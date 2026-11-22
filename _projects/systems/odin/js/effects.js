// The motion on ODIN's pages, started once a page's content is showing:
//   data-odin-reveal   rises and fades in when it scrolls into view
//   data-odin-count    counts up to its figure, such as "$131,500,000", when it comes into view
//   data-odin-glow     a soft light follows the pointer across it
//   data-odin-stepper  a list whose items take turns being the active step, and can be picked
// Links to a part of the page scroll there smoothly. A visitor who asks for less motion gets every
// part showing at once, the figures as they are, and no automatic stepping.

import { prefersLessMotion } from './canvas-loop.js';
import { easeOut, formatFigure, parseFigure } from './figures.js';

const COUNT_SECONDS = 1.8;
const STEP_SECONDS = 3.2;

// Marks the page so parts waiting to be revealed start hidden. Call it before the content shows, so
// nothing flashes in and then disappears again.
export function prepareMotion(root) {
  if (root && !prefersLessMotion()) root.classList.add('odin--motion');
}

export function startEffects(root) {
  if (!root) return;
  const still = prefersLessMotion();
  reveal(root, still);
  countUp(root, still);
  glow(root, still);
  steppers(root, still);
  smoothLinks(root, still);
}

// Calls onSeen once for each element, the first time it scrolls into view.
function whenSeen(elements, onSeen, threshold = 0.15) {
  if (typeof IntersectionObserver !== 'function') {
    elements.forEach(onSeen);
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      onSeen(entry.target);
    }
  }, { threshold, rootMargin: '0px 0px -6% 0px' });
  elements.forEach((element) => observer.observe(element));
}

function reveal(root, still) {
  const parts = [...root.querySelectorAll('[data-odin-reveal]')];
  const show = (element) => element.classList.add('is-shown');
  if (still) parts.forEach(show);
  else whenSeen(parts, show);
}

// The counting number is shown to sight only. A screen reader reads the figure itself from a hidden
// copy, so it never hears a count that has not finished, such as "$0".
function countUp(root, still) {
  if (still) return;
  const figures = [...root.querySelectorAll('[data-odin-count]')]
    .map((element) => ({ element, text: element.textContent, parts: parseFigure(element.textContent) }))
    .filter((figure) => figure.parts !== null);
  for (const figure of figures) {
    figure.shown = document.createElement('span');
    figure.shown.setAttribute('aria-hidden', 'true');
    figure.shown.textContent = formatFigure(figure.parts, 0);
    const read = document.createElement('span');
    read.className = 'odin__sr';
    read.textContent = figure.text;
    figure.element.replaceChildren(figure.shown, read);
  }
  whenSeen(figures.map((figure) => figure.element), (element) => {
    const figure = figures.find((candidate) => candidate.element === element);
    const start = performance.now();
    const step = (now) => {
      const progress = (now - start) / 1000 / COUNT_SECONDS;
      if (progress >= 1) {
        // The last frame is the figure exactly as the backend wrote it
        figure.shown.textContent = figure.text;
        return;
      }
      figure.shown.textContent = formatFigure(figure.parts, figure.parts.value * easeOut(progress));
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, 0.5);
}

function glow(root, still) {
  if (still) return;
  for (const card of root.querySelectorAll('[data-odin-glow]')) {
    card.addEventListener('pointermove', (event) => {
      const box = card.getBoundingClientRect();
      card.style.setProperty('--odin-mx', `${Math.round(event.clientX - box.left)}px`);
      card.style.setProperty('--odin-my', `${Math.round(event.clientY - box.top)}px`);
    });
  }
}

// A list of steps. One step at a time is active: it shows its text and the line beside the list
// fills up to it. Pointing at, clicking or tabbing to a step makes it active. While the list is on
// screen and the visitor is not using it, the next step becomes active every few seconds.
function steppers(root, still) {
  for (const list of root.querySelectorAll('[data-odin-stepper]')) {
    const steps = [...list.querySelectorAll('li')];
    if (steps.length === 0) continue;
    let active = 0;
    let inUse = false;
    let onScreen = false;

    const activate = (index) => {
      active = index;
      steps.forEach((step, place) => {
        step.classList.toggle('is-active', place === index);
        step.classList.toggle('is-done', place < index);
        if (place === index) step.setAttribute('aria-current', 'step');
        else step.removeAttribute('aria-current');
      });
      list.style.setProperty('--odin-progress', steps.length > 1 ? String(index / (steps.length - 1)) : '1');
    };

    steps.forEach((step, index) => {
      step.tabIndex = 0;
      step.addEventListener('pointerenter', () => activate(index));
      step.addEventListener('focus', () => activate(index));
      step.addEventListener('click', () => activate(index));
    });
    list.addEventListener('pointerenter', () => { inUse = true; });
    list.addEventListener('pointerleave', () => { inUse = false; });
    activate(0);

    if (still) continue;
    if (typeof IntersectionObserver === 'function') {
      new IntersectionObserver((entries) => {
        onScreen = entries[entries.length - 1].isIntersecting;
      }, { threshold: 0.4 }).observe(list);
    }
    setInterval(() => {
      if (onScreen && !inUse && !list.contains(document.activeElement)) activate((active + 1) % steps.length);
    }, STEP_SECONDS * 1000);
  }
}

function smoothLinks(root, still) {
  root.addEventListener('click', (event) => {
    const link = event.target instanceof Element ? event.target.closest('a[href^="#"]') : null;
    if (!link || !root.contains(link)) return;
    const id = link.getAttribute('href').slice(1);
    const target = id ? document.getElementById(id) : null;
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
    history.replaceState(null, '', `#${id}`);
  });
}
