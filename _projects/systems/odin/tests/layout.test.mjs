import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const kit = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, kit), 'utf8');
const layout = read('layouts/site.html');
// Every page source, at any depth: Markdown and HTML
const pages = readdirSync(new URL('pages/', kit), { recursive: true })
  .filter((name) => /\.(md|html)$/.test(name)).map((name) => `pages/${name}`);

// The part of a Liquid file a browser gets: without the comments that explain it.
const markup = (text) => text.replace(/\{%-?\s*comment\s*-?%\}[\s\S]*?\{%-?\s*endcomment\s*-?%\}/g, '');
// What is left of markup when its Liquid, its script blocks and its tags are taken out: the words
// written straight into it.
const literalWords = (text) => markup(text)
  .replace(/^---\n[\s\S]*?\n---\n/, '')
  .replace(/<script[\s\S]*?<\/script>/g, '')
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/\{\{[\s\S]*?\}\}|\{%[\s\S]*?%\}/g, '')
  .replace(/<[^>]+>/g, '')
  .replace(/&[a-z]+;/g, '');

test('the layout is a whole document of its own, not a page inside the shared OCS layout', () => {
  assert.ok(!layout.startsWith('---'), 'the layout has front matter, so it sits inside another layout');
  // Nothing but Liquid's own lines comes before the document starts
  assert.match(markup(layout).replace(/\{%-?[\s\S]*?-?%\}/g, ''), /^\s*<!DOCTYPE html>/);
  assert.match(layout, /<html lang="en" class="odin">/);
  assert.match(layout, /<meta charset="utf-8">/);
  assert.match(layout, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
  assert.match(layout, /<main class="odin__main" id="odin-main"[\s>]/);
});

test('the layout loads the OCS stylesheet and the theme script from the site, with the baseurl', () => {
  assert.match(layout, /<link rel="stylesheet" href="\{\{ '\/assets\/css\/style\.css' \| relative_url \}\}">/);
  assert.match(layout, /<script src="\{\{ '\/assets\/js\/user-preferences\.js' \| relative_url \}\}"><\/script>/);
});

test('the layout asks for the typefaces the theme presets name, so a picked theme shows in its own face', () => {
  const presets = readFileSync(new URL('../../../assets/js/user-preferences.js', kit), 'utf8');
  const fonts = layout.match(/fonts\.googleapis\.com\/css2\?([^"]+)"/)[1].replaceAll('+', ' ');
  // The first family each preset names, when it is a web font and not one a computer already has
  const local = ['Georgia', 'system-ui', 'Arial'];
  const named = [...presets.matchAll(/font: "'?([A-Za-z][A-Za-z ]*?)'?,/g)].map((match) => match[1]);
  assert.ok(named.length > 0);
  for (const family of new Set(named.filter((name) => !local.includes(name)))) {
    assert.ok(fonts.includes(`family=${family}:`), `the layout does not load ${family}`);
  }
});

test('the skip link leads to the main part of the page', () => {
  assert.match(layout, /<a class="odin__skip" href="#odin-main">/);
});

test('no markup in the kit styles itself: no style attribute and no style block', () => {
  for (const path of ['layouts/site.html', ...pages]) {
    const text = markup(read(path));
    assert.ok(!/\sstyle\s*=/.test(text), `${path} has a style attribute`);
    assert.ok(!/<style[\s>]/.test(text), `${path} has a style block`);
  }
});

test('no word is written straight into the layout or a page: each comes from the interface file or the backend', () => {
  for (const path of ['layouts/site.html', ...pages]) {
    const words = literalWords(read(path)).match(/[A-Za-z][A-Za-z']+/g) ?? [];
    assert.deepEqual(words, [], `${path} has words of its own`);
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
  for (const path of pages) {
    const text = read(path);
    assert.ok(text.startsWith('---\n'), `${path} does not start with front matter`);
    const frontMatter = text.slice(4, text.indexOf('\n---', 4));
    assert.match(frontMatter, /^layout: projects\/odin\/site$/m, `${path} does not use the ODIN layout`);
    const address = frontMatter.match(/^permalink: (\/\S*)$/m);
    assert.ok(address, `${path} has no permalink`);
    addresses.push(address[1]);
  }
  assert.equal(new Set(addresses).size, addresses.length, 'two pages share an address');
});

test('the layout holds the three states, all hidden until a script shows one', () => {
  const tags = [...markup(layout).matchAll(/<[a-z]+\b[^>]*\bdata-odin-state="[a-z]+"[^>]*>/g)].map((match) => match[0]);
  const state = (tag) => tag.match(/data-odin-state="([a-z]+)"/)[1];
  // The header, then the three states of the page itself, then the footer
  assert.deepEqual(tags.map(state), ['ready', 'loading', 'error', 'ready', 'ready']);
  assert.deepEqual(tags.map((tag) => tag.match(/^<([a-z]+)/)[1]), ['header', 'div', 'div', 'div', 'footer']);
  // With JavaScript off no state shows, and the noscript line says why
  for (const tag of tags) assert.match(tag, /\shidden[\s>]/, `the ${state(tag)} part is not hidden to start with`);
  assert.match(tags[1], /\brole="status"/);
  assert.match(tags[2], /\brole="alert"/);
  assert.match(layout, /<noscript>\s*<p class="odin__status">\{\{ ui\.noscript \| escape \}\}<\/p>\s*<\/noscript>/);
  // The page's own content sits in the ready part, so none of it shows until the backend answers
  assert.match(markup(layout), /data-odin-state="ready" hidden>\s*\{\{ content \}\}\s*<\/div>/);
  const retry = markup(layout).match(/<button\b[^>]*\bdata-odin-retry[^>]*>/)[0];
  assert.match(retry, /\bclass="ocs__btn medium accent fill"/);
  assert.match(retry, /\btype="button"/);
});

test('a plain script shows the loading part and stands in when the modules cannot be loaded', () => {
  const scripts = [...layout.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/g)].filter((match) => match[2].trim() !== '');
  assert.equal(scripts.length, 2);
  const [plain, modules] = scripts;
  assert.ok(!/type="module"/.test(plain[1] ?? ''), 'the first script is a module, which fails with the others');
  assert.match(modules[1], /type="module"/);
  assert.match(plain[2], /part\('loading'\)\.hidden = false;/);
  // It listens on the script right after it, which is the module script
  assert.match(plain[2], /document\.currentScript\.nextElementSibling\.addEventListener\('error'/);
  assert.match(plain[2], /part\('error'\)\.hidden = false;/);
});

test('the page script imports config.js and the odin modules from the site, with the baseurl', () => {
  const imports = [...layout.matchAll(/from '(\{\{ site\.baseurl \}\}[^']+)'/g)].map((match) => match[1]);
  assert.deepEqual(imports, [
    '{{ site.baseurl }}/assets/js/api/config.js',
    '{{ site.baseurl }}/assets/js/projects/odin/content.js',
    '{{ site.baseurl }}/assets/js/projects/odin/page.js',
    '{{ site.baseurl }}/assets/js/projects/odin/tone.js',
  ]);
  // Liquid values reach JavaScript through jsonify
  for (const value of ['page_name', 'site.odin.routes', 'site.baseurl', 'ui.loading', 'ui.error_title']) {
    assert.ok(layout.includes(`{{ ${value} | jsonify }}`), `${value} is not passed through jsonify`);
  }
});

test('the main part can take the keyboard after a retry', () => {
  const main = markup(layout).match(/<main\b[^>]*>/)[0];
  assert.match(main, /\btabindex="-1"/);
  assert.match(main, /\bdata-odin-main\b/);
});

test('every page has an address in _config.yml, and every address there has a page', () => {
  const config = readFileSync(new URL('../../../_config.yml', kit), 'utf8');
  const block = config.match(/^odin:\n(?:(?: {2}.*|)\n)*/m)[0];
  const routes = [...block.slice(block.indexOf('  routes:')).matchAll(/^ {4}([a-z][a-z0-9_]*): "(\/[^"]*)"$/gm)].map((match) => match[2]);
  assert.ok(routes.length > 0);
  const addresses = pages.map((path) => read(path).match(/^permalink: (\/\S*)$/m)[1]);
  assert.deepEqual([...routes].sort(), [...addresses].sort());
});

test('the header and the footer build their menus from the backend, with no link written in', () => {
  const lists = [...markup(layout).matchAll(/<ul\b[^>]*\bdata-odin-each="menu"[^>]*>\s*<template>([\s\S]*?)<\/template>/g)].map((match) => match[1]);
  assert.equal(lists.length, 2);
  for (const template of lists) {
    assert.match(template, /\bdata-odin-route="item\.name"/);
    assert.match(template, /\bdata-odin-text="item\.menu"/);
    assert.ok(!/\bhref=/.test(template), 'a menu link has an address written in');
  }
  // The header's menu marks the page being shown
  assert.match(lists[0], /\bdata-odin-current="item\.current"/);
});

test('the logo links home through the address _config.yml gives the home page', () => {
  assert.match(layout, /<a class="odin__brand" href="\{\{ site\.odin\.routes\.home \| relative_url \}\}">/);
  assert.match(layout, /<img class="odin__logo" data-odin-src="site\.logo_dark" data-odin-alt="site\.name">/);
});

test('every image in the layout and the pages gets its description from the backend', () => {
  for (const path of ['layouts/site.html', ...pages]) {
    for (const [image] of markup(read(path)).matchAll(/<img\b[^>]*>/g)) {
      assert.match(image, /\bdata-odin-src="[a-z_.]+"/, `${path}: ${image} has no source from the backend`);
      assert.match(image, /\bdata-odin-alt="[a-z_.]+"/, `${path}: ${image} has no description from the backend`);
    }
  }
});
