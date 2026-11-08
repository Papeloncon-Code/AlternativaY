// Sirve la página de prueba desde OTRO origen (127.0.0.1:8790) para ejercitar CORS de verdad contra el gateway (8787).
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize } from 'node:path';
const pub = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript' };
const server = createServer((req, res) => {
  const p = normalize(new URL(req.url, 'http://x').pathname).replace(/^(\.\.[/\\])+/, '');
  const f = join(pub, p === '/' ? 'index.html' : p);
  if (!f.startsWith(pub) || !existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[f.slice(f.lastIndexOf('.'))] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
export function startPage(port = 8790) { return new Promise((ok) => server.listen(port, '127.0.0.1', () => ok(server))); }
if (process.argv[1] === fileURLToPath(import.meta.url)) startPage().then(() => console.log('página de prueba en http://127.0.0.1:8790/'));
