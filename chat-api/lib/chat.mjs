import { loadSystemContext } from './knowledge.mjs';

const DEFAULT_ORIGINS = 'https://kmurakami.com,https://www.kmurakami.com';
const messages = {
  forbidden: 'This site is not allowed to use the chat.',
  method: 'Use POST for chat.',
  type: 'Send a JSON request.',
  invalid: 'Please send a question of up to 600 characters and a short conversation history.',
  large: 'The conversation is too large. Please clear it and try again.',
  unavailable: 'Chat is not configured yet. Please use the portfolio pages or contact Kai directly.',
  busy: 'Chat is busy. Please try again shortly.',
  upstream: 'Chat is temporarily unavailable. Please try again later.',
  timeout: 'Chat took too long to respond. Please try again.',
  bodyTimeout: 'The request took too long to arrive. Please try again.',
  aborted: 'The request was cancelled.',
};

const plainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value, keys) => Object.keys(value).every(key => keys.includes(key));

function joinChunks(chunks, size) {
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

async function readRequestBody(request, timeoutMs) {
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  let timer;
  let rejectStopped;
  const stopped = new Promise((_, reject) => { rejectStopped = reject; });
  const stop = code => {
    rejectStopped(Object.assign(new Error(code), { code }));
    // Do not await cancellation: an uncooperative producer must not hold the response open.
    void reader.cancel().catch(() => {});
  };
  const onAbort = () => stop('aborted');
  request.signal.addEventListener('abort', onAbort, { once: true });
  timer = setTimeout(() => stop('bodyTimeout'), timeoutMs);
  if (request.signal.aborted) onAbort();
  try {
    const chunks = [];
    let size = 0;
    while (true) {
      const { done, value } = await Promise.race([reader.read(), stopped]);
      if (done) break;
      size += value.byteLength;
      if (size > 16384) {
        void reader.cancel().catch(() => {});
        throw Object.assign(new Error('large'), { code: 'large' });
      }
      chunks.push(value);
    }
    return joinChunks(chunks, size);
  } finally {
    clearTimeout(timer);
    request.signal.removeEventListener('abort', onAbort);
    reader.releaseLock();
  }
}

export function createChatHandler({
  env = process.env,
  fetchImpl = fetch,
  now = Date.now,
  timeoutMs = 23000,
  bodyTimeoutMs = 5000,
  maxConcurrent = 4,
  maxRateEntries = 2000,
} = {}) {
  const allowed = new Set(
    (env.CHAT_ALLOWED_ORIGINS ?? DEFAULT_ORIGINS).split(',').map(s => s.trim()).filter(Boolean),
  );
  const model = 'gpt-6-luna';
  const rates = new Map();
  let active = 0;

  return async function chat(request, { ip = 'unknown' } = {}) {
    const origin = request.headers.get('origin');
    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      Vary: 'Origin',
    };
    if (origin && allowed.has(origin)) headers['Access-Control-Allow-Origin'] = origin;
    const fail = (status, code) => new Response(
      JSON.stringify({ error: { code, message: messages[code] } }),
      { status, headers },
    );
    if (!origin || !allowed.has(origin)) return fail(403, 'forbidden');
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          ...headers,
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '600',
        },
      });
    }
    if (request.method !== 'POST') return fail(405, 'method');
    if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get('content-type') || '')) {
      return fail(415, 'type');
    }
    if (Number(request.headers.get('content-length')) > 16384) return fail(413, 'large');

    let body;
    try {
      const bytes = await readRequestBody(request, bodyTimeoutMs);
      body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    } catch (error) {
      if (error.code === 'large') return fail(413, 'large');
      if (error.code === 'bodyTimeout') return fail(408, 'bodyTimeout');
      if (error.code === 'aborted') return fail(499, 'aborted');
      return fail(400, 'invalid');
    }
    if (!plainObject(body) || !exactKeys(body, ['question', 'history']) ||
        typeof body.question !== 'string' || !body.question.trim() || body.question.length > 600) {
      return fail(400, 'invalid');
    }
    const history = body.history ?? [];
    if (!Array.isArray(history) || history.length > 6) return fail(400, 'invalid');
    let total = 0;
    for (const entry of history) {
      if (!plainObject(entry) || !exactKeys(entry, ['role', 'content']) ||
          !['user', 'assistant'].includes(entry.role) || typeof entry.content !== 'string' ||
          !entry.content.trim() || entry.content.length > 2000) {
        return fail(400, 'invalid');
      }
      total += entry.content.length;
    }
    if (total > 8000) return fail(400, 'invalid');
    if (!env.OPENAI_API_KEY) return fail(503, 'unavailable');

    const timestamp = now();
    for (const [key, value] of rates) {
      if (timestamp - value.start >= 60000) rates.delete(key);
    }
    const key = String(ip).slice(0, 128);
    let rate = rates.get(key);
    if (!rate) {
      if (rates.size >= maxRateEntries) return fail(429, 'busy');
      rate = { start: timestamp, count: 0 };
      rates.set(key, rate);
    }
    if (rate.count >= 6 || active >= maxConcurrent) return fail(429, 'busy');
    rate.count++;
    active++;

    const controller = new AbortController();
    let timedOut = false;
    let rejectAbort;
    const aborted = new Promise((_, reject) => { rejectAbort = reject; });
    const cancel = () => {
      controller.abort();
      rejectAbort(new Error('aborted'));
    };
    const timer = setTimeout(() => {
      timedOut = true;
      cancel();
    }, timeoutMs);
    request.signal.addEventListener('abort', cancel, { once: true });
    if (request.signal.aborted) cancel();
    try {
      const work = (async () => {
        let systemContext;
        try { systemContext = await loadSystemContext(); }
        catch { return fail(503, 'unavailable'); }
        controller.signal.throwIfAborted();
        const response = await fetchImpl('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          body: JSON.stringify({
            model,
            max_completion_tokens: 80,
            reasoning_effort: 'none',
            stream: false,
            messages: [
              { role: 'system', content: systemContext },
              ...history,
              { role: 'user', content: body.question.trim() },
            ],
          }),
        });
        if (!response.ok) {
          return fail(response.status === 429 ? 429 : 502, response.status === 429 ? 'busy' : 'upstream');
        }
        // Bound the provider response too; reasoning fields are never forwarded.
        const reader = response.body?.getReader();
        if (!reader) return fail(502, 'upstream');
        const chunks = [];
        let size = 0;
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > 65536) {
              void reader.cancel().catch(() => {});
              return fail(502, 'upstream');
            }
            chunks.push(value);
          }
        } finally {
          reader.releaseLock();
        }
        const data = JSON.parse(new TextDecoder().decode(joinChunks(chunks, size)));
        const answer = data?.choices?.[0]?.message?.content;
        if (typeof answer !== 'string' || !answer.trim() || answer.length > 4000 ||
            answer.includes(env.OPENAI_API_KEY)) {
          return fail(502, 'upstream');
        }
        return new Response(JSON.stringify({ answer: answer.trim().replace(/\s+/g, ' ') }), { status: 200, headers });
      })();
      return await Promise.race([work, aborted]);
    } catch {
      if (timedOut) return fail(504, 'timeout');
      if (request.signal.aborted) return fail(499, 'aborted');
      return fail(502, 'upstream');
    } finally {
      clearTimeout(timer);
      request.signal.removeEventListener('abort', cancel);
      active--;
    }
  };
}
