import test from 'node:test';
import assert from 'node:assert/strict';
import { readChannelPreview } from '../src/index.js';

// Respuesta simulada que llega por trozos, con las etiquetas partidas entre dos trozos.
function fakeFetch(html, chunk = 1000) {
  const bytes = new TextEncoder().encode(html);
  let sent = 0; let cancelled = false;
  const body = new ReadableStream({
    pull(c) { if (sent >= bytes.length) return c.close(); c.enqueue(bytes.slice(sent, sent + chunk)); sent += chunk; },
    cancel() { cancelled = true; },
  });
  const f = async () => new Response(body, { status: 200 });
  f.stats = () => ({ sent, cancelled, total: bytes.length });
  return f;
}

test('lee og:image y og:title aunque estén partidos entre trozos, y corta la lectura', async () => {
  const relleno = 'x'.repeat(5000);
  const html = `<html>${relleno}<meta property="og:title" content="CNET"><meta property="og:image" content="https://yt3.googleusercontent.com/abc=s900-c-k-c0x00ffffff-no-rj">${relleno.repeat(50)}</html>`;
  const f = fakeFetch(html, 997);
  const r = await readChannelPreview(f, 'UCOmcA3f_RrH6b9NmcNa4tdg');
  assert.equal(r.name, 'CNET');
  assert.equal(r.avatar, 'https://yt3.googleusercontent.com/abc=s176-c-k-c0x00ffffff-no-rj');
  const st = f.stats();
  assert.ok(st.cancelled, 'debe cancelar la descarga');
  assert.ok(st.sent < st.total / 10, `solo debe leer el principio (${st.sent} de ${st.total})`);
});

test('rechaza fotos que no sean de la CDN pública de canales', async () => {
  const html = '<meta property="og:title" content="X"><meta property="og:image" content="https://evil.example/a.png">';
  const r = await readChannelPreview(fakeFetch(html), 'UCaaaaaaaaaaaaaaaaaaaaaa');
  assert.equal(r.avatar, null);
  assert.equal(r.name, 'X');
});

test('si YouTube responde con error, no hay foto', async () => {
  const r = await readChannelPreview(async () => new Response('no', { status: 429 }), 'UCaaaaaaaaaaaaaaaaaaaaaa');
  assert.equal(r.status, 429); assert.equal(r.avatar, undefined);
});
