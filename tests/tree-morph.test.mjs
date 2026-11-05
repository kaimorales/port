import test from 'node:test';
import assert from 'node:assert/strict';
import { pairGlyphs, morphGlyph, coverOpacity, HANDOFF_END } from '../assets/tree/morph.mjs';

const glyph = (x, y, char = 'x') => ({ x, y, char, color: [30, 150, 50], alpha: 1, size: 6 });

test('morph accounts for every tree character and every page destination', () => {
  const source = [glyph(30, 20), glyph(10, 10), glyph(20, 10)];
  const target = [glyph(50, 100), glyph(60, 100), glyph(80, 150), glyph(40, 80), glyph(10, 80)];
  const copy = structuredClone({ source, target });
  const pairs = pairGlyphs(source, target);
  assert.equal(pairs.length, 5);
  for (const p of source) assert.ok(pairs.some(pair => pair.from === p));
  for (const p of target) assert.ok(pairs.some(pair => pair.to === p));
  assert.deepEqual({ source, target }, copy);
});

test('each character starts on the tree and lands exactly on its page destination', () => {
  const pairs = pairGlyphs([glyph(250, 200), glyph(200, 300)], [glyph(40, 80, '#'), glyph(100, 400, ':')]);
  for (const pair of pairs) {
    const start = morphGlyph(pair, 0), end = morphGlyph(pair, 1);
    assert.deepEqual([start.x, start.y, start.char], [pair.from.x, pair.from.y, pair.from.char]);
    assert.deepEqual([end.x, end.y, end.char], [pair.to.x, pair.to.y, pair.to.char]);
    assert.deepEqual(end.color, pair.to.color);
    assert.equal(end.size, pair.to.size);
  }
});

test('motion remains deterministic and finite, including out-of-range frames', () => {
  const [pair] = pairGlyphs([glyph(10, 100)], [glyph(300, 20)]);
  for (const progress of [-1, 0, .1, .4, .8, 1, 2]) {
    const result = morphGlyph(pair, progress);
    assert.deepEqual(result, morphGlyph(pair, progress));
    assert.ok([result.x, result.y, result.size, result.alpha, ...result.color].every(Number.isFinite));
    assert.ok(result.alpha >= 0 && result.alpha <= 1);
  }
  assert.deepEqual(morphGlyph(pair, -1), morphGlyph(pair, 0));
  assert.deepEqual(morphGlyph(pair, 2), morphGlyph(pair, 1));
});

test('missing animation geometry can fail open', () => {
  assert.deepEqual(pairGlyphs([], [glyph(1, 1)]), []);
  assert.deepEqual(pairGlyphs([glyph(1, 1)], []), []);
});

test('the page is fully covered during travel and fully exposed before the dialog closes', () => {
  for (const y of [-1, 0, .25, .5, .75, 1, 2]) {
    assert.equal(coverOpacity(0, y), 1);
    assert.equal(coverOpacity(980, y), 1);
    assert.equal(coverOpacity(HANDOFF_END, y), 0);
    assert.equal(coverOpacity(HANDOFF_END + 500, y), 0);
  }
});

test('the handoff reveals continuously without reversing or a final opacity jump', () => {
  for (const y of [0, .25, .5, .75, 1]) {
    let previous = 1;
    for (let time = 0; time <= HANDOFF_END; time += 1) {
      const alpha = coverOpacity(time, y);
      assert.ok(alpha >= 0 && alpha <= previous);
      assert.ok(previous - alpha < .004);
      previous = alpha;
    }
    assert.ok(coverOpacity(HANDOFF_END - 16, y) < .001);
  }
  assert.ok(coverOpacity(1250, 0) < coverOpacity(1250, 1));
});
