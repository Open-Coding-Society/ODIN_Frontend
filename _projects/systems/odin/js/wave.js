// A small moving chart beside the assessment steps: a target's path and an eye's path that follows
// it a moment behind, the kind of trace eye tracking records. It is a picture, with no data in it.

import { startCanvas } from './canvas-loop.js';
import { paint, readPalette } from './palette.js';
import { watchTheme } from './site-frame.js';

export function startWave(canvas) {
  if (!canvas) return null;
  let palette = readPalette(canvas);
  const loop = startCanvas(canvas, (context, frame) => drawWave(context, frame, palette));
  watchTheme(() => {
    palette = readPalette(canvas);
    loop.redraw();
  });
  return loop;
}

// Where a path is at `x`. The eye's path lags the target's and wavers a little.
function target(x, time, height) {
  return height / 2 + Math.sin(x * 0.018 + time * 1.6) * height * 0.26 + Math.sin(x * 0.006 - time * 0.7) * height * 0.08;
}

function eye(x, time, height) {
  return target(x, time - 0.18, height) + Math.sin(x * 0.21 + time * 6) * 1.6;
}

function drawWave(context, { width, height, time }, colors) {
  context.clearRect(0, 0, width, height);

  context.strokeStyle = paint(colors.text, 0.07);
  context.lineWidth = 1;
  for (let x = 0; x <= width; x += 28) {
    context.beginPath();
    context.moveTo(x + 0.5, 0);
    context.lineTo(x + 0.5, height);
    context.stroke();
  }
  for (let y = 0; y <= height; y += 28) {
    context.beginPath();
    context.moveTo(0, y + 0.5);
    context.lineTo(width, y + 0.5);
    context.stroke();
  }

  const line = (path, color, lineWidth, dash) => {
    context.beginPath();
    for (let x = 0; x <= width; x += 4) {
      const y = path(x, time, height);
      if (x === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.setLineDash(dash);
    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    context.stroke();
    context.setLineDash([]);
  };
  line(target, paint(colors.third, 0.9), 2, []);
  line(eye, paint(colors.second, 0.9), 2, [6, 5]);

  // A dot on each path at the right edge, where the newest reading is
  for (const [path, color] of [[target, colors.third], [eye, colors.second]]) {
    const y = path(width - 6, time, height);
    context.beginPath();
    context.arc(width - 6, y, 4, 0, Math.PI * 2);
    context.fillStyle = paint(color, 1);
    context.shadowColor = paint(color, 0.8);
    context.shadowBlur = 12;
    context.fill();
    context.shadowBlur = 0;
  }
}
