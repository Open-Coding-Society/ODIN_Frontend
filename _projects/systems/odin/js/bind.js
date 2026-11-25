// Writes content into a page's markup. The markup says where each value goes with a data
// attribute whose value is a path into the content, such as site.phone or sections.hero.title:
//
//   data-odin-text        the element's text
//   data-odin-paragraphs  the element's text, one <p> for each paragraph of the value
//   data-odin-src         an image's address, from the image's file name
//   data-odin-alt         an image's description
//   data-odin-content     a meta element's content
//   data-odin-href        a link to another site (https only)
//   data-odin-tel         a link that opens the phone app, from a phone number
//   data-odin-mail        a link that opens the email app, from an email address
//   data-odin-map         a link that opens a map, from a street address
//   data-odin-route       a link to one of this site's pages, from the page's name
//   data-odin-current     marks the link of the page being shown
//   data-odin-if          shows the element only when the content has the value
//   data-odin-each        repeats the element's <template> once for each item of a list; inside
//                         the template, paths that start with item. read from that item
//
// Values go in as text and attributes, never as HTML, so nothing the backend sends can run in
// the page. Everything is checked before anything is written: a value the markup asks for and
// the content does not have throws, and the page is left as it was.

const MAP_SEARCH = 'https://www.google.com/maps/search/?api=1&query=';

export const isText = (value) => typeof value === 'string' && value.trim() !== '';

// The value at a path such as sections.hero.title, or undefined when any step is missing.
export function lookup(context, path) {
  let value = context;
  for (const key of path.split('.')) {
    if (value === null || typeof value !== 'object' || !Object.hasOwn(value, key)) return undefined;
    value = value[key];
  }
  return value;
}

// True for content a visitor could be shown: text, a list with something in it, or true.
function hasValue(value) {
  if (Array.isArray(value)) return value.length > 0;
  return isText(value) || value === true;
}

function text(value, path) {
  if (!isText(value)) throw new Error(`The content has no text at ${path}`);
  return value;
}

// A phone number as a tel: address, or null for one with letters or an extension.
function telAddress(value) {
  const number = value.replace(/[\s().-]/g, '');
  return /^\+?\d{7,15}$/.test(number) ? `tel:${number}` : null;
}

// An email address as a mailto: address, or null for one with a character that would change
// what the link does.
function mailAddress(value) {
  return /^[^\s@?#%&]+@[^\s@?#%&]+\.[^\s@?#%&]+$/.test(value) ? `mailto:${value}` : null;
}

// Sets the link's address, or takes it away when the value makes no clean address. The text of
// such a link is still shown, as plain text.
function setAddress(element, address) {
  if (address === null) element.removeAttribute('href');
  else element.setAttribute('href', address);
}

// One entry per attribute: given the element, the value at its path and the path, it checks the
// value and returns the write.
const MARKS = {
  'data-odin-text': (element, value, path) => {
    const words = text(value, path);
    return () => { element.textContent = words; };
  },
  'data-odin-paragraphs': (element, value, path) => {
    const paragraphs = text(value, path).split(/\n\s*\n/).map((part) => part.trim()).filter((part) => part !== '');
    return () => {
      element.replaceChildren(...paragraphs.map((words) => {
        const paragraph = element.ownerDocument.createElement('p');
        paragraph.textContent = words;
        return paragraph;
      }));
    };
  },
  'data-odin-src': (element, value, path, { imageUrl }) => {
    const address = imageUrl(text(value, path));
    return () => element.setAttribute('src', address);
  },
  'data-odin-alt': (element, value, path) => {
    const words = text(value, path);
    return () => element.setAttribute('alt', words);
  },
  'data-odin-content': (element, value, path) => {
    const words = text(value, path);
    return () => element.setAttribute('content', words);
  },
  'data-odin-href': (element, value, path) => {
    if (typeof value !== 'string' || !value.startsWith('https://')) throw new Error(`The content has no https link at ${path}`);
    return () => element.setAttribute('href', value);
  },
  'data-odin-tel': (element, value, path) => {
    const address = telAddress(text(value, path));
    return () => setAddress(element, address);
  },
  'data-odin-mail': (element, value, path) => {
    const address = mailAddress(text(value, path));
    return () => setAddress(element, address);
  },
  'data-odin-map': (element, value, path) => {
    const address = MAP_SEARCH + encodeURIComponent(text(value, path));
    return () => element.setAttribute('href', address);
  },
  'data-odin-route': (element, value, path, { routes }) => {
    if (!isText(value) || !Object.hasOwn(routes, value)) throw new Error(`This site has no page for ${path}`);
    return () => element.setAttribute('href', routes[value]);
  },
  'data-odin-current': (element, value) => () => {
    if (value === true) element.setAttribute('aria-current', 'page');
    else element.removeAttribute('aria-current');
  },
};

// The writes that fill a list: the template is copied once per item, each copy takes its item,
// and the copies replace whatever the list held before.
function planList(list, items, path, context, tools, writes) {
  const template = [...list.children].find((child) => child.tagName === 'TEMPLATE');
  if (!template) throw new Error(`The list for ${path} has no template`);
  if (!Array.isArray(items) || items.length === 0) throw new Error(`The content has no list at ${path}`);
  const copies = items.map((item) => {
    const copy = template.content.cloneNode(true);
    for (const child of copy.children) plan(child, { ...context, item }, tools, writes);
    return copy;
  });
  writes.push(() => list.replaceChildren(template, ...copies));
}

// Collects the writes for one element and everything inside it. Nothing is written here.
function plan(element, context, tools, writes) {
  const condition = element.getAttribute('data-odin-if');
  if (condition !== null) {
    const shown = hasValue(lookup(context, condition));
    writes.push(() => { element.hidden = !shown; });
    // What is inside a part the content does not have is never asked for
    if (!shown) return;
  }
  const list = element.getAttribute('data-odin-each');
  if (list !== null) {
    planList(element, lookup(context, list), list, context, tools, writes);
    return;
  }
  for (const [attribute, check] of Object.entries(MARKS)) {
    const path = element.getAttribute(attribute);
    if (path !== null) writes.push(check(element, lookup(context, path), path, tools));
  }
  for (const child of element.children) plan(child, context, tools, writes);
}

// Writes the content into `root` and everything inside it. `tools` gives imageUrl (file name to
// address) and routes (page name to address). All of it is written, or nothing is.
export function bind(root, context, tools) {
  const writes = [];
  plan(root, context, tools, writes);
  for (const write of writes) write();
}
