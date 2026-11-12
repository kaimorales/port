// Stable motion per glyph: crown first, then trunk, all carried by one breeze.
export function disperseGlyph(x, y, progress) {
  const seed = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  const noise = seed - Math.floor(seed);
  const delay = noise * .13 + y / 532 * .07;
  const t = Math.max(0, Math.min(1, (progress - delay) / (1 - delay)));
  const drift = t * t * (3 - 2 * t);
  return {
    x: x + ((x - 294) * .17 + 12 + noise * 24 + Math.sin(y * .035 + t * 2) * 9) * drift,
    y: y - (26 + noise * 59) * drift,
    opacity: (1 - t) ** 1.4,
  };
}
