import assert from 'node:assert/strict';
import { test } from 'node:test';

import { channels, toneOf, watchTone } from '../js/tone.js';
import { h } from './fake-dom.mjs';

test('channels reads the colour forms a browser reports', () => {
  assert.deepEqual(channels('rgb(255, 0, 51)'), [1, 0, 0.2]);
  assert.deepEqual(channels('rgba(0, 0, 0, 0.5)'), [0, 0, 0]);
  assert.deepEqual(channels('rgb(255 255 255)'), [1, 1, 1]);
  assert.deepEqual(channels('color(srgb 0.5 0.25 1)'), [0.5, 0.25, 1]);
  assert.equal(channels('transparent'), null);
  assert.equal(channels(''), null);
});

test('toneOf calls the grounds of the theme presets light or dark', () => {
  const light = ['rgb(255, 255, 255)', 'rgb(244, 236, 216)', 'color(srgb 0.96 0.96 0.96)'];
  const dark = ['rgb(18, 18, 18)', 'rgb(11, 18, 32)', 'rgb(21, 71, 52)', 'rgb(42, 20, 51)', 'rgb(10, 10, 15)'];
  assert.deepEqual(light.map(toneOf), light.map(() => 'light'));
  assert.deepEqual(dark.map(toneOf), dark.map(() => 'dark'));
});

test('a colour that cannot be read counts as light', () => {
  assert.equal(toneOf('transparent'), 'light');
});

// A stand-in for MutationObserver that keeps what it was asked to watch and can be fired by hand.
function fakeObserver() {
  const made = [];
  class Observer {
    constructor(callback) {
      this.callback = callback;
      this.watching = null;
      made.push(this);
    }

    observe(target, options) {
      this.watching = { target, options };
    }

    disconnect() {
      this.watching = null;
    }
  }
  return { Observer, made };
}

test('watchTone writes the tone at once, and again when a theme changes the root', () => {
  const root = h('html');
  let background = 'rgb(255, 255, 255)';
  const { Observer, made } = fakeObserver();
  const stop = watchTone(root, { styleOf: () => ({ backgroundColor: background }), Observer });
  assert.equal(root.getAttribute('data-odin-tone'), 'light');
  assert.equal(made[0].watching.target, root);
  assert.deepEqual(made[0].watching.options, { attributes: true, attributeFilter: ['class', 'style'] });
  background = 'rgb(11, 18, 32)';
  made[0].callback();
  assert.equal(root.getAttribute('data-odin-tone'), 'dark');
  stop();
  assert.equal(made[0].watching, null);
});

test('watchTone does not write a tone that has not changed', () => {
  const root = h('html');
  let writes = 0;
  const set = root.setAttribute.bind(root);
  root.setAttribute = (name, value) => { writes += 1; set(name, value); };
  const { Observer, made } = fakeObserver();
  watchTone(root, { styleOf: () => ({ backgroundColor: 'rgb(255, 255, 255)' }), Observer });
  made[0].callback();
  made[0].callback();
  assert.equal(writes, 1);
});
