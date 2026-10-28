const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const source = readFileSync(join(__dirname, '../app.js'), 'utf8');

function redirects(href) {
  const location = new URL(href);
  const destinations = [];
  location.replace = url => destinations.push(String(url));
  vm.runInNewContext(source, { window: { location }, URL });
  return destinations;
}

test('old section bookmarks open their corresponding page', () => {
  for (const section of ['experience', 'projects', 'about', 'contact']) {
    assert.deepEqual(redirects(`https://kmurakami.com/#${section}`),
      [`https://kmurakami.com/${section}.html`]);
  }
});

test('legacy links preserve a GitHub Pages repository prefix', () => {
  assert.deepEqual(redirects('https://example.github.io/port/index.html#projects'),
    ['https://example.github.io/port/projects.html']);
  assert.deepEqual(redirects('https://example.github.io/port/#about'),
    ['https://example.github.io/port/about.html']);
});

test('home and unrecognized hashes do not navigate', () => {
  for (const hash of ['', '#', '#top', '#missing', '#__proto__', '#constructor', '#https://evil.example']) {
    assert.deepEqual(redirects(`https://kmurakami.com/${hash}`), []);
  }
});
