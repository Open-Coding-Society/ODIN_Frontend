// The "follow the dot" demo's math, kept apart from the drawing so it can be tested: where the dot
// is at each moment, and how much of the time a visitor's path stayed close to it.

// How long one run of the demo lasts, in seconds.
export const RUN_SECONDS = 9;

// Where the dot is `seconds` into a run, inside a box `width` by `height`. It sweeps a figure
// eight that drifts, the kind of smooth path an eye-tracking test asks the eyes to follow.
export function dotPosition(seconds, width, height) {
  const t = Math.max(0, seconds);
  // It starts slowly and picks up speed, then holds it
  const phase = t < 1.5 ? (t * t) / 3 : t - 0.75;
  const x = width / 2 + width * 0.36 * Math.sin(phase * 0.9);
  const y = height / 2 + height * 0.3 * Math.sin(phase * 1.8 + 0.4);
  return { x, y };
}

// How close a point must be to the dot to count as following it: a share of the box's smaller side.
export function closeRadius(width, height) {
  return Math.max(18, Math.min(width, height) * 0.12);
}

// The share of the samples (from 0 to 1) where the visitor's point was within `radius` of the dot.
// Each sample is { t, x, y } for the visitor's point at `t` seconds; the dot's place at that moment
// comes from dotPosition. Samples taken before the visitor moved at all are left out.
export function closeShare(samples, width, height, radius = closeRadius(width, height)) {
  const counted = samples.filter((sample) => Number.isFinite(sample.x) && Number.isFinite(sample.y));
  if (counted.length === 0) return 0;
  const close = counted.filter((sample) => {
    const dot = dotPosition(sample.t, width, height);
    return Math.hypot(sample.x - dot.x, sample.y - dot.y) <= radius;
  });
  return close.length / counted.length;
}

// The share as a whole percent, such as "72%".
export function percentText(share) {
  return `${Math.round(Math.min(1, Math.max(0, share)) * 100)}%`;
}
