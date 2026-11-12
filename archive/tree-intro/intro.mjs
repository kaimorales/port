import { makeTree } from '../../assets/tree/model.mjs';
import { createTreeRenderer } from './renderer.mjs';

const root = document.documentElement;
const footer = document.querySelector('.home-footer');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const SESSION_KEY = 'kai-tree-seen-v1';

function setup() {
  if (!footer || !document.createElement('canvas').getContext('2d')) return;
  let tree = makeTree(Math.floor(Math.random() * 0xffffffff));
  const replay = document.createElement('button');
  replay.className = 'tree-replay';
  replay.type = 'button';
  replay.setAttribute('aria-label', 'Grow another tree');
  replay.title = 'Grow another tree';
  const miniature = document.createElement('canvas');
  miniature.setAttribute('aria-hidden', 'true');
  replay.append(miniature);
  footer.append(replay);
  const drawMiniature = createTreeRenderer(miniature);
  if (!drawMiniature) { replay.remove(); return; }
  drawMiniature(tree, 1, 0, true);

  const dialog = document.createElement('dialog');
  dialog.className = 'tree-intro';
  dialog.setAttribute('aria-label', 'A growing ASCII tree');
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const draw = createTreeRenderer(canvas);
  if (!draw) { replay.remove(); return; }
  const skip = document.createElement('button');
  skip.className = 'tree-skip';
  skip.type = 'button';
  skip.textContent = 'skip';
  skip.setAttribute('aria-label', 'Skip tree intro');
  dialog.append(canvas, skip);
  document.body.append(dialog);

  let frame = 0, deadline = 0, closing = false, manual = false, mature = false;
  function close() {
    cancelAnimationFrame(frame);
    clearTimeout(deadline);
    root.classList.remove('intro-pending');
    dialog.close();
    dialog.classList.remove('is-dispersing');
    closing = false;
    if (manual) replay.focus({ preventScroll: true });
  }
  function finish(immediate = false) {
    if (!dialog.open) return;
    if (immediate || motion.matches) {
      close();
      drawMiniature(tree, 1, 0, true);
      return;
    }
    if (closing) return;
    closing = true;
    cancelAnimationFrame(frame);
    clearTimeout(deadline);
    root.classList.remove('intro-pending');
    drawMiniature(tree, 1, 0, true);
    dialog.classList.add('is-dispersing');
    const started = performance.now();
    function scatter(now) {
      try {
        const progress = Math.min(1, (now - started) / 600);
        draw.disperse(progress);
        if (progress >= 1) close();
        else frame = requestAnimationFrame(scatter);
      } catch { close(); }
    }
    frame = requestAnimationFrame(scatter);
    deadline = setTimeout(close, 1000);
  }
  function play(isManual) {
    if (dialog.open) return;
    manual = isManual;
    mature = false;
    tree = makeTree(Math.floor(Math.random() * 0xffffffff));
    skip.textContent = motion.matches ? 'close' : 'skip';
    skip.setAttribute('aria-label', motion.matches ? 'Close tree' : 'Skip tree intro');
    dialog.showModal();
    root.classList.remove('intro-pending');
    draw(tree, motion.matches ? 1 : 0);
    if (motion.matches) { mature = true; return; }
    const start = performance.now();
    let lastFrame = -Infinity;
    function tick(now) {
      try {
        const elapsed = now - start;
        mature = elapsed >= 1700;
        if (now - lastFrame >= 1000 / 30) {
          draw(tree, Math.min(1, elapsed / 1700), elapsed);
          lastFrame = now;
        }
        if (elapsed >= 1950 && manual) {
          skip.textContent = 'back';
          skip.setAttribute('aria-label', 'Back to homepage');
          frame = requestAnimationFrame(tick);
        }
        else if (elapsed >= 1950) finish();
        else frame = requestAnimationFrame(tick);
      } catch { finish(true); }
    }
    frame = requestAnimationFrame(tick);
    if (!manual) deadline = setTimeout(() => finish(true), 2800);
  }
  replay.addEventListener('click', () => play(true));
  dialog.addEventListener('click', () => finish(!mature || closing));
  dialog.addEventListener('keydown', event => {
    if (event.metaKey || event.ctrlKey || event.altKey || ['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) return;
    event.preventDefault();
    finish(true);
  });
  dialog.addEventListener('cancel', event => { event.preventDefault(); finish(true); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      finish(true);
    }
  });
  motion.addEventListener('change', () => { if (motion.matches) finish(true); });
  if (root.classList.contains('intro-pending') && !motion.matches && !document.hidden) {
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* Storage is optional. */ }
    play(false);
  }
}

try { setup(); } finally { root.classList.remove('intro-pending'); }
