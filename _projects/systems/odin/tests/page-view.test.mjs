import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clearSections, fillSections, showPage } from '../js/page-view.js';
import { container, element, itemList } from './fake-page.mjs';

const HERO = { name: 'hero', kicker: 'Example kicker', title: 'Example', text: 'One line.', action: 'Example action', image: 'hero.webp', image_alt: 'A lens.', items: [] };
const PITCH = { name: 'pitch', kicker: null, title: 'Second title', text: 'More words.', action: null, image: null, image_alt: null, items: [] };
const FACTS = { name: 'facts', title: 'Some facts', items: [{ title: '50%', text: 'Of one thing' }, { title: '20%', text: 'Of another' }] };
const SITE = { phone: '(555) 010-0000', email: 'hello@example.com', address: '1 Example St' };
const imageUrl = (name) => `https://images.example/${name}`;

// A page with its three state blocks and one element per section. Each section's element holds a
// mark for each of `fields`, an image mark if `image` is set, and a list whose copies hold a mark
// for each of `items`. `basics` are marks for site basics, as [key, opens] pairs.
function page(sections = [{ name: 'hero', fields: ['kicker', 'title'], image: true }], basics = []) {
  const blocks = Object.fromEntries(['loading', 'ready', 'unavailable'].map((state) => [state, element({ odinState: state }, { hidden: true })]));
  const parts = {};
  const all = [];
  for (const { name, fields = [], image = false, items = null, template = true } of sections) {
    const marks = Object.fromEntries(fields.map((key) => [key, element({ odinField: key })]));
    const picture = image ? element({ odinImage: '' }) : null;
    const makeCopy = () => {
      const copyMarks = Object.fromEntries(items.map((key) => [key, element({ odinField: key })]));
      return { ...container(Object.values(copyMarks)), marks: copyMarks };
    };
    const list = items ? itemList(template ? makeCopy : null) : null;
    const inside = [...Object.values(marks), ...(picture ? [picture] : []), ...(list ? [list] : [])];
    parts[name] = { marks, picture, list };
    all.push(container(inside, { odinSection: name }), ...inside);
  }
  const basicMarks = Object.fromEntries(basics.map(([key, opens]) => [key, element(opens ? { odinBasic: key, odinOpens: opens } : { odinBasic: key })]));
  return { root: container([...Object.values(blocks), ...all, ...Object.values(basicMarks)]), blocks, parts, basics: basicMarks };
}

const TWO = [{ name: 'hero', fields: ['title'], image: true }, { name: 'pitch', fields: ['title', 'text'] }];
const LISTED = [{ name: 'facts', fields: ['title'], items: ['title', 'text'] }];

function showing(blocks) {
  return Object.keys(blocks).filter((state) => !blocks[state].hidden);
}

test('fillSections writes a section\'s parts and its image into the element marked for it', () => {
  const { root, parts } = page();
  fillSections(root, { sections: [{ name: 'other', title: 'Not this one' }, HERO] }, { imageUrl });
  assert.equal(parts.hero.marks.kicker.textContent, 'Example kicker');
  assert.equal(parts.hero.marks.title.textContent, 'Example');
  assert.equal(parts.hero.picture.getAttribute('src'), 'https://images.example/hero.webp');
  assert.equal(parts.hero.picture.getAttribute('alt'), 'A lens.');
});

test('each section gets its own values and no other section\'s', () => {
  const { root, parts } = page(TWO);
  fillSections(root, { sections: [PITCH, HERO] }, { imageUrl });
  assert.equal(parts.hero.marks.title.textContent, 'Example');
  assert.equal(parts.pitch.marks.title.textContent, 'Second title');
  assert.equal(parts.pitch.marks.text.textContent, 'More words.');
  assert.equal(parts.hero.picture.getAttribute('src'), 'https://images.example/hero.webp');
});

test('fillSections refuses a page that marks no section, so a misspelled mark cannot show an empty page', () => {
  const root = container([element({ odinField: 'title' })]);
  assert.throws(() => fillSections(root, { sections: [HERO] }, { imageUrl }), /marks no section/);
});

test('fillSections refuses a page whose section the backend did not send', () => {
  const { root } = page([{ name: 'pitch', fields: ['title'] }]);
  assert.throws(() => fillSections(root, { sections: [HERO] }, { imageUrl }), /no content for its pitch section/);
});

test('fillSections refuses a section that lacks a part the page shows, or has it blank', () => {
  for (const lacking of [null, undefined, '', '   ']) {
    const { root, parts } = page();
    assert.throws(() => fillSections(root, { sections: [{ ...HERO, kicker: lacking }] }, { imageUrl }), /no usable value for: kicker/, JSON.stringify(lacking));
    assert.equal(parts.hero.marks.title.textContent, '');
  }
});

test('fillSections refuses a section that lacks the image the page shows, or its description', () => {
  for (const lacking of [{ image: null }, { image_alt: null }, { image: '' }, { image_alt: '  ' }, { image: undefined, image_alt: undefined }]) {
    const { root, parts } = page();
    assert.throws(() => fillSections(root, { sections: [{ ...HERO, ...lacking }] }, { imageUrl }), /The hero section has no image/, JSON.stringify(lacking));
    assert.equal(parts.hero.picture.getAttribute('src'), null);
  }
});

test('a section the page shows without an image does not need one', () => {
  const { root, parts } = page([{ name: 'pitch', fields: ['title'] }]);
  fillSections(root, { sections: [PITCH] }, { imageUrl });
  assert.equal(parts.pitch.marks.title.textContent, 'Second title');
});

test('a list gets one copy of its template per item, in order, each with that item\'s parts', () => {
  const { root, parts } = page(LISTED);
  fillSections(root, { sections: [FACTS] }, { imageUrl });
  const copies = parts.facts.list.copies;
  assert.deepEqual(copies.map((copy) => [copy.marks.title.textContent, copy.marks.text.textContent]), [['50%', 'Of one thing'], ['20%', 'Of another']]);
  assert.equal(parts.facts.marks.title.textContent, 'Some facts');
});

test('a filled list still starts with its template, followed by the copies', () => {
  const { root, parts } = page(LISTED);
  fillSections(root, { sections: [FACTS] }, { imageUrl });
  const { children } = parts.facts.list;
  assert.equal(children.length, 3);
  assert.equal(children[0].isTemplate, true);
  assert.ok(children.slice(1).every((child) => !child.isTemplate));
});

// The copies sit inside the section's element, so a second fill must not put the section's own
// parts into them, or ask the section for parts only an item has.
test('filling a page again replaces each list\'s copies, so it never holds an item twice', () => {
  const { root, parts } = page(LISTED);
  fillSections(root, { sections: [FACTS] }, { imageUrl });
  fillSections(root, { sections: [{ ...FACTS, items: [FACTS.items[1]] }] }, { imageUrl });
  assert.deepEqual(parts.facts.list.copies.map((copy) => [copy.marks.title.textContent, copy.marks.text.textContent]), [['20%', 'Of another']]);
  assert.equal(parts.facts.marks.title.textContent, 'Some facts');
});

test('fillSections refuses two sections with one name, so it is never a matter of order which shows', () => {
  const { root, parts } = page();
  assert.throws(() => fillSections(root, { sections: [HERO, PITCH, { ...HERO, title: 'Another' }] }, { imageUrl }), /two sections named hero/);
  assert.equal(parts.hero.marks.title.textContent, '');
});

test('fillSections refuses a list whose section has no items, or an item lacking a part the list shows', () => {
  for (const [items, message] of [[[], /The facts section has no items/], [null, /has no items/], [undefined, /has no items/], [[{ title: '50%' }], /no usable value for: text/], [[FACTS.items[0], { title: '20%', text: ' ' }], /no usable value for: text/]]) {
    const { root, parts } = page(LISTED);
    assert.throws(() => fillSections(root, { sections: [{ ...FACTS, items }] }, { imageUrl }), message, JSON.stringify(items));
    assert.deepEqual(parts.facts.list.copies, []);
  }
});

test('an item must have its own title and text: the section\'s are never used in their place', () => {
  const { root } = page([{ name: 'facts', items: ['title', 'text'] }]);
  const section = { name: 'facts', title: 'Some facts', text: 'About the facts.' };
  assert.throws(() => fillSections(root, { sections: [{ ...section, items: [{ text: 'About it.' }] }] }, { imageUrl }), /no usable value for: title/);
  assert.throws(() => fillSections(root, { sections: [{ ...section, items: [{ title: 'First fact' }] }] }, { imageUrl }), /no usable value for: text/);
});

test('fillSections refuses a list the markup gave no template', () => {
  const { root } = page([{ name: 'facts', items: ['title'], template: false }]);
  assert.throws(() => fillSections(root, { sections: [FACTS] }, { imageUrl }), /The facts list has no template/);
});

test('site basics go where the page marks them, and one that opens an app becomes a link', () => {
  const { root, basics } = page([{ name: 'pitch', fields: ['title'] }], [['phone', 'tel'], ['email', 'mailto'], ['address']]);
  fillSections(root, { sections: [PITCH], site: SITE }, { imageUrl });
  assert.equal(basics.phone.textContent, '(555) 010-0000');
  assert.equal(basics.phone.getAttribute('href'), 'tel:5550100000');
  assert.equal(basics.email.textContent, 'hello@example.com');
  assert.equal(basics.email.getAttribute('href'), 'mailto:hello@example.com');
  assert.equal(basics.address.textContent, '1 Example St');
  assert.equal(basics.address.getAttribute('href'), null);
});

test('a phone number keeps its leading plus sign in the link', () => {
  const { root, basics } = page([{ name: 'pitch', fields: ['title'] }], [['phone', 'tel']]);
  fillSections(root, { sections: [PITCH], site: { phone: '+1 (555) 010-0000' } }, { imageUrl });
  assert.equal(basics.phone.getAttribute('href'), 'tel:+15550100000');
});

test('a phone number or email that makes no clean link is shown as plain text', () => {
  const unclean = [
    ['phone', 'tel', '(555) 010-0000 ext. 12'], ['phone', 'tel', '1-800-EXAMPLE'], ['phone', 'tel', '(555) 010-0000 / (555) 010-0001'],
    ['phone', 'tel', 'Call us any time'], ['phone', 'tel', '555'],
    ['email', 'mailto', 'sales#west@example.com'], ['email', 'mailto', 'hello@example.com?cc=other@example.com'], ['email', 'mailto', 'Write to us'],
    ['email', 'mailto', 'hello@example'],
  ];
  for (const [key, opens, value] of unclean) {
    const { root, basics } = page([{ name: 'pitch', fields: ['title'] }], [[key, opens]]);
    basics[key].setAttribute('href', 'left-over');
    fillSections(root, { sections: [PITCH], site: { [key]: value } }, { imageUrl });
    assert.equal(basics[key].textContent, value);
    assert.equal(basics[key].getAttribute('href'), null, value);
  }
});

test('fillSections refuses a page that shows a site basic it was not given, or one that is blank', () => {
  for (const site of [undefined, null, {}, { phone: '' }, { phone: '  ' }, { phone: 5550100000 }, Object.create(SITE)]) {
    const { root, basics } = page([{ name: 'pitch', fields: ['title'] }], [['phone', 'tel']]);
    assert.throws(() => fillSections(root, { sections: [PITCH], site }, { imageUrl }), /The site basics have no phone/);
    assert.equal(basics.phone.getAttribute('href'), null);
  }
});

test('fillSections refuses a kind of link it does not know how to open', () => {
  const { root, basics } = page([{ name: 'pitch', fields: ['title'] }], [['phone', 'sms']]);
  assert.throws(() => fillSections(root, { sections: [PITCH], site: SITE }, { imageUrl }), /Nothing opens a sms link/);
  assert.equal(basics.phone.textContent, '');
});

test('clearSections empties the parts, the image, the lists and the site basics', () => {
  const { root, parts, basics } = page([{ name: 'hero', fields: ['title'], image: true }, { name: 'facts', items: ['title', 'text'] }], [['phone', 'tel']]);
  fillSections(root, { sections: [HERO, FACTS], site: SITE }, { imageUrl });
  clearSections(root);
  assert.equal(parts.hero.marks.title.textContent, '');
  assert.equal(parts.hero.picture.getAttribute('src'), null);
  assert.equal(parts.hero.picture.getAttribute('alt'), '');
  assert.deepEqual(parts.facts.list.copies, []);
  assert.equal(parts.facts.list.children[0].isTemplate, true);
  assert.equal(basics.phone.textContent, '');
  assert.equal(basics.phone.getAttribute('href'), null);
});

test('showPage shows the page when its content loads', async () => {
  const { root, blocks, parts } = page(TWO);
  const reports = [];
  const shown = await showPage({ root, load: async () => ({ sections: [HERO, PITCH] }), imageUrl, report: (...args) => reports.push(args) });
  assert.equal(shown, true);
  assert.deepEqual(showing(blocks), ['ready']);
  assert.equal(parts.pitch.marks.title.textContent, 'Second title');
  assert.deepEqual(reports, []);
});

test('showPage shows the loading block while the content is on its way', async () => {
  const { root, blocks } = page();
  let finish;
  const pending = showPage({ root, load: () => new Promise((resolve) => { finish = resolve; }), imageUrl, report: () => {} });
  assert.deepEqual(showing(blocks), ['loading']);
  finish({ sections: [HERO] });
  await pending;
  assert.deepEqual(showing(blocks), ['ready']);
});

test('showPage shows only the unavailable block when loading fails, and reports why', async () => {
  const { root, blocks, parts } = page();
  const failure = new Error('Flask is down');
  const reports = [];
  const shown = await showPage({ root, load: async () => { throw failure; }, imageUrl, report: (...args) => reports.push(args) });
  assert.equal(shown, false);
  assert.deepEqual(showing(blocks), ['unavailable']);
  assert.equal(parts.hero.marks.title.textContent, '');
  assert.equal(reports[0][1], failure);
});

test('showPage shows no part of a page when something later on it cannot be filled', async () => {
  const sections = [{ name: 'hero', fields: ['title'], image: true }, { name: 'facts', items: ['title', 'text'] }];
  for (const content of [{ sections: [HERO, { ...FACTS, items: [] }], site: SITE }, { sections: [HERO, FACTS] }]) {
    const { root, blocks, parts } = page(sections, [['phone', 'tel']]);
    const shown = await showPage({ root, load: async () => content, imageUrl, report: () => {} });
    assert.equal(shown, false);
    assert.deepEqual(showing(blocks), ['unavailable']);
    assert.equal(parts.hero.marks.title.textContent, '');
    assert.equal(parts.hero.picture.getAttribute('src'), null);
    assert.deepEqual(parts.facts.list.copies, []);
  }
});

test('showPage leaves the unavailable block showing even when the report fails', async () => {
  const { root, blocks } = page();
  const broken = () => { throw new Error('the reporter broke'); };
  await assert.rejects(showPage({ root, load: async () => { throw new Error('Flask is down'); }, imageUrl, report: broken }), /the reporter broke/);
  assert.deepEqual(showing(blocks), ['unavailable']);
});
