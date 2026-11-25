import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const root = new URL('../../../../', import.meta.url);
const config = readFileSync(new URL('_config.yml', root), 'utf8');

// The entries of the exclude list in _config.yml, without quotes.
function excluded() {
  const block = config.match(/^exclude:\n((?: {2}.*\n)+)/m);
  assert.ok(block, '_config.yml has no exclude list');
  return block[1].split('\n').map((line) => line.match(/^ {2}- "?([^"#]+?)"?\s*$/)).filter(Boolean).map((match) => match[1]);
}

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
  const kept = ['assets', 'navigation', '_config.yml'];
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
  for (const name of names('assets/css').filter((entry) => entry !== 'projects')) {
    assert.ok(excluded().includes(`assets/css/${name}`), `assets/css/${name} would be published`);
  }
});

test('under navigation, only ODIN\'s pages are published', () => {
  for (const name of names('navigation').filter((entry) => entry !== 'projects')) {
    assert.ok(excluded().includes(`navigation/${name}`), `navigation/${name} would be published`);
  }
});

test('the scripts the layout loads are not excluded', () => {
  for (const entry of ['assets', 'assets/js', 'assets/css', 'assets/js/api', 'assets/js/api/config.js', 'assets/js/user-preferences.js',
    'assets/js/projects', 'navigation', 'navigation/projects']) {
    assert.ok(!excluded().includes(entry), `${entry} is excluded, and the site needs it`);
  }
});
