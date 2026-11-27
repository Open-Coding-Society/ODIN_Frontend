import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const root = new URL('../../../../', import.meta.url);
const config = readFileSync(new URL('_config.yml', root), 'utf8');

// The entries of the exclude list in _config.yml, without quotes.
function excluded() {
  const block = config.match(/^exclude:\n((?: {2}.*\n)+)/m);
  assert.ok(block, '_config.yml has no exclude list');
  const entries = [];
  for (const line of block[1].split('\n').filter((text) => text.trim() !== '' && !text.trim().startsWith('#'))) {
    // One entry to a line, bare or in double quotes, with nothing after it
    const entry = line.match(/^ {2}- (?:"([^"]+)"|([^\s"'#]+))$/);
    assert.ok(entry, `the exclude list has a line this test cannot read: ${line}`);
    entries.push(entry[1] ?? entry[2]);
  }
  return entries;
}

// Jekyll leaves a path out when an entry names it or names a folder above it, and also when the
// path merely starts with the entry's letters.
const leftOut = (path) => excluded().some((entry) => path === entry || path.startsWith(entry));

const names = (path) => readdirSync(new URL(path, root));

test('odin is the only project the build publishes', () => {
  const registered = readFileSync(new URL('_projects/.makeprojects', root), 'utf8')
    .split('\n').map((line) => line.trim()).filter((line) => line !== '' && !line.startsWith('#'));
  assert.deepEqual(registered, ['systems/odin:dev']);
});

test('the exclude list keeps the defaults Jekyll would use without one', () => {
  for (const entry of ['Gemfile', 'Gemfile.lock', 'node_modules', 'vendor/bundle/', 'vendor/cache/', 'vendor/gems/', 'vendor/ruby/']) {
    assert.ok(excluded().includes(entry), `${entry} is not excluded`);
  }
});

test('no page or folder at the top of the repo is published but the built site itself', () => {
  // Folders that start with an underscore or a dot are never published. assets holds the
  // stylesheet and scripts, and navigation holds ODIN's pages.
  // vendor is where a bundler cache goes: Jekyll's own defaults name the folders inside it.
  const kept = ['assets', 'navigation', 'vendor'];
  for (const name of names('.').filter((entry) => !/^[._]/.test(entry) && !kept.includes(entry))) {
    assert.ok(excluded().includes(name), `${name} at the top of the repo would be published`);
  }
});

test('of the template\'s scripts, only config.js and the theme script are published', () => {
  for (const name of names('assets/js').filter((entry) => !['api', 'projects', 'user-preferences.js'].includes(entry))) {
    assert.ok(excluded().includes(`assets/js/${name}`), `assets/js/${name} would be published`);
  }
  for (const name of names('assets/js/api').filter((entry) => entry !== 'config.js')) {
    assert.ok(excluded().includes(`assets/js/api/${name}`), `assets/js/api/${name} would be published`);
  }
});

test('of assets, only the stylesheets and scripts ODIN uses are published', () => {
  for (const name of names('assets').filter((entry) => !['css', 'js'].includes(entry))) {
    assert.ok(excluded().includes(`assets/${name}`), `assets/${name} would be published`);
  }
  // The one stylesheet comes from the theme, so nothing in assets/css is published
  for (const name of names('assets/css')) {
    assert.ok(excluded().includes(`assets/css/${name}`), `assets/css/${name} would be published`);
  }
});

test('under navigation, only ODIN\'s pages are published', () => {
  for (const name of names('navigation').filter((entry) => entry !== 'projects')) {
    assert.ok(excluded().includes(`navigation/${name}`), `navigation/${name} would be published`);
  }
});

test('nothing the site needs is left out, by its own name or by an entry it starts with', () => {
  const needed = ['assets/js/api/config.js', 'assets/js/user-preferences.js', 'assets/js/projects/odin/page.js',
    'assets/js/projects/odin/content.js', 'assets/js/projects/odin/bind.js', 'assets/js/projects/odin/tone.js',
    'navigation/projects/odin/home.md', '_layouts/projects/odin/site.html', '_data/projects/odin/ui.yml', '_sass/projects/odin/main.scss'];
  for (const path of needed) {
    const by = excluded().find((entry) => path === entry || path.startsWith(entry));
    assert.equal(by, undefined, `${path} is left out by the entry ${by}`);
  }
  assert.ok(leftOut('assets/js/api/logout.js'));
});

test('a kit that is no longer registered has left no copy behind to be published', () => {
  // These folders are where kits publish. Git ignores them, so a used clone can hold old copies
  for (const folder of ['navigation/projects', 'assets/js/projects', '_sass/projects', '_layouts/projects', '_data/projects', '_plugins/projects']) {
    let held;
    try {
      held = names(folder);
    } catch {
      continue; // not built yet on this machine
    }
    const others = held.filter((entry) => entry !== 'odin' && entry !== '_all.scss');
    assert.deepEqual(others, [], `${folder} holds copies from another kit: remove them as the README says`);
  }
});
