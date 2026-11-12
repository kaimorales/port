import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPreviewServer } from '../scripts/preview.mjs';

async function startPreview(t, root) {
  const server = createPreviewServer({
    root,
    chatHandler: async () => Response.json({answer:'Test response'}),
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

test('preview serves the public site but never server files or support directories', async t => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const base = await startPreview(t, root);
  for (const path of [
    '/', '/index.html', '/conversation-study.html', '/projects/harlen.html',
    '/assets/site/styles.css', '/assets/site/legacy-links.js',
    '/assets/home/main.mjs', '/assets/chat/client.mjs',
    '/assets/tree/intro.mjs', '/assets/driving/worker.mjs',
    '/assets/driving/seed.json', '/assets/pit-wall/main.mjs', '/assets/images/profile.jpg',
  ]) {
    assert.equal((await fetch(base + path)).status, 200, path);
  }
  for (const path of [
    '/chat-api/.env.local', '/chat-api/context.md', '/chat-api/identity.md',
    '/chat-api/personality.md', '/chat-api/voice.md', '/.git/config',
    '/chat-api/lib/knowledge.mjs', '/scripts/preview.mjs',
    '/tests/chat-client.test.mjs', '/docs/design.md',
    '/tools/driving/train.mjs', '/archive/tree-intro/index.html',
    '/%2eenv.local', '/projects/%2e%2e/chat-api/.env.local',
    '/assets/%2e%2e%2fchat-api/context.md',
    '/assets/%2e%2e%2fchat-api/identity.md',
    '/assets/%2e%2e%2fchat-api/personality.md',
    '/assets/%2e%2e%2fchat-api/voice.md',
  ]) {
    assert.equal((await fetch(base + path)).status, 404, path);
  }
  const reply = await fetch(base + '/api/chat', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({question:'Hello'}),
  });
  assert.deepEqual(await reply.json(), {answer:'Test response'});
});

test('preview rejects private symlink targets even through allowed public asset paths', async t => {
  const root = await mkdtemp(join(tmpdir(), 'portfolio-preview-test-'));
  t.after(() => rm(root, {recursive:true, force:true}));
  await mkdir(join(root, 'assets', 'home'), {recursive:true});
  for (const directory of ['chat-api', 'archive', 'docs', 'tools', 'tests', 'scripts']) {
    await mkdir(join(root, directory), {recursive:true});
    await writeFile(join(root, directory, 'private.html'), '<main>Private fixture</main>');
  }
  await mkdir(join(root, 'projects'), {recursive:true});
  await writeFile(join(root, 'index.html'), '<main>Public homepage</main>');
  await writeFile(join(root, 'assets', 'home', 'public.mjs'), 'export const publicValue = true;');
  await writeFile(join(root, 'chat-api', 'private.mjs'), 'export const privateValue = true;');
  await symlink(join(root, 'chat-api', 'private.mjs'), join(root, 'assets', 'home', 'leaked.mjs'));
  await symlink(join(root, 'chat-api'), join(root, 'assets', 'home', 'backend'));
  await symlink(join(root, 'chat-api', 'private.html'), join(root, 'projects', 'leaked.html'));
  const base = await startPreview(t, root);
  assert.equal((await fetch(base + '/assets/home/public.mjs')).status, 200);
  for (const path of [
    '/assets/home/leaked.mjs', '/assets/home/backend/private.mjs', '/projects/leaked.html',
    '/chat-api/private.html', '/archive/private.html', '/docs/private.html',
    '/tools/private.html', '/tests/private.html', '/scripts/private.html',
  ]) {
    assert.equal((await fetch(base + path)).status, 404, path);
  }
});
