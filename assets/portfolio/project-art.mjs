// Original character drawings. The paths are shared by the drawing and its
// assembly, so every mark arrives along the structure it belongs to.
const WIDTH = 560;
const HEIGHT = 220;
const DURATION = 1950;
const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

function random(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

function point(curve, t) {
  const u = 1 - t;
  return {
    x: u ** 3 * curve[0] + 3 * u * u * t * curve[2] + 3 * u * t * t * curve[4] + t ** 3 * curve[6],
    y: u ** 3 * curve[1] + 3 * u * u * t * curve[3] + 3 * u * t * t * curve[5] + t ** 3 * curve[7],
  };
}

function buildScene(scene) {
  const glyphs = [];
  const rand = random(scene === 'football' ? 197 : 43);

  function path(curve, { start = 0, duration = .6, opacity = .64, spacing = 3, weight = 1, chars = '.,:;+' } = {}) {
    let length = 0, prev = point(curve, 0);
    for (let i = 1; i <= 80; i++) {
      const p = point(curve, i / 80);
      length += Math.hypot(p.x - prev.x, p.y - prev.y); prev = p;
    }
    const count = Math.max(2, Math.ceil(length / spacing));
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      for (let lane = 0; lane < weight; lane++) {
        const offset = (lane - (weight - 1) / 2) * 2.7;
        const p = point(curve, t);
        const q = point(curve, Math.min(1, t + .008));
        const angle = Math.atan2(q.y - p.y, q.x - p.x);
        glyphs.push({ curve, t, offset, angle, x: p.x - Math.sin(angle) * offset, y: p.y + Math.cos(angle) * offset,
          start: start + t * duration, travel: .13 + rand() * .055,
          opacity: opacity * (.72 + rand() * .28), char: chars[Math.floor(rand() * chars.length)], size: 5.8 });
      }
    }
  }

  function line(x1, y1, x2, y2, opts) {
    path([x1, y1, lerp(x1, x2, .33), lerp(y1, y2, .33), lerp(x1, x2, .66), lerp(y1, y2, .66), x2, y2], opts);
  }

  function cluster(cx, cy, rx, ry, { start = .4, count = 80, opacity = .68 } = {}) {
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand());
      const ripple = 1 + .15 * Math.sin(a * 3 + cx);
      const x = cx + Math.cos(a) * rx * r * ripple;
      const y = cy + Math.sin(a) * ry * r;
      glyphs.push({ x, y, seedX: cx, seedY: cy, start: start + r * .12 + rand() * .035,
        travel: .16, opacity: opacity * (1 - r * .55), char: r < .35 ? '+x:'[i % 3] : '.,:·'[i % 4], size: 5.5 });
    }
  }

  function ring(cx, cy, radius, { start = .3, opacity = .8, char = 'o' } = {}) {
    const count = Math.max(8, Math.ceil(radius * 6.28 / 3));
    for (let i = 0; i < count; i++) {
      const angle = i / count * Math.PI * 2;
      const x = cx + Math.cos(angle) * radius, y = cy + Math.sin(angle) * radius;
      glyphs.push({ x, y, seedX: cx, seedY: cy, start: start + i / count * .06, travel: .1, opacity, char, size: 5.5 });
    }
  }

  if (scene === 'football') {
    // The pitch arrives as four quiet edges, then yard marks and the play.
    const pale = { start: .02, duration: .35, opacity: .35, spacing: 3.4, chars: '.:+' };
    line(58, 29, 502, 29, pale); line(502, 29, 502, 191, pale);
    line(502, 191, 58, 191, pale); line(58, 191, 58, 29, pale);
    for (let i = 1; i < 10; i++) {
      const x = 58 + i * 44.4;
      line(x, 29, x, 191, { start: .08 + i * .015, duration: .27, opacity: .23, spacing: 3.8, chars: '.:' });
      for (const y of [81, 139]) line(x - 5, y, x + 5, y, { start: .2 + i * .015, duration: .02, opacity: .42 });
    }
    const players = [[135, 64], [135, 94], [135, 124], [135, 155], [102, 110]];
    for (let i = 0; i < players.length; i++) ring(...players[i], 5, { start: .32 + i * .02, char: 'o', opacity: .75 });
    const defenders = [[195, 62], [208, 110], [197, 157], [299, 81], [322, 145]];
    for (const [x, y] of defenders) {
      line(x - 4, y - 4, x + 4, y + 4, { start: .36, duration: .04, opacity: .5, chars: 'x' });
      line(x - 4, y + 4, x + 4, y - 4, { start: .37, duration: .04, opacity: .5, chars: 'x' });
    }
    path([140, 64, 208, 64, 224, 47, 283, 48], { start: .43, duration: .31, opacity: .85, weight: 2, chars: '.:+*' });
    path([140, 94, 230, 96, 249, 148, 395, 159], { start: .45, duration: .34, opacity: .88, weight: 2, chars: '.:+*' });
    path([140, 155, 260, 157, 329, 45, 457, 62], { start: .47, duration: .35, opacity: .9, weight: 2, chars: '.:+*' });
    path([107, 110, 124, 104, 126, 125, 135, 124], { start: .4, duration: .1, opacity: .6, spacing: 3.5 });
    for (const [x, y, angle, start] of [[283, 48, 0, .74], [395, 159, .1, .79], [457, 62, .1, .82]]) {
      for (const side of [-1, 1]) line(x - 13 * Math.cos(angle + side * .5), y - 13 * Math.sin(angle + side * .5), x, y, { start, duration: .045, opacity: .9, chars: '.:+', weight: 1 });
    }
  } else {
    // A branching context structure. Curved connections grow from a shared
    // source; each terminal gathers its own small, irregular cloud of marks.
    path([48, 114, 160, 76, 337, 151, 505, 106], { start: .02, duration: .65, weight: 4, opacity: .78, chars: '.,:+' });
    path([50, 114, 180, 136, 355, 83, 505, 106], { start: .05, duration: .63, weight: 3, opacity: .52 });
    const branches = [
      [[96, 104, 115, 99, 114, 50, 163, 46], .13],
      [[139, 104, 163, 108, 163, 175, 209, 174], .2],
      [[210, 108, 230, 102, 240, 61, 289, 65], .28],
      [[288, 115, 322, 123, 315, 173, 363, 166], .37],
      [[370, 120, 398, 109, 405, 52, 449, 54], .46],
      [[435, 115, 449, 118, 458, 150, 488, 145], .53],
    ];
    for (const [curve, start] of branches) {
      path(curve, { start, duration: .19, weight: 3, opacity: .78 });
      const x = curve[6], y = curve[7];
      cluster(x, y, 24 + rand() * 8, 13 + rand() * 6, { start: start + .16, count: 150, opacity: .78 });
      // Short tributaries make the image read as a structure of many records.
      for (let i = 0; i < 3; i++) {
        const t = .45 + i * .12, p = point(curve, t);
        const direction = y < 110 ? -1 : 1;
        const tipX = p.x + 13 + i * 5, tipY = p.y + direction * (12 + i * 5);
        path([p.x, p.y, p.x + 6, p.y, tipX - 9, tipY, tipX, tipY], { start: start + t * .18, duration: .09, opacity: .4, spacing: 3 });
        cluster(tipX, tipY, 6, 4, { start: start + t * .18 + .07, count: 16, opacity: .65 });
      }
    }
    cluster(49, 114, 12, 15, { start: .02, count: 100, opacity: .9 });
    cluster(506, 106, 18, 21, { start: .68, count: 180, opacity: .94 });
    // Faint secondary bridges connect neighboring context clusters.
    path([164, 46, 206, 14, 264, 26, 289, 65], { start: .45, duration: .27, opacity: .3, spacing: 4, chars: '.,' });
    path([209, 174, 268, 200, 326, 199, 363, 166], { start: .49, duration: .27, opacity: .3, spacing: 4, chars: '.,' });
    path([289, 65, 353, 34, 397, 26, 449, 54], { start: .52, duration: .27, opacity: .3, spacing: 4, chars: '.,' });
  }
  return glyphs;
}

export function mountProjectArt(container, { scene = 'harlen', reducedMotion = false } = {}) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'display:block;width:100%;height:220px;pointer-events:none';
  container.append(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return { replay() {}, destroy() { canvas.remove(); } };
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const glyphs = buildScene(scene);
  let frame = 0, destroyed = false, width = 0, ratio = 1, startTime = 0;
  let running = false;
  const shouldReduce = () => motion.matches || (typeof reducedMotion === 'function' ? reducedMotion() : reducedMotion);

  function size() {
    width = Math.max(1, container.getBoundingClientRect().width);
    ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(220 * ratio);
  }

  function draw(progress) {
    const scale = Math.min(width / WIDTH, 1);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, 220);
    ctx.translate((width - WIDTH * scale) / 2, (220 - HEIGHT * scale) / 2);
    ctx.scale(scale, scale);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '600 6.7px "Courier New", monospace';
    for (const glyph of glyphs) {
      if (progress < glyph.start) continue;
      const p = smooth((progress - glyph.start) / glyph.travel);
      let x, y;
      if (glyph.curve) {
        const position = point(glyph.curve, glyph.t * (.82 + .18 * p));
        x = position.x - Math.sin(glyph.angle) * glyph.offset;
        y = position.y + Math.cos(glyph.angle) * glyph.offset;
      } else {
        x = lerp(glyph.seedX, glyph.x, p);
        y = lerp(glyph.seedY, glyph.y, p);
      }
      const opacity = Math.min(.96, glyph.opacity * 1.45) * smooth(p * 2.5);
      ctx.fillStyle = `rgba(48,85,36,${opacity})`;
      ctx.fillText(glyph.char, x, y);
    }
  }

  function finish() {
    cancelAnimationFrame(frame); running = false;
    if (!destroyed) draw(1.2);
  }
  function tick(now) {
    if (destroyed) return;
    const elapsed = (now - startTime) / DURATION;
    draw(elapsed * 1.12);
    if (elapsed < 1) frame = requestAnimationFrame(tick);
    else finish();
  }
  function replay() {
    if (destroyed) return;
    cancelAnimationFrame(frame); size();
    if (shouldReduce() || document.hidden) { finish(); return; }
    running = true; startTime = performance.now(); draw(0);
    frame = requestAnimationFrame(tick);
  }
  const observer = new ResizeObserver(() => {
    const next = container.getBoundingClientRect().width;
    if (next && Math.abs(next - width) > 1) { size(); finish(); }
  });
  const visibility = () => { if (document.hidden && running) finish(); };
  const motionChange = () => { if (shouldReduce()) finish(); };
  observer.observe(container);
  document.addEventListener('visibilitychange', visibility);
  motion.addEventListener('change', motionChange);
  replay();
  return {
    replay,
    destroy() {
      destroyed = true; cancelAnimationFrame(frame); observer.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      motion.removeEventListener('change', motionChange); canvas.remove();
    },
  };
}
