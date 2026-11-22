// Runs a drawing on a canvas. It sizes the canvas for the screen it is on, redraws every frame while
// the canvas is on screen and the tab is showing, and stops when it is not, so a drawing the visitor
// can't see costs nothing. A visitor who asks for less motion gets one still frame.

// Whether the visitor's system asks for less motion.
export function prefersLessMotion() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Starts `draw(context, frame)` on `canvas`. `frame` holds width and height (in CSS pixels), time
// (seconds since the start), delta (seconds since the last frame, at most a twentieth) and still
// (true when only a still frame is drawn). Returns { redraw, stop }.
export function startCanvas(canvas, draw, { still = prefersLessMotion() } = {}) {
  const context = canvas && typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null;
  if (!context) return { redraw() {}, stop() {} };

  let width = 0;
  let height = 0;
  let frameId = 0;
  let running = false;
  let onScreen = true;
  const start = performance.now();
  let last = start;

  const render = (now) => {
    if (width === 0 || height === 0) return;
    const delta = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    draw(context, { width, height, time: still ? 0 : (now - start) / 1000, delta, still });
  };

  const resize = () => {
    const box = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = box.width;
    height = box.height;
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    // A resize clears the canvas, so a drawing that is not running is drawn again at once
    if (!running) render(performance.now());
  };

  const tick = (now) => {
    if (!running) return;
    render(now);
    frameId = requestAnimationFrame(tick);
  };

  const update = () => {
    const shouldRun = !still && onScreen && document.visibilityState === 'visible';
    if (shouldRun && !running) {
      running = true;
      last = performance.now();
      frameId = requestAnimationFrame(tick);
    } else if (!shouldRun && running) {
      running = false;
      cancelAnimationFrame(frameId);
    }
  };

  const sizer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  sizer?.observe(canvas);
  const watcher = typeof IntersectionObserver === 'function'
    ? new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1].isIntersecting;
      update();
    })
    : null;
  watcher?.observe(canvas);
  document.addEventListener('visibilitychange', update);
  resize();
  update();

  return {
    redraw: () => render(performance.now()),
    stop() {
      running = false;
      cancelAnimationFrame(frameId);
      sizer?.disconnect();
      watcher?.disconnect();
      document.removeEventListener('visibilitychange', update);
    },
  };
}
