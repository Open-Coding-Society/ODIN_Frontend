import assert from 'node:assert/strict';
import { test } from 'node:test';

import { bind, lookup } from '../js/bind.js';
import { h } from './fake-dom.mjs';

const tools = {
  imageUrl: (file) => `http://backend/api/odin/image?name=${file}`,
  routes: { home: '/site/', about: '/site/about/' },
};

// Made-up content in the shape the backend sends. None of it is ODIN's.
const context = {
  site: { name: 'Example Site', linkedin: 'https://www.example.com/company/example/', logo_dark: 'logo.svg' },
  page: { name: 'home', description: null },
  menu: [{ name: 'home', menu: 'Home', current: true }, { name: 'about', menu: 'About', current: false }],
  sections: {
    hero: { title: 'Example', kicker: null, image: 'photo.jpg', image_alt: 'A photo' },
    mission: { text: 'First paragraph.\n\nSecond paragraph.\n\n\n  Third.  ' },
    statistics: { items: [{ title: '50%', text: 'First figure' }, { title: '20%', text: 'Second figure' }] },
    empty: { items: [] },
  },
};

test('lookup follows a path one step at a time and gives undefined when a step is missing', () => {
  assert.equal(lookup(context, 'sections.hero.title'), 'Example');
  assert.equal(lookup(context, 'sections.hero.kicker'), null);
  assert.equal(lookup(context, 'sections.nothing.title'), undefined);
  assert.equal(lookup(context, 'site.name.length'), undefined);
  assert.equal(lookup(context, 'sections.constructor'), undefined);
});

test('text goes into the element as text, never as markup', () => {
  const title = h('h1', { 'data-odin-text': 'sections.hero.title' });
  const root = h('main', {}, title);
  bind(root, { sections: { hero: { title: '<b>Example</b>' } } }, tools);
  assert.equal(title.textContent, '<b>Example</b>');
  assert.equal(title.children.length, 0);
});

test('a value the markup asks for and the content does not have throws, and nothing is written', () => {
  const first = h('h1', { 'data-odin-text': 'sections.hero.title' });
  const second = h('p', { 'data-odin-text': 'sections.hero.kicker' });
  const root = h('main', {}, first, second);
  assert.throws(() => bind(root, context, tools), /sections\.hero\.kicker/);
  assert.equal(first.textContent, '');
  for (const value of ['', '   ', 7, {}, []]) {
    assert.throws(() => bind(h('p', { 'data-odin-text': 'value' }), { value }, tools), /no text at value/);
  }
});

test('paragraphs: one p for each paragraph of the value, with the space around each removed', () => {
  const body = h('div', { 'data-odin-paragraphs': 'sections.mission.text' }, h('p', {}, 'old'));
  bind(body, context, tools);
  assert.deepEqual(body.children.map((child) => [child.tagName, child.textContent]),
    [['P', 'First paragraph.'], ['P', 'Second paragraph.'], ['P', 'Third.']]);
});

test('an image gets its address from the file name, and its description', () => {
  const image = h('img', { 'data-odin-src': 'sections.hero.image', 'data-odin-alt': 'sections.hero.image_alt' });
  bind(image, context, tools);
  assert.equal(image.getAttribute('src'), 'http://backend/api/odin/image?name=photo.jpg');
  assert.equal(image.getAttribute('alt'), 'A photo');
});

test('a meta element gets its content', () => {
  const meta = h('meta', { name: 'description', 'data-odin-content': 'site.name' });
  bind(meta, context, tools);
  assert.equal(meta.getAttribute('content'), 'Example Site');
});

test('a link to another site is written only when it is an https address', () => {
  const link = h('a', { 'data-odin-href': 'site.linkedin' });
  bind(link, context, tools);
  assert.equal(link.getAttribute('href'), context.site.linkedin);
  for (const value of ['http://example.com', 'javascript:alert(1)', '//example.com', 'example.com', null]) {
    assert.throws(() => bind(h('a', { 'data-odin-href': 'value' }), { value }, tools), /no https link at value/);
  }
});

test('a phone number becomes a tel link of its digits', () => {
  for (const [value, address] of [['555 0100 200', 'tel:5550100200'], ['(555) 010-0200', 'tel:5550100200'], ['+1 555.010.0200', 'tel:+15550100200']]) {
    const link = h('a', { 'data-odin-tel': 'value', 'data-odin-text': 'value' });
    bind(link, { value }, tools);
    assert.equal(link.getAttribute('href'), address);
    assert.equal(link.textContent, value);
  }
});

test('text that is not a plain phone number stops the page, like any other value it cannot use', () => {
  for (const value of ['555 0100 ext. 4', 'call us', '12', 'tel:5550100200', '555;0100200']) {
    assert.throws(() => bind(h('a', { 'data-odin-tel': 'value' }), { value }, tools), /no phone number at value/);
  }
});

test('an email address becomes a mailto link', () => {
  const link = h('a', { 'data-odin-mail': 'value' });
  bind(link, { value: 'hello@example.com' }, tools);
  assert.equal(link.getAttribute('href'), 'mailto:hello@example.com');
});

test('an email with a character that would change what the link does stops the page', () => {
  for (const value of ['a@b.com?subject=x', 'a b@c.com', 'not an email', 'a@b.com&cc=d@e.com', 'a@b']) {
    assert.throws(() => bind(h('a', { 'data-odin-mail': 'value' }), { value }, tools), /no email address at value/);
  }
});

test('a page name becomes that page\'s address, and a name with no address here throws', () => {
  const link = h('a', { 'data-odin-route': 'page.name' });
  bind(link, context, tools);
  assert.equal(link.getAttribute('href'), '/site/');
  assert.throws(() => bind(h('a', { 'data-odin-route': 'value' }), { value: 'pricing' }, tools), /no page for value/);
  assert.throws(() => bind(h('a', { 'data-odin-route': 'value' }), { value: 'constructor' }, tools), /no page for value/);
});

test('if: a part the content does not have is hidden, and what is inside it is not asked for', () => {
  const kicker = h('p', { 'data-odin-if': 'sections.hero.kicker' }, h('span', { 'data-odin-text': 'sections.hero.kicker' }));
  const title = h('p', { 'data-odin-if': 'sections.hero.title', hidden: '' }, h('span', { 'data-odin-text': 'sections.hero.title' }));
  const list = h('ul', { 'data-odin-if': 'sections.empty.items' });
  const root = h('main', {}, kicker, title, list);
  bind(root, context, tools);
  assert.equal(kicker.hidden, true);
  assert.equal(title.hidden, false);
  assert.equal(title.textContent, 'Example');
  assert.equal(list.hidden, true);
});

test('if: a whole section, a number and true count as there; null, blank text and an empty list do not', () => {
  const shown = (value) => {
    const part = h('div', { 'data-odin-if': 'value' });
    bind(part, { value }, tools);
    return !part.hidden;
  };
  assert.deepEqual([{ title: 'x' }, {}, 7, 0, true, 'words', ['x']].map(shown), [true, true, true, true, true, true, true]);
  assert.deepEqual([null, undefined, '', '  ', [], false].map(shown), [false, false, false, false, false, false]);
});

test('if and a value on the same element: the value is written only when it is there', () => {
  const meta = h('meta', { 'data-odin-if': 'page.description', 'data-odin-content': 'page.description' });
  bind(meta, context, tools);
  assert.equal(meta.hidden, true);
  assert.equal(meta.getAttribute('content'), null);
});

test('each: the template is copied once for each item, and item paths read from that item', () => {
  const template = h('template', {}, h('li', {}, h('strong', { 'data-odin-text': 'item.title' }), h('span', { 'data-odin-text': 'item.text' })));
  const list = h('ul', { 'data-odin-each': 'sections.statistics.items' }, template);
  bind(list, context, tools);
  assert.equal(list.children[0], template);
  assert.deepEqual(list.children.slice(1).map((item) => item.children.map((part) => part.textContent)),
    [['50%', 'First figure'], ['20%', 'Second figure']]);
});

test('each: filling a list again replaces the copies of the first time', () => {
  const list = h('ul', { 'data-odin-each': 'items' }, h('template', {}, h('li', { 'data-odin-text': 'item.title' })));
  bind(list, { items: [{ title: 'one' }, { title: 'two' }] }, tools);
  bind(list, { items: [{ title: 'three' }] }, tools);
  assert.deepEqual(list.children.slice(1).map((item) => item.textContent), ['three']);
});

test('each: a copy can still read the rest of the content, and mark the current page', () => {
  const link = h('a', { 'data-odin-route': 'item.name', 'data-odin-text': 'item.menu', 'data-odin-current': 'item.current' });
  const menu = h('ul', { 'data-odin-each': 'menu' }, h('template', {}, h('li', { title: 'x' }, link, h('i', { 'data-odin-text': 'site.name' }))));
  bind(menu, context, tools);
  const links = menu.children.slice(1).map((item) => item.children[0]);
  assert.deepEqual(links.map((item) => [item.getAttribute('href'), item.textContent, item.getAttribute('aria-current')]),
    [['/site/', 'Home', 'page'], ['/site/about/', 'About', null]]);
  assert.equal(menu.children[1].children[1].textContent, 'Example Site');
});

test('each: a list with no template, or content with no list, throws and writes nothing', () => {
  assert.throws(() => bind(h('ul', { 'data-odin-each': 'sections.statistics.items' }), context, tools), /no template/);
  const kept = h('li', {}, 'kept');
  const list = h('ul', { 'data-odin-each': 'sections.empty.items' }, h('template', {}, h('li')), kept);
  assert.throws(() => bind(list, context, tools), /no list at sections\.empty\.items/);
  assert.throws(() => bind(h('ul', { 'data-odin-each': 'site.name' }, h('template', {})), context, tools), /no list at site\.name/);
  assert.equal(list.children[1], kept);
});

test('each: a list element takes no other mark, so one is never silently skipped', () => {
  const list = h('ul', { 'data-odin-each': 'sections.statistics.items', 'data-odin-text': 'site.name' }, h('template', {}, h('li')));
  assert.throws(() => bind(list, context, tools), /also has data-odin-text/);
});

test('each: one item without a value the template asks for stops the whole page, with nothing written', () => {
  const title = h('h1', { 'data-odin-text': 'sections.hero.title' });
  const list = h('ul', { 'data-odin-each': 'items' }, h('template', {}, h('li', { 'data-odin-text': 'item.title' })));
  const root = h('main', {}, title, list);
  assert.throws(() => bind(root, { ...context, items: [{ title: 'one' }, { title: '' }] }, tools), /item\.title/);
  assert.equal(title.textContent, '');
  assert.equal(list.children.length, 1);
});

test('marks deep inside the page are found, and an element with no mark is left as it was', () => {
  const deep = h('span', { 'data-odin-text': 'site.name' });
  const plain = h('p', { class: 'kept' }, 'kept words');
  const root = h('main', {}, h('section', {}, h('div', {}, deep)), plain);
  bind(root, context, tools);
  assert.equal(deep.textContent, 'Example Site');
  assert.equal(plain.textContent, 'kept words');
  assert.deepEqual(plain.attributes, { class: 'kept' });
});
