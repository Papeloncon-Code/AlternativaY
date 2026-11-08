// Bloque 7: datos públicos sin Puente (visitas, descripción, fotos de canal) y página de privacidad.
import { test, expect } from '@playwright/test';
import { noPrompts, trackErrors } from './helpers';

// Peticiones desde el propio navegador (usa la misma red que la web, también detrás de un proxy).
const api = (page: import('@playwright/test').Page, path: string) => page.evaluate((p) => fetch(p).then((r) => r.json()), path);

test.beforeEach(async ({ page }) => { await noPrompts(page); });

test('H3 · las tarjetas muestran visitas (del RSS público) sin Puente', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('.vcard').first()).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.vcard .vmeta', { hasText: /visualizaci/ }).first()).toBeVisible();
});

test('W4 · la página del vídeo muestra visitas y descripción sin Puente', async ({ page }) => {
  const ok = trackErrors(page);
  // Un vídeo que el servidor ya tenga con descripción
  await page.goto('/privacidad');
  const feed = await api(page, '/api/feed?limit=200');
  const v = feed.items.find((x: { views: number | null; kind: string }) => x.views != null && x.kind !== 'short');
  test.skip(!v, 'el servidor aún no tiene visitas');
  const all = await api(page, '/api/descriptions');
  const data = { description: all.items.find((x: { id: string }) => x.id === v.id)?.d };
  await page.goto(`/ver/${v.id}`);
  await expect(page.locator('.desc-meta')).toContainText('visualizaci');
  if (data.description) await expect(page.locator('.desc-text')).toContainText(data.description.slice(0, 20));
  ok();
});

test('L3 · fotos reales de canal en el menú sin Puente (cuando el servidor ya las tiene)', async ({ page }) => {
  await page.goto('/privacidad');
  const chans = await api(page, '/api/channels');
  const withPhoto = chans.items.find((c: { avatar?: string | null }) => c.avatar);
  test.skip(!withPhoto, 'el servidor aún no tiene fotos');
  await page.goto('/'); await expect(page.locator('.vcard').first()).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.side-item[href^="/canal/"]').first()).toBeVisible(); // lista de canales cargada
  const more = page.locator('.side-item', { hasText: /^Mostrar \d+ más$/ });
  if (await more.count()) await more.click(); // el canal puede estar entre los ocultos
  const img = page.locator(`.side-item[href="/canal/${withPhoto.id}"] img.avatar`);
  await expect(img).toBeVisible();
  await expect.poll(() => img.evaluate((i) => (i as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  // También en la cabecera del canal
  await page.goto(`/canal/${withPhoto.id}`);
  await expect(page.locator('.ch-head img.avatar')).toBeVisible();
});

test('Privacidad: página enlazada desde el menú y Ajustes', async ({ page }) => {
  await page.goto('/');
  await page.locator('.side-item', { hasText: 'Privacidad' }).click();
  await expect(page).toHaveURL(/\/privacidad$/);
  await expect(page.locator('h1')).toHaveText('Privacidad');
  await expect(page.locator('.ptable').nth(1)).toContainText('Solo si activas Web Push');
  await expect(page.locator('.privacy')).toContainText('no carga youtube-nocookie.com ni retransmite segmentos de googlevideo.com');
  await page.goto('/ajustes');
  await expect(page.locator('.panel').getByRole('link', { name: /Privacidad/ })).toHaveAttribute('href', '/privacidad');
});

test('G1 · ninguna cookie de YouTube al navegar por TodoTube', async ({ page, context }) => {
  await context.route(/googlevideo\.com/, (r) => r.abort()); // sin reproducción real
  const hosts = new Set<string>();
  page.on('request', (r) => hosts.add(new URL(r.url()).host));
  for (const p of ['/', '/privacidad', '/ajustes', '/suscripciones']) await page.goto(p, { waitUntil: 'networkidle' });
  expect([...hosts].filter((h) => h === 'www.youtube.com')).toEqual([]);
  expect((await context.cookies()).filter((c) => c.domain.includes('youtube'))).toEqual([]);
});

test('M3 · nuestro servidor no recibe la página en la que estás', async ({ page }) => {
  const refs: string[] = [];
  page.on('request', (r) => { if (r.url().includes('/api/')) refs.push(r.headers()['referer'] ?? ''); });
  await page.goto('/buscar?q=noticias'); await page.waitForLoadState('networkidle');
  expect(refs.length).toBeGreaterThan(0);
  expect(refs.filter((r) => r.includes('/buscar') || r.includes('noticias'))).toEqual([]);
});

test('duración sobre la miniatura (pestaña pública «Vídeos» del canal)', async ({ page }) => {
  const feed = (await (await page.request.get('/api/feed?limit=1000')).json()).items as { id: string; channelId: string; duration?: number | null; kind: string | null }[];
  const v = feed.find((x) => x.duration && x.kind !== 'short');
  test.skip(!v, 'el servidor aún no ha leído la duración de ningún vídeo');
  await page.goto(`/canal/${v!.channelId}/videos`);
  await expect(page.locator('.ch-grid .vcard').first()).toBeVisible({ timeout: 15_000 });
  const card = page.locator('.ch-grid .vcard', { has: page.locator(`a[href="/ver/${v!.id}"]`) }).first();
  // Con D1 caído, cada servidor de Cloudflare puede responder con su copia en memoria o con el respaldo RSS (sin duración):
  // solo se compara si la página recibió la misma fuente de datos que la prueba.
  test.skip(!(await card.count()) || !(await card.locator('.vdur').count()), 'la página recibió otra fuente de datos (respaldo RSS)');
  const m = Math.floor(v!.duration! / 60) % 60, s = v!.duration! % 60, h = Math.floor(v!.duration! / 3600);
  await expect(card.locator('.vdur')).toHaveText(h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`);
});

test('S1 · sin Puente se busca en todo: canales y vídeos de fuera de tus suscripciones', async ({ page }) => {
  await page.goto('/buscar?q=fern');
  await expect(page.locator('.sresult').first()).toBeVisible({ timeout: 20_000 });
  expect(await page.locator('.sresult').count()).toBeGreaterThan(5);
  // Cada resultado lleva su duración y su canal enlazado.
  await expect(page.locator('.sresult .vdur').first()).toHaveText(/^\d{1,2}(:\d{2}){1,2}$|EN VIVO/);
  await expect(page.locator('.sresult .sr-chan').first()).toHaveAttribute('href', /^\/canal\/UC[\w-]{22}$/);
});

test('C3 · cualquier canal, aunque no lo sigas: cabecera, vídeos con duración y «Suscribirse»', async ({ page }) => {
  const ID = 'UCuTIiHyNqELu6RNtB4AahAA'; // no está entre los seguidos (en producción, John Acquaviva; en CI, datos sintéticos)
  const want = await (await page.request.get(`/api/canal/${ID}`)).json();
  await page.goto(`/canal/${ID}/videos`);
  await expect(page.locator('.ch-info h1')).toContainText(want.channel.header?.title ?? want.channel.name, { timeout: 20_000 });
  if (want.channel.header?.handle) await expect(page.locator('.ch-meta')).toContainText(want.channel.header.handle);
  await expect(page.getByRole('button', { name: 'Suscribirse' })).toBeVisible();
  expect(await page.locator('.ch-grid .vcard').count()).toBeGreaterThanOrEqual(10);
  await expect(page.locator('.ch-grid .vdur').first()).toHaveText(/^\d{1,2}(:\d{2}){1,2}$/);
});
