const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');

function visit(gate, { navigationType = 'navigate', reduced = false, hash = '' } = {}) {
  const classes = new Set();
  let release;
  runInNewContext(gate, {
    document: { documentElement: { classList: { add: c => classes.add(c), remove: c => classes.delete(c) } } },
    location: { hash },
    performance: { getEntriesByType: () => navigationType ? [{ type: navigationType }] : [] },
    matchMedia: () => ({ matches: reduced }),
    setTimeout: callback => { release = callback; },
  });
  return { classes, release };
}

const file = 'index.html';
const pending = 'morph-pending';
const html = readFileSync(new URL(`../${file}`, `file://${__filename}`), 'utf8');
const gate = html.match(/<script>([\s\S]*?)<\/script>/)[1];
test(`${file}: refresh animates, but failed loading releases the homepage`, () => {
  const result = visit(gate, { navigationType: 'reload' });
  assert.ok(result.classes.has(pending));
  result.release();
  assert.equal(result.classes.size, 0);
});

test(`${file}: arriving from another page or browser history opens directly`, () => {
  for (const navigationType of ['navigate', 'back_forward', null]) {
    assert.equal(visit(gate, { navigationType }).classes.size, 0);
  }
});

test(`${file}: reduced motion and legacy section redirects open directly`, () => {
  for (const options of [{ reduced: true }, ...['projects', 'experience', 'about', 'contact'].map(section => ({hash: `#${section}`}))]) {
    assert.equal(visit(gate, { ...options, navigationType: 'reload' }).classes.size, 0);
  }
});
