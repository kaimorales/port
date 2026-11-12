import test from 'node:test';
import assert from 'node:assert/strict';
import { disperseGlyph } from './motion.mjs';

test('dispersal starts exactly on the tree and ends fully invisible', () => {
  for (const [x, y] of [[50, 50], [294, 300], [530, 450]]) {
    assert.deepEqual(disperseGlyph(x, y, 0), { x, y, opacity: 1 });
    assert.equal(disperseGlyph(x, y, 1).opacity, 0);
  }
});

test('glyphs rise gently and fade monotonically without frame-to-frame randomness', () => {
  for (const [x, y] of [[50, 50], [294, 300], [530, 450]]) {
    let opacity = 1;
    for (let step = 0; step <= 20; step++) {
      const progress = step / 20;
      const position = disperseGlyph(x, y, progress);
      assert.deepEqual(position, disperseGlyph(x, y, progress));
      assert.ok(position.y <= y);
      assert.ok(position.opacity <= opacity && position.opacity >= 0);
      assert.ok(Math.abs(position.x - x) < 100 && y - position.y < 100);
      opacity = position.opacity;
    }
  }
});

test('late and early animation frames are clamped safely', () => {
  assert.deepEqual(disperseGlyph(120, 200, -1), disperseGlyph(120, 200, 0));
  assert.deepEqual(disperseGlyph(120, 200, 2), disperseGlyph(120, 200, 1));
});
