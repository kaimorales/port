import test from 'node:test';
import assert from 'node:assert/strict';
import { requestReply } from '../assets/chat/client.mjs';

test('sends only the question and bounded conversation, with no browser credentials', async () => {
  let call;
  const answer = await requestReply({ endpoint: '/api/chat', question: '  What has Kai built?  ',
    history: [{role:'user',content:'Hi'}, {role:'assistant',content:'Hello'}],
    fetchImpl: async (url, options) => { call = {url,options}; return Response.json({answer:'He built Harlen.'}); } });
  assert.equal(answer, 'He built Harlen.');
  assert.deepEqual(JSON.parse(call.options.body), {question:'What has Kai built?',history:[{role:'user',content:'Hi'},{role:'assistant',content:'Hello'}]});
  assert.equal(call.options.credentials, 'omit');
  assert.equal(call.options.headers['Content-Type'], 'application/json');
});

test('unconfigured and invalid inputs never send a request', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; };
  for (const input of [{endpoint:'',question:'Hi'},{endpoint:'/api/chat',question:' '},{endpoint:'/api/chat',question:'x'.repeat(601)}]) {
    await assert.rejects(requestReply({...input,fetchImpl}));
  }
  assert.equal(calls, 0);
});

test('provider errors and invalid responses cannot masquerade as an answer', async () => {
  for (const response of [Response.json({error:{code:'rate_limited'}},{status:429}), new Response('<html>Not found</html>',{status:404}), Response.json({answer:42}), Response.json({answer:' '}), Response.json({answer:'x'.repeat(4001)})]) {
    await assert.rejects(requestReply({endpoint:'/api/chat',question:'Hi',fetchImpl:async()=>response}));
  }
});

test('a network failure produces a useful error', async () => {
  await assert.rejects(requestReply({endpoint:'/api/chat',question:'Hi',fetchImpl:async()=>{throw new TypeError('Failed to fetch');}}), /connect/i);
});

test('clearing a conversation aborts its pending request', async () => {
  const abort = new AbortController();
  const promise = requestReply({endpoint:'/api/chat',question:'Hi',signal:abort.signal,
    fetchImpl:async (_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}))});
  abort.abort();
  await assert.rejects(promise, {name:'AbortError'});
});
