import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const sass = new URL('../sass/', import.meta.url);
const files = readdirSync(sass).filter((name) => name.endsWith('.scss'));
const read = (name) => readFileSync(new URL(name, sass), 'utf8');
const TOKENS = '_tokens.scss';

// SCSS without its comments and without #{...}, so a word in a comment is never taken for code
// and an interpolation's braces are never taken for a block.
const code = (text) => text
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')
  .replace(/\s\/\/ .*$/gm, '')
  .replace(/#\{[^}]*\}/g, 'INTERPOLATED');

// The blocks of a file as { selector, body }, at every depth. A block's body is its own text
// with nested blocks left in.
function blocks(text) {
  const found = [];
  const open = [];
  let start = 0;
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === '{') {
      open.push({ selector: text.slice(start, index).trim(), from: index + 1 });
      start = index + 1;
    } else if (text[index] === '}') {
      const block = open.pop();
      found.push({ selector: block.selector, body: text.slice(block.from, index), depth: open.length, parents: open.map((parent) => parent.selector) });
      start = index + 1;
    } else if (text[index] === ';') {
      start = index + 1;
    }
  }
  return found;
}

// Every declaration of a file as [property, value], whatever block it is in.
function declarations(text) {
  return text.split(/[{};]/)
    .map((part) => part.trim().match(/^(--[\w-]+|[a-z-]+)\s*:\s*(.+)$/s))
    .filter((match) => match !== null)
    .map((match) => [match[1], match[2]]);
}

// The CSS colour keywords. `transparent` and `currentcolor` are not colours of their own.
const NAMED = ('aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown '
  + 'burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod '
  + 'darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon '
  + 'darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray '
  + 'dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green '
  + 'greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon '
  + 'lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon '
  + 'lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta '
  + 'maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen '
  + 'mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab '
  + 'orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum '
  + 'powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna '
  + 'silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet '
  + 'wheat white whitesmoke yellow yellowgreen').split(' ');
// Functions that make a colour. color-mix is the one the kit uses, over the theme's own colours.
const COLOUR_FUNCTIONS = /(?<![\w-])(rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color|lighten|darken|saturate|desaturate|adjust-hue|adjust-color|scale-color|change-color|mix|tint|shade)\(/;

test('main.scss imports every partial in the folder, tokens first', () => {
  const imports = [...code(read('main.scss')).matchAll(/@import "([^"]+)";/g)].map((match) => match[1]);
  const own = imports.filter((name) => !name.includes('/'));
  const partials = files.filter((name) => name.startsWith('_')).map((name) => name.slice(1, -'.scss'.length));
  assert.deepEqual([...own].sort(), [...partials].sort());
  assert.equal(own[0], 'tokens');
});

test('the kit uses @import, which the Jekyll build understands, never @use', () => {
  for (const name of files) assert.ok(!/@use\b|@forward\b/.test(code(read(name))), `${name} has @use or @forward`);
});

test('only the tokens file names a colour, and only its default block uses one', () => {
  for (const name of files) {
    const text = code(read(name));
    if (name === TOKENS) {
      // The colour tokens reach the page through the default block's interpolations and nowhere else
      const uses = [...read(name).matchAll(/^(.*)\$odin-(paper|ink|signal)\b(?!:)/gm)].map((match) => match[1].trim());
      assert.ok(uses.length > 0);
      for (const before of uses) assert.match(before, /^--pref-[a-z-]+: #\{$/, `a colour token is used outside the default block: ${before}`);
      continue;
    }
    assert.ok(!/\$odin-(paper|ink|signal)\b/.test(text), `${name} uses a colour token, which ignores a visitor's theme`);
    assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(text), `${name} has a hex colour`);
    for (const [property, value] of declarations(text)) {
      assert.ok(!COLOUR_FUNCTIONS.test(value), `${name}: ${property} makes a colour with a function`);
      for (const word of value.toLowerCase().split(/[^a-z-]+/)) {
        assert.ok(!NAMED.includes(word), `${name}: ${property} uses the colour ${word}`);
      }
    }
  }
});

test('every rule starts with .odin or is an .odin__ block, so the kit styles no other page', () => {
  const scoped = /^(html)?\.odin(?![\w-])|^\.odin__[a-z][a-z-]*(?![\w])/;
  let checked = 0;
  for (const name of files) {
    for (const { selector, parents } of blocks(code(read(name)))) {
      // A mixin's rules are placed by whoever includes it, and a nested rule is under its parent
      if (selector.startsWith('@mixin') || parents.some((parent) => parent.startsWith('@mixin'))) continue;
      if (selector.startsWith('@')) {
        // A block handed to a mixin is placed where the mixin is included, so its rules are checked too
        assert.match(selector, /^@(media|supports|include)\b/, `${name}: ${selector} is not an at-rule the kit uses`);
        continue;
      }
      if (parents.some((parent) => !parent.startsWith('@'))) continue;
      for (const part of selector.split(/,(?![^(]*\))/).map((text) => text.trim())) {
        assert.match(part, scoped, `${name}: ${part} is not under .odin`);
        checked += 1;
      }
    }
  }
  assert.ok(checked > 0);
});

test('the scope check reads rules inside an at-rule and refuses a bare tag there', () => {
  const found = blocks(code('@media (max-width: 10px) {\n  body { margin: 0; }\n}\n.odin { p { margin: 0; } }'));
  assert.deepEqual(found.map((block) => block.selector), ['body', '@media (max-width: 10px)', 'p', '.odin']);
  assert.deepEqual(found[0].parents, ['@media (max-width: 10px)']);
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
