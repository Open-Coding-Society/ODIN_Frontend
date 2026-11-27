import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const kit = new URL('../', import.meta.url);
const root = new URL('../../../../', import.meta.url);

function manifest() {
  return JSON.parse(readFileSync(new URL('distribution.json', kit), 'utf8')).files;
}

test('the kit is registered, so make builds it', () => {
  const registered = readFileSync(new URL('_projects/.makeprojects', root), 'utf8')
    .split('\n').map((line) => line.trim().split(':')[0]);
  assert.ok(registered.includes('systems/odin'), 'systems/odin is not in _projects/.makeprojects');
});

test('the manifest is a list of source and destination pairs', () => {
  const files = manifest();
  assert.ok(Array.isArray(files));
  for (const entry of files) {
    assert.deepEqual(Object.keys(entry).sort(), ['destination', 'source']);
  }
});

test('every source in the manifest is a path inside the kit that exists', () => {
  for (const { source } of manifest()) {
    assert.ok(!source.split('/').includes('..'), `${source} leaves the kit`);
    assert.ok(existsSync(new URL(source, kit)), `missing source ${source}`);
  }
});

test('every destination starts with a folder the publisher accepts', () => {
  // The folders scripts/publish_project.rb accepts as the start of a destination
  const publisher = readFileSync(new URL('scripts/publish_project.rb', root), 'utf8');
  const accepted = publisher.match(/DESTINATIONS = %w\[([^\]]+)\]/);
  assert.ok(accepted, 'DESTINATIONS was not found in scripts/publish_project.rb');
  const folders = accepted[1].trim().split(/\s+/);
  for (const { destination } of manifest()) {
    assert.ok(folders.includes(destination.split('/')[0]), `${destination} does not start with a publisher folder`);
  }
});

test('every destination is an odin folder that Git ignores, so copies are never committed', () => {
  const ignored = readFileSync(new URL('.gitignore', root), 'utf8').split('\n').map((line) => line.trim())
    .filter((line) => line.endsWith('/') && !line.startsWith('#'));
  for (const { destination } of manifest()) {
    assert.ok(destination.split('/').includes('odin'), `${destination} is not an odin folder`);
    // A line that starts with a slash matches from the repo root; any other matches at any depth
    const covered = ignored.some((line) => (line.startsWith('/')
      ? `/${destination}/`.startsWith(line)
      : `/${destination}/`.includes(`/${line}`)));
    assert.ok(covered, `${destination} is not ignored by .gitignore`);
  }
});
