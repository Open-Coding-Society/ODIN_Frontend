// Reads the ODIN website's content from the Flask backend. The frontend keeps none of it: a page
// asks here, and a page that gets no usable answer shows a connection error.

const SITE_PATH = '/api/odin/site';
const PAGES_PATH = '/api/odin/pages';
const PAGE_PATH = '/api/odin/page';
const IMAGE_PATH = '/api/odin/image';

// How long a page waits for the backend before it treats the content as unavailable.
const DEFAULT_TIME_LIMIT_MS = 8000;

// The content could not be used: the request failed or took too long, or the backend answered
// with something that is not the content. `cause` holds the request's error when there is one.
export class ContentUnavailableError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = 'ContentUnavailableError';
  }
}

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isText = (value) => typeof value === 'string' && value.trim() !== '';

// `baseUrl` and `fetchOptions` are pythonURI and fetchOptions from assets/js/api/config.js. The
// page hands them in, so this module can be tested without a browser.
export function createContent({ baseUrl, fetchOptions = {}, fetch = globalThis.fetch, timeLimitMs = DEFAULT_TIME_LIMIT_MS }) {
  // The backend's JSON answer to a GET of this path. A request that fails, is refused or takes
  // too long is unavailable content. The time limit also ends a request that never answers.
  async function ask(path) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeLimitMs);
    try {
      const response = await fetch(`${baseUrl}${path}`, { ...fetchOptions, method: 'GET', signal: controller.signal });
      if (!response.ok) throw new Error(`The backend answered ${response.status}`);
      return await response.json();
    } catch (cause) {
      throw new ContentUnavailableError(`GET ${path} gave no content`, { cause });
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    // The basics every page shows: the company name, how to reach it, its logos and footer lines.
    async site() {
      const answer = await ask(SITE_PATH);
      if (!isObject(answer)) throw new ContentUnavailableError(`GET ${SITE_PATH} answered without the site basics`);
      return answer;
    },

    // Every page in menu order, each with its name, title, description and menu words.
    async pages() {
      const answer = await ask(PAGES_PATH);
      const pages = isObject(answer) ? answer.pages : undefined;
      const usable = (page) => isObject(page) && isText(page.name) && isText(page.title);
      if (!Array.isArray(pages) || pages.length === 0 || !pages.every(usable)) {
        throw new ContentUnavailableError(`GET ${PAGES_PATH} answered without a list of pages`);
      }
      return pages;
    },

    // One page: its title, its description and its sections in the order the page shows them.
    async page(name) {
      const path = `${PAGE_PATH}?name=${encodeURIComponent(name)}`;
      const answer = await ask(path);
      const sections = isObject(answer) ? answer.sections : undefined;
      const named = (section) => isObject(section) && isText(section.name);
      if (!Array.isArray(sections) || sections.length === 0 || !sections.every(named)) {
        throw new ContentUnavailableError(`GET ${path} answered without a list of sections`);
      }
      return { title: answer.title, description: answer.description, sections };
    },

    // The address of one of the website's images, by the file name the content gives for it.
    imageUrl(file) {
      return `${baseUrl}${IMAGE_PATH}?name=${encodeURIComponent(file)}`;
    },
  };
}
