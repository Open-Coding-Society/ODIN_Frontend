// Tells the page's styles whether its ground is light or dark, by writing data-odin-tone on the
// html element. ODIN's logo is one black drawing: on a dark ground the styles turn it white. A
// visitor can pick any theme, so the tone is read from the colour the page really has.

// A CSS colour such as rgb(16, 19, 25) or color(srgb 0.06 0.07 0.1) as three numbers from 0 to 1,
// or null for text that is neither.
export function channels(color) {
  const rgb = color.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
  if (rgb) return rgb.slice(1, 4).map((value) => Number(value) / 255);
  const srgb = color.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  if (srgb) return srgb.slice(1, 4).map(Number);
  return null;
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
  const write = () => {
    const tone = toneOf(styleOf(root).backgroundColor);
    // Writing the same value again would wake the observer for nothing
    if (root.getAttribute('data-odin-tone') !== tone) root.setAttribute('data-odin-tone', tone);
  };
  write();
  const observer = new Observer(write);
  observer.observe(root, { attributes: true, attributeFilter: ['class', 'style'] });
  return () => observer.disconnect();
}
