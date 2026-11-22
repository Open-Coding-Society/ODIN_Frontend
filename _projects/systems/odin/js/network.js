// The moving background of the About and Contact Us page headers: points that drift and link up
// when they come close, like signals passing between nerve cells. The points lean toward the
// visitor's pointer. It is decoration only.

import { prefersLessMotion, startCanvas } from './canvas-loop.js';
import { paint, readPalette } from './palette.js';
import { watchTheme } from './site-frame.js';

// Points closer than this many CSS pixels are joined by a line.
const LINK_DISTANCE = 130;

export function startNetwork(canvas) {
  if (!canvas) return null;
  let palette = readPalette(canvas);
  const field = { points: [], width: 0, height: 0, pointer: null };

  const track = (event) => {
    const box = canvas.getBoundingClientRect();
    const x = event.clientX - box.left;
    const y = event.clientY - box.top;
    field.pointer = x >= 0 && y >= 0 && x <= box.width && y <= box.height ? { x, y } : null;
  };
  if (!prefersLessMotion()) window.addEventListener('pointermove', track, { passive: true });

  const loop = startCanvas(canvas, (context, frame) => drawNetwork(context, frame, field, palette));
  watchTheme(() => {
    palette = readPalette(canvas);
    loop.redraw();
  });
  return loop;
}

// Makes enough points for the canvas's size. A seeded sequence places them, so the still frame for
// a visitor who asks for less motion looks the same every time.
function seedPoints(field, width, height) {
  let seed = 7;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const count = Math.round(Math.min(110, Math.max(36, (width * height) / 11000)));
  field.points = Array.from({ length: count }, () => ({
    x: random() * width,
    y: random() * height,
    vx: (random() - 0.5) * 26,
    vy: (random() - 0.5) * 26,
    r: 1.2 + random() * 1.8,
    tint: random(),
  }));
  field.width = width;
  field.height = height;
}

function drawNetwork(context, { width, height, delta, still }, field, colors) {
  if (field.width !== width || field.height !== height) seedPoints(field, width, height);
  context.clearRect(0, 0, width, height);

  for (const point of field.points) {
    if (!still) {
      if (field.pointer) {
        const dx = field.pointer.x - point.x;
        const dy = field.pointer.y - point.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 220 && distance > 1) {
          point.vx += (dx / distance) * 18 * delta;
          point.vy += (dy / distance) * 18 * delta;
        }
      }
      // Speed settles back to a drift
      const speed = Math.hypot(point.vx, point.vy);
      if (speed > 30) {
        point.vx *= 30 / speed;
        point.vy *= 30 / speed;
      }
      point.x += point.vx * delta;
      point.y += point.vy * delta;
      if (point.x < -20) point.x = width + 20;
      if (point.x > width + 20) point.x = -20;
      if (point.y < -20) point.y = height + 20;
      if (point.y > height + 20) point.y = -20;
    }
  }

  context.lineWidth = 1;
  for (let a = 0; a < field.points.length; a += 1) {
    for (let b = a + 1; b < field.points.length; b += 1) {
      const first = field.points[a];
      const second = field.points[b];
      const distance = Math.hypot(first.x - second.x, first.y - second.y);
      if (distance < LINK_DISTANCE) {
        context.beginPath();
        context.moveTo(first.x, first.y);
        context.lineTo(second.x, second.y);
        context.strokeStyle = paint(first.tint > 0.5 ? colors.accent : colors.second, (1 - distance / LINK_DISTANCE) * 0.35);
        context.stroke();
      }
    }
  }

  for (const point of field.points) {
    const color = point.tint > 0.66 ? colors.third : point.tint > 0.33 ? colors.accent : colors.second;
    context.beginPath();
    context.arc(point.x, point.y, point.r, 0, Math.PI * 2);
    context.fillStyle = paint(color, 0.85);
    context.fill();
  }
}
