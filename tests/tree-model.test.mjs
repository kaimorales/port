import test from 'node:test';
import assert from 'node:assert/strict';
import { makeTree, curvePoint, growth } from '../assets/tree/model.mjs';

test('the detailed tree is reproducible and changing the seed changes its geometry', () => {
  assert.deepEqual(makeTree(42), makeTree(42));
  assert.notDeepEqual(makeTree(42), makeTree(43));
});

test('branches remain attached and foliage follows the branch that supports it', () => {
  const tree = makeTree(42);
  for (const branch of tree.branches) {
    if (branch.parent === null) continue;
    const parent = tree.branches[branch.parent];
    const anchor = curvePoint(parent.points, branch.attach);
    assert.ok(Math.hypot(branch.points[0][0] - anchor[0], branch.points[0][1] - anchor[1]) < 1e-8);
    assert.ok(branch.start >= parent.start + (parent.end - parent.start) * branch.attach);
  }
  for (const leaf of tree.leaves) {
    assert.ok(leaf.start >= tree.branches[leaf.branch].end);
    assert.ok(leaf.end <= 1);
  }
});

test('varied trees stay inside the composition with finite geometry', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const tree = makeTree(seed);
    assert.ok(tree.branches.length > 50);
    assert.ok(tree.leaves.length > 2500 && tree.leaves.length < 12000);
    for (const leaf of tree.leaves) {
      assert.ok(leaf.x - leaf.size >= 15 && leaf.x + leaf.size <= 825);
      assert.ok(leaf.y - leaf.size >= 15 && leaf.y + leaf.size <= 745);
    }
    for (const branch of tree.branches) {
      assert.ok(branch.width > 0 && branch.end > branch.start);
      assert.ok(branch.points.flat().every(Number.isFinite));
    }
  }
});

test('growth is bounded, continuous, and completes every part', () => {
  assert.equal(growth(0, .2, .6), 0);
  assert.equal(growth(.2, .2, .6), 0);
  assert.ok(Math.abs(growth(.4, .2, .6) - .5) < 1e-8);
  assert.equal(growth(.6, .2, .6), 1);
  const tree = makeTree(42);
  for (const part of [...tree.branches, ...tree.leaves]) assert.equal(growth(1, part.start, part.end), 1);
});
