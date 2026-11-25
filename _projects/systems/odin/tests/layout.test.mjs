import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const kit = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, kit), 'utf8');
const layout = read('layouts/site.html');
const pages = readdirSync(new URL('pages/', kit)).filter((name) => name.endsWith('.md'));

// The part of a Liquid file a browser gets: without the comments that explain it.
const markup = (text) => text.replace(/\{%-?\s*comment\s*-?%\}[\s\S]*?\{%-?\s*endcomment\s*-?%\}/g, '');

test('the layout is a whole document of its own, not a page inside the shared OCS layout', () => {
  assert.ok(!layout.startsWith('---'), 'the layout has front matter, so it sits inside another layout');
  // Nothing but Liquid's own lines comes before the document starts
  assert.match(markup(layout).replace(/\{%-?[\s\S]*?-?%\}/g, ''), /^\s*<!DOCTYPE html>/);
  assert.match(layout, /<html lang="en">/);
  assert.match(layout, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
  assert.match(layout, /<body class="odin">/);
  assert.match(layout, /<main class="odin__main" id="odin-main">/);
});

test('the layout loads the OCS stylesheet and the theme script from the site, with the baseurl', () => {
  assert.match(layout, /<link rel="stylesheet" href="\{\{ '\/assets\/css\/style\.css' \| relative_url \}\}">/);
  assert.match(layout, /<script src="\{\{ '\/assets\/js\/user-preferences\.js' \| relative_url \}\}"><\/script>/);
});

test('the skip link leads to the main part of the page', () => {
  assert.match(layout, /<a class="odin__skip" href="#odin-main">/);
});

test('no markup in the kit styles itself: no style attribute and no style block', () => {
  for (const path of ['layouts/site.html', ...pages.map((name) => `pages/${name}`)]) {
    const text = markup(read(path));
    assert.ok(!/\sstyle\s*=/.test(text), `${path} has a style attribute`);
    assert.ok(!/<style[\s>]/.test(text), `${path} has a style block`);
  }
});

test('every word the layout prints is read from the interface file, which has it', () => {
  const ui = read('data/ui.yml');
  const keys = [...layout.matchAll(/\{\{\s*ui\.([a-z_]+)/g)].map((match) => match[1]);
  assert.ok(keys.length > 0);
  for (const key of keys) {
    assert.match(ui, new RegExp(`^${key}: ".+"$`, 'm'), `data/ui.yml has no ${key}`);
  }
});

test('every page starts with front matter that names the ODIN layout and its own address', () => {
  assert.ok(pages.length > 0);
  const addresses = [];
  for (const name of pages) {
    const text = read(`pages/${name}`);
    assert.ok(text.startsWith('---\n'), `${name} does not start with front matter`);
    const frontMatter = text.slice(4, text.indexOf('\n---', 4));
    assert.match(frontMatter, /^layout: projects\/odin\/site$/m, `${name} does not use the ODIN layout`);
    const address = frontMatter.match(/^permalink: (\/\S*)$/m);
    assert.ok(address, `${name} has no permalink`);
    addresses.push(address[1]);
  }
  assert.equal(new Set(addresses).size, addresses.length, 'two pages share an address');
});
