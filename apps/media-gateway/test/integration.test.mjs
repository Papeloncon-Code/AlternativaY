// Integración real (GW-001…GW-018 sobre la red local): runtime de Workers (wrangler dev, workerd) + origen de prueba local.
// Ninguna petición sale a Internet; nada de YouTube/Googlevideo.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { start, events } from '../scripts/origin.mjs';
import { startWrangler } from '../scripts/env.mjs';

const GW = 'http://127.0.0.1:8787/media';
const FILE = readFileSync(new URL('../fixtures/test-video.mp4', import.meta.url));
const sha = (b) => createHash('sha256').update(b).digest('hex');
let origin; let wrangler; const logs = [];


before(async () => {
  origin = await start(8788);
  wrangler = startWrangler(new URL('..', import.meta.url).pathname, (t) => logs.push(t));
  for (let i = 0; i < 120; i++) { // hasta 60 s para arrancar
    try { const r = await fetch(`${GW}/test-video.mp4`, { method: 'HEAD' }); if (r.status) return; } catch { /* aún no */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('wrangler dev no arrancó:\n' + logs.join(''));
});
after(() => { wrangler?.stop(); origin?.closeAllConnections(); origin?.close(); });

test('GW-001 GET completo: hash idéntico al fixture', async () => {
  const r = await fetch(`${GW}/test-video.mp4`);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-type'), 'video/mp4');
  assert.equal(sha(Buffer.from(await r.arrayBuffer())), sha(FILE));
});

test('GW-002 HEAD sin cuerpo', async () => {
  const r = await fetch(`${GW}/test-video.mp4`, { method: 'HEAD' });
  assert.equal(r.status, 200);
  assert.equal(Number(r.headers.get('content-length')), FILE.length);
  assert.equal((await r.arrayBuffer()).byteLength, 0);
});

for (const [id, range, s, e] of [['GW-003', 'bytes=0-1023', 0, 1023], ['GW-004', 'bytes=3000000-3001999', 3000000, 3001999], ['GW-005', `bytes=${FILE.length - 777}-`, FILE.length - 777, FILE.length - 1]]) {
  test(`${id} ${range}: 206 y bytes exactos`, async () => {
    const r = await fetch(`${GW}/test-video.mp4`, { headers: { Range: range } });
    assert.equal(r.status, 206);
    assert.equal(r.headers.get('content-range'), `bytes ${s}-${e}/${FILE.length}`);
    assert.ok(Buffer.from(await r.arrayBuffer()).equals(FILE.subarray(s, e + 1)));
  });
}

test('GW-006 rango fuera de tamaño: 416', async () => {
  const r = await fetch(`${GW}/test-video.mp4`, { headers: { Range: `bytes=${FILE.length + 10}-` } });
  assert.equal(r.status, 416);
  assert.equal(r.headers.get('content-range'), `bytes */${FILE.length}`);
});

test('GW-007/011/013 entradas peligrosas: rechazo sin tocar el origen', async () => {
  const before = events.length;
  for (const [p, init] of [['/test-video.mp4', { headers: { Range: 'bytes=0-1,5-9' } }], ['/otro.mp4', {}], ['/test-video.mp4?url=https://www.youtube.com', {}], ['/..%2F..%2Fetc%2Fpasswd', {}]]) {
    const r = await fetch(GW + p, init);
    assert.ok([400, 404, 416].includes(r.status), `${p} → ${r.status}`);
  }
  assert.equal(events.length, before, 'el origen no recibió ninguna petición');
});

test('GW-008/009/010 CORS real', async () => {
  const ok = await fetch(`${GW}/test-video.mp4`, { method: 'OPTIONS', headers: { Origin: 'http://127.0.0.1:8790', 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'range' } });
  assert.equal(ok.status, 204);
  assert.equal(ok.headers.get('access-control-allow-origin'), 'http://127.0.0.1:8790');
  const bad = await fetch(`${GW}/test-video.mp4`, { method: 'OPTIONS', headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'GET' } });
  assert.equal(bad.status, 403);
  assert.equal(bad.headers.get('access-control-allow-origin'), null);
  const get = await fetch(`${GW}/test-video.mp4`, { headers: { Origin: 'https://evil.example' } });
  assert.equal(get.status, 403);
});

test('GW-014 redirección a host ajeno: 502 y no se sigue', async () => {
  const r = await fetch(`${GW}/redirect.mp4`, { redirect: 'manual' });
  assert.equal(r.status, 502);
  assert.equal(r.headers.get('location'), null);
});

test('GW-015 404 y 500 del origen se propagan', async () => {
  assert.equal((await fetch(`${GW}/missing.mp4`)).status, 404);
  assert.equal((await fetch(`${GW}/error.mp4`)).status, 500);
});

test('GW-016 origen sin Content-Length: bytes íntegros', async () => {
  const r = await fetch(`${GW}/nolength.mp4`);
  assert.equal(r.status, 200);
  assert.equal(sha(Buffer.from(await r.arrayBuffer())), sha(FILE));
});

test('GW-018 streaming incremental: primer trozo en < 1,5 s cuando el envío completo tarda ~14 s', async () => {
  const t0 = Date.now();
  const r = await fetch(`${GW}/slow.mp4`);
  const reader = r.body.getReader();
  const first = await reader.read();
  const ms = Date.now() - t0;
  assert.ok(first.value.byteLength > 0);
  assert.ok(ms < 1500, `primer trozo a los ${ms} ms`);
  await reader.cancel();
});

test('GW-017 cancelación: al cortar el cliente, el origen deja de enviar', async () => {
  const ac = new AbortController();
  const r = await fetch(`${GW}/slow.mp4`, { signal: ac.signal });
  const reader = r.body.getReader();
  await reader.read(); await reader.read();
  const t = Date.now();
  ac.abort();
  let seen = null;
  for (let i = 0; i < 50 && !seen; i++) { await new Promise((x) => setTimeout(x, 100)); seen = events.find((e) => e.aborted && e.t >= t - 50); }
  assert.ok(seen, 'el origen registró la desconexión');
  assert.ok(seen.sent < FILE.length, `se cortó tras enviar ${seen.sent} de ${FILE.length} bytes`);
  console.log(`  cancelación propagada en ${seen.t - t} ms; enviados ${seen.sent} de ${FILE.length} bytes`);
});

test('Registro del Worker sin URLs ni rangos', async () => {
  const text = logs.join('');
  const lines = text.split('\n').filter((l) => l.includes('"gw":1'));
  assert.ok(lines.length > 5, 'hay registros');
  assert.ok(!lines.some((l) => l.includes('127.0.0.1:8788') || l.includes('bytes=')), 'sin URL de origen ni rangos');
});
