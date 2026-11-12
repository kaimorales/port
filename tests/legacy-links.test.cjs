const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const source = readFileSync(join(__dirname, '../assets/site/legacy-links.js'), 'utf8');

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

const aliasHtml = readFileSync(join(__dirname, '../conversation-study.html'), 'utf8');

function aliasRedirects(href) {
  const location = new URL(href);
  const destinations = [];
  location.replace = url => destinations.push(new URL(String(url), href).href);
  const scripts = [...aliasHtml.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  for (const [, script] of scripts) {
    vm.runInNewContext(script, { window: { location }, location, URL });
  }
  return destinations;
}

test('the conversation preview alias opens the homepage with query and hash intact', () => {
  assert.deepEqual(aliasRedirects('https://kmurakami.com/conversation-study.html?preview=1#about'),
    ['https://kmurakami.com/index.html?preview=1#about']);
});

test('the preview alias preserves a GitHub Pages repository prefix', () => {
  assert.deepEqual(aliasRedirects('https://example.github.io/port/conversation-study.html?from=old#projects'),
    ['https://example.github.io/port/index.html?from=old#projects']);
});
