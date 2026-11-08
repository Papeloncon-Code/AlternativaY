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

test('lee og:image y og:title aunque estén partidos entre trozos', async () => {
  const relleno = 'x'.repeat(5000);
  const html = `<html>${relleno}<meta property="og:title" content="CNET"><meta property="og:image" content="https://yt3.googleusercontent.com/abc=s900-c-k-c0x00ffffff-no-rj">${relleno.repeat(50)}</html>`;
  const f = fakeFetch(html, 997);
  const r = await readChannelPreview(f, 'UCOmcA3f_RrH6b9NmcNa4tdg');
  assert.equal(r.name, 'CNET');
  assert.equal(r.avatar, 'https://yt3.googleusercontent.com/abc=s176-c-k-c0x00ffffff-no-rj');
  // Sin cabecera en la página se lee hasta el final (como mucho 4 MB): no hay nada más que cortar.
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

// Cabecera pública (forma real recortada de la página de un canal, 2026-11-08).
const cabecera = {
  pageHeaderRenderer: { pageTitle: 'Canal "Uno" {raro}', content: { pageHeaderViewModel: {
    title: { dynamicTextViewModel: { text: { content: 'Canal "Uno" {raro}', attachmentRuns: [{ element: { type: { imageType: { image: { sources: [{ clientResource: { imageName: 'CHECK_CIRCLE_FILLED' } }] } } } } }] } } },
    metadata: { contentMetadataViewModel: { metadataRows: [
      { metadataParts: [{ text: { content: '@canaluno' } }] },
      { metadataParts: [{ text: { content: '446 K suscriptores' } }, { text: { content: '2 K vídeos' } }] },
    ] } },
    description: { descriptionPreviewViewModel: { description: { content: 'Descripción del canal } con llave' } } },
    attribution: { attributionViewModel: {
      text: { content: 'Facebook', commandRuns: [{ startIndex: 0, length: 8, onTap: { innertubeCommand: { urlEndpoint: { url: 'https://www.youtube.com/redirect?event=channel_header&q=https%3A%2F%2Fwww.facebook.com%2Fcanaluno' } } } }] },
      suffix: { content: 'y 1 enlace más' },
    } },
    banner: { imageBannerViewModel: { image: { sources: [
      { url: 'https://yt3.googleusercontent.com/b=w1060-fcrop64', width: 1060, height: 175 },
      { url: 'https://yt3.googleusercontent.com/b=w2560-fcrop64', width: 2560, height: 424 },
      { url: 'https://yt3.googleusercontent.com/b=w2880-fcrop64', width: 2880, height: 477 },
    ] } } },
  } } },
};

test('lee la cabecera pública del final de la página (aunque llegue partida) y deja de leer al cerrarla', async () => {
  const html = `<meta property="og:title" content="Canal"><meta property="og:image" content="https://yt3.googleusercontent.com/a=s900">${'x'.repeat(100_000)}"channelVideoPlayerRenderer":{"videoId":"abcdefghijk","title":{"runs":[{"text":"Destacado "},{"text":"{con llaves}"}]},"description":{"runs":[{"text":"Texto"}]},"viewCountText":{"simpleText":"5 visualizaciones"},"publishedTimeText":{"runs":[{"text":"hace 7 a"}]}},"x":1${'x'.repeat(100_000)}"tabs":[],"header":${JSON.stringify(cabecera)},"metadata":{}${'y'.repeat(300_000)}`;
  const f = fakeFetch(html, 4093);
  const r = await readChannelPreview(f, 'UCaaaaaaaaaaaaaaaaaaaaaa');
  assert.deepEqual(r.header, {
    title: 'Canal "Uno" {raro}', verified: true, handle: '@canaluno', subs: '446 K suscriptores', videos: '2 K vídeos',
    about: 'Descripción del canal } con llave',
    link: { text: 'Facebook', url: 'https://www.facebook.com/canaluno', more: 'y 1 enlace más' },
    banner: 'https://yt3.googleusercontent.com/b=w2560-fcrop64',
    featured: { id: 'abcdefghijk', title: 'Destacado {con llaves}', about: 'Texto', views: '5 visualizaciones', ago: 'hace 7 a' },
  });
  const st = f.stats();
  assert.ok(st.cancelled && st.sent < st.total * 0.6, `debe cortar tras la cabecera (${st.sent} de ${st.total})`);
});

test('cabecera: enlaces que no son http(s) y banners fuera de la CDN se descartan', async () => {
  const c = structuredClone(cabecera);
  const vm = c.pageHeaderRenderer.content.pageHeaderViewModel;
  vm.attribution.attributionViewModel.text.commandRuns[0].onTap.innertubeCommand.urlEndpoint.url = 'https://www.youtube.com/redirect?q=javascript%3Aalert(1)';
  vm.banner.imageBannerViewModel.image.sources = [{ url: 'https://evil.example/b.png', width: 100 }];
  vm.title = { dynamicTextViewModel: { text: { content: 'Sin verificar' } } };
  const r = await readChannelPreview(fakeFetch(`"header":${JSON.stringify(c)}`), 'UCaaaaaaaaaaaaaaaaaaaaaa');
  assert.equal(r.header.link, null);
  assert.equal(r.header.banner, null);
  assert.equal(r.header.verified, false);
});

import { readChannelVideos, parseViewsLabel, parseDuration, parseAgo, storeChannelVideos } from '../src/index.js';
const lockup = (id, dur, views, ago) => ({ lockupViewModel: {
  contentId: id, contentType: 'LOCKUP_CONTENT_TYPE_VIDEO',
  contentImage: { thumbnailViewModel: { overlays: [{ thumbnailBottomOverlayViewModel: { badges: [{ thumbnailBadgeViewModel: { text: dur } }] } }] } },
  metadata: { lockupMetadataViewModel: { title: { content: `Vídeo ${id} {x}` }, metadata: { contentMetadataViewModel: { metadataRows: [{ metadataParts: [
    { text: { content: 'x' }, accessibilityLabel: views }, { text: { content: 'y' }, accessibilityLabel: ago },
  ] }] } } } },
} });

test('pestaña «Vídeos»: id, título, duración, visualizaciones y antigüedad de cada vídeo', async () => {
  const items = [lockup('aaaaaaaaaaa', '22:28', '82 millones de visualizaciones', 'hace 7 días'), lockup('bbbbbbbbbbb', '1:02:03', '1,2 mil visualizaciones', 'hace 3 semanas'), lockup('ccccccccccc', 'EN DIRECTO', '5 visualizaciones', 'hace 1 hora')];
  const html = `<meta property="og:title" content="C">${'x'.repeat(50_000)}"richGridRenderer":{"contents":[${items.map((i) => `{"richItemRenderer":{"content":${JSON.stringify(i)}}}`).join(',')}]}${'z'.repeat(9000)}"header":${JSON.stringify(cabecera)},"x":1`;
  const r = await readChannelVideos(fakeFetch(html, 2039), 'UCaaaaaaaaaaaaaaaaaaaaaa');
  assert.equal(r.lockups.length, 3);
  assert.deepEqual(r.lockups[0], { id: 'aaaaaaaaaaa', title: 'Vídeo aaaaaaaaaaa {x}', dur: 1348, views: 82_000_000, age: 7 * 8.64e7 });
  assert.equal(r.lockups[1].dur, 3723); assert.equal(r.lockups[1].views, 1200);
  assert.equal(r.lockups[2].dur, null);
  assert.equal(r.header.handle, '@canaluno');
});

test('números y duraciones en español', () => {
  assert.equal(parseViewsLabel('2,1 mil millones de visualizaciones'), 2_100_000_000);
  assert.equal(parseViewsLabel('604.111 visualizaciones'), 604_111);
  assert.equal(parseViewsLabel('Programado para el 3 dic'), null);
  assert.equal(parseDuration('9:05'), 545);
  assert.equal(parseAgo('hace 1 año'), 3.1536e10);
});

test('vídeos de la pestaña: los recién subidos (< 2 días) no se añaden, para no robarle el aviso a WebSub', async () => {
  const calls = [];
  const env = { DB: { prepare: (sql) => ({ bind: (...a) => ({ sql, a }) }), batch: async (s) => { calls.push(...s); } } };
  await storeChannelVideos(env, 'UCaaaaaaaaaaaaaaaaaaaaaa', [
    { id: 'nuevo000000', title: 'Recién subido', dur: 60, views: 10, age: 3.6e6 },
    { id: 'viejo000000', title: 'De hace un mes', dur: 600, views: 1000, age: 30 * 8.64e7 },
  ], 1_800_000_000_000);
  const inserts = calls.filter((c) => c.sql.startsWith('INSERT'));
  assert.equal(inserts.length, 1);
  assert.equal(inserts[0].a[0], 'viejo000000');
  assert.equal(calls.filter((c) => c.sql.startsWith('UPDATE')).length, 2); // la duración sí se guarda en los dos
});
