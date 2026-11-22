import { test } from 'node:test';
import assert from 'node:assert/strict';

import { RUN_SECONDS, closeRadius, closeShare, dotPosition, percentText } from '../js/dot-path.js';

const WIDTH = 800;
const HEIGHT = 500;

test('the dot stays inside the box for the whole run', () => {
  for (let seconds = 0; seconds <= RUN_SECONDS; seconds += 0.05) {
    const { x, y } = dotPosition(seconds, WIDTH, HEIGHT);
    assert.ok(x >= 0 && x <= WIDTH && y >= 0 && y <= HEIGHT, `${seconds}: ${x}, ${y}`);
  }
});

test('the dot moves smoothly, with no jump between frames', () => {
  let last = dotPosition(0, WIDTH, HEIGHT);
  for (let seconds = 1 / 60; seconds <= RUN_SECONDS; seconds += 1 / 60) {
    const next = dotPosition(seconds, WIDTH, HEIGHT);
    assert.ok(Math.hypot(next.x - last.x, next.y - last.y) < 20, `jump at ${seconds}`);
    last = next;
  }
});

test('a time before the start is the start', () => {
  assert.deepEqual(dotPosition(-3, WIDTH, HEIGHT), dotPosition(0, WIDTH, HEIGHT));
});

test('following the dot exactly is 100%, and staying far away is 0%', () => {
  const exact = [];
  const far = [];
  for (let t = 0; t <= RUN_SECONDS; t += 0.1) {
    exact.push({ t, ...dotPosition(t, WIDTH, HEIGHT) });
    const dot = dotPosition(t, WIDTH, HEIGHT);
    far.push({ t, x: dot.x + 300, y: dot.y });
  }
  assert.equal(closeShare(exact, WIDTH, HEIGHT), 1);
  assert.equal(closeShare(far, WIDTH, HEIGHT), 0);
});

test('only the samples within the radius count as close', () => {
  const radius = closeRadius(WIDTH, HEIGHT);
  const samples = [0, 1, 2, 3].map((t) => {
    const dot = dotPosition(t, WIDTH, HEIGHT);
    return { t, x: dot.x + (t < 3 ? radius - 1 : radius + 1), y: dot.y };
  });
  assert.equal(closeShare(samples, WIDTH, HEIGHT), 0.75);
});

test('no samples, or only unusable ones, is 0%', () => {
  assert.equal(closeShare([], WIDTH, HEIGHT), 0);
  assert.equal(closeShare([{ t: 1, x: NaN, y: 2 }], WIDTH, HEIGHT), 0);
});

test('the close radius grows with the box but never gets tiny', () => {
  assert.equal(closeRadius(800, 500), 60);
  assert.equal(closeRadius(100, 60), 18);
});

test('the share is written as a whole percent', () => {
  assert.equal(percentText(0.724), '72%');
  assert.equal(percentText(1), '100%');
  assert.equal(percentText(-0.2), '0%');
  assert.equal(percentText(1.4), '100%');
});
