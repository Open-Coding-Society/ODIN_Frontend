import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { SITE_FIELDS } from '../js/content.js';

const system = new URL('../', import.meta.url);
const root = new URL('../../../../', import.meta.url);

// The shared project roots a manifest may publish to, each of which Git ignores (see .gitignore).
const ODIN_FOLDER = /^(navigation|_includes|_layouts|_data|_plugins|_posts|_sass|assets\/js|assets\/css)\/projects\/odin(\/|$)/;

// The one form of import a page uses: named imports, single quotes, the site's baseurl.
const PAGE_IMPORT = /^\s*import \{([^}]*)\} from '\{\{ site\.baseurl \}\}\/([^']+)';$/;

function distribution() {
  return JSON.parse(readFileSync(new URL('distribution.json', system), 'utf8')).files;
}

// The source file behind a published path: this system's own script, a file tracked at that path,
// or a file another system's manifest publishes there.
function sourceOf(path) {
  if (path.startsWith('assets/js/projects/odin/')) return new URL(`js/${path.slice('assets/js/projects/odin/'.length)}`, system);
  if (existsSync(new URL(path, root))) return new URL(path, root);
  const systems = new URL('_projects/systems/', root);
  for (const name of readdirSync(systems)) {
    const manifest = new URL(`${name}/distribution.json`, systems);
    if (!existsSync(manifest)) continue;
    const entry = JSON.parse(readFileSync(manifest, 'utf8')).files.find(({ destination }) => destination === path);
    if (entry) return new URL(`${name}/${entry.source}`, systems);
  }
  return null;
}

test('odin is registered once, as a project that make dev builds', () => {
  const registered = readFileSync(new URL('_projects/.makeprojects', root), 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.split(':')[0] === 'systems/odin');
  assert.deepEqual(registered, ['systems/odin:dev']);
});

test('distribution.json holds a list of files', () => {
  assert.ok(Array.isArray(distribution()), 'files is not a list');
});

test('every odin source in distribution.json exists in the system', () => {
  for (const { source } of distribution()) {
    assert.ok(existsSync(new URL(source, system)), `missing source ${source}`);
  }
});

// A copy published anywhere else could be committed by mistake, or overwrite another system's file.
test('every odin file is published inside an ignored odin project folder', () => {
  for (const { destination } of distribution()) {
    assert.match(destination, ODIN_FOLDER, `${destination} is not inside an odin project folder`);
    assert.ok(!destination.split('/').includes('..'), `${destination} steps out of its folder`);
  }
});

test('each folder is published where the site looks for it', () => {
  const published = Object.fromEntries(distribution().map(({ source, destination }) => [source, destination]));
  assert.deepEqual(published, {
    pages: 'navigation/projects/odin',
    layouts: '_layouts/projects/odin',
    _includes: '_includes/projects/odin',
    js: 'assets/js/projects/odin',
    'sass/main.scss': '_sass/projects/odin/main.scss',
  });
});

// The layout and its pages name each other by these paths, so a rename breaks the build.
test('every page uses the odin layout, and the layout includes the footer that exists', () => {
  for (const name of readdirSync(new URL('pages/', system)).filter((file) => file.endsWith('.md'))) {
    assert.match(readFileSync(new URL(`pages/${name}`, system), 'utf8'), /^layout: projects\/odin\/site$/m, `${name} does not use the odin layout`);
  }
  const layout = readFileSync(new URL('layouts/site.html', system), 'utf8');
  const includes = [...layout.matchAll(/\{%-? include projects\/odin\/([\w.-]+) -?%\}/g)].map(([, file]) => file);
  for (const file of includes) {
    assert.ok(existsSync(new URL(`_includes/${file}`, system)), `the layout includes ${file}, which is not in _includes/`);
  }
  assert.deepEqual(includes, ['footer.html']);
});

// The ODIN layout sits inside the shared OCS layout, which gives every page the OCS head, the top
// bar with the site menu and sign-in, and the page column. A top bar of ODIN's own would be a
// second frame to keep up.
test('the odin layout is built on the shared OCS layout, and adds no top bar of its own', () => {
  const layout = readFileSync(new URL('layouts/site.html', system), 'utf8');
  const [, parent] = layout.match(/^---\nlayout: ([\w/-]+)\n---\n/) || [];
  assert.equal(parent, 'opencs');
  assert.ok(existsSync(new URL(`_layouts/${parent}.html`, root)), `the shared layout ${parent} is not in _layouts/`);
  for (const tag of ['<html', '<head', '<body', '<header', '<main']) {
    assert.ok(!layout.includes(tag), `the odin layout writes its own ${tag}> where the shared layout already has one`);
  }
});

// The shared layout keeps a page in a narrow column unless the page asks for the full width.
test('the three site pages ask the shared layout for the full width', () => {
  for (const name of ['home.md', 'about.md', 'contact.md']) {
    assert.match(readFileSync(new URL(`pages/${name}`, system), 'utf8'), /^full_width: true$/m, `${name} does not ask for the full width`);
  }
});

// The site menu is the OCS one: minima.nav_pages in _config.yml, which the shared top bar loops
// over. Each entry is the published path of a page, so one that names no ODIN page is left out of
// the bar without a word.
test('the site menu in _config.yml lists ODIN pages that exist, with the home page first', () => {
  const config = readFileSync(new URL('_config.yml', root), 'utf8');
  const start = config.indexOf('\n  nav_pages:\n');
  assert.ok(start >= 0, '_config.yml has no minima.nav_pages list');
  // The list is every line indented under nav_pages. One written in a form this test cannot read
  // fails here, so no entry goes unchecked.
  const lines = config.slice(start + '\n  nav_pages:\n'.length).split('\n');
  const entries = lines.slice(0, lines.findIndex((line) => !line.startsWith('    ')));
  assert.ok(entries.length > 0, 'the site menu is empty');
  const paths = entries.map((line) => {
    const [, path] = line.match(/^    - (\S+)$/) || [];
    assert.ok(path, `this test cannot read the menu entry "${line}"`);
    return path;
  });
  const pagesFolder = distribution().find(({ source }) => source === 'pages').destination;
  for (const path of paths) {
    assert.ok(path.startsWith(`${pagesFolder}/`), `the menu entry ${path} is not an ODIN page`);
    const source = new URL(`pages/${path.slice(pagesFolder.length + 1)}`, system);
    assert.ok(existsSync(source), `the menu entry ${path} has no page in pages/`);
    assert.match(readFileSync(source, 'utf8'), /^title: \S/m, `${path} has no title for the menu to show`);
  }
  assert.equal(paths[0], `${pagesFolder}/home.md`);
  assert.ok(paths.length >= 2, 'the site menu lists fewer than two pages');
});

// The footer's menu is a list in _config.yml too, so adding a page never means editing HTML.
test('the footer menu comes from _config.yml, and the footer only loops over it', () => {
  const config = readFileSync(new URL('_config.yml', root), 'utf8');
  const block = config.slice(config.indexOf('\nodin:\n'));
  assert.ok(block.startsWith('\nodin:\n'), '_config.yml has no odin block');
  const items = [...block.matchAll(/^\s+- \{ title: "([^"]+)", url: "([^"]+)" \}$/gm)].map(([, title, url]) => ({ title, url }));
  assert.ok(items.length >= 1, 'the footer menu lists no page');
  for (const { title, url } of items) assert.match(url, /^\/([\w-]+\/)*$/, `${title} has the address ${url}`);

  const footer = readFileSync(new URL('_includes/footer.html', system), 'utf8');
  assert.match(footer, /for item in site\.odin\.footer_nav\.items/);
  for (const { title } of items) assert.ok(!footer.includes(`>${title}<`), `the footer writes the menu item ${title} itself`);
});

// A social link whose field the backend does not send would keep the whole footer part hidden.
test('the footer\'s social links come from _config.yml, each naming a field the backend sends', () => {
  const config = readFileSync(new URL('_config.yml', root), 'utf8');
  const block = config.slice(config.indexOf('\nodin:\n'));
  const links = [...block.matchAll(/^\s+- \{ title: "([^"]+)", field: "([^"]+)" \}$/gm)].map(([, title, field]) => ({ title, field }));
  assert.ok(links.length >= 1, 'the odin block lists no social link');
  for (const { title, field } of links) assert.ok(SITE_FIELDS.includes(field), `${title} names the field ${field}, which is not a site basic`);

  const footer = readFileSync(new URL('_includes/footer.html', system), 'utf8');
  assert.match(footer, /for item in site\.odin\.social/);
  assert.match(footer, /data-odin-href="\{\{ item\.field \}\}"/);
  for (const { title } of links) assert.ok(!footer.includes(`>${title}<`), `the footer writes the social link ${title} itself`);
});

// Two pages with one address would leave it to chance which one the site shows.
test('the ODIN home page is the only page at the site root', () => {
  const home = readFileSync(new URL('pages/home.md', system), 'utf8');
  assert.match(home, /^permalink: \/$/m, 'pages/home.md is not at the site root');
  for (const name of ['index.md', 'index.markdown', 'index.html']) {
    assert.ok(!existsSync(new URL(name, root)), `${name} at the repo root would also claim the site root`);
  }
});

// A misspelled mark makes its page unavailable for every visitor, so the marks are checked here.
const SECTION_PARTS = ['kicker', 'title', 'text', 'action'];
// An item of a list has these two parts
const ITEM_PARTS = ['title', 'text'];
// The sections the backend's pages have, by name. A page may only mark one of these.
const BACKEND_SECTIONS = ['hero', 'statistics', 'features', 'how_it_works', 'pitch', 'fda', 'intro', 'mission', 'details', 'phone', 'email', 'address'];

test('each page has all three state blocks', () => {
  for (const name of readdirSync(new URL('pages/', system)).filter((file) => file.endsWith('.md'))) {
    const markup = readFileSync(new URL(`pages/${name}`, system), 'utf8');
    const states = [...markup.matchAll(/data-odin-state="([^"]+)"/g)].map(([, state]) => state).sort();
    assert.deepEqual(states, ['loading', 'ready', 'unavailable'], `${name} does not have the three state blocks`);
  }
});

test('the pages and the contact block name only parts the backend sends', () => {
  const files = [...readdirSync(new URL('pages/', system)).map((name) => `pages/${name}`), '_includes/contact.html'];
  for (const name of files) {
    const markup = readFileSync(new URL(name, system), 'utf8');
    const marked = (attribute) => [...markup.matchAll(new RegExp(`${attribute}="([^"]+)"`, 'g'))].map(([, value]) => value);
    assert.ok(marked('data-odin-field').length > 0, `${name} marks no field`);
    // Only the connection check shows the site basics as fields. A page built from sections shows
    // them with data-odin-basic, because a field inside a section's element is one of its parts.
    const fields = name === 'pages/connection.md' ? SITE_FIELDS : SECTION_PARTS;
    // An item's own parts are only filled inside a list's template
    const outside = markup.replace(/<template>[\s\S]*?<\/template>/g, '');
    for (const field of [...outside.matchAll(/data-odin-field="([^"]+)"/g)].map(([, value]) => value)) {
      assert.ok(fields.includes(field), `${name} marks the field ${field} outside a list, where it would not be given`);
    }
    // Inside a template only an item's own parts are filled
    const templates = (markup.match(/<template>[\s\S]*?<\/template>/g) || []).join('');
    for (const field of [...templates.matchAll(/data-odin-field="([^"]+)"/g)].map(([, value]) => value)) {
      assert.ok(ITEM_PARTS.includes(field), `${name} marks the field ${field} in a list, where an item has no such part`);
    }
    assert.ok(!/data-odin-(image|href)/.test(templates), `${name} marks an image or a link in a list, which page-view.js does not fill`);
    for (const section of marked('data-odin-section')) {
      assert.ok(BACKEND_SECTIONS.includes(section), `${name} marks the section ${section}, which no backend page has`);
    }
    for (const basic of marked('data-odin-basic')) {
      assert.ok(SITE_FIELDS.includes(basic), `${name} shows the site basic ${basic}, which the backend does not send`);
    }
    for (const opens of marked('data-odin-opens')) {
      assert.ok(['tel', 'mailto'].includes(opens), `${name} asks for a ${opens} link, which page-view.js cannot make`);
    }
    for (const link of marked('data-odin-href')) {
      assert.ok([...SITE_FIELDS, 'link'].includes(link), `${name} marks the link ${link}, which the backend does not send`);
    }
  }
});

// The team asked that the site not list its people.
test('the About page lists no team', () => {
  const about = readFileSync(new URL('pages/about.md', system), 'utf8');
  assert.ok(!about.includes('data-odin-items'), 'pages/about.md holds a list');
  assert.ok(!about.includes('data-odin-section="team"'), 'pages/about.md marks the team section');
});

// A menu entry with no page behind it is a dead link on every page of the site.
test('every page in the footer menu exists, at the address the menu gives', () => {
  const config = readFileSync(new URL('_config.yml', root), 'utf8');
  const block = config.slice(config.indexOf('\nodin:\n'));
  const menu = [...block.matchAll(/^\s+- \{ title: "([^"]+)", url: "([^"]+)" \}$/gm)].map(([, title, url]) => ({ title, url }));
  const permalinks = readdirSync(new URL('pages/', system))
    .map((name) => readFileSync(new URL(`pages/${name}`, system), 'utf8').match(/^permalink: (\S+)$/m)?.[1]);
  // Every entry of the menu must be one this test could read, or a dead link written another way
  // would pass. The social links are entries too, with a field in place of an address.
  const entries = block.slice(0, block.indexOf('\n\n')).split('\n').filter((line) => /^\s+- /.test(line));
  const social = entries.filter((line) => /field: /.test(line));
  assert.equal(menu.length, entries.length - social.length, 'a menu entry is written in a form this test cannot read');
  for (const { title, url } of menu) {
    assert.ok(permalinks.includes(url), `the menu entry ${title} leads to ${url}, which no ODIN page has`);
  }
});

// Two pages with one address would leave it to chance which one the site shows.
test('no two ODIN pages share an address, and the template\'s own About page stays removed', () => {
  const permalinks = readdirSync(new URL('pages/', system))
    .map((name) => readFileSync(new URL(`pages/${name}`, system), 'utf8').match(/^permalink: (\S+)$/m)?.[1]);
  assert.equal(new Set(permalinks).size, permalinks.length, `two ODIN pages share an address: ${permalinks.join(' ')}`);
  assert.ok(!existsSync(new URL('navigation/about.md', root)), 'navigation/about.md would also claim /about/');
});

// Each page asks the backend for its own content. A page that asked for another's would be unavailable.
test('each page loads the backend pages whose sections it shows', () => {
  const loads = (name) => [...readFileSync(new URL(`pages/${name}`, system), 'utf8').matchAll(/content\.(page\('(\w+)'\)|site\(\))/g)]
    .map(([, call, page]) => page ?? 'site').sort();
  assert.deepEqual(loads('home.md'), ['contact', 'home', 'site']);
  assert.deepEqual(loads('about.md'), ['about']);
  assert.deepEqual(loads('contact.md'), ['contact', 'site']);
  for (const name of ['home.md', 'contact.md']) {
    assert.match(readFileSync(new URL(`pages/${name}`, system), 'utf8'), /\{% include projects\/odin\/contact\.html %\}/, `${name} does not include the contact block`);
  }
});

// The hero's button jumps to the contact block, which the home page includes.
test('the home page includes the contact block that its button leads to', () => {
  const home = readFileSync(new URL('pages/home.md', system), 'utf8');
  const block = readFileSync(new URL('_includes/contact.html', system), 'utf8');
  assert.match(home, /href="#contact"/);
  assert.match(home, /\{% include projects\/odin\/contact\.html %\}/);
  assert.match(block, /id="contact"/);
});

// The site is served under a base address (/ODIN_Frontend), so a link printed without it is broken.
test('every link the footer prints goes through relative_url', () => {
  for (const file of ['footer.html']) {
    const markup = readFileSync(new URL(`_includes/${file}`, system), 'utf8');
    // \s keeps data-odin-href out: that one names a field, and the script fills in its address
    const links = [...markup.matchAll(/\shref="([^"]*)"/g)].map(([, address]) => address);
    assert.ok(links.length > 0, `${file} prints no link`);
    for (const address of links) {
      assert.match(address, /^\{\{ .*\| relative_url \}\}$/, `${file} prints the link ${address} without relative_url`);
    }
  }
});

// A page whose import does not resolve stays on its loading message, so check every one: the file
// exists where the page asks for it, and it exports the names the page imports. An import written
// any other way fails here, so it cannot go unchecked.
test('each odin page and layout imports scripts that exist, by names they export', () => {
  const sources = ['pages', 'layouts'].flatMap((folder) => readdirSync(new URL(`${folder}/`, system))
    .filter((name) => name.endsWith('.md') || name.endsWith('.html'))
    .map((name) => `${folder}/${name}`));
  assert.ok(sources.some((name) => name.startsWith('pages/')) && sources.includes('layouts/site.html'), 'no page or layout found');
  for (const name of sources) {
    const lines = readFileSync(new URL(name, system), 'utf8').split('\n').filter((line) => /^\s*import\b/.test(line));
    assert.ok(lines.length > 0, `${name} imports no script`);
    for (const line of lines) {
      const match = line.match(PAGE_IMPORT);
      assert.ok(match, `${name}: this test cannot read the import "${line.trim()}"`);
      const [, list, path] = match;
      const source = sourceOf(path);
      assert.ok(source && existsSync(source), `${name} imports ${path}, which no file or system publishes`);
      const code = readFileSync(source, 'utf8');
      const exported = new Set([...code.matchAll(/^export (?:async )?(?:function|class|const|var|let) (\w+)/gm)].map((found) => found[1]));
      for (const wanted of list.split(',').map((part) => part.trim()).filter(Boolean)) {
        assert.ok(exported.has(wanted), `${name} imports ${wanted} from ${path}, which does not export it`);
      }
    }
  }
});
