import { test, expect } from '@playwright/test';
import { noPrompts, trackErrors } from './helpers';

test.beforeEach(async ({ page }) => { await noPrompts(page); });

test('W8 · el reproductor ocupa su hueco, pasa a mini al salir sin recargarse, y vuelve', async ({ page }) => {
  const ok = trackErrors(page);
  await page.goto('/'); await expect(page.locator('.vcard').first()).toBeVisible({ timeout: 15_000 });
  const href = (await page.locator('.vcard .vthumb').first().getAttribute('href'))!;
  await page.locator('.vcard .vthumb').first().click();
  await expect(page).toHaveURL(href);
  const host = page.locator('.player-dock');
  await expect(host).toHaveClass(/on-page/);
  // Encima exacto del hueco
  await page.waitForTimeout(500);
  const [h, s] = await Promise.all([host.boundingBox(), page.locator('#player-slot').boundingBox()]);
  for (const k of ['x', 'y', 'width', 'height'] as const) expect(Math.abs(h![k] - s![k])).toBeLessThan(2);
  // Marca el iframe para comprobar que no se recarga
  await page.locator('.player-dock iframe').evaluate((f) => { (f as HTMLIFrameElement).dataset.mark = 'mismo'; });
  await page.locator('.logo-link').click();
  await expect(host).toHaveClass(/mini/);
  await expect(page.locator('.player-dock iframe')).toHaveAttribute('data-mark', 'mismo');
  await expect(page.locator('.mini-cover')).toHaveCount(0);
  const miniFrame = await page.locator('.player-dock iframe').boundingBox();
  expect(miniFrame!.width).toBeGreaterThanOrEqual(200);
  expect(miniFrame!.height).toBeGreaterThanOrEqual(200);
  await page.locator('.mini-text').click();
  await expect(page).toHaveURL(href);
  await expect(host).toHaveClass(/on-page/);
  await expect(page.locator('.player-dock iframe')).toHaveAttribute('data-mark', 'mismo');
  // Cerrar desde el mini reproductor
  await page.locator('.logo-link').click();
  await page.getByRole('button', { name: 'Cerrar el mini reproductor' }).click();
  await expect(host).toHaveCount(0);
  ok();
});

test('W7 · modo cine: el reproductor sigue el hueco al cambiar de tamaño', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('.vcard').first()).toBeVisible({ timeout: 15_000 });
  await page.locator('.vcard .vthumb').first().click();
  await page.waitForTimeout(400);
  const w1 = (await page.locator('.player-dock').boundingBox())!.width;
  await page.keyboard.press('t'); await page.waitForTimeout(400);
  const [h, s] = await Promise.all([page.locator('.player-dock').boundingBox(), page.locator('#player-slot').boundingBox()]);
  expect(Math.abs(h!.width - s!.width)).toBeLessThan(2);
  expect(h!.width).not.toBe(w1);
  await page.keyboard.press('t');
});
