import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const kit = new URL('../', import.meta.url);
const root = new URL('../../../../', import.meta.url);

// The folders the publisher accepts as the start of a destination (scripts/publish_project.rb).
const PUBLISHER_ROOTS = readFileSync(new URL('scripts/publish_project.rb', root), 'utf8')
  .match(/DESTINATIONS = %w\[([^\]]+)\]/)[1].trim().split(/\s+/);

function manifest() {
  return JSON.parse(readFileSync(new URL('distribution.json', kit), 'utf8')).files;
}

function configValue(key) {
  const line = readFileSync(new URL('_config.yml', root), 'utf8').split('\n').find((text) => text.startsWith(`${key}:`));
  return line === undefined ? undefined : line.slice(key.length + 1).trim().replace(/^"(.*)"$/, '$1');
}

test('the kit is registered, so make builds it', () => {
  const registered = readFileSync(new URL('_projects/.makeprojects', root), 'utf8')
    .split('\n').map((line) => line.trim());
  assert.ok(registered.includes('systems/odin:dev'), 'systems/odin:dev is not in _projects/.makeprojects');
});

test('the manifest is a list of source and destination pairs', () => {
  const files = manifest();
  assert.ok(Array.isArray(files));
  for (const entry of files) {
    assert.deepEqual(Object.keys(entry).sort(), ['destination', 'source']);
  }
});

test('every source in the manifest exists in the kit', () => {
  for (const { source } of manifest()) {
    assert.ok(existsSync(new URL(source, kit)), `missing source ${source}`);
  }
});

test('every destination is in an odin folder the publisher accepts and Git ignores', () => {
  for (const { destination } of manifest()) {
    const [first, ...rest] = destination.split('/');
    assert.ok(PUBLISHER_ROOTS.includes(first), `${destination} does not start with a publisher folder`);
    assert.ok(`/${rest.join('/')}/`.includes('/projects/odin/'), `${destination} is not inside a projects/odin folder`);
  }
});

test('the site config names this site and its repository', () => {
  assert.equal(configValue('title'), 'ODIN Diagnostics');
  assert.equal(configValue('github_repo'), 'ODIN_Frontend');
  assert.equal(configValue('baseurl'), '/ODIN_Frontend');
});
