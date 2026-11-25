// A small stand-in for the browser's document, for tests of the modules that write content into
// markup. It keeps what those modules use: attributes, children, text, the hidden property, a
// template's content, attribute selectors, click listeners and focus. Text set on an element
// replaces its children, as in a browser.

// The element that last took the keyboard's focus, in any fake document.
export const focus = { element: null };

class FakeFragment {
  constructor(children = []) {
    this.children = children;
  }

  cloneNode() {
    return new FakeFragment(this.children.map((child) => child.cloneNode(true)));
  }
}

export class FakeElement {
  constructor(tagName, attributes = {}, children = []) {
    this.tagName = tagName.toUpperCase();
    this.attributes = { ...attributes };
    this.children = [];
    this.text = '';
    this.listeners = {};
    this.ownerDocument = { createElement: (name) => new FakeElement(name) };
    const elements = [];
    for (const child of children) {
      if (typeof child === 'string') this.text += child;
      else elements.push(child);
    }
    // A template's children are its content and are not in the page until they are copied
    if (this.tagName === 'TEMPLATE') this.content = new FakeFragment(elements);
    else this.children = elements;
  }

  getAttribute(name) {
    return Object.hasOwn(this.attributes, name) ? this.attributes[name] : null;
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  removeAttribute(name) {
    delete this.attributes[name];
  }

  get hidden() {
    return Object.hasOwn(this.attributes, 'hidden');
  }

  set hidden(value) {
    if (value) this.attributes.hidden = '';
    else delete this.attributes.hidden;
  }

  get textContent() {
    return this.text + this.children.map((child) => child.textContent).join('');
  }

  set textContent(value) {
    this.children = [];
    this.text = String(value);
  }

  replaceChildren(...nodes) {
    this.text = '';
    this.children = nodes.flatMap((node) => (node instanceof FakeFragment ? node.children : [node]));
  }

  cloneNode() {
    const copy = new FakeElement(this.tagName, this.attributes);
    copy.text = this.text;
    copy.children = this.children.map((child) => child.cloneNode(true));
    if (this.content) copy.content = this.content.cloneNode(true);
    return copy;
  }

  // Elements inside this one that match [name] or [name="value"], in document order.
  querySelectorAll(selector) {
    const match = selector.match(/^\[([a-z-]+)(?:="([^"]*)")?\]$/);
    if (!match) throw new Error(`The fake document does not understand ${selector}`);
    const [, name, value] = match;
    const found = [];
    const visit = (element) => {
      for (const child of element.children) {
        const held = child.getAttribute(name);
        if (held !== null && (value === undefined || held === value)) found.push(child);
        visit(child);
      }
    };
    visit(this);
    return found;
  }

  addEventListener(type, listener) {
    (this.listeners[type] ??= []).push(listener);
  }

  focus() {
    focus.element = this;
  }

  // Runs the element's click listeners and resolves when what they started has finished. A
  // browser's click() returns nothing, so this has a name of its own.
  press() {
    return Promise.all((this.listeners.click ?? []).map((listener) => listener()));
  }
}

// h('p', { class: 'x' }, 'words', h('span')) builds an element. A string child is its text.
export function h(tagName, attributes = {}, ...children) {
  return new FakeElement(tagName, attributes, children);
}

// A document whose root is <html> holding these children.
export function fakeDocument(...children) {
  const documentElement = h('html', {}, ...children);
  return {
    documentElement,
    title: '',
    querySelectorAll: (selector) => documentElement.querySelectorAll(selector),
  };
}
