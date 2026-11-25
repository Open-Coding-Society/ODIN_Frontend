// Shows one ODIN page. The markup holds three kinds of part, each marked data-odin-state:
// "loading" and "error" blocks with the interface's own words, and "ready" parts (the header,
// the page and the footer) that are empty until the backend's content is written into them.
// Exactly one state shows at a time, so a visitor sees the whole page or none of it.

import { bind, isText } from './bind.js';

const STATES = ['loading', 'ready', 'error'];

export function showState(root, state) {
  if (!STATES.includes(state)) throw new Error(`Unknown page state: ${state}`);
  const parts = [...root.querySelectorAll('[data-odin-state]')];
  const missing = STATES.filter((name) => !parts.some((part) => part.getAttribute('data-odin-state') === name));
  if (missing.length > 0) throw new Error(`The page has no part for: ${missing.join(', ')}`);
  for (const part of parts) part.hidden = part.getAttribute('data-odin-state') !== state;
}

// What the markup's paths read from: the site basics, this page's details, the menu, the pages
// by name and this page's sections by name. The menu is every page that has menu words and an
// address here. `pages` holds every page with an address here, so one page can link to another
// with the other's own words.
export function pageContext({ site, pages, page, name, routes }) {
  const menu = pages
    .filter((entry) => isText(entry.menu) && Object.hasOwn(routes, entry.name))
    .map((entry) => ({ ...entry, current: entry.name === name }));
  // No prototype, so a page or a section could be named after anything an object inherits
  const byName = Object.create(null);
  for (const entry of pages) {
    if (Object.hasOwn(routes, entry.name)) byName[entry.name] = entry;
  }
  const sections = Object.create(null);
  for (const section of page.sections) {
    if (Object.hasOwn(sections, section.name)) throw new Error(`The page was given two sections named ${section.name}`);
    sections[section.name] = section;
  }
  // The browser tab names the page and then the site, unless the page is named after the site
  const tab = !isText(page.title) || page.title === site.name ? site.name : `${page.title} | ${site.name}`;
  return { site, page: { name, title: page.title, description: page.description, tab }, menu, pages: byName, sections };
}

// Each page's address on this site: the path _config.yml gives it, after the site's baseurl.
export function siteRoutes(paths, baseurl) {
  return Object.fromEntries(Object.entries(paths).map(([name, path]) => [name, `${baseurl}${path}`]));
}

// Loads the page named `name` and shows it in `document`: all of it, or the error block.
// `content` is createContent's object, `routes` maps each page name to its address, and `titles`
// gives the tab's words for the loading and error states. `refocus` moves the keyboard to the
// new state's part, for a load the visitor asked for with the retry button. Resolves to whether
// the page is showing.
export async function showPage({ document, content, name, routes, titles, report = console.error, refocus = false }) {
  const root = document.documentElement;
  // Only the newest load may change the page: an older one that finishes late is dropped
  const load = (latestLoad.get(document) ?? 0) + 1;
  latestLoad.set(document, load);
  const stale = () => latestLoad.get(document) !== load;
  document.title = titles.loading;
  showState(root, 'loading');
  try {
    const [site, pages, page] = await Promise.all([content.site(), content.pages(), content.page(name)]);
    if (stale()) return false;
    const context = pageContext({ site, pages, page, name, routes });
    bind(root, context, { imageUrl: content.imageUrl, routes });
    document.title = context.page.tab;
  } catch (error) {
    if (stale()) return false;
    document.title = titles.error;
    showState(root, 'error');
    if (refocus) focusFirst(root, '[data-odin-retry]');
    report('The ODIN page could not be shown.', error);
    return false;
  }
  showState(root, 'ready');
  if (refocus) focusFirst(root, '[data-odin-main]');
  return true;
}

// The number of the newest load of each document.
const latestLoad = new WeakMap();

// Hiding the part that held the keyboard's focus drops the focus to the top of the document.
// This puts it on the first element that matches, in the part that now shows.
function focusFirst(root, selector) {
  const [target] = root.querySelectorAll(selector);
  if (target) target.focus();
}

// Shows the page, and shows it again each time the visitor presses a button marked
// data-odin-retry, which the error block holds.
export function startPage(options) {
  for (const button of options.document.querySelectorAll('[data-odin-retry]')) {
    button.addEventListener('click', () => showPage({ ...options, refocus: true }));
  }
  return showPage(options);
}
