import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const sass = new URL('../sass/', import.meta.url);
const files = readdirSync(sass).filter((name) => name.endsWith('.scss'));
const read = (name) => readFileSync(new URL(name, sass), 'utf8');
const TOKENS = '_tokens.scss';

// SCSS without its comments, so a word in a comment is never taken for code.
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/ .*$/gm, '');

// Named colours a rule could reach for. `transparent` and `currentColor` are not colours of their own.
const NAMED = ['white', 'black', 'red', 'green', 'blue', 'gray', 'grey', 'silver', 'orange', 'yellow', 'purple', 'pink'];

test('main.scss imports every partial in the folder, tokens first', () => {
  const imports = [...code(read('main.scss')).matchAll(/@import "([^"]+)";/g)].map((match) => match[1]);
  const partials = files.filter((name) => name.startsWith('_')).map((name) => name.slice(1, -'.scss'.length));
  assert.deepEqual([...imports.filter((name) => !name.includes('/'))].sort(), [...partials].sort());
  assert.equal(imports.filter((name) => !name.includes('/'))[0], 'tokens');
});

test('the kit uses @import, which the Jekyll build understands, never @use', () => {
  for (const name of files) assert.ok(!/@use\b|@forward\b/.test(code(read(name))), `${name} has @use or @forward`);
});

test('only the tokens file names a colour', () => {
  for (const name of files.filter((file) => file !== TOKENS)) {
    const text = code(read(name));
    assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(text), `${name} has a hex colour`);
    assert.ok(!/\b(rgb|rgba|hsl|hsla)\(/.test(text), `${name} has an rgb or hsl colour`);
    for (const word of NAMED) {
      assert.ok(!new RegExp(`:\\s*[^;]*\\b${word}\\b`).test(text), `${name} uses the colour ${word}`);
    }
  }
});

test('every rule is under .odin, so the kit styles no other page', () => {
  for (const name of files) {
    // Top-level selectors: lines that open a block at column 0
    const selectors = [...code(read(name)).matchAll(/^([^\s@$}/][^{;]*)\{/gm)].map((match) => match[1].trim());
    for (const selector of selectors) {
      for (const part of selector.split(',').map((text) => text.trim())) {
        assert.ok(/^(html:not\(\.user-theme-active\) )?\.odin(__[a-z-]+)?\b/.test(part), `${name}: ${part} is not under .odin`);
      }
    }
  }
});

// WCAG relative luminance and contrast ratio of two #rrggbb colours.
function luminance(hex) {
  const channel = (index) => {
    const value = parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}
function contrast(first, second) {
  const [light, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}
// What color-mix(in srgb, first percent%, second) gives.
function mix(first, percent, second) {
  const blend = (index) => Math.round(
    (parseInt(first.slice(1 + index * 2, 3 + index * 2), 16) * percent
      + parseInt(second.slice(1 + index * 2, 3 + index * 2), 16) * (100 - percent)) / 100,
  ).toString(16).padStart(2, '0');
  return `#${blend(0)}${blend(1)}${blend(2)}`;
}

test("ODIN's default colours keep 4.5 to 1 for text, for the accent and for text on an accent fill", () => {
  const tokens = read(TOKENS);
  const token = (name) => {
    const found = tokens.match(new RegExp(`^\\$odin-${name}: (#[0-9a-fA-F]{6});`, 'm'));
    assert.ok(found, `the tokens file has no $odin-${name}`);
    return found[1];
  };
  const mixed = (alias) => {
    const found = tokens.match(new RegExp(`--odin-${alias}: color-mix\\(in srgb, var\\(--odin-ink\\) (\\d+)%, var\\(--odin-paper\\)\\);`));
    assert.ok(found, `the tokens file has no --odin-${alias} mix`);
    return mix(token('ink'), Number(found[1]), token('paper'));
  };
  const [paper, ink, signal] = [token('paper'), token('ink'), token('signal')];
  const [tint, quiet] = [mixed('tint'), mixed('quiet')];
  const pairs = {
    'text on the page': [ink, paper],
    'text on a tinted panel': [ink, tint],
    'quiet text on the page': [quiet, paper],
    'quiet text on a tinted panel': [quiet, tint],
    'the accent on the page': [signal, paper],
    'the accent on a tinted panel': [signal, tint],
    'page-coloured text on an accent fill': [paper, signal],
  };
  for (const [label, [front, back]] of Object.entries(pairs)) {
    assert.ok(contrast(front, back) >= 4.5, `${label} is ${contrast(front, back).toFixed(2)} to 1`);
  }
});
