import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ContentUnavailableError, createContent } from '../js/content.js';

const BASE = 'http://localhost:8587';

// A fetch that answers each address with what `answers` holds for it: a value is sent as JSON
// with status 200, a number is sent as that status, and a function is called.
function fakeFetch(answers) {
  const calls = [];
  const fetch = async (url, options) => {
    calls.push({ url, options });
    const answer = answers[url];
    if (typeof answer === 'function') return answer(options);
    if (typeof answer === 'number') return { ok: false, status: answer, json: async () => ({ message: 'no' }) };
    if (answer === undefined) throw new TypeError('Failed to fetch');
    return { ok: true, status: 200, json: async () => answer };
  };
  return { fetch, calls };
}

// Made-up content in the shape the backend sends. None of it is ODIN's.
const SITE = { name: 'Example Site', phone: '555 0100' };
const PAGES = { pages: [{ name: 'home', title: 'Example Site', description: null, menu: 'Home' }] };
const HOME = { page: 'home', title: 'Example Site', description: 'One line.', sections: [{ name: 'hero', title: 'Example' }] };

function contentWith(answers, options = {}) {
  const { fetch, calls } = fakeFetch(answers);
  return { content: createContent({ baseUrl: BASE, fetch, ...options }), calls };
}

test('site, pages and page each ask the backend at their own address and return what it sent', async () => {
  const { content, calls } = contentWith({
    [`${BASE}/api/odin/site`]: SITE,
    [`${BASE}/api/odin/pages`]: PAGES,
    [`${BASE}/api/odin/page?name=home`]: HOME,
  });
  assert.deepEqual(await content.site(), SITE);
  assert.deepEqual(await content.pages(), PAGES.pages);
  assert.deepEqual(await content.page('home'), { title: HOME.title, description: HOME.description, sections: HOME.sections });
  assert.deepEqual(calls.map((call) => call.url), Object.keys({
    [`${BASE}/api/odin/site`]: 0, [`${BASE}/api/odin/pages`]: 0, [`${BASE}/api/odin/page?name=home`]: 0,
  }));
});

test('each request is a plain public GET: no login cookie, no extra headers, and a signal that can end it', async () => {
  const { content, calls } = contentWith({ [`${BASE}/api/odin/site`]: SITE });
  await content.site();
  const { signal, ...options } = calls[0].options;
  assert.deepEqual(options, { method: 'GET', mode: 'cors', credentials: 'omit' });
  assert.ok(signal instanceof AbortSignal);
});

test('a page name is encoded into the address', async () => {
  const { content, calls } = contentWith({});
  await assert.rejects(content.page('a b&c'), ContentUnavailableError);
  assert.equal(calls[0].url, `${BASE}/api/odin/page?name=a%20b%26c`);
});

test('a backend that cannot be reached is unavailable content, with the request error as the cause', async () => {
  const { content } = contentWith({});
  await assert.rejects(content.site(), (error) => {
    assert.ok(error instanceof ContentUnavailableError);
    assert.equal(error.name, 'ContentUnavailableError');
    assert.ok(error.cause instanceof TypeError);
    return true;
  });
});

test('an answer that is not 200 is unavailable content', async () => {
  const { content } = contentWith({ [`${BASE}/api/odin/site`]: 404, [`${BASE}/api/odin/page?name=missing`]: 404 });
  await assert.rejects(content.site(), ContentUnavailableError);
  await assert.rejects(content.page('missing'), ContentUnavailableError);
});

test('an answer that is not JSON is unavailable content', async () => {
  const { content } = contentWith({
    [`${BASE}/api/odin/site`]: () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('Unexpected token <'); } }),
  });
  await assert.rejects(content.site(), ContentUnavailableError);
});

test('a backend that never answers is given up on after the time limit, and the request is ended', async () => {
  let ended = false;
  const { content } = contentWith({
    [`${BASE}/api/odin/site`]: (options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => { ended = true; reject(new Error('aborted')); });
    }),
  }, { timeLimitMs: 10 });
  await assert.rejects(content.site(), ContentUnavailableError);
  assert.ok(ended, 'the request was left running');
});

test('site basics that are not an object, or have no name for the tab, are unavailable content', async () => {
  for (const answer of [null, 'Example', ['Example'], {}, { name: '  ' }, { name: 7 }]) {
    const { content } = contentWith({ [`${BASE}/api/odin/site`]: () => ({ ok: true, status: 200, json: async () => answer }) });
    await assert.rejects(content.site(), ContentUnavailableError);
  }
});

test('a page list that is missing, empty or holds a page without a name or title is unavailable content', async () => {
  const bad = [{}, { pages: [] }, { pages: 'home' }, { pages: [{ title: 'No name' }] }, { pages: [{ name: 'home' }] },
    { pages: [{ name: 'home', title: '  ' }] }, { pages: [null] }];
  for (const answer of bad) {
    const { content } = contentWith({ [`${BASE}/api/odin/pages`]: answer });
    await assert.rejects(content.pages(), ContentUnavailableError, JSON.stringify(answer));
  }
});

test('a page without a list of named sections is unavailable content', async () => {
  const bad = [{}, { sections: [] }, { sections: {} }, { sections: [{ title: 'No name' }] }, { sections: [null] }];
  for (const answer of bad) {
    const { content } = contentWith({ [`${BASE}/api/odin/page?name=home`]: answer });
    await assert.rejects(content.page('home'), ContentUnavailableError, JSON.stringify(answer));
  }
});

test('an image address names the file, encoded, at the backend', () => {
  const { content, calls } = contentWith({});
  assert.equal(content.imageUrl('logo-dark.svg'), `${BASE}/api/odin/image?name=logo-dark.svg`);
  assert.equal(content.imageUrl('a b&c.png'), `${BASE}/api/odin/image?name=a%20b%26c.png`);
  assert.equal(calls.length, 0);
});
