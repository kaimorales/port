import { curvePoint, growth } from './model.mjs';

const COLS = 168, ROWS = 95;
const WIDTH = 588, HEIGHT = 532;
const RAMP = ' .,:;+=ox%#@';
const leafColors = Array.from({ length: 24 }, (_, i) => {
  const light = i / 23;
  return `rgb(${Math.round(12 + light * 58)},${Math.round(104 + light * 106)},${Math.round(36 + light * 44)})`;
});

// Paint a shaded botanical scene at one pixel per character, then retype it.
// This uses the rendering idea of asciiFlowers with original tree geometry/art.
export function createTreeRenderer(canvas) {
  const output = canvas.getContext('2d');
  if (!output) return null;
  const raster = document.createElement('canvas');
  raster.width = COLS;
  raster.height = ROWS;
  const g = raster.getContext('2d', { willReadFrequently: true });
  if (!g) return null;
  let glyphs = [];

  function breeze(x, y, time, phase = 0) {
    const lift = Math.max(0, (710 - y) / 650);
    return [x + (Math.sin(time * .0008 + y * .008) * 3.5 + Math.sin(time * .0011 + phase) * 1.2) * lift * lift, y];
  }

  function branchShape(branch, progress, time) {
    const amount = growth(progress, branch.start, branch.end);
    if (amount <= 0) return;
    const points = [], normals = [], widths = [];
    const steps = Math.max(4, Math.ceil(amount * 24));
    for (let i = 0; i <= steps; i++) {
      const t = amount * i / steps;
      const p = curvePoint(branch.points, t);
      const before = curvePoint(branch.points, Math.max(0, t - .005));
      const after = curvePoint(branch.points, Math.min(1, t + .005));
      const angle = Math.atan2(after[1] - before[1], after[0] - before[0]);
      points.push(breeze(p[0], p[1], time));
      normals.push([-Math.sin(angle), Math.cos(angle)]);
      widths.push((branch.width * (1 - t) ** 1.25 + branch.tip * t) / 2);
    }
    g.beginPath();
    for (let i = 0; i <= steps; i++) {
      const x = points[i][0] + normals[i][0] * widths[i];
      const y = points[i][1] + normals[i][1] * widths[i];
      if (!i) g.moveTo(x, y); else g.lineTo(x, y);
    }
    for (let i = steps; i >= 0; i--) g.lineTo(points[i][0] - normals[i][0] * widths[i], points[i][1] - normals[i][1] * widths[i]);
    g.closePath();
    g.fillStyle = '#665b48';
    g.fill();
    // Unequal bark ridges and a lit edge follow each curved, tapering limb.
    if (branch.width > 5) {
      for (const stripe of [-.65, -.3, .1, .48]) {
        g.beginPath();
        for (let i = 0; i <= steps; i++) {
          const ridge = stripe + Math.sin(i * .6 + branch.phase) * .08;
          const x = points[i][0] + normals[i][0] * widths[i] * ridge;
          const y = points[i][1] + normals[i][1] * widths[i] * ridge;
          if (!i) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.strokeStyle = stripe < -.4 ? '#b0a184' : stripe < 0 ? '#87785d' : '#3d3a30';
        g.lineWidth = Math.max(.65, branch.width * .065);
        g.stroke();
      }
    }
  }

  function foliage(tree, front, progress, time) {
    for (const leaf of tree.leaves) {
      if (leaf.front !== front) continue;
      const amount = growth(progress, leaf.start, leaf.end);
      if (amount <= 0) continue;
      const [x, y] = breeze(leaf.x, leaf.y, time, leaf.phase);
      const flutter = Math.sin(time * .0014 + leaf.phase + leaf.x * .05) * .12;
      g.fillStyle = leafColors[Math.min(23, Math.floor(leaf.light * 23))];
      g.beginPath();
      g.ellipse(x, y, leaf.size * amount, leaf.size * leaf.squash * amount,
        leaf.angle + flutter, 0, Math.PI * 2);
      g.fill();
    }
  }

  function render(tree, progress, time = 0) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, COLS, ROWS);
    g.setTransform(COLS / 840, 0, 0, ROWS / 760, 0, 0);
    if (progress > .06) {
      for (const dot of tree.ground) {
        g.fillStyle = `rgba(99,102,72,${dot.opacity * Math.min(1, progress * 4)})`;
        g.fillRect(dot.x, dot.y, 2, 2);
      }
    }
    foliage(tree, false, progress, time);
    for (const branch of tree.branches) branchShape(branch, progress, time);
    foliage(tree, true, progress, time);

    const ratio = Math.min(devicePixelRatio || 1, 2);
    if (canvas.width !== WIDTH * ratio || canvas.height !== HEIGHT * ratio) {
      canvas.width = WIDTH * ratio;
      canvas.height = HEIGHT * ratio;
    }
    output.setTransform(ratio, 0, 0, ratio, 0, 0);
    output.globalAlpha = 1;
    output.clearRect(0, 0, WIDTH, HEIGHT);
    const pixels = g.getImageData(0, 0, COLS, ROWS).data;
    output.font = '600 6px "Courier New", monospace';
    output.textAlign = 'center';
    output.textBaseline = 'middle';
    glyphs = [];
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const i = (y * COLS + x) * 4;
        const alpha = pixels[i + 3] / 255;
        if (alpha < .08) continue;
        const luminance = (pixels[i] * .2126 + pixels[i + 1] * .7152 + pixels[i + 2] * .0722) / 255;
        const density = Math.min(1, (1 - luminance) * alpha * 1.22);
        const char = RAMP[Math.max(1, Math.round(density * (RAMP.length - 1)))];
        const color = `rgba(${pixels[i]},${pixels[i + 1]},${pixels[i + 2]},${Math.min(1, alpha * 1.3)})`;
        const px = (x + .5) * WIDTH / COLS, py = (y + .5) * HEIGHT / ROWS;
        glyphs.push({ x: px, y: py, char, color });
        output.fillStyle = color;
        output.fillText(char, px, py);
      }
    }
  }
  render.snapshot = () => glyphs.map(glyph => ({ ...glyph }));
  return render;
}
