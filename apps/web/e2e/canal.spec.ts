import { test, expect, type Page } from '@playwright/test';
import { noPrompts, trackErrors } from './helpers';

// Spec 007 §14 · página de canal con las medidas de la referencia (tomadas a 1366 px el 2026-11-08).
type V = { id: string; channelId: string; kind: string | null; views: number | null; publishedAt: number | null; title: string | null };
type C = { id: string; name: string; header?: { banner?: string | null; about?: string | null; handle?: string | null; subs?: string | null; featured?: { id: string } | null } | null };
async function data(page: Page) {
  const feed = (await (await page.request.get('/api/feed?limit=1000')).json()).items as V[];
  const chans = (await (await page.request.get('/api/channels')).json()).items as C[];
  const counts = new Map<string, number>();
  for (const v of feed) if (v.kind !== 'short') counts.set(v.channelId, (counts.get(v.channelId) ?? 0) + 1);
  const busy = [...counts].sort((a, b) => b[1] - a[1])[0][0];
  return { feed, chans, busy, withHeader: chans.find((c) => c.header?.banner && c.header?.about) };
}

test.beforeEach(async ({ page }) => { await noPrompts(page); });

test('medidas de la cabecera y pestañas como en la referencia', async ({ page }) => {
  const ok = trackErrors(page);
  const { busy } = await data(page);
  await page.goto(`/canal/${busy}/videos`);
  await expect(page.locator('.ch-grid .vcard').first()).toBeVisible({ timeout: 15_000 });
  const m = await page.evaluate(() => {
    const box = (s: string) => { const e = document.querySelector(s)!; const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), fs: getComputedStyle(e).fontSize }; };
    return { avatar: box('.ch-head > :first-child'), h1: box('.ch-info h1'), tabs: box('.ch-tabs'), tab: box('.ch-tab'), chip: box('.ch-orders .chip'), card: box('.ch-grid .vcard') };
  });
  expect(m.avatar).toMatchObject({ w: 160, h: 160 });
  expect(m.h1.fs).toBe('36px');
  expect(m.tabs.h).toBe(48);
  expect(m.tab.fs).toBe('16px');
  expect(m.chip.h).toBe(32);
  // 3 columnas a 1366 px con el menú abierto, como la referencia (347 px cada tarjeta allí).
  expect(m.card.w).toBeGreaterThan(330); expect(m.card.w).toBeLessThan(380);
  // En la página del canal las tarjetas no repiten la foto ni el nombre del canal.
  await expect(page.locator('.ch-grid .vavatar')).toHaveCount(0);
  await expect(page.locator('.ch-grid .vchan')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  ok();
});

test('orden: Más recientes, Populares (por visualizaciones) y Más antiguos', async ({ page }) => {
  const { feed, busy } = await data(page);
  const mine = feed.filter((v) => v.channelId === busy && v.kind !== 'short');
  const byViews = [...mine].sort((a, b) => (b.views ?? -1) - (a.views ?? -1) || (b.publishedAt ?? 0) - (a.publishedAt ?? 0));
  const oldest = [...mine].sort((a, b) => (a.publishedAt ?? 0) - (b.publishedAt ?? 0));
  await page.goto(`/canal/${busy}/videos`);
  const first = page.locator('.ch-grid .vcard .vthumb').first();
  await page.getByRole('button', { name: 'Populares' }).click();
  await expect(page).toHaveURL(/orden=populares/);
  await expect(first).toHaveAttribute('href', `/ver/${byViews[0].id}`);
  await page.getByRole('button', { name: 'Más antiguos' }).click();
  await expect(first).toHaveAttribute('href', `/ver/${oldest[0].id}`);
  await page.reload(); // el orden vive en la dirección: se puede compartir y se conserva al recargar
  await expect(page.getByRole('button', { name: 'Más antiguos' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Más recientes' }).click();
  await expect(page).not.toHaveURL(/orden=/);
});

test('Inicio: vídeo destacado y estantes que se desplazan con la flecha', async ({ page }) => {
  const { busy } = await data(page);
  await page.goto(`/canal/${busy}`);
  await expect(page.locator('.ch-featured')).toBeVisible({ timeout: 15_000 });
  const shelf = page.locator('.ch-shelf').filter({ has: page.getByRole('heading', { name: 'Vídeos' }) }).first();
  await expect(shelf).toBeVisible();
  const row = shelf.locator('.ch-shelf-row');
  expect(await row.evaluate((e) => Math.round(e.querySelector('.vcard')!.getBoundingClientRect().width))).toBe(210);
  // Datos cortos en una sola línea («▷ 4 M  hace 1 d»), como en la referencia.
  await expect(row.locator('.vmeta-dense').first()).toContainText(/hace \d+ (min|h|d|sem\.|mes|meses|a)|ahora/);
  expect(await row.locator('.vmeta-dense').first().evaluate((e) => e.getBoundingClientRect().height)).toBeLessThanOrEqual(20);
  // Las direcciones de la descripción del destacado son enlaces (si las tiene).
  const desc = page.locator('.ch-feat-desc');
  if (await desc.count() && /https?:\/\//.test(await desc.innerText())) await expect(desc.locator('a.linkified').first()).toHaveAttribute('rel', /noreferrer/);
  if (await shelf.locator('.shelf-arrow.right').count()) {
    await shelf.locator('.shelf-arrow.right').click();
    await expect.poll(() => row.evaluate((e) => e.scrollLeft)).toBeGreaterThan(100);
    await expect(shelf.locator('.shelf-arrow.left')).toBeVisible();
  }
});

test('buscar dentro del canal', async ({ page }) => {
  const { feed, busy } = await data(page);
  const word = feed.find((v) => v.channelId === busy && (v.title ?? '').split(' ').some((w) => w.length > 4))!.title!.split(' ').find((w) => w.length > 4)!;
  await page.goto(`/canal/${busy}`);
  await page.getByRole('button', { name: 'Buscar en el canal' }).click();
  await page.getByRole('textbox', { name: 'Buscar en este canal' }).fill(word);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/buscar\?q=/);
  await expect(page.locator('.ch-results .vcard').first()).toBeVisible();
});

test('cabecera pública: banner, @usuario, suscriptores y «…más» abre «Acerca de»', async ({ page }) => {
  const { withHeader } = await data(page);
  test.skip(!withHeader, 'la web publicada aún no da la cabecera de ningún canal');
  const ok = trackErrors(page);
  await page.goto(`/canal/${withHeader!.id}`);
  await expect(page.locator('.ch-banner img')).toBeVisible();
  const ratio = await page.locator('.ch-banner').evaluate((e) => e.getBoundingClientRect().width / e.getBoundingClientRect().height);
  expect(ratio).toBeGreaterThan(6); expect(ratio).toBeLessThan(6.5);
  if (withHeader!.header!.handle) await expect(page.locator('.ch-meta')).toContainText(withHeader!.header!.handle!);
  await page.locator('.ch-desc').click();
  const dlg = page.getByRole('dialog');
  await expect(dlg.getByRole('heading', { name: 'Descripción' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dlg).toHaveCount(0);
  ok();
});

// Escalones medidos en la referencia (ventana → ancho de la columna, columnas de vídeos, foto).
for (const [vw, width, cols, avatar] of [[1920, 1284, 3, 160], [1366, 1070, 3, 160], [1272, 1070, 3, 160], [1000, 856, 2, 160], [800, 642, 2, 120], [600, 428, 1, 120], [500, 428, 1, 72]] as const) {
  test(`a ${vw} px la columna mide ${width} px con ${cols} columna(s) y foto de ${avatar} px`, async ({ page }) => {
    await page.setViewportSize({ width: vw, height: 900 });
    const { busy } = await data(page);
    await page.goto(`/canal/${busy}/videos`);
    await expect(page.locator('.ch-grid .vcard').first()).toBeVisible({ timeout: 15_000 });
    const m = await page.evaluate(() => {
      const g = document.querySelector('.ch-grid')!;
      return { w: Math.round(document.querySelector('.channel-page')!.getBoundingClientRect().width), cols: getComputedStyle(g).gridTemplateColumns.split(' ').length, av: Math.round(document.querySelector('.ch-head > :first-child')!.getBoundingClientRect().width), sw: document.documentElement.scrollWidth <= innerWidth };
    });
    expect(m).toEqual({ w: width, cols, av: avatar, sw: true });
  });
}
