import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const assets = join(root, 'assets');
const entryPoints = [
  'site/styles.css', 'site/legacy-links.js',
  'home/styles.css', 'home/main.mjs',
  'chat/client.mjs', 'chat/config.mjs',
  'tree/model.mjs', 'tree/renderer.mjs', 'tree/morph.mjs',
  'tree/intro.mjs', 'tree/page-glyphs.mjs', 'tree/styles.css',
  'driving/main.mjs', 'driving/core.mjs', 'driving/worker.mjs',
  'driving/styles.css', 'driving/seed.json',
  'pit-wall/main.mjs', 'pit-wall/model.mjs', 'pit-wall/styles.css',
  'images/banner.jpg', 'images/profile.jpg',
];

function modulesIn(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? modulesIn(path) : /\.(?:mjs|js)$/.test(entry.name) ? [path] : [];
  });
}

function dependencyPaths(source) {
  const patterns = [
    /\b(?:import|export)\s+(?:[^;]*?\s+from\s*)?['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]/g,
    /\bnew\s+URL\s*\(\s*['"]([^'"]+)['"]\s*,\s*import\.meta\.url\s*\)/g,
  ];
  return [...new Set(patterns.flatMap(pattern => [...source.matchAll(pattern)].map(match => match[1])))];
}

test('the organized asset directories contain every public runtime entry point', () => {
  const missing = entryPoints.filter(path => !existsSync(join(assets, path)));
  assert.deepEqual(missing, [], `Missing runtime assets: ${missing.join(', ')}`);
});

test('every relative module, dynamic import, worker and data URL resolves inside assets', () => {
  assert.ok(existsSync(assets), 'The public assets directory must exist');
  const modules = modulesIn(assets);
  assert.ok(modules.length > 0, 'Expected public JavaScript modules');
  let checked = 0;
  for (const file of modules) {
    for (const specifier of dependencyPaths(readFileSync(file, 'utf8'))) {
      if (!specifier.startsWith('.')) continue;
      checked += 1;
      const target = resolve(dirname(file), decodeURIComponent(specifier.split(/[?#]/)[0]));
      const label = `${relative(root, file)} → ${specifier}`;
      assert.ok(target.startsWith(assets + sep), `Dependency leaves public assets: ${label}`);
      assert.ok(existsSync(target), `Missing moved dependency: ${label}`);
      assert.ok(statSync(target).isFile(), `Dependency is not a file: ${label}`);
    }
  }
  assert.ok(checked > 0, 'Expected relative runtime dependencies to be checked');
});

test('asset modules do not fetch data relative to the current HTML page', () => {
  assert.ok(existsSync(assets), 'The public assets directory must exist');
  for (const file of modulesIn(assets)) {
    const source = readFileSync(file, 'utf8');
    const literalFetches = source.matchAll(/\bfetch\s*\(\s*(['"`])([^'"`]*)\1/g);
    for (const [, , specifier] of literalFetches) {
      assert.ok(specifier.startsWith('/') || /^[a-z][a-z\d+.-]*:/i.test(specifier),
        `${relative(root, file)}: fetch(${JSON.stringify(specifier)}) resolves from the HTML page; use new URL(relativePath, import.meta.url)`);
    }
  }
});
