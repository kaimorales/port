const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');

function visit(gate, { seen = false, reduced = false, hash = '', blocked = false } = {}) {
  const classes = new Set();
  let release;
  runInNewContext(gate, {
    document: { documentElement: { classList: { add: c => classes.add(c), remove: c => classes.delete(c) } } },
    location: { hash },
    matchMedia: () => ({ matches: reduced }),
    sessionStorage: { getItem: () => { if (blocked) throw new Error('Storage blocked'); return seen ? '1' : null; } },
    setTimeout: callback => { release = callback; },
  });
  return { classes, release };
}

const file = 'index.html';
const pending = 'morph-pending';
const html = readFileSync(new URL(`../${file}`, `file://${__filename}`), 'utf8');
const gate = html.match(/<script>([\s\S]*?)<\/script>/)[1];
test(`${file}: first visit can animate, but failed loading releases the homepage`, () => {
  const result = visit(gate);
  assert.ok(result.classes.has(pending));
  result.release();
  assert.equal(result.classes.size, 0);
});

test(`${file}: every load animates regardless of visit history or storage availability`, () => {
  for (const options of [{ seen: true }, { blocked: true }, { hash: '#content' }]) {
    assert.ok(visit(gate, options).classes.has(pending));
  }
});

test(`${file}: reduced motion and legacy section redirects open directly`, () => {
  for (const options of [{ reduced: true }, ...['projects', 'experience', 'about', 'contact'].map(section => ({hash: `#${section}`}))]) {
    assert.equal(visit(gate, options).classes.size, 0);
  }
});
