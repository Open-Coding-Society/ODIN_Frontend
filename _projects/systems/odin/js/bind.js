// Writes content into a page's markup. The markup says where each value goes with a data
// attribute whose value is a path into the content, such as site.phone or sections.hero.title:
//
//   data-odin-text        the element's text
//   data-odin-paragraphs  the element's text, one <p> for each paragraph of the value
//   data-odin-src         an image's address, from the image's file name
//   data-odin-alt         an image's description
//   data-odin-image-href  a link element's address, from an image's file name (the tab's icon)
//   data-odin-content     a meta element's content
//   data-odin-href        a link to another site (https only)
//   data-odin-tel         a link that opens the phone app, from a phone number
//   data-odin-mail        a link that opens the email app, from an email address. Text that
//                         makes no clean phone or email address gets no link and still shows
//   data-odin-route       a link to one of this site's pages, from the page's name
//   data-odin-current     marks the link of the page being shown
//   data-odin-if          shows the element only when the content has the value
//   data-odin-each        repeats the element's <template> once for each item of a list; inside
//                         the template, paths that start with item. read from that item. The
//                         list element holds only the list, so it takes no other mark
//
// Values go in as text and attributes, never as HTML, so nothing the backend sends can run in
// the page. Everything is checked before anything is written: a value the markup asks for and
// the content does not have throws, and the page is left as it was.

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

// True for content a visitor could be shown: text, a number, true, a list with something in it,
// or a record such as a whole section.
function hasValue(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (value !== null && typeof value === 'object') return true;
  return isText(value) || typeof value === 'number' || value === true;
}

// The value, which must be text a visitor can read. Anything else stops the page.
function requireText(value, path) {
  if (!isText(value)) throw new Error(`The content has no text at ${path}`);
  return value;
}

// A phone number as a tel: address, or null for text that is not one plain number. A plain
// number is digits, with the spaces, brackets, dots and hyphens people write them with, and a
// plus sign in front. After a plus sign, a zero in brackets is the one dialled only inside the
// country, so it is left out.
function telAddress(value) {
  const number = value.replace(/^(\+\d+\s*)\(0\)/, '$1').replace(/[\s().-]/g, '');
  return /^\+?\d{7,15}$/.test(number) ? `tel:${number}` : null;
}

// An email address as a mailto: address, or null for text that is not one address, or that has
// a character which would change what the link does (a question mark starts a subject line).
function mailAddress(value) {
  const plain = /^[^\s@?#%&:,;<>"/]+@[^\s@?#%&:,;<>"/]+\.[^\s@?#%&:,;<>"/]+$/.test(value) && !value.includes('..');
  return plain ? `mailto:${value}` : null;
}

// Sets the link's address, or takes it away. A contact detail written in a way that makes no
// clean address is still content: its text shows, as plain text, and the page is not stopped.
function setAddress(element, address) {
  if (address === null) element.removeAttribute('href');
  else element.setAttribute('href', address);
}

// One entry per attribute: given the element, the value at its path and the path, it checks the
// value and returns the write.
const MARKS = {
  'data-odin-text': (element, value, path) => {
    const words = requireText(value, path);
    return () => { element.textContent = words; };
  },
  'data-odin-paragraphs': (element, value, path) => {
    const paragraphs = requireText(value, path).split(/\n\s*\n/).map((part) => part.trim()).filter((part) => part !== '');
    return () => {
      element.replaceChildren(...paragraphs.map((words) => {
        const paragraph = element.ownerDocument.createElement('p');
        paragraph.textContent = words;
        return paragraph;
      }));
    };
  },
  'data-odin-src': (element, value, path, { imageUrl }) => {
    const address = imageUrl(requireText(value, path));
    return () => element.setAttribute('src', address);
  },
  'data-odin-alt': (element, value, path) => {
    const words = requireText(value, path);
    return () => element.setAttribute('alt', words);
  },
  'data-odin-image-href': (element, value, path, { imageUrl }) => {
    const address = imageUrl(requireText(value, path));
    return () => element.setAttribute('href', address);
  },
  'data-odin-content': (element, value, path) => {
    const words = requireText(value, path);
    return () => element.setAttribute('content', words);
  },
  'data-odin-href': (element, value, path) => {
    if (typeof value !== 'string' || !value.startsWith('https://')) throw new Error(`The content has no https link at ${path}`);
    return () => element.setAttribute('href', value);
  },
  'data-odin-tel': (element, value, path) => {
    const address = telAddress(requireText(value, path));
    return () => setAddress(element, address);
  },
  'data-odin-mail': (element, value, path) => {
    const address = mailAddress(requireText(value, path));
    return () => setAddress(element, address);
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
    const extra = Object.keys(MARKS).find((attribute) => element.getAttribute(attribute) !== null);
    if (extra !== undefined) throw new Error(`The list for ${list} also has ${extra}, which a list element cannot take`);
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
