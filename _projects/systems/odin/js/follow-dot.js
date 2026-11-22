// The "follow the dot" demo on the home page. The visitor presses start, a three second count runs,
// and then a glowing dot moves along a smooth path while the visitor follows it with a mouse or a
// finger. At the end both paths are drawn and the page shows how much of the time the visitor
// stayed close. It shows the idea behind eye tracking; it is not a test of anything.
//
// The section holds the parts, marked:
//   data-odin-demo         the canvas
//   data-odin-demo-start   the start button
//   data-odin-demo-result  the block that shows the score, hidden until a run ends
//   data-odin-demo-score   where the score goes, such as "72%"

import { prefersLessMotion, startCanvas } from './canvas-loop.js';
import { RUN_SECONDS, closeRadius, closeShare, dotPosition, percentText } from './dot-path.js';
import { paint, readPalette } from './palette.js';
import { watchTheme } from './site-frame.js';

const COUNTDOWN_SECONDS = 3;
// How much of each path stays drawn behind the dot while it runs, in seconds
const TRAIL_SECONDS = 1.2;

export function startDemo(section) {
  const canvas = section?.querySelector('[data-odin-demo]');
  const button = section?.querySelector('[data-odin-demo-start]');
  const result = section?.querySelector('[data-odin-demo-result]');
  const score = section?.querySelector('[data-odin-demo-score]');
  if (!canvas || !button) return null;

  let palette = readPalette(canvas);
  const lessMotion = prefersLessMotion();
  const run = { mode: 'idle', startedAt: 0, samples: [], pointer: null, moved: false, width: 0, height: 0 };

  // Every move during a run is a sample, so the score does not depend on how fast the screen
  // redraws. A frame adds one more only when the pointer has been still since the last frame, so
  // holding still while the dot moves away counts too.
  const place = (event) => {
    const box = canvas.getBoundingClientRect();
    run.pointer = { x: event.clientX - box.left, y: event.clientY - box.top };
    if (run.mode !== 'run') return;
    const seconds = performance.now() / 1000 - run.startedAt;
    if (seconds <= RUN_SECONDS) {
      run.samples.push({ t: seconds, ...run.pointer });
      run.moved = true;
    }
  };
  canvas.addEventListener('pointermove', place);
  canvas.addEventListener('pointerdown', place);
  canvas.addEventListener('pointerleave', () => { run.pointer = null; });

  const finish = () => {
    run.mode = 'done';
    if (score) score.textContent = percentText(closeShare(run.samples, run.width, run.height));
    if (result) result.hidden = false;
    button.disabled = false;
    canvas.classList.remove('is-running');
  };

  button.addEventListener('click', () => {
    run.mode = 'countdown';
    run.startedAt = performance.now() / 1000;
    run.samples = [];
    button.disabled = true;
    if (result) result.hidden = true;
    canvas.classList.add('is-running');
  });

  // The visitor starts this motion themselves, so it runs even for one who asks for less motion;
  // only the idle drift stays still for them.
  const loop = startCanvas(canvas, (context, frame) => {
    run.width = frame.width;
    run.height = frame.height;
    const now = performance.now() / 1000;
    if (run.mode === 'countdown' && now - run.startedAt >= COUNTDOWN_SECONDS) {
      run.mode = 'run';
      run.startedAt = now;
    }
    if (run.mode === 'run') {
      const seconds = now - run.startedAt;
      if (run.pointer && !run.moved) run.samples.push({ t: Math.min(seconds, RUN_SECONDS), ...run.pointer });
      run.moved = false;
      if (seconds >= RUN_SECONDS) finish();
    }
    drawDemo(context, frame, run, palette, now, lessMotion);
  }, { still: false });

  watchTheme(() => {
    palette = readPalette(canvas);
    loop.redraw();
  });
  return loop;
}

function drawDemo(context, { width, height }, run, colors, now, lessMotion) {
  context.clearRect(0, 0, width, height);
  drawDots(context, width, height, colors);

  if (run.mode === 'idle') {
    drawPath(context, width, height, 0, RUN_SECONDS, paint(colors.text, 0.12), [4, 8]);
    const drift = lessMotion ? 2 : (now * 0.45) % RUN_SECONDS;
    drawTarget(context, dotPosition(drift, width, height), colors, now, lessMotion);
    return;
  }

  if (run.mode === 'countdown') {
    const left = Math.max(1, Math.ceil(COUNTDOWN_SECONDS - (now - run.startedAt)));
    const part = (now - run.startedAt) % 1;
    const start = dotPosition(0, width, height);
    drawTarget(context, start, colors, now, false);
    context.save();
    context.font = `800 ${Math.round(Math.min(width, height) * 0.28)}px Sora, system-ui, sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = paint(colors.text, 0.9 - part * 0.6);
    context.fillText(String(left), width / 2, height / 2);
    context.restore();
    return;
  }

  if (run.mode === 'run') {
    const seconds = now - run.startedAt;
    drawPath(context, width, height, Math.max(0, seconds - TRAIL_SECONDS), seconds, paint(colors.third, 0.8), []);
    drawVisitor(context, run.samples.filter((sample) => sample.t >= seconds - TRAIL_SECONDS), width, height, colors, false);
    const dot = dotPosition(seconds, width, height);
    // The ring shows how close counts as following
    context.beginPath();
    context.arc(dot.x, dot.y, closeRadius(width, height), 0, Math.PI * 2);
    context.setLineDash([3, 6]);
    context.strokeStyle = paint(colors.third, 0.45);
    context.lineWidth = 1.5;
    context.stroke();
    context.setLineDash([]);
    drawTarget(context, dot, colors, now, false);
    drawProgress(context, width, height, seconds / RUN_SECONDS, colors);
    return;
  }

  // Done: both whole paths, with the visitor's colored where it was close to the dot
  drawPath(context, width, height, 0, RUN_SECONDS, paint(colors.third, 0.85), []);
  drawVisitor(context, run.samples, width, height, colors, true);
  drawTarget(context, dotPosition(RUN_SECONDS, width, height), colors, now, true);
  drawProgress(context, width, height, 1, colors);
}

function drawDots(context, width, height, colors) {
  context.fillStyle = paint(colors.text, 0.08);
  for (let x = 16; x < width; x += 32) {
    for (let y = 16; y < height; y += 32) {
      context.fillRect(x, y, 1.5, 1.5);
    }
  }
}

// The dot's path between two moments of a run
function drawPath(context, width, height, from, to, color, dash) {
  context.beginPath();
  for (let seconds = from; seconds <= to; seconds += 1 / 60) {
    const { x, y } = dotPosition(seconds, width, height);
    if (seconds === from) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.setLineDash(dash);
  context.strokeStyle = color;
  context.lineWidth = 3;
  context.lineCap = 'round';
  context.stroke();
  context.setLineDash([]);
}

// The visitor's path. At the end each piece is bright where it was close to the dot and faint where
// it was not.
function drawVisitor(context, samples, width, height, colors, judged) {
  const radius = closeRadius(width, height);
  context.lineWidth = 3;
  context.lineCap = 'round';
  for (let index = 1; index < samples.length; index += 1) {
    const from = samples[index - 1];
    const to = samples[index];
    let color = paint(colors.second, 0.9);
    if (judged) {
      const dot = dotPosition(to.t, width, height);
      color = Math.hypot(to.x - dot.x, to.y - dot.y) <= radius ? paint(colors.second, 0.95) : paint(colors.text, 0.25);
    }
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.strokeStyle = color;
    context.stroke();
  }
}

function drawTarget(context, { x, y }, colors, now, still) {
  const pulse = still ? 0.5 : (Math.sin(now * 4) + 1) / 2;
  const glow = context.createRadialGradient(x, y, 2, x, y, 34);
  glow.addColorStop(0, paint(colors.third, 0.7));
  glow.addColorStop(1, paint(colors.third, 0));
  context.fillStyle = glow;
  context.beginPath();
  context.arc(x, y, 34, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.arc(x, y, 8 + pulse * 2, 0, Math.PI * 2);
  context.fillStyle = paint(colors.third, 1);
  context.fill();
  context.beginPath();
  context.arc(x, y, 3, 0, Math.PI * 2);
  context.fillStyle = paint(colors.background, 0.9);
  context.fill();
}

function drawProgress(context, width, height, share, colors) {
  const bar = context.createLinearGradient(0, 0, width, 0);
  bar.addColorStop(0, paint(colors.accent, 1));
  bar.addColorStop(1, paint(colors.second, 1));
  context.fillStyle = paint(colors.text, 0.08);
  context.fillRect(0, height - 4, width, 4);
  context.fillStyle = bar;
  context.fillRect(0, height - 4, width * Math.min(1, share), 4);
}
