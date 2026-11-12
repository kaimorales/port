import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, writeFile, rm, readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import * as knowledge from '../chat-api/lib/knowledge.mjs';
import {createChatHandler} from '../chat-api/lib/chat.mjs';

const filenames = ['identity.md', 'personality.md', 'voice.md'];

async function profileFixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'portfolio-context-'));
  t.after(() => rm(directory, {recursive:true, force:true}));
  await Promise.all(filenames.map(name => writeFile(join(directory, name), `# ${name}\nOriginal ${name} content.`)));
  return directory;
}

test('all three saved Markdown files are loaded freshly without the retired context', async t => {
  assert.equal(typeof knowledge.loadSystemContext, 'function');
  const directory = await profileFixture(t);
  await writeFile(join(directory, 'context.md'), 'Retired context must not be loaded.');
  const first = await knowledge.loadSystemContext(directory);
  assert.match(first, /guide to Kai Morales's portfolio/);
  assert.deepEqual(
    [...first.matchAll(/^--- (identity|personality|voice)\.md ---$/gm)].map(match => `${match[1]}.md`),
    filenames,
    'Profile sections should appear in their intended order on separate lines',
  );
  for (const name of filenames) {
    assert.ok(first.includes(`\n\n--- ${name} ---\n# ${name}\nOriginal ${name} content.`));
  }
  for (const name of filenames) assert.ok(first.includes(`Original ${name} content.`));
  assert.doesNotMatch(first, /Retired context must not be loaded/);
  for (const name of filenames) {
    await writeFile(join(directory, name), `Updated ${name} content.`);
    const next = await knowledge.loadSystemContext(directory);
    assert.ok(next.includes(`Updated ${name} content.`));
    assert.ok(!next.includes(`Original ${name} content.`));
  }
});

test('missing, empty, and oversized context cannot silently produce ungrounded replies', async t => {
  assert.equal(typeof knowledge.loadSystemContext, 'function');
  const directory = await profileFixture(t);
  for (const name of filenames) {
    const path = join(directory, name);
    await rm(path);
    await assert.rejects(knowledge.loadSystemContext(directory));
    await writeFile(path, '  \n');
    await assert.rejects(knowledge.loadSystemContext(directory), /context/i);
    await writeFile(path, 'Restored content.');
  }
  await Promise.all(filenames.map(name => writeFile(join(directory, name), 'a'.repeat(11000))));
  await assert.rejects(knowledge.loadSystemContext(directory), /context/i);
});

test('the provider receives the configured Markdown along with the portfolio role', async () => {
  const notes = await Promise.all(filenames.map(name => readFile(new URL(`../chat-api/${name}`, import.meta.url), 'utf8')));
  let payload;
  const handler = createChatHandler({env:{OPENAI_API_KEY:'test-key'}, fetchImpl:async (_url, options) => {
    payload = JSON.parse(options.body);
    return Response.json({choices:[{message:{content:'A portfolio answer.'}}]});
  }});
  const response = await handler(new Request('https://chat.example/api/chat', {
    method:'POST', headers:{origin:'https://kmurakami.com','content-type':'application/json'},
    body:JSON.stringify({question:'What does Kai work on?'}),
  }));
  assert.equal(response.status, 200);
  assert.equal(payload.messages[0].role, 'system');
  for (const section of notes) {
    assert.ok(section.trim(), 'Each configured profile section must be saved and nonempty');
    assert.ok(payload.messages[0].content.includes(section.trim()));
  }
  assert.match(payload.messages[0].content, /guide to Kai Morales's portfolio/);
});
