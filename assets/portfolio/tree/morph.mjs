const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => {
  const t = clamp(value);
  return t * t * t * (t * (t * 6 - 15) + 10);
};

// The opaque ASCII sheet uncovers the fully rendered page beneath it. Start
// while the last characters are settling, with a small top-to-bottom offset.
export const HANDOFF_END = 1680;
export function coverOpacity(milliseconds, verticalPosition = 0) {
  return 1 - smooth((milliseconds - 980 - clamp(verticalPosition) * 160) / 540);
}

// Reading-order matching keeps nearby branches moving in coherent ribbons.
export function pairGlyphs(source, target) {
  if (!source.length || !target.length) return [];
  const order = (a, b) => a.y - b.y || a.x - b.x;
  const from = [...source].sort(order), to = [...target].sort(order);
  const count = Math.max(from.length, to.length);
  return Array.from({ length: count }, (_, i) => ({
    from: from[Math.floor(i * from.length / count)],
    to: to[Math.floor(i * to.length / count)],
    delay: i / count * .07,
    bend: Math.sin(from[Math.floor(i * from.length / count)].x * .018) * 28,
  }));
}

export function morphGlyph(pair, progress) {
  const p = clamp((clamp(progress) - pair.delay) / (1 - pair.delay));
  const t = smooth(p);
  const { from, to } = pair;
  const arc = Math.sin(Math.PI * t);
  return {
    x: from.x + (to.x - from.x) * t + pair.bend * arc,
    y: from.y + (to.y - from.y) * t - 32 * arc,
    size: from.size + (to.size - from.size) * t,
    alpha: from.alpha + (to.alpha - from.alpha) * t,
    color: from.color.map((value, i) => Math.round(value + (to.color[i] - value) * t)),
    char: t < .62 ? from.char : to.char,
  };
}
