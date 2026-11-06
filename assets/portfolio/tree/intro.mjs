import { makeTree } from './model.mjs';
import { createTreeRenderer } from './renderer.mjs';
import { pairGlyphs, morphGlyph, coverOpacity, HANDOFF_END } from './morph.mjs';
import { pageGlyphs } from './page-glyphs.mjs';

export function mountTreeMorph() {
  const root = document.documentElement;
  const page = document.querySelector('.home-page');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const treeCanvas = document.createElement('canvas');
  const drawTree = createTreeRenderer(treeCanvas);
  if (!page || !drawTree) { root.classList.remove('morph-pending'); return; }

  const dialog = document.createElement('dialog');
  dialog.className = 'tree-morph';
  dialog.setAttribute('aria-label', 'A tree growing into the homepage');
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  if (!ctx) { root.classList.remove('morph-pending'); return; }
  const skip = document.createElement('button');
  skip.className = 'morph-skip';
  skip.type = 'button';
  skip.textContent = 'skip intro';
  dialog.append(canvas, skip);
  document.body.append(dialog);

  let frame = 0, deadline = 0, run = 0;
  function close() {
    run++;
    cancelAnimationFrame(frame);
    clearTimeout(deadline);
    root.classList.remove('morph-pending', 'morph-active');
    dialog.close();
    dialog.classList.remove('is-resolving');
    dialog.removeAttribute('data-phase');
  }
  function play() {
    if (dialog.open || motion.matches || document.hidden) return;
    const token = ++run;
    const width = innerWidth, height = innerHeight, ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const landed = document.createElement('canvas');
    landed.width = canvas.width;
    landed.height = canvas.height;
    const landedContext = landed.getContext('2d');
    let cachedLanding = false;
    const scale = Math.min((width - 36) / 588, (height - 84) / 532, 1);
    const treeX = (width - 588 * scale) / 2;
    const treeY = Math.max(16, (height - 532 * scale) / 2 - 16);
    const tree = makeTree(43);
    let targets = null, pairs = null, morphStarted = null, lastPaint = -Infinity;
    root.classList.add('morph-active');
    root.classList.remove('morph-pending');
    dialog.dataset.phase = 'growing';
    dialog.showModal();
    const revealTop = Math.max(0, page.querySelector('.home-painting-frame, .home-painting')?.getBoundingClientRect().top || 0);
    pageGlyphs(page, width, height).then(result => {
      if (token === run) targets = result;
    }).catch(() => { if (token === run) close(); });
    const started = performance.now();
    deadline = setTimeout(close, 5000);

    function tick(now) {
      if (token !== run) return;
      try {
        const elapsed = now - started;
        if (morphStarted === null) {
          if (now - lastPaint > 1000 / 30) {
            drawTree(tree, Math.min(1, elapsed / 1500), elapsed);
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(treeCanvas, treeX, treeY, 588 * scale, 532 * scale);
            lastPaint = now;
          }
          if (elapsed >= 1850 && targets !== null) {
            if (!targets.length) { close(); return; }
            drawTree(tree, 1, elapsed);
            const source = drawTree.snapshot().map(glyph => {
              const components = glyph.color.match(/[\d.]+/g).map(Number);
              return { x: treeX + glyph.x * scale, y: treeY + glyph.y * scale,
                char: glyph.char, color: components.slice(0, 3), alpha: components[3], size: 6 * scale };
            });
            pairs = pairGlyphs(source, targets);
            if (!pairs.length) { close(); return; }
            morphStarted = now;
            dialog.dataset.phase = 'morphing';
          }
        } else {
          const travel = now - morphStarted;
          const progress = Math.min(1, travel / 1150);
          if (cachedLanding) {
            ctx.drawImage(landed, 0, 0, width, height);
          } else {
            // White belongs to this layer, so revealing the page never doubles
            // the type or dims both versions halfway through the handoff.
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, width, height);
            let fontSize = '';
            for (const pair of pairs) {
              const glyph = morphGlyph(pair, progress);
              const size = glyph.size.toFixed(1);
              if (size !== fontSize) { ctx.font = `600 ${size}px "Courier New", monospace`; fontSize = size; }
              ctx.fillStyle = `rgba(${glyph.color.join(',')},${glyph.alpha})`;
              ctx.fillText(glyph.char, glyph.x, glyph.y);
            }
            if (progress === 1 && landedContext) {
              landedContext.drawImage(canvas, 0, 0);
              cachedLanding = true;
            }
          }
          if (travel >= 980) {
            dialog.dataset.phase = 'revealing';
            dialog.classList.add('is-resolving');
            const mask = ctx.createLinearGradient(0, 0, 0, height);
            for (let i = 0; i <= 16; i++) {
              mask.addColorStop(i / 16, `rgba(0,0,0,${coverOpacity(travel, i / 16)})`);
            }
            ctx.save();
            ctx.globalCompositeOperation = 'destination-in';
            ctx.fillStyle = mask;
            ctx.fillRect(0, 0, width, height);
            ctx.restore();
            // Keep the paper margin solid while the artwork underneath resolves.
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, width, revealTop);
          }
          // All content is exposed now; the remaining white margin matches the
          // page, so closing the dialog only restores interaction.
          if (travel >= HANDOFF_END) { frame = requestAnimationFrame(close); return; }
        }
        frame = requestAnimationFrame(tick);
      } catch { close(); }
    }
    frame = requestAnimationFrame(tick);
  }
  skip.addEventListener('click', close);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Tab' || event.ctrlKey || event.metaKey || event.altKey) return;
    if (['Shift', 'Control', 'Meta', 'Alt'].includes(event.key)) return;
    event.preventDefault(); close();
  });
  addEventListener('resize', () => { if (dialog.open) close(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && dialog.open) close(); });
  motion.addEventListener('change', () => { if (motion.matches) close(); });
  if (root.classList.contains('morph-pending')) play();
  root.classList.remove('morph-pending');
}
