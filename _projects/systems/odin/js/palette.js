// The colors the ODIN drawings use, taken from the visitor's theme. A canvas can't read CSS
// variables, so the theme's colors are read here and turned into plain colors a canvas can paint
// with. Every color starts from the theme, so the drawings follow the Preferences page.

// A color as { r, g, b, a }, with r, g, b from 0 to 255 and a from 0 to 1, or null for a form this
// does not read. Reads #rgb, #rrggbb, rgb(...), rgba(...) and color(srgb r g b / a).
export function parseColor(text) {
  const value = String(text ?? '').trim().toLowerCase();
  let match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(value);
  if (match) {
    const hex = match[1].length === 3 ? match[1].replace(/./g, (c) => c + c) : match[1];
    return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16), a: 1 };
  }
  match = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/.exec(value);
  if (match) {
    return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]), a: alpha(match[4]) };
  }
  match = /^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/.exec(value);
  if (match) {
    return { r: Number(match[1]) * 255, g: Number(match[2]) * 255, b: Number(match[3]) * 255, a: alpha(match[4]) };
  }
  return null;
}

function alpha(text) {
  if (text === undefined) return 1;
  return text.endsWith('%') ? Number(text.slice(0, -1)) / 100 : Number(text);
}

// The color as hue (0 to 360), saturation and lightness (0 to 1).
export function toHsl({ r, g, b }) {
  const [red, green, blue] = [r, g, b].map((value) => value / 255);
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: lightness };
  const delta = max - min;
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue;
  if (max === red) hue = (green - blue) / delta + (green < blue ? 6 : 0);
  else if (max === green) hue = (blue - red) / delta + 2;
  else hue = (red - green) / delta + 4;
  return { h: hue * 60, s: saturation, l: lightness };
}

export function fromHsl({ h, s, l }) {
  const hue = (((h % 360) + 360) % 360) / 360;
  if (s === 0) {
    const gray = Math.round(l * 255);
    return { r: gray, g: gray, b: gray, a: 1 };
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t) => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return { r: Math.round(channel(hue + 1 / 3) * 255), g: Math.round(channel(hue) * 255), b: Math.round(channel(hue - 1 / 3) * 255), a: 1 };
}

// The same color with its hue turned by `degrees`. The page's styles do the same with relative
// colors, so the drawings and the page get the same second and third colors.
export function turnHue(color, degrees) {
  const hsl = toHsl(color);
  return { ...fromHsl({ ...hsl, h: hsl.h + degrees }), a: color.a };
}

// A color a canvas can paint with, at `opacity` times the color's own alpha.
export function paint(color, opacity = 1) {
  const a = Math.min(1, Math.max(0, (color.a ?? 1) * opacity));
  return `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, ${Number(a.toFixed(3))})`;
}

// How far the second and third colors turn from the accent. sass/main.scss uses the same numbers.
export const SECOND_TURN = 60;
export const THIRD_TURN = -50;

// The palette for drawings inside `element`, read from the theme's variables. A variable that is
// missing or unreadable falls back to one the theme always has, so a drawing never goes blank.
export function readPalette(element, styleOf = getComputedStyle) {
  const style = styleOf(element);
  const read = (name) => parseColor(style.getPropertyValue(name));
  const text = read('--pref-text-color') ?? parseColor(style.color) ?? { r: 240, g: 240, b: 240, a: 1 };
  const background = read('--pref-bg-color') ?? { r: 18, g: 18, b: 18, a: 1 };
  const accent = read('--pref-accent-color') ?? text;
  return {
    text,
    background,
    accent,
    second: turnHue(accent, SECOND_TURN),
    third: turnHue(accent, THIRD_TURN),
  };
}
