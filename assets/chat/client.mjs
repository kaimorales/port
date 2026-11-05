// Browser transport only. Provider credentials never belong in this module.
export async function requestReply({ endpoint, question, history = [], signal, fetchImpl = fetch }) {
  if (!endpoint) throw new Error('Chat is not connected yet. You can still explore the links above.');
  const text = typeof question === 'string' ? question.trim() : '';
  if (!text || text.length > 600) throw new Error('Ask a question in 600 characters or fewer.');
  const recent = [];
  let size = 0;
  for (const entry of history.slice(-6).reverse()) {
    if (!['user', 'assistant'].includes(entry.role) || typeof entry.content !== 'string') continue;
    const content = entry.content.slice(0, 2000);
    if (size + content.length > 6000) break;
    recent.unshift({ role: entry.role, content });
    size += content.length;
  }
  const controller = new AbortController();
  const abort = () => controller.abort(signal.reason);
  if (signal?.aborted) throw signal.reason;
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => controller.abort(new DOMException('Timed out', 'TimeoutError')), 28000);
  try {
    let response;
    try {
      response = await fetchImpl(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'omit', cache: 'no-store', redirect: 'error', signal: controller.signal,
        body: JSON.stringify({ question: text, history: recent }),
      });
    } catch (error) {
      if (controller.signal.aborted) throw controller.signal.reason;
      throw new Error('Couldn’t connect to the chat. Please try again.');
    }
    if (!response.ok) {
      if (response.status === 429) throw new Error('Chat has reached its limit. Please try again later.');
      if (response.status === 503) throw new Error('Chat isn’t available right now. You can still explore the links above.');
      throw new Error('Couldn’t get a reply. Please try again.');
    }
    let data;
    try { data = await response.json(); }
    catch { if (controller.signal.aborted) throw controller.signal.reason; throw new Error('Couldn’t read the reply. Please try again.'); }
    if (typeof data?.answer !== 'string' || !data.answer.trim() || data.answer.length > 4000) {
      throw new Error('Couldn’t read the reply. Please try again.');
    }
    return data.answer.trim();
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}
