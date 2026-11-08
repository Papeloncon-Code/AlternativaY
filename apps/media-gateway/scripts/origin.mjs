// Origen de prueba LOCAL controlado por el proyecto (spec 008). Sirve el fixture con soporte real de Range y simula fallos:
//   /fixtures/test-video.mp4|.webm, test-dash.mpd, dash-0.mp4, dash-1.mp4 → 200/206/416, HEAD
//   /fixtures/slow.mp4        → envía 64 KB cada 150 ms; registra si el cliente corta la conexión (prueba de cancelación)
//   /fixtures/nolength.mp4    → sin Content-Length (transferencia por trozos)
//   /fixtures/error.mp4       → 500 · /fixtures/missing.mp4 → 404 · /fixtures/redirect.mp4 → 302 a un host ajeno
import { createServer } from 'node:http';
import { createReadStream, statSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');
const port = Number(process.env.ORIGIN_PORT || 8788);
const file = join(root, 'test-video.mp4');
export const events = [];
const ev = (e) => { events.push(e); if (process.env.ORIGIN_LOG) console.log(JSON.stringify(e)); };

const server = createServer((req, res) => {
  const { pathname } = new URL(req.url, 'http://x');
  ev({ t: Date.now(), path: pathname, method: req.method, range: req.headers.range ?? null });
  if (pathname === '/fixtures/error.mp4') { res.writeHead(500, { 'content-type': 'text/plain' }); return res.end('fallo'); }
  if (pathname === '/fixtures/redirect.mp4') { res.writeHead(302, { location: 'http://evil.example/robar' }); return res.end(); }
  if (pathname === '/fixtures/nolength.mp4') {
    res.writeHead(200, { 'content-type': 'video/mp4' }); // sin Content-Length: Node usa chunked
    return createReadStream(file).pipe(res);
  }
  if (pathname === '/fixtures/slow.mp4') {
    const data = readFileSync(file);
    res.writeHead(200, { 'content-type': 'video/mp4', 'content-length': data.length });
    let off = 0; let closed = false;
    res.on('close', () => { closed = true; if (off < data.length) ev({ t: Date.now(), path: pathname, aborted: true, sent: off }); });
    const tick = () => {
      if (closed) return;
      if (off >= data.length) return res.end();
      res.write(data.subarray(off, off + 65536)); off += 65536; setTimeout(tick, 150);
    };
    return tick();
  }
  const TYPES = { mp4: 'video/mp4', webm: 'video/webm', mpd: 'application/dash+xml' };
  const fm = pathname.match(/^\/fixtures\/(test-video\.(mp4|webm)|test-dash\.mpd|dash-[01]\.mp4)$/);
  const served = fm && [join(root, fm[1]), TYPES[fm[1].split('.').pop()]];
  if (!served) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('no existe'); }
  const [path, type] = served;
  const size = statSync(path).size;
  const base = { 'content-type': type, 'accept-ranges': 'bytes', etag: '"fixture-v1"', 'last-modified': 'Sat, 07 Nov 2026 00:00:00 GMT' };
  const r = req.headers.range && /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
  if (req.headers.range && !r) { res.writeHead(416, { ...base, 'content-range': `bytes */${size}` }); return res.end(); }
  if (r) {
    let start = r[1] === '' ? size - Number(r[2]) : Number(r[1]);
    let end = r[1] === '' || r[2] === '' ? size - 1 : Math.min(Number(r[2]), size - 1);
    if (start < 0) start = 0;
    if (start >= size || start > end) { res.writeHead(416, { ...base, 'content-range': `bytes */${size}` }); return res.end(); }
    res.writeHead(206, { ...base, 'content-range': `bytes ${start}-${end}/${size}`, 'content-length': end - start + 1 });
    return req.method === 'HEAD' ? res.end() : createReadStream(path, { start, end }).pipe(res);
  }
  res.writeHead(200, { ...base, 'content-length': size });
  return req.method === 'HEAD' ? res.end() : createReadStream(path).pipe(res);
});

export function start(p = port) { return new Promise((ok) => server.listen(p, '127.0.0.1', () => ok(server))); }
if (process.argv[1] === fileURLToPath(import.meta.url)) start().then(() => console.log(`origen de prueba en http://127.0.0.1:${port}/fixtures/`));
