// Tells the page's styles whether its ground is light or dark, by writing data-odin-tone on the
// html element. ODIN's logo is one black drawing: on a dark ground the styles turn it white. A
// visitor can pick any theme, so the tone is read from the colour the page really has.

// The attribute the styles read (sass/_frame.scss), with the value light or dark.
export const TONE_ATTRIBUTE = 'data-odin-tone';

// A CSS colour as three numbers from 0 to 1, in the two forms a browser reports a background in:
// rgb(16, 19, 25), with or without an alpha, and color(srgb 0.06 0.07 0.1). Null for any other
// text, and for a colour that is mostly see-through: a browser reports no background at all as
// rgba(0, 0, 0, 0), which is not black. The OCS themes are written as hex colours, which a
// browser reports as rgb. A theme in another colour space (oklch, lab) is not read.
export function channels(color) {
  const rgb = color.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/);
  const srgb = color.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/);
  const found = rgb ?? srgb;
  if (!found) return null;
  const alpha = found[4] === undefined ? 1 : parseFloat(found[4]) / (found[4].endsWith('%') ? 100 : 1);
  if (alpha < 0.5) return null;
  return found.slice(1, 4).map((value) => (rgb ? Number(value) / 255 : Number(value)));
}

// 'dark' for a colour whose WCAG relative luminance is under the point where white text reads
// better than black, and 'light' for the rest. A colour that cannot be read counts as light,
// which is ODIN's own ground.
export function toneOf(color) {
  const parts = channels(color);
  if (parts === null) return 'light';
  const [red, green, blue] = parts.map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  return luminance < 0.179 ? 'dark' : 'light';
}

// Writes the tone of `root`'s background on it now, and again whenever a theme changes the
// root's class or style. `styleOf` is the browser's getComputedStyle and `Observer` its
// MutationObserver. Returns a function that stops watching.
export function watchTone(root, { styleOf, Observer }) {
  // The observer watches class and style only, so writing this attribute does not wake it
  const write = () => root.setAttribute(TONE_ATTRIBUTE, toneOf(styleOf(root).backgroundColor));
  write();
  const observer = new Observer(write);
  observer.observe(root, { attributes: true, attributeFilter: ['class', 'style'] });
  return () => observer.disconnect();
}
