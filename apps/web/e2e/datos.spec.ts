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
  const data = await api(page, `/api/video/${v.id}`);
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
  const img = page.locator(`.side-item[href="/canal/${withPhoto.id}"] img.avatar`);
  await expect(img).toBeVisible();
  await expect.poll(() => img.evaluate((i) => (i as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
});

test('Privacidad: página enlazada desde el menú y Ajustes', async ({ page }) => {
  await page.goto('/');
  await page.locator('.side-item', { hasText: 'Privacidad' }).click();
  await expect(page).toHaveURL(/\/privacidad$/);
  await expect(page.locator('h1')).toHaveText('Privacidad');
  await expect(page.locator('.ptable').first()).toContainText('solo si activas los avisos');
  await page.goto('/ajustes');
  await expect(page.locator('.panel').getByRole('link', { name: /Privacidad/ })).toHaveAttribute('href', '/privacidad');
});
