// GW-019 (HTML5) y GW-020 (Shaka) en un navegador real (Chromium de Playwright), con la página en OTRO origen (8790)
// para ejercitar CORS. Solo el vídeo de prueba propio; nada de YouTube. Firefox no está instalado en este entorno.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { start } from '../scripts/origin.mjs';
import { startPage } from '../scripts/page-server.mjs';
import { startWrangler } from '../scripts/env.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
let origin; let pageSrv; let wrangler; let browser;

before(async () => {
  origin = await start(8788); pageSrv = await startPage(8790);
  wrangler = startWrangler(new URL('..', import.meta.url).pathname);
  for (let i = 0; i < 120; i++) { try { if ((await fetch('http://127.0.0.1:8787/media/test-video.mp4', { method: 'HEAD' })).status) break; } catch { /* aún no */ } await new Promise((r) => setTimeout(r, 500)); }
  // Sin proxy: todo está en 127.0.0.1
  browser = await chromium.launch({ proxy: undefined, args: ['--no-proxy-server', '--autoplay-policy=no-user-gesture-required'] });
});
after(async () => { await browser?.close(); wrangler?.stop(); for (const s of [origin, pageSrv]) { s?.closeAllConnections(); s?.close(); } });

async function open() {
  const page = await browser.newPage();
  const reqs = [];
  page.on('response', async (r) => {
    if (!r.url().startsWith('http://127.0.0.1:8787/')) return;
    const h = await r.request().allHeaders(); // incluye Origin (headers() la oculta)
    reqs.push({ url: r.url().replace('http://127.0.0.1:8787/media/', ''), method: r.request().method(), status: r.status(), range: h.range ?? null, origin: h.origin ?? null, acao: r.headers()['access-control-allow-origin'] ?? null });
  });
  const errs = []; page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('http://127.0.0.1:8790/');
  return { page, reqs, errs };
}
const waitFor = (page, fn, arg, ms = 15000) => page.waitForFunction(fn, arg, { timeout: ms });

test('GW-019 HTML5: reproduce, pausa, salta, volumen y llega al final, con peticiones Range 206', async () => {
  const { page, reqs } = await open();
  const fmt = await page.evaluate(() => window.fixture[0]);
  await page.evaluate(() => document.getElementById('html5').play());
  await waitFor(page, () => document.getElementById('html5').currentTime > 1);
  await page.evaluate(() => document.getElementById('html5').pause());
  assert.equal(await page.evaluate(() => document.getElementById('html5').paused), true);
  await page.evaluate(() => { const v = document.getElementById('html5'); v.currentTime = 25; });
  await waitFor(page, () => { const v = document.getElementById('html5'); return !v.seeking && Math.abs(v.currentTime - 25) < 1 && v.readyState >= 3; });
  await page.evaluate(() => { const v = document.getElementById('html5'); v.volume = 0.5; v.playbackRate = 2; return v.play(); });
  await waitFor(page, () => document.getElementById('html5').ended, null, 20000);
  const vol = await page.evaluate(() => document.getElementById('html5').volume);
  assert.equal(vol, 0.5);
  const mine = reqs.filter((r) => r.url.startsWith('test-video'));
  const ranges = mine.filter((r) => r.range);
  assert.ok(ranges.length >= 1, 'el navegador pidió rangos');
  assert.ok(mine.some((r) => r.status === 206), 'el gateway respondió 206');
  console.log(`  formato ${fmt}; ${mine.length} peticiones al gateway; estados ${[...new Set(mine.map((r) => r.status))].join(', ')}; rangos ${ranges.map((r) => r.range).join(' | ')}`);
  await page.close();
});

test('GW-020 Shaka (DASH por rangos): carga con CORS desde otro origen, reproduce y salta sin errores de red', async () => {
  const { page, reqs } = await open();
  const state = await page.evaluate(() => window.shakaReady);
  assert.equal(state, 'loaded', `Shaka: ${state} ${await page.evaluate(() => JSON.stringify(window.shakaErrors))}`);
  await page.evaluate(() => document.getElementById('shaka').play());
  await waitFor(page, () => document.getElementById('shaka').currentTime > 1);
  await page.evaluate(() => { document.getElementById('shaka').currentTime = 20; });
  await waitFor(page, () => { const v = document.getElementById('shaka'); return !v.seeking && Math.abs(v.currentTime - 20) < 1.5; });
  await waitFor(page, () => document.getElementById('shaka').currentTime > 21);
  assert.deepEqual(await page.evaluate(() => window.shakaErrors), []);
  await page.waitForTimeout(300);
  const dash = reqs.filter((r) => r.url === 'test-dash.mpd' || r.url.startsWith('dash-'));
  const cors = dash.filter((r) => r.origin === 'http://127.0.0.1:8790');
  assert.ok(cors.length > 0 && cors.length === dash.length, `todas las peticiones de Shaka llevan Origin (CORS): ${cors.length}/${dash.length}`);
  assert.ok(cors.every((r) => r.status === 204 || r.acao === 'http://127.0.0.1:8790'), 'todas las respuestas autorizan el origen de la página');
  assert.ok(dash.some((r) => r.status === 206 && r.range), 'Shaka pidió trozos por rango y recibió 206');
  console.log(`  Shaka: ${dash.length} peticiones (manifiesto + trozos); con Origin y CORS autorizado: ${cors.length}; estados ${[...new Set(dash.map((r) => r.status))].join(', ')}; por rango: ${dash.filter((r) => r.range).length}`);
  await page.close();
});
