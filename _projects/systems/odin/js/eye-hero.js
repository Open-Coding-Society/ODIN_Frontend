// The home page's moving picture: an eye inside a scanner's rings. The iris follows the visitor's
// pointer the way an eye follows a target. Left alone, it looks around by itself in quick jumps,
// the way eyes move between points, and blinks now and then. All of it is drawn, so no photo is used.

import { prefersLessMotion, startCanvas } from './canvas-loop.js';
import { paint, readPalette } from './palette.js';
import { watchTheme } from './site-frame.js';

// Seconds without pointer movement before the eye starts looking around by itself.
const IDLE_SECONDS = 2.5;

export function startEye(canvas) {
  if (!canvas) return null;
  let palette = readPalette(canvas);
  const gaze = {
    x: 0, y: 0, targetX: 0, targetY: 0,
    lastPointer: -Infinity, nextJump: 0, nextBlink: 3.5, blinkStart: -1, trail: [],
  };

  const follow = (event) => {
    const box = canvas.getBoundingClientRect();
    const dx = event.clientX - (box.left + box.width / 2);
    const dy = event.clientY - (box.top + box.height / 2);
    const distance = Math.hypot(dx, dy);
    // Near pointers move the eye a little, far ones to the edge of its range
    const reach = Math.min(1, distance / Math.max(box.width, box.height));
    gaze.targetX = distance ? (dx / distance) * reach : 0;
    gaze.targetY = distance ? (dy / distance) * reach : 0;
    gaze.lastPointer = performance.now() / 1000;
  };
  if (!prefersLessMotion()) window.addEventListener('pointermove', follow, { passive: true });

  const loop = startCanvas(canvas, (context, frame) => drawEye(context, frame, gaze, palette));
  watchTheme(() => {
    palette = readPalette(canvas);
    loop.redraw();
  });
  return loop;
}

function drawEye(context, { width, height, time, delta, still }, gaze, colors) {
  const now = performance.now() / 1000;
  const cx = width / 2;
  const cy = height / 2;
  // The scanner's outer ticks reach 1.27 sizes from the middle and the corner marks 1.4, so this
  // keeps all of it inside the canvas
  const size = Math.min(width, height) * 0.34;

  if (!still) moveGaze(gaze, time, delta, now);
  const open = still ? 1 : openness(gaze, time);

  context.clearRect(0, 0, width, height);
  drawGlow(context, cx, cy, size, colors);
  drawRings(context, cx, cy, size, time, colors);

  // The eye's outline, which the iris and the scan line are clipped to
  context.save();
  almond(context, cx, cy, size, open);
  context.fillStyle = paint(colors.text, 0.05);
  context.fill();
  context.clip();
  const irisX = cx + gaze.x * size * 0.42;
  const irisY = cy + gaze.y * size * 0.3;
  drawTrail(context, gaze, irisX, irisY, still, colors);
  drawIris(context, irisX, irisY, size * 0.44, time, colors);
  drawScan(context, cx, cy, size, time, colors);
  context.restore();

  // The lids, drawn over the clipped inside
  almond(context, cx, cy, size, open);
  context.lineWidth = 2;
  context.strokeStyle = paint(colors.accent, 0.85);
  context.shadowColor = paint(colors.accent, 0.6);
  context.shadowBlur = 14;
  context.stroke();
  context.shadowBlur = 0;
  drawBrackets(context, cx, cy, size, colors);
}

// Eases the gaze toward its target. When the pointer has been still, it picks a new spot to look at
// every second or so, the way eyes jump between points.
function moveGaze(gaze, time, delta, now) {
  if (now - gaze.lastPointer > IDLE_SECONDS && time >= gaze.nextJump) {
    gaze.targetX = (Math.random() * 2 - 1) * 0.85;
    gaze.targetY = (Math.random() * 2 - 1) * 0.65;
    gaze.nextJump = time + 0.7 + Math.random() * 1.1;
  }
  const ease = 1 - Math.exp(-delta * 10);
  gaze.x += (gaze.targetX - gaze.x) * ease;
  gaze.y += (gaze.targetY - gaze.y) * ease;
}

// How open the eye is, from 0 (shut) to 1. A blink lasts a fifth of a second.
function openness(gaze, time) {
  if (gaze.blinkStart < 0 && time >= gaze.nextBlink) gaze.blinkStart = time;
  if (gaze.blinkStart < 0) return 1;
  const progress = (time - gaze.blinkStart) / 0.2;
  if (progress >= 1) {
    gaze.blinkStart = -1;
    gaze.nextBlink = time + 3.5 + Math.random() * 4;
    return 1;
  }
  return 1 - Math.sin(progress * Math.PI) * 0.94;
}

function almond(context, cx, cy, size, open) {
  const lift = size * 0.92 * open;
  context.beginPath();
  context.moveTo(cx - size, cy);
  context.bezierCurveTo(cx - size * 0.45, cy - lift, cx + size * 0.45, cy - lift, cx + size, cy);
  context.bezierCurveTo(cx + size * 0.45, cy + lift, cx - size * 0.45, cy + lift, cx - size, cy);
  context.closePath();
}

function drawGlow(context, cx, cy, size, colors) {
  const glow = context.createRadialGradient(cx, cy, size * 0.1, cx, cy, size * 1.6);
  glow.addColorStop(0, paint(colors.accent, 0.22));
  glow.addColorStop(0.55, paint(colors.second, 0.08));
  glow.addColorStop(1, paint(colors.second, 0));
  context.fillStyle = glow;
  context.fillRect(cx - size * 1.7, cy - size * 1.7, size * 3.4, size * 3.4);
}

// The scanner around the eye: a fine outer ring with ticks, a dashed ring that turns, and an arc
// that sweeps around.
function drawRings(context, cx, cy, size, time, colors) {
  context.save();
  context.translate(cx, cy);

  context.beginPath();
  context.arc(0, 0, size * 1.16, 0, Math.PI * 2);
  context.strokeStyle = paint(colors.text, 0.12);
  context.lineWidth = 1;
  context.stroke();

  context.save();
  context.rotate(-time * 0.08);
  for (let tick = 0; tick < 72; tick += 1) {
    const angle = (tick / 72) * Math.PI * 2;
    const long = tick % 6 === 0;
    const inner = size * (long ? 1.2 : 1.23);
    context.beginPath();
    context.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    context.lineTo(Math.cos(angle) * size * 1.27, Math.sin(angle) * size * 1.27);
    context.strokeStyle = paint(colors.text, long ? 0.35 : 0.14);
    context.lineWidth = long ? 1.5 : 1;
    context.stroke();
  }
  context.restore();

  context.save();
  context.rotate(time * 0.25);
  context.setLineDash([3, 11]);
  context.beginPath();
  context.arc(0, 0, size * 1.06, 0, Math.PI * 2);
  context.strokeStyle = paint(colors.accent, 0.55);
  context.lineWidth = 1.5;
  context.stroke();
  context.restore();

  const sweep = time * 1.1;
  for (let step = 0; step < 24; step += 1) {
    const from = sweep - step * 0.035;
    context.beginPath();
    context.arc(0, 0, size * 1.16, from - 0.035, from);
    context.strokeStyle = paint(colors.second, 0.9 * (1 - step / 24));
    context.lineWidth = 3;
    context.stroke();
  }
  context.restore();
}

// A faint line where the iris has been over the last moment
function drawTrail(context, gaze, x, y, still, colors) {
  if (still) return;
  gaze.trail.push({ x, y });
  if (gaze.trail.length > 36) gaze.trail.shift();
  for (let index = 1; index < gaze.trail.length; index += 1) {
    const from = gaze.trail[index - 1];
    const to = gaze.trail[index];
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.strokeStyle = paint(colors.third, (index / gaze.trail.length) * 0.5);
    context.lineWidth = 2;
    context.stroke();
  }
}

function drawIris(context, x, y, radius, time, colors) {
  const iris = context.createRadialGradient(x, y, radius * 0.2, x, y, radius);
  iris.addColorStop(0, paint(colors.third, 0.95));
  iris.addColorStop(0.45, paint(colors.accent, 0.95));
  iris.addColorStop(0.85, paint(colors.second, 0.9));
  iris.addColorStop(1, paint(colors.background, 0.95));
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fillStyle = iris;
  context.fill();

  // The fine lines of the iris, which turn very slowly
  context.save();
  context.translate(x, y);
  context.rotate(time * 0.05);
  for (let line = 0; line < 84; line += 1) {
    const angle = (line / 84) * Math.PI * 2;
    const wobble = Math.sin(line * 7.3) * 0.08;
    context.beginPath();
    context.moveTo(Math.cos(angle) * radius * 0.34, Math.sin(angle) * radius * 0.34);
    context.lineTo(Math.cos(angle + wobble) * radius * 0.95, Math.sin(angle + wobble) * radius * 0.95);
    context.strokeStyle = paint(colors.background, line % 3 === 0 ? 0.28 : 0.12);
    context.lineWidth = 1;
    context.stroke();
  }
  context.restore();

  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.strokeStyle = paint(colors.background, 0.7);
  context.lineWidth = 3;
  context.stroke();

  // The pupil widens and narrows a little, as a living one does
  const pupil = radius * (0.36 + Math.sin(time * 1.3) * 0.03);
  context.beginPath();
  context.arc(x, y, pupil, 0, Math.PI * 2);
  context.fillStyle = paint(colors.background, 1);
  context.fill();
  context.strokeStyle = paint(colors.accent, 0.45);
  context.lineWidth = 1.5;
  context.stroke();

  context.beginPath();
  context.arc(x - radius * 0.34, y - radius * 0.36, radius * 0.13, 0, Math.PI * 2);
  context.fillStyle = paint(colors.text, 0.85);
  context.fill();
  context.beginPath();
  context.arc(x + radius * 0.24, y + radius * 0.28, radius * 0.05, 0, Math.PI * 2);
  context.fillStyle = paint(colors.text, 0.5);
  context.fill();
}

// A bright line that moves up and down across the eye, like a scanner reading it
function drawScan(context, cx, cy, size, time, colors) {
  const y = cy + Math.sin(time * 1.2) * size * 0.7;
  const band = context.createLinearGradient(0, y - 18, 0, y + 18);
  band.addColorStop(0, paint(colors.third, 0));
  band.addColorStop(0.5, paint(colors.third, 0.16));
  band.addColorStop(1, paint(colors.third, 0));
  context.fillStyle = band;
  context.fillRect(cx - size, y - 18, size * 2, 36);
  const line = context.createLinearGradient(cx - size, 0, cx + size, 0);
  line.addColorStop(0, paint(colors.third, 0));
  line.addColorStop(0.5, paint(colors.third, 0.9));
  line.addColorStop(1, paint(colors.third, 0));
  context.fillStyle = line;
  context.fillRect(cx - size, y - 1, size * 2, 2);
}

// Four corner marks around the eye, like a camera's focus frame
function drawBrackets(context, cx, cy, size, colors) {
  const half = size * 1.36;
  const arm = size * 0.22;
  context.strokeStyle = paint(colors.text, 0.4);
  context.lineWidth = 2;
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const x = cx + sx * half;
    const y = cy + sy * half;
    context.beginPath();
    context.moveTo(x, y - sy * arm);
    context.lineTo(x, y);
    context.lineTo(x - sx * arm, y);
    context.stroke();
  }
}
