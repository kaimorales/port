import { createChatHandler } from '../lib/chat.mjs';

const handler = createChatHandler();

// Vercel supplies/overwrites x-real-ip at its proxy boundary. Local servers pass
// their socket address directly to createChatHandler instead.
export default {
  fetch(request) {
    return handler(request, { ip: request.headers.get('x-real-ip') || 'unknown' });
  },
};
