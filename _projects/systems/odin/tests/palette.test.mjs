import { test } from 'node:test';
import assert from 'node:assert/strict';

import { SECOND_TURN, THIRD_TURN, fromHsl, paint, parseColor, readPalette, toHsl, turnHue } from '../js/palette.js';

test('reads the color forms a theme and a browser give', () => {
  assert.deepEqual(parseColor('#4CAFEF'), { r: 76, g: 175, b: 239, a: 1 });
  assert.deepEqual(parseColor('#fff'), { r: 255, g: 255, b: 255, a: 1 });
  assert.deepEqual(parseColor('rgb(18, 18, 18)'), { r: 18, g: 18, b: 18, a: 1 });
  assert.deepEqual(parseColor('rgba(10, 20, 30, 0.5)'), { r: 10, g: 20, b: 30, a: 0.5 });
  assert.deepEqual(parseColor('rgb(10 20 30 / 50%)'), { r: 10, g: 20, b: 30, a: 0.5 });
  assert.deepEqual(parseColor('color(srgb 1 0 0.5)'), { r: 255, g: 0, b: 127.5, a: 1 });
});

test('a form it does not read gives null', () => {
  for (const text of ['', 'blue', 'hsl(120 50% 50%)', '#12', undefined, null]) {
    assert.equal(parseColor(text), null, String(text));
  }
});

test('hue, saturation and lightness go there and back', () => {
  for (const color of [{ r: 76, g: 175, b: 239, a: 1 }, { r: 157, g: 23, b: 77, a: 1 }, { r: 18, g: 18, b: 18, a: 1 }]) {
    const back = fromHsl(toHsl(color));
    assert.ok(Math.abs(back.r - color.r) <= 1 && Math.abs(back.g - color.g) <= 1 && Math.abs(back.b - color.b) <= 1, JSON.stringify(back));
  }
});

test('turning the hue keeps the saturation and lightness', () => {
  const accent = parseColor('#4CAFEF');
  const turned = toHsl(turnHue(accent, SECOND_TURN));
  const original = toHsl(accent);
  assert.ok(Math.abs(turned.s - original.s) < 0.02);
  assert.ok(Math.abs(turned.l - original.l) < 0.02);
  assert.ok(Math.abs(((turned.h - original.h + 360) % 360) - SECOND_TURN) < 1.5);
  assert.deepEqual(turnHue(accent, 360), { ...accent });
});

test('paints with the color\'s alpha times the opacity, kept between 0 and 1', () => {
  assert.equal(paint({ r: 10.4, g: 20.6, b: 30, a: 1 }, 0.25), 'rgba(10, 21, 30, 0.25)');
  assert.equal(paint({ r: 0, g: 0, b: 0, a: 0.5 }, 0.5), 'rgba(0, 0, 0, 0.25)');
  assert.equal(paint({ r: 0, g: 0, b: 0, a: 1 }, 3), 'rgba(0, 0, 0, 1)');
});

test('reads the palette from the theme\'s variables', () => {
  const variables = { '--pref-text-color': '#F0F0F0', '--pref-bg-color': '#121212', '--pref-accent-color': '#4CAFEF' };
  const style = { color: 'rgb(1, 2, 3)', getPropertyValue: (name) => variables[name] ?? '' };
  const palette = readPalette({}, () => style);
  assert.deepEqual(palette.accent, parseColor('#4CAFEF'));
  assert.deepEqual(palette.background, parseColor('#121212'));
  assert.deepEqual(palette.second, turnHue(parseColor('#4CAFEF'), SECOND_TURN));
  assert.deepEqual(palette.third, turnHue(parseColor('#4CAFEF'), THIRD_TURN));
});

test('a theme without its variables still gives every color', () => {
  const style = { color: 'rgb(1, 2, 3)', getPropertyValue: () => '' };
  const palette = readPalette({}, () => style);
  assert.deepEqual(palette.text, { r: 1, g: 2, b: 3, a: 1 });
  assert.deepEqual(palette.accent, palette.text);
  for (const key of ['text', 'background', 'accent', 'second', 'third']) assert.ok(palette[key], key);
});
