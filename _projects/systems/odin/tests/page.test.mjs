import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ContentUnavailableError } from '../js/content.js';
import { pageContext, showPage, showState, siteRoutes, startPage } from '../js/page.js';
import { fakeDocument, h } from './fake-dom.mjs';

const SITE = { name: 'ODIN Diagnostics', phone: '(805) 300-1100' };
const PAGES = [
  { name: 'home', title: 'ODIN Diagnostics', description: 'One line.', menu: 'Home' },
  { name: 'about', title: 'About', description: null, menu: 'About' },
  { name: 'terms', title: 'Terms', description: null, menu: null },
  { name: 'pricing', title: 'Pricing', description: null, menu: 'Pricing' },
];
const HOME = { title: 'ODIN Diagnostics', description: 'One line.', sections: [{ name: 'hero', title: 'ODIN' }] };
const ROUTES = { home: '/', about: '/about/', terms: '/terms/' };
const TITLES = { loading: 'Loading', error: 'Cannot load' };

// A page with the three states, a title filled from the content and a retry button.
function page() {
  const title = h('h1', { 'data-odin-text': 'sections.hero.title' });
  const loading = h('div', { 'data-odin-state': 'loading' }, 'Loading');
  const retry = h('button', { 'data-odin-retry': '' }, 'Try again');
  const error = h('div', { 'data-odin-state': 'error', hidden: '' }, retry);
  const header = h('header', { 'data-odin-state': 'ready', hidden: '' }, h('a', { 'data-odin-text': 'site.name' }));
  const ready = h('div', { 'data-odin-state': 'ready', hidden: '' }, title);
  const document = fakeDocument(h('body', {}, header, loading, error, ready));
  return { document, title, loading, error, header, ready, retry };
}

// Content that answers with these values. A value that is an Error is thrown.
function contentOf({ site = SITE, pages = PAGES, home = HOME } = {}) {
  const give = (value) => async () => {
    if (value instanceof Error) throw value;
    return value;
  };
  return { site: give(site), pages: give(pages), page: give(home), imageUrl: (file) => `image:${file}` };
}

test('showState shows the parts of one state and hides the rest', () => {
  const { document, loading, error, header, ready } = page();
  showState(document.documentElement, 'ready');
  assert.deepEqual([loading.hidden, error.hidden, header.hidden, ready.hidden], [true, true, false, false]);
  showState(document.documentElement, 'error');
  assert.deepEqual([loading.hidden, error.hidden, header.hidden, ready.hidden], [true, false, true, true]);
});

test('showState refuses a state it does not know and a page that lacks a part for one', () => {
  const { document } = page();
  assert.throws(() => showState(document.documentElement, 'done'), /Unknown page state/);
  const partial = fakeDocument(h('div', { 'data-odin-state': 'loading' }), h('div', { 'data-odin-state': 'ready' }));
  assert.throws(() => showState(partial.documentElement, 'loading'), /no part for: error/);
});

test('siteRoutes puts the baseurl before each page\'s path', () => {
  assert.deepEqual(siteRoutes({ home: '/', about: '/about/' }, '/ODIN_Frontend'), { home: '/ODIN_Frontend/', about: '/ODIN_Frontend/about/' });
  assert.deepEqual(siteRoutes({ home: '/' }, ''), { home: '/' });
});

test('the menu is the pages that have menu words and an address here, in the backend\'s order', () => {
  const context = pageContext({ site: SITE, pages: PAGES, page: HOME, name: 'about', routes: ROUTES });
  assert.deepEqual(context.menu.map((entry) => [entry.name, entry.menu, entry.current]), [['home', 'Home', false], ['about', 'About', true]]);
});

test('the tab names the page and then the site, or only the site when they are the same', () => {
  const tab = (title) => pageContext({ site: SITE, pages: PAGES, page: { ...HOME, title }, name: 'home', routes: ROUTES }).page.tab;
  assert.equal(tab('ODIN Diagnostics'), 'ODIN Diagnostics');
  assert.equal(tab('About'), 'About | ODIN Diagnostics');
  assert.equal(tab(null), 'ODIN Diagnostics');
});

test('sections are read by name, and two with one name are refused', () => {
  const context = pageContext({ site: SITE, pages: PAGES, page: HOME, name: 'home', routes: ROUTES });
  assert.equal(context.sections.hero.title, 'ODIN');
  const twice = { ...HOME, sections: [{ name: 'hero' }, { name: 'hero' }] };
  assert.throws(() => pageContext({ site: SITE, pages: PAGES, page: twice, name: 'home', routes: ROUTES }), /two sections named hero/);
});

test('showPage writes the content, names the tab and shows the ready parts', async () => {
  const { document, title, loading, error, header, ready } = page();
  const shown = await showPage({ document, content: contentOf(), name: 'home', routes: ROUTES, titles: TITLES });
  assert.equal(shown, true);
  assert.equal(title.textContent, 'ODIN');
  assert.equal(header.textContent, 'ODIN Diagnostics');
  assert.equal(document.title, 'ODIN Diagnostics');
  assert.deepEqual([loading.hidden, error.hidden, header.hidden, ready.hidden], [true, true, false, false]);
});

test('while the content is on its way, only the loading part shows and the tab says so', async () => {
  const { document, loading, error, ready } = page();
  let release;
  const content = { ...contentOf(), site: () => new Promise((resolve) => { release = () => resolve(SITE); }) };
  const showing = showPage({ document, content, name: 'home', routes: ROUTES, titles: TITLES });
  assert.deepEqual([loading.hidden, error.hidden, ready.hidden], [false, true, true]);
  assert.equal(document.title, 'Loading');
  release();
  assert.equal(await showing, true);
});

test('when the backend cannot be reached, only the error part shows and no content is written', async () => {
  for (const broken of [{ site: new ContentUnavailableError('down') }, { pages: new ContentUnavailableError('down') },
    { home: new ContentUnavailableError('down') }]) {
    const { document, title, loading, error, header, ready } = page();
    const reports = [];
    const shown = await showPage({ document, content: contentOf(broken), name: 'home', routes: ROUTES, titles: TITLES,
      report: (...parts) => reports.push(parts) });
    assert.equal(shown, false);
    assert.deepEqual([loading.hidden, error.hidden, header.hidden, ready.hidden], [true, false, true, true]);
    assert.equal(title.textContent, '');
    assert.equal(header.textContent, '');
    assert.equal(document.title, 'Cannot load');
    assert.equal(reports.length, 1);
    assert.ok(reports[0][1] instanceof ContentUnavailableError);
  }
});

test('content that lacks a value the page asks for is an error too, with nothing written', async () => {
  const { document, title, error, header } = page();
  const home = { ...HOME, sections: [{ name: 'hero', title: null }] };
  const shown = await showPage({ document, content: contentOf({ home }), name: 'home', routes: ROUTES, titles: TITLES, report: () => {} });
  assert.equal(shown, false);
  assert.equal(error.hidden, false);
  assert.equal(title.textContent, '');
  assert.equal(header.textContent, '');
});

test('the retry button loads the page again, and a backend that is back shows it', async () => {
  const { document, title, error, ready, retry } = page();
  let down = true;
  const working = contentOf();
  const content = { ...working, site: async () => { if (down) throw new ContentUnavailableError('down'); return SITE; } };
  assert.equal(await startPage({ document, content, name: 'home', routes: ROUTES, titles: TITLES, report: () => {} }), false);
  assert.equal(error.hidden, false);
  down = false;
  await retry.click();
  assert.deepEqual([error.hidden, ready.hidden], [true, false]);
  assert.equal(title.textContent, 'ODIN');
  assert.equal(document.title, 'ODIN Diagnostics');
});
