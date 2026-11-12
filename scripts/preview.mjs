import { createServer } from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, extname, resolve, relative, sep } from 'node:path';
import { Readable } from 'node:stream';
import { createChatHandler } from '../chat-api/lib/chat.mjs';
import { isPublicFile } from './public-files.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8',
  '.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml',
  '.webp':'image/webp','.ico':'image/x-icon','.json':'application/json'};

async function localEnvironment(root, port) {
  const env = {...process.env};
  try {
    const text = await readFile(resolve(root, 'chat-api/.env.local'), 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^\s*(OPENAI_API_KEY|CHAT_ALLOWED_ORIGINS)\s*=\s*(.*?)\s*$/);
      if (match && !env[match[1]]) env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  env.CHAT_ALLOWED_ORIGINS = `http://127.0.0.1:${port},http://localhost:${port}`;
  return env;
}

export function createPreviewServer({root = ROOT, chatHandler} = {}) {
  let configured = null, signature = '';
  const server = createServer(async (req, res) => {
    const abort = new AbortController();
    req.once('aborted', () => abort.abort());
    res.once('close', () => { if (!res.writableEnded) abort.abort(); });
    try {
      const origin = `http://127.0.0.1:${req.socket.localPort}`;
      const url = new URL(req.url, origin);
      if (url.pathname === '/api/chat') {
        let handler = chatHandler;
        if (!handler) {
          const env = await localEnvironment(root, req.socket.localPort);
          const next = JSON.stringify([env.OPENAI_API_KEY,env.CHAT_ALLOWED_ORIGINS]);
          if (next !== signature) { configured = createChatHandler({env}); signature = next; }
          handler = configured;
        }
        const request = new Request(url, {method:req.method,headers:req.headers,signal:abort.signal,
          ...(['GET','HEAD'].includes(req.method) ? {} : {body:Readable.toWeb(req),duplex:'half'})});
        const result = await handler(request, {ip:req.socket.remoteAddress});
        res.writeHead(result.status, Object.fromEntries(result.headers));
        res.end(Buffer.from(await result.arrayBuffer()));
        return;
      }
      if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
      const path = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
      if (!isPublicFile(path)) { res.writeHead(404); res.end('Not found'); return; }
      const file = await realpath(resolve(root, `.${path}`));
      const realRoot = await realpath(root);
      if (!file.startsWith(realRoot + sep)) { res.writeHead(404); res.end('Not found'); return; }
      // A public-looking symlink must not turn a backend file into an asset.
      if (!isPublicFile('/' + relative(realRoot, file).split(sep).join('/'))) {
        res.writeHead(404); res.end('Not found'); return;
      }
      const contents = await readFile(file);
      res.writeHead(200, {'Content-Type':TYPES[extname(file)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
      res.end(req.method === 'HEAD' ? undefined : contents);
    } catch (error) {
      if (res.destroyed || res.writableEnded) return;
      if (!res.headersSent) res.writeHead(error.code === 'ENOENT' ? 404 : 500, {'Content-Type':'text/plain'});
      res.end(error.code === 'ENOENT' ? 'Not found' : 'Preview request unavailable');
    }
  });
  server.headersTimeout = 10000;
  server.requestTimeout = 15000;
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 8765);
  createPreviewServer().listen(port, '127.0.0.1', () => {
    console.log(`Portfolio preview: http://127.0.0.1:${port}/`);
    console.log('Chat reads its key from chat-api/.env.local; private files are not served.');
  });
}
