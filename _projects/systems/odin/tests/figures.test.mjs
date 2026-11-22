import { test } from 'node:test';
import assert from 'node:assert/strict';

import { easeOut, formatFigure, parseFigure } from '../js/figures.js';

test('reads the figures the statistics show', () => {
  assert.deepEqual(parseFigure('3,800,000'), { prefix: '', value: 3800000, decimals: 0, suffix: '', grouped: true });
  assert.deepEqual(parseFigure('50%'), { prefix: '', value: 50, decimals: 0, suffix: '%', grouped: false });
  assert.deepEqual(parseFigure('$131,500,000'), { prefix: '$', value: 131500000, decimals: 0, suffix: '', grouped: true });
  assert.deepEqual(parseFigure(' 4.5 min '), { prefix: '', value: 4.5, decimals: 1, suffix: ' min', grouped: false });
});

test('text that is not one number is not a figure', () => {
  for (const text of ['', 'Quick', '20% to 30%', '1,23', null, undefined, 42]) {
    assert.equal(parseFigure(text), null, String(text));
  }
});

test('writes a count in the figure\'s own style', () => {
  const money = parseFigure('$131,500,000');
  assert.equal(formatFigure(money, 0), '$0');
  assert.equal(formatFigure(money, 65750000.4), '$65,750,000');
  assert.equal(formatFigure(money, money.value), '$131,500,000');
  assert.equal(formatFigure(parseFigure('50%'), 12.6), '13%');
  assert.equal(formatFigure(parseFigure('4.5 min'), 2), '2.0 min');
});

test('ends a count on exactly the figure it started from', () => {
  for (const text of ['3,800,000', '50%', '20%', '$131,500,000']) {
    const parts = parseFigure(text);
    assert.equal(formatFigure(parts, parts.value * easeOut(1)), text);
  }
});

test('the easing starts at 0, ends at 1 and never goes past either', () => {
  assert.equal(easeOut(0), 0);
  assert.equal(easeOut(1), 1);
  assert.equal(easeOut(-1), 0);
  assert.equal(easeOut(2), 1);
  assert.ok(easeOut(0.5) > 0.5, 'it is past halfway at half the time');
});
