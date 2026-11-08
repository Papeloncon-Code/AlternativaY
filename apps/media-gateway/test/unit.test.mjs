// Pruebas unitarias del gateway (test-plan.md, GW-001…GW-018) con un origen simulado: sin red.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handle, readConfig, isPrivateHost, parseRange, makeLimiter } from '../src/gateway.js';

const ENV = {
  GATEWAY_ENABLED: '1', ORIGIN_BASE: 'https://media.example.org/fixtures/', ASSETS: 'test-video.mp4,missing.mp4',
  ALLOWED_ORIGINS: 'http://127.0.0.1:8790', RATE_LIMIT_PER_MIN: '1000',
};
const cfg = readConfig(ENV);
const BYTES = new Uint8Array(4096).map((_, i) => i % 251);

// Origen simulado: registra cada llamada y responde como un servidor con Range.
function fakeOrigin(over = {}) {
  const calls = [];
  const f = async (url, init) => {
    calls.push({ url, init });
    if (over.respond) return over.respond(url, init);
    const range = init.headers?.Range;
    if (range) {
      const [, a, b] = /bytes=(\d*)-(\d*)/.exec(range);
      const start = a === '' ? BYTES.length - Number(b) : Number(a);
      const end = a === '' || b === '' ? BYTES.length - 1 : Math.min(Number(b), BYTES.length - 1);
      if (start >= BYTES.length) return new Response(null, { status: 416, headers: { 'content-range': `bytes */${BYTES.length}` } });
      return new Response(init.method === 'HEAD' ? null : BYTES.slice(start, end + 1), { status: 206, headers: { 'content-type': 'video/mp4', 'content-range': `bytes ${start}-${end}/${BYTES.length}`, 'content-length': String(end - start + 1), 'accept-ranges': 'bytes', 'set-cookie': 'secreto=1', 'x-internal': 'no' } });
    }
    return new Response(init.method === 'HEAD' ? null : BYTES, { status: 200, headers: { 'content-type': 'video/mp4', 'content-length': String(BYTES.length), 'accept-ranges': 'bytes', etag: '"v1"' } });
  };
  f.calls = calls;
  return f;
}
const req = (path, init = {}) => new Request(`http://127.0.0.1:8787${path}`, init);
const bytesOf = async (res) => new Uint8Array(await res.arrayBuffer());

test('GW-001 GET completo: mismos bytes, tipo y longitud; destino fijo', async () => {
  const f = fakeOrigin();
  const res = await handle(req('/media/test-video.mp4'), cfg, f);
  assert.equal(res.status, 200);
  assert.deepEqual(await bytesOf(res), BYTES);
  assert.equal(res.headers.get('content-type'), 'video/mp4');
  assert.equal(res.headers.get('content-length'), '4096');
  assert.equal(f.calls[0].url, 'https://media.example.org/fixtures/test-video.mp4');
  assert.equal(f.calls[0].init.redirect, 'manual');
  assert.deepEqual(f.calls[0].init.headers, {}); // no se reenvía ninguna cabecera del cliente (cookies, Authorization…)
});

test('GW-002 HEAD: cabeceras de representación y sin cuerpo', async () => {
  const res = await handle(req('/media/test-video.mp4', { method: 'HEAD' }), cfg, fakeOrigin());
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-length'), '4096');
  assert.equal(res.body, null);
});

for (const [id, range, start, end] of [['GW-003', 'bytes=0-1023', 0, 1023], ['GW-004', 'bytes=1000-1999', 1000, 1999], ['GW-005', 'bytes=4000-', 4000, 4095]]) {
  test(`${id} Range ${range}: 206, Content-Range exacto y bytes exactos`, async () => {
    const f = fakeOrigin();
    const res = await handle(req('/media/test-video.mp4', { headers: { Range: range } }), cfg, f);
    assert.equal(res.status, 206);
    assert.equal(res.headers.get('content-range'), `bytes ${start}-${end}/4096`);
    assert.deepEqual(await bytesOf(res), BYTES.slice(start, end + 1));
    assert.equal(f.calls[0].init.headers.Range, range);
    assert.equal(res.headers.get('set-cookie'), null); // solo pasan cabeceras de la lista
    assert.equal(res.headers.get('x-internal'), null);
  });
}

test('GW-006 Range fuera de tamaño: 416 con Content-Range bytes */tamaño', async () => {
  const res = await handle(req('/media/test-video.mp4', { headers: { Range: 'bytes=99999-' } }), cfg, fakeOrigin());
  assert.equal(res.status, 416);
  assert.equal(res.headers.get('content-range'), 'bytes */4096');
});

test('GW-007 Range malformado o múltiple: 416 sin llamar al origen', async () => {
  for (const r of ['bytes=0-10,20-30', 'bytes=abc', 'items=0-1', 'bytes=-', 'bytes=10-5']) {
    const f = fakeOrigin();
    const res = await handle(req('/media/test-video.mp4', { headers: { Range: r } }), cfg, f);
    assert.equal(res.status, 416, r);
    assert.equal(f.calls.length, 0, r);
  }
});

test('GW-008 OPTIONS desde origen permitido: 204 con lo justo', async () => {
  const res = await handle(req('/media/test-video.mp4', { method: 'OPTIONS', headers: { Origin: 'http://127.0.0.1:8790', 'Access-Control-Request-Headers': 'range' } }), cfg, fakeOrigin());
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('access-control-allow-origin'), 'http://127.0.0.1:8790');
  assert.equal(res.headers.get('access-control-allow-methods'), 'GET, HEAD, OPTIONS');
  assert.equal(res.headers.get('access-control-allow-headers'), 'Range');
  assert.equal(res.headers.get('access-control-allow-credentials'), null);
});

test('GW-009 OPTIONS desde origen no permitido: sin autorización CORS', async () => {
  const res = await handle(req('/media/test-video.mp4', { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } }), cfg, fakeOrigin());
  assert.equal(res.status, 403);
  assert.equal(res.headers.get('access-control-allow-origin'), null);
});

test('GW-010 GET con origen no permitido: 403, no se refleja el origen ni se llama al origen', async () => {
  const f = fakeOrigin();
  const res = await handle(req('/media/test-video.mp4', { headers: { Origin: 'https://evil.example' } }), cfg, f);
  assert.equal(res.status, 403);
  assert.equal(res.headers.get('access-control-allow-origin'), null);
  assert.equal(f.calls.length, 0);
  // Con origen permitido sí hay CORS y se exponen las cabeceras de Range
  const ok = await handle(req('/media/test-video.mp4', { headers: { Origin: 'http://127.0.0.1:8790' } }), cfg, fakeOrigin());
  assert.equal(ok.headers.get('access-control-allow-origin'), 'http://127.0.0.1:8790');
  assert.match(ok.headers.get('access-control-expose-headers'), /Content-Range/);
  assert.equal(ok.headers.get('vary'), 'Origin');
});

test('GW-011 destinos que no son de la lista: rechazo sin llamar al origen', async () => {
  for (const p of ['/media/otro.mp4', '/media/test-video.mp4?url=https://evil.example', '/proxy?url=https://www.youtube.com', '/media/', '/', '/media/https:%2F%2Fevil.example%2Fa.mp4', '/media/test-video.mp4/extra']) {
    const f = fakeOrigin();
    const res = await handle(req(p), cfg, f);
    assert.ok([400, 404].includes(res.status), `${p} → ${res.status}`);
    assert.equal(f.calls.length, 0, p);
  }
});

test('GW-012 la configuración rechaza bucle local, redes privadas, enlace local, metadatos y http', () => {
  for (const o of ['http://media.example.org/', 'https://127.0.0.1/', 'https://10.0.0.5/', 'https://192.168.1.2/', 'https://172.16.0.1/', 'https://169.254.169.254/', 'https://[::1]/', 'https://localhost/', 'https://metadata.google.internal/', 'https://user:pw@media.example.org/']) {
    assert.throws(() => readConfig({ ...ENV, ORIGIN_BASE: o }), undefined, o);
  }
  assert.ok(isPrivateHost('100.64.0.1'));
  assert.ok(!isPrivateHost('media.example.org'));
  // Solo en desarrollo (DEV_ALLOW_LOOPBACK=1) se acepta el origen local de prueba
  assert.doesNotThrow(() => readConfig({ ...ENV, ORIGIN_BASE: 'http://127.0.0.1:8788/fixtures/', DEV_ALLOW_LOOPBACK: '1' }));
});

test('GW-013 traversal y codificación ambigua: rechazo sin llamar al origen', async () => {
  for (const p of ['/media/..%2F..%2Fetc%2Fpasswd', '/media/%2e%2e', '/media/test-video%2Emp4', '/media/TEST-VIDEO.mp4', '/media/test video.mp4', '/media/test-video.mp4%00.mp4']) {
    const f = fakeOrigin();
    const res = await handle(req(p), cfg, f);
    assert.ok([400, 404].includes(res.status), `${p} → ${res.status}`);
    assert.equal(f.calls.length, 0, p);
  }
});

test('GW-014 redirección del origen: 502, no se sigue', async () => {
  const f = fakeOrigin({ respond: () => new Response(null, { status: 302, headers: { location: 'http://evil.example/x' } }) });
  const res = await handle(req('/media/test-video.mp4'), cfg, f);
  assert.equal(res.status, 502);
  assert.equal(res.headers.get('location'), null);
  assert.equal(f.calls.length, 1);
});

test('GW-015 errores del origen 404 y 500 se propagan (nunca 200)', async () => {
  for (const s of [404, 500, 503]) {
    const res = await handle(req('/media/missing.mp4'), cfg, fakeOrigin({ respond: () => new Response('x', { status: s }) }));
    assert.equal(res.status, s);
  }
  const down = await handle(req('/media/test-video.mp4'), cfg, async () => { throw new TypeError('fetch failed'); });
  assert.equal(down.status, 502);
});

test('GW-016 origen sin Content-Length: se retransmite sin inventar longitud', async () => {
  const stream = new ReadableStream({ start(c) { c.enqueue(BYTES.slice(0, 100)); c.enqueue(BYTES.slice(100, 300)); c.close(); } });
  const res = await handle(req('/media/test-video.mp4'), cfg, fakeOrigin({ respond: () => new Response(stream, { status: 200, headers: { 'content-type': 'video/mp4' } }) }));
  assert.equal(res.headers.get('content-length'), null);
  assert.deepEqual(await bytesOf(res), BYTES.slice(0, 300));
});

test('GW-017 cancelación: la señal del cliente llega al origen y cancelar la respuesta cancela la lectura', async () => {
  let upstreamCancelled = false; let gotSignal;
  const stream = new ReadableStream({ pull(c) { c.enqueue(new Uint8Array(1024)); return new Promise((r) => setTimeout(r, 20)); }, cancel() { upstreamCancelled = true; } });
  const ac = new AbortController();
  const res = await handle(req('/media/test-video.mp4', { signal: ac.signal }), cfg, fakeOrigin({ respond: (u, init) => { gotSignal = init.signal; return new Response(stream, { status: 200 }); } }));
  const reader = res.body.getReader();
  await reader.read();
  ac.abort();
  assert.equal(gotSignal.aborted, true);
  await reader.cancel();
  assert.equal(upstreamCancelled, true);
});

test('GW-018 streaming incremental: el primer trozo llega antes de que el origen termine', async () => {
  let release; const gate = new Promise((r) => { release = r; });
  let finished = false;
  const stream = new ReadableStream({
    async start(c) { c.enqueue(BYTES.slice(0, 512)); await gate; c.enqueue(BYTES.slice(512)); finished = true; c.close(); },
  });
  const res = await handle(req('/media/test-video.mp4'), cfg, fakeOrigin({ respond: () => new Response(stream, { status: 200 }) }));
  const reader = res.body.getReader();
  const first = await reader.read();
  assert.equal(first.value.byteLength, 512);
  assert.equal(finished, false, 'el origen aún no ha terminado: no hay almacenamiento completo');
  release();
  let rest = 0; for (;;) { const r = await reader.read(); if (r.done) break; rest += r.value.byteLength; }
  assert.equal(rest, BYTES.length - 512);
});

test('Interruptor, método no permitido, límite de abuso y registro sin URL', async () => {
  const off = await handle(req('/media/test-video.mp4'), readConfig({ ...ENV, GATEWAY_ENABLED: '0' }), fakeOrigin());
  assert.equal(off.status, 503);
  const post = await handle(req('/media/test-video.mp4', { method: 'POST', body: 'x' }), cfg, fakeOrigin());
  assert.equal(post.status, 405);
  let t = 0; const lim = makeLimiter(2, () => t);
  assert.ok(lim('a')); assert.ok(lim('a')); assert.ok(!lim('a')); t = 60_000; assert.ok(lim('a'));
  const limited = await handle(req('/media/test-video.mp4'), cfg, fakeOrigin(), () => false);
  assert.equal(limited.status, 429);
  const logs = [];
  await handle(req('/media/test-video.mp4', { headers: { Range: 'bytes=0-9' } }), cfg, fakeOrigin(), null, (e) => logs.push(e));
  assert.deepEqual(Object.keys(logs[0]).sort(), ['ms', 'op', 'status']);
  assert.ok(!JSON.stringify(logs).includes('media.example.org'));
});

test('parseRange', () => {
  assert.equal(parseRange(null), null);
  assert.equal(parseRange('bytes=0-'), 'bytes=0-');
  assert.equal(parseRange('bytes=-500'), 'bytes=-500');
  assert.equal(parseRange('bytes=0-1,2-3'), 'invalid');
});
