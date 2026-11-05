// Original tree geometry. Rendering samples these shaded shapes into ASCII cells.
export function curvePoint(points, t) {
  const u = 1 - t;
  return [0, 1].map(axis => u ** 3 * points[0][axis] + 3 * u * u * t * points[1][axis]
    + 3 * u * t * t * points[2][axis] + t ** 3 * points[3][axis]);
}

export function growth(time, start, end) {
  const t = Math.max(0, Math.min(1, (time - start) / (end - start)));
  return t * t * (3 - 2 * t);
}

export function makeTree(seed = 1) {
  let state = seed >>> 0;
  const random = () => {
    state += 0x6D2B79F5;
    let t = Math.imul(state ^ state >>> 15, 1 | state);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const branches = [], leaves = [], ground = [];
  const jitter = amount => (random() - .5) * amount;
  function add(points, width, tip, parent, attach, duration, root = false) {
    const start = parent === null ? 0 : branches[parent].start +
      (branches[parent].end - branches[parent].start) * attach;
    branches.push({ points, width, tip, parent, attach, start,
      end: start + duration, phase: random() * 6.28, root });
    return branches.length - 1;
  }
  const trunk = add([[380, 690], [344 + jitter(20), 586], [443 + jitter(30), 492], [410 + jitter(20), 385]],
    39, 12, null, 0, .28);
  function limb(parent, attach, end, width, bend, duration = .18) {
    const start = curvePoint(branches[parent].points, attach);
    const dx = end[0] - start[0], dy = end[1] - start[1];
    return add([start, [start[0] + dx * .26 + bend, start[1] + dy * .45],
      [start[0] + dx * .78 - bend * .3, start[1] + dy * .7], end],
    width, width * .28, parent, attach, duration);
  }
  const left = limb(trunk, .44, [213 + jitter(25), 350 + jitter(25)], 21, -26);
  const right = limb(trunk, .58, [614 + jitter(35), 325 + jitter(25)], 19, 10);
  const crown = [left, right,
    limb(trunk, .92, [382 + jitter(30), 198 + jitter(24)], 12, -16),
    limb(trunk, .78, [278 + jitter(25), 237 + jitter(25)], 14, -24),
    limb(trunk, .87, [510 + jitter(25), 215 + jitter(25)], 13, 24),
    limb(left, .64, [133 + jitter(20), 414 + jitter(20)], 8, -10, .13),
    limb(right, .65, [682 + jitter(20), 391 + jitter(20)], 8, 14, .13)];

  function foliage(branch, count, radius, at = .91, offset = [0, 0]) {
    const b = branches[branch];
    const anchor = curvePoint(b.points, at);
    const center = [anchor[0] + offset[0], anchor[1] + offset[1]];
    const phase = random() * 6.28;
    const rx = radius * (.85 + random() * .35), ry = radius * (.65 + random() * .2);
    for (let i = 0; i < count; i++) {
      const a = random() * Math.PI * 2, r = Math.sqrt(random());
      // Small lobes break the regular ellipse into individual sprays of leaves.
      const lobe = 1 + .15 * Math.sin(a * 5 + phase);
      const x = center[0] + Math.cos(a) * rx * r * lobe;
      const y = center[1] + Math.sin(a) * ry * r * lobe;
      const start = Math.max(.44, b.end) + random() * .17;
      const light = Math.max(0, Math.min(1, .48 - (y - center[1]) / ry * .4 -
        (x - center[0]) / rx * .18 + jitter(.3)));
      leaves.push({ x, y, size: 4 + random() * 7, squash: .4 + random() * .35,
        angle: random() * Math.PI, phase, light, front: random() > .28,
        start, end: Math.min(.98, start + .16 + random() * .07), branch });
    }
  }
  function twigs(parent, depth, length) {
    const p = branches[parent].points;
    const direction = Math.atan2(p[3][1] - p[2][1], p[3][0] - p[2][0]);
    for (const side of [-1, 1]) {
      const attach = .73 + random() * .25;
      const base = curvePoint(p, attach);
      // Fine twigs turn upward; large limbs retain the broad, uneven silhouette.
      const angle = direction * .7 - Math.PI / 2 * .3 + side * (.35 + random() * .4);
      const end = [base[0] + Math.cos(angle) * length, base[1] + Math.sin(angle) * length];
      const child = limb(parent, attach, end, Math.max(1.1, depth * 1.2), jitter(12), .075);
      if (depth > 1) twigs(child, depth - 1, length * (.65 + random() * .15));
      if (depth <= 2) foliage(child, depth === 1 ? 90 : 48, depth === 1 ? 29 : 35);
    }
  }
  for (const branch of crown) twigs(branch, 3, 48 + random() * 18);
  // Overlapping inner sprays give the canopy volume instead of isolated tip tufts.
  for (const branch of crown.slice(0, 5)) {
    foliage(branch, 210, 62, .82, [-8, -14]);
    foliage(branch, 145, 48, .58, [12, -12]);
  }
  foliage(crown[2], 180, 65, .8, [25, -4]);
  foliage(crown[3], 160, 52, .72, [24, -12]);
  // Root flare: several tapered curves anchor the trunk to a little stippled earth.
  for (let i = 0; i < 7; i++) {
    const x = 316 + i * 21 + jitter(12), y = 702 + random() * 9;
    add([[380, 675], [373 + jitter(16), 694], [x + (380 - x) * .25, y - 6], [x, y]],
      11 + random() * 8, .5, null, 0, .13, true);
  }
  for (let i = 0; i < 140; i++) {
    ground.push({ x: 380 + jitter(178), y: 703 + jitter(15), opacity: random() * .23 });
  }
  // Fit complete geometry as a unit; affine fitting preserves branch attachments.
  const xs = leaves.flatMap(l => [l.x - l.size, l.x + l.size]);
  const ys = leaves.flatMap(l => [l.y - l.size, l.y + l.size]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys);
  const scale = Math.min(1.08, 740 / (maxX - minX), 650 / (715 - minY));
  const transform = ([x, y]) => [420 + (x - (minX + maxX) / 2) * scale, 710 + (y - 715) * scale];
  for (const branch of branches) {
    branch.points = branch.points.map(transform);
    branch.width *= scale;
    branch.tip *= scale;
  }
  for (const leaf of leaves) {
    [leaf.x, leaf.y] = transform([leaf.x, leaf.y]);
    leaf.size *= scale;
  }
  for (const dot of ground) [dot.x, dot.y] = transform([dot.x, dot.y]);
  return { branches, leaves, ground };
}
