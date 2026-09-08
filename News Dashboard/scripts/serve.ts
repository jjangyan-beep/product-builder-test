import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { refreshSnapshot, atomicWrite, scheduledSlot } from '../packages/pipeline/src/dashboard/snapshot.ts';

const root = resolve('apps/web');
const port = Number(process.env.PORT ?? 4173);
const origin = `http://127.0.0.1:${port}`;
let pending: Promise<unknown> | null = null;
let lastAttempt = 0;
async function refresh() {
  if (pending) return pending;
  if (Date.now() - lastAttempt < 60000) return;
  lastAttempt = Date.now();
  pending = (async () => {
    let state = 'success';
    try { const result = await refreshSnapshot(`${root}/data/news.json`); if (result.partial) state = 'partial'; }
    catch { state = 'failed'; }
    await atomicWrite(`${root}/data/status.json`, { state, attemptedAt: new Date().toISOString() }).catch(() => {});
    return { state };
  })();
  try { return await pending; } finally { pending = null; }
}

const files = new Map([
  ['/', ['index.html', 'text/html']], ['/index.html', ['index.html', 'text/html']],
  ['/style.css', ['style.css', 'text/css']], ['/app.js', ['app.js', 'text/javascript']],
  ['/model.js', ['model.js', 'text/javascript']],
  ['/data/news.json', ['data/news.json', 'application/json']], ['/data/status.json', ['data/status.json', 'application/json']],
]);
const server = createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'");
  if (req.headers.host !== `127.0.0.1:${port}`) { res.writeHead(403).end(); return; }
  const url = new URL(req.url ?? '/', origin);
  if (url.pathname === '/api/refresh' && req.method === 'POST') {
    if (req.headers.origin !== origin) { res.writeHead(403).end(); return; }
    const result = await refresh();
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(result ?? { state: 'cooldown' })); return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
  const entry = files.get(url.pathname);
  if (!entry) { res.writeHead(404).end(); return; }
  try {
    const bytes = await readFile(resolve(root, entry[0]));
    res.writeHead(200, { 'Content-Type': `${entry[1]}; charset=utf-8` }).end(req.method === 'HEAD' ? undefined : bytes);
  } catch { res.writeHead(404).end(); }
});
server.listen(port, '127.0.0.1', () => console.log(`Local: ${origin}`));
let lastSlot: string | null = null;
setInterval(() => {
  const slot = scheduledSlot(new Date());
  if (slot && slot !== lastSlot) { lastSlot = slot; void refresh(); }
}, 15000).unref();
