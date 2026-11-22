// Reads and writes the figures the statistics show, such as "3,800,000", "50%" and "$131,500,000",
// so a page can count up to them. Nothing here touches the page.

// A figure: an optional sign or symbol before the number, the number itself (with commas between
// thousands, and maybe a decimal part), and an optional symbol after it.
const FIGURE = /^(\D*?)(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d+))?(\D*)$/;

// The parts of a figure, or null for text that is not one number with symbols around it.
//   parseFigure("$131,500,000") -> { prefix: "$", value: 131500000, decimals: 0, suffix: "", grouped: true }
export function parseFigure(text) {
  if (typeof text !== 'string') return null;
  const match = FIGURE.exec(text.trim());
  if (!match) return null;
  const [, prefix, whole, fraction = '', suffix] = match;
  const value = Number(`${whole.replace(/,/g, '')}${fraction ? `.${fraction}` : ''}`);
  if (!Number.isFinite(value)) return null;
  return { prefix, value, decimals: fraction.length, suffix, grouped: whole.includes(',') };
}

// The figure written with `value` in place of its own number, in the same style: the same symbols,
// the same number of decimals, and commas when the figure had them.
export function formatFigure(parts, value) {
  const fixed = Math.max(0, value).toFixed(parts.decimals);
  const [whole, fraction] = fixed.split('.');
  const digits = parts.grouped ? whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : whole;
  return `${parts.prefix}${digits}${fraction ? `.${fraction}` : ''}${parts.suffix}`;
}

// Eases a count so it starts fast and settles on the figure. `t` runs from 0 to 1.
export function easeOut(t) {
  const clamped = Math.min(1, Math.max(0, t));
  return 1 - (1 - clamped) ** 3;
}
