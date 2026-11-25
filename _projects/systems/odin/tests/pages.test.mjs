import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

import { lookup } from '../js/bind.js';

const kit = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, kit), 'utf8');

// What the backend sends, by name only: the keys of the site basics, and for each page its
// sections with the parts each one has (ODIN_Backend, model/dataconfigs). A page that asks for
// a part not listed here would show the error state, so a misspelled path fails this test first.
const SITE = ['name', 'tagline', 'phone', 'email', 'address', 'copyright', 'instagram', 'linkedin', 'logo_dark', 'logo_light',
  'icon', 'notice_title', 'notice'];
const PAGES = {
  home: { hero: ['kicker', 'title', 'text', 'action', 'image', 'image_alt'], statistics: ['title', 'text', 'items'], pitch: ['title', 'text'] },
  how_it_works: { how_it_works: ['text', 'image', 'image_alt'], features: ['image', 'image_alt', 'items'] },
  about: { mission: ['text', 'image', 'image_alt'] },
  contact: { intro: ['text'], phone: ['title'], email: ['title'], address: ['title'], evonexus: ['image', 'image_alt', 'image_link'] },
  not_found: { message: ['title', 'text', 'action'] },
};
const ITEM = ['title', 'text'];
const MENU_ITEM = ['name', 'title', 'description', 'menu', 'current'];

// Content in that shape, with the path itself as each value.
function contextFor(page) {
  const record = (keys, prefix) => Object.fromEntries(keys.map((key) => [key, `${prefix}.${key}`]));
  const sections = {};
  for (const [name, parts] of Object.entries(PAGES[page])) {
    sections[name] = record(parts, `sections.${name}`);
    if (parts.includes('items')) sections[name].items = [record(ITEM, 'item')];
  }
  return {
    site: record(SITE, 'site'),
    page: record(['name', 'title', 'description', 'tab'], 'page'),
    menu: [record(MENU_ITEM, 'item')],
    // As the page context builds it: only the pages with an address here
    pages: Object.fromEntries(routedNames().map((name) => [name, record(['name', 'title', 'description', 'menu'], `pages.${name}`)])),
    sections,
  };
}

// Every path a file's marks ask for, as [mark, path].
function paths(text) {
  return [...text.matchAll(/\bdata-odin-(text|paragraphs|src|alt|content|href|tel|mail|route|current|if|each)="([^"]+)"/g)]
    .map((match) => [match[1], match[2]]);
}

// Each page's address in _config.yml, as [address, name].
function routes() {
  const config = readFileSync(new URL('../../../_config.yml', kit), 'utf8');
  return [...config.matchAll(/^ {4}([a-z][a-z0-9_]*): "(\/[^"]*)"$/gm)].map((match) => [match[2], match[1]]);
}

function routedNames() {
  return routes().map(([, name]) => name);
}

// The backend's name for each page file: the name _config.yml lists at the file's address.
function pageNames() {
  const byAddress = Object.fromEntries(routes());
  const names = {};
  for (const file of readdirSync(new URL('pages/', kit), { recursive: true }).filter((name) => /\.(md|html)$/.test(name))) {
    const address = read(`pages/${file}`).match(/^permalink: (\/\S*)$/m)[1];
    names[`pages/${file}`] = byAddress[address];
  }
  return names;
}

function assertPathsExist(file, context) {
  const found = paths(read(file));
  for (const [mark, path] of found) {
    // An item's parts are checked against the shape of one item of the list it is in
    const from = path.startsWith('item.') ? { item: { ...Object.fromEntries(ITEM.map((key) => [key, key])), ...Object.fromEntries(MENU_ITEM.map((key) => [key, key])) } } : context;
    assert.notEqual(lookup(from, path), undefined, `${file}: data-odin-${mark}="${path}" is not something the backend sends`);
    if (mark === 'each') assert.ok(Array.isArray(lookup(context, path)), `${file}: ${path} is not a list`);
  }
  return found.length;
}

test('every page file shows a page the backend has', () => {
  const names = pageNames();
  assert.ok(Object.keys(names).length > 0);
  for (const [file, name] of Object.entries(names)) {
    assert.ok(Object.hasOwn(PAGES, name), `${file} is at an address _config.yml gives to ${name}, which the backend does not have`);
  }
});

test('every path a page asks for is a part the backend sends for that page', () => {
  for (const [file, name] of Object.entries(pageNames())) {
    assert.ok(assertPathsExist(file, contextFor(name)) > 0, `${file} asks the backend for nothing`);
  }
});

test('every path the layout asks for is in the site basics, the page details or the menu, on every page', () => {
  for (const name of Object.keys(PAGES)) assertPathsExist('layouts/site.html', contextFor(name));
});

// One element's opening tag in a file, by a class it carries.
function tagWith(file, className) {
  const found = read(file).match(new RegExp(`<[a-z]+\\b[^>]*\\bclass="[^"]*\\b${className}\\b[^"]*"[^>]*>`));
  assert.ok(found, `${file} has no element with the class ${className}`);
  return found[0];
}

test('the home page\'s button leads to the contact page, with the backend\'s words, and only when both are there', () => {
  const home = read('pages/home.md');
  assert.match(home, /<p data-odin-if="pages\.contact"><a class="ocs__btn large accent fill"[^>]*>/);
  const button = tagWith('pages/home.md', 'ocs__btn');
  assert.match(button, /\bdata-odin-route="pages\.contact\.name"/);
  assert.match(button, /\bdata-odin-text="sections\.hero\.action"/);
  assert.match(button, /\bdata-odin-if="sections\.hero\.action"/);
});

test('the home page\'s link on leads to the how it works page with that page\'s menu words, when it has them', () => {
  const home = read('pages/home.md');
  const onward = tagWith('pages/home.md', 'odin__onward');
  assert.match(onward, /\bdata-odin-if="pages\.how_it_works\.menu"/);
  assert.match(home, /<a data-odin-route="pages\.how_it_works\.name" data-odin-text="pages\.how_it_works\.menu"><\/a>/);
});

test('a figure is the name of its fact and what it counts is the fact, so both are read in that order', () => {
  const home = read('pages/home.md');
  assert.match(home, /<dt data-odin-text="item\.title"><\/dt>\s*<dd data-odin-text="item\.text"><\/dd>/);
});

test('a part a section may not have is guarded, so the page shows without it', () => {
  for (const file of Object.keys(pageNames())) {
    for (const [tag] of read(file).matchAll(/<[a-z]+\b[^>]*\bdata-odin-text="sections\.[a-z_]+\.(kicker|action)"[^>]*>/g)) {
      assert.match(tag, /\bdata-odin-if="sections\.[a-z_]+\.(kicker|action)"/, `${file}: ${tag} is not guarded`);
    }
  }
});
