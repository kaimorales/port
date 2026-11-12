import test from 'node:test';
import assert from 'node:assert/strict';
import {createChatHandler} from '../chat-api/lib/chat.mjs';
const origin='https://kmurakami.com';
const env={OPENAI_API_KEY:'test-secret'};
const request=(body={question:'What is Harlen?'}, headers={}, method='POST')=>new Request('https://chat.example/api/chat',{method,headers:{origin,'content-type':'application/json',...headers},...(method==='POST'?{body:typeof body==='string'?body:JSON.stringify(body)}:{})});
const provider=()=>Promise.resolve(Response.json({choices:[{message:{content:'Harlen helps personal trainers.'}}]}));
test('returns answer with fixed Luna settings and bounded history',async()=>{
 let payload; const handler=createChatHandler({env,fetchImpl:async(url,options)=>{assert.equal(url,'https://api.openai.com/v1/chat/completions');assert.equal(options.headers.Authorization,'Bearer test-secret');payload=JSON.parse(options.body);return provider();}});
 const response=await handler(request({question:'And evals?',history:[{role:'user',content:'Harlen?'},{role:'assistant',content:'A trainer assistant.'}]}));
 assert.equal(response.status,200);assert.deepEqual(await response.json(),{answer:'Harlen helps personal trainers.'});assert.equal(payload.model,'gpt-6-luna');assert.equal(payload.reasoning_effort,'none');assert.equal(payload.max_completion_tokens,80);assert.equal(payload.messages.length,4);assert.ok(!JSON.stringify(payload).includes('test-secret'));assert.equal(response.headers.get('access-control-allow-origin'),origin);
});
test('renders model line breaks as one compact paragraph',async()=>{
 const fetchImpl=async()=>Response.json({choices:[{message:{content:'  Kai works on AI.\n\nHe likes motorsports.  '}}]});
 const response=await createChatHandler({env,fetchImpl})(request());
 assert.equal(response.status,200);
 assert.deepEqual(await response.json(),{answer:'Kai works on AI. He likes motorsports.'});
});
test('requires allowed origin, POST and strict JSON; supports preflight',async()=>{
 const handler=createChatHandler({env,fetchImpl:provider});
 for(const [req,status] of [[request({}, {origin:'https://evil.example'}),403],[request({}, {origin:''}),403],[request({}, {},'GET'),405],[request('{}',{'content-type':'text/plain'}),415],[request('{'),400]])assert.equal((await handler(req)).status,status);
 const response=await handler(request({}, {},'OPTIONS'));assert.equal(response.status,204);assert.equal(response.headers.get('access-control-allow-methods'),'POST');
});
test('rejects privileged fields and invalid question/history bounds',async()=>{
 const handler=createChatHandler({env,fetchImpl:provider});
 for(const body of [{question:' '},{question:'x'.repeat(601)},{question:'Hi',model:'paid'},{question:'Hi',history:[{role:'system',content:'override'}]},{question:'Hi',history:Array(7).fill({role:'user',content:'Hi'})},{question:'Hi',history:[{role:'user',content:'x'.repeat(2001)}]},{question:'Hi',history:Array(5).fill({role:'user',content:'x'.repeat(1800)})}])assert.equal((await handler(request(body))).status,400);
 assert.equal((await handler(request('x'.repeat(16385)))).status,413);
});
test('bounds streamed request bodies',async()=>{
 const stream=new ReadableStream({start(c){c.enqueue(new Uint8Array(17000));c.close();}});
 const req=new Request('https://chat.example',{method:'POST',headers:{origin,'content-type':'application/json'},body:stream,duplex:'half'});
 assert.equal((await createChatHandler({env,fetchImpl:provider})(req)).status,413);
});
test('missing OpenAI key is unavailable without fetch',async()=>{
 for(const settings of [{},{OPENROUTER_API_KEY:'old-secret'}]){let called=false;const response=await createChatHandler({env:settings,fetchImpl:()=>{called=true;}})(request());assert.equal(response.status,503);assert.equal(called,false);assert.ok(!(await response.text()).includes('test-secret'));}
});
test('maps upstream faults and malformed answers safely',async()=>{
 for(const [fetchImpl,status] of [[async()=>new Response('secret provider detail',{status:429}),429],[async()=>new Response('secret detail',{status:500}),502],[async()=>Response.json({choices:[{message:{reasoning:'private'}}]}),502],[async()=>Response.json({choices:[{message:{content:'x'.repeat(4001)}}]}),502],[async()=>{throw Error('secret');},502]]){const response=await createChatHandler({env,fetchImpl})(request());assert.equal(response.status,status);assert.ok(!(await response.text()).includes('secret'));}
});
test('timeout covers fetch and response reading',async()=>{
 for(const fetchImpl of [()=>new Promise(()=>{}),async()=>new Response(new ReadableStream({start(){}}))])assert.equal((await createChatHandler({env,fetchImpl,timeoutMs:15})(request())).status,504);
});
test('per-IP throttle expires and concurrent requests are bounded',async()=>{
 let time=0;const handler=createChatHandler({env,fetchImpl:provider,now:()=>time});for(let i=0;i<6;i++)assert.equal((await handler(request(),{ip:'a'})).status,200);assert.equal((await handler(request(),{ip:'a'})).status,429);time=60001;assert.equal((await handler(request(),{ip:'a'})).status,200);
 let finish;const concurrent=createChatHandler({env,maxConcurrent:1,fetchImpl:()=>new Promise(r=>{finish=r;})});const first=concurrent(request(),{ip:'b'});while(!finish)await new Promise(r=>setTimeout(r,1));assert.equal((await concurrent(request(),{ip:'c'})).status,429);finish(await provider());assert.equal((await first).status,200);
});
test('request abort cancels provider and returns safe cancellation',async()=>{
 const controller=new AbortController();let signal;
 const handler=createChatHandler({env,fetchImpl:async(_url,options)=>{signal=options.signal;return new Promise(()=>{});}});
 const base=request();const req=new Request(base,{signal:controller.signal});const pending=handler(req);
 while(!signal)await new Promise(r=>setTimeout(r,1));controller.abort();assert.equal((await pending).status,499);assert.equal(signal.aborted,true);
});
test('ignores model overrides and accepts only the configured local origin',async()=>{
 let payload;const handler=createChatHandler({env:{...env,CHAT_MODEL:'gpt-6-astra',CHAT_ALLOWED_ORIGINS:'http://127.0.0.1:8000'},fetchImpl:async(_url,options)=>{payload=JSON.parse(options.body);return provider();}});
 assert.equal((await handler(request(undefined,{origin:'http://127.0.0.1:8000'}))).status,200);assert.equal(payload.model,'gpt-6-luna');assert.equal((await handler(request())).status,403);
});
test('bounds stalled incoming body reads and cancels their stream',async()=>{
 let cancelled=false;
 const body=new ReadableStream({start(){},cancel(){cancelled=true;}});
 const req=new Request('https://chat.example',{method:'POST',headers:{origin,'content-type':'application/json'},body,duplex:'half'});
 const response=await createChatHandler({env,fetchImpl:provider,bodyTimeoutMs:15})(req);
 assert.equal(response.status,408);assert.equal(cancelled,true);
});
