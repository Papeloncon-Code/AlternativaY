import { test, expect } from '@playwright/test';
import { noPrompts, trackErrors } from './helpers';

test.beforeEach(async ({ page }) => { await noPrompts(page); });

for (const path of ['/', '/suscripciones', '/tu', '/ajustes', '/buscar?q=news', '/puente', '/canal/UCNye-wNBqNL5ZzHSJj3l8Bg', '/canal/UCNye-wNBqNL5ZzHSJj3l8Bg/videos']) {
  test(`sin desplazamiento horizontal en ${path}`, async ({ page }) => {
    const ok = trackErrors(page);
    await page.goto(path); await page.waitForLoadState('networkidle');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    ok();
  });
}

test('buscador móvil: abrir, sugerir y cerrar con Esc', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('.vcard').first()).toBeVisible({ timeout: 15_000 });
  await page.locator('.top-right .only-mobile').click();
  await page.locator('#q').fill('news');
  await expect(page.locator('.suggest li[role=option]').first()).toBeVisible();
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  await expect(page.locator('.topbar.searching')).toHaveCount(0);
});

test('Shorts móvil: el fallback navega con botones externos sin cubrir el iframe', async ({ page }) => {
  await page.goto('/shorts');
  await expect(page).toHaveURL(/\/shorts\/[\w-]{11}/);
  const u1 = page.url();
  await expect(page.locator('.shorts-stage.official')).toHaveCount(1);
  await expect(page.locator('.short-gesture')).toHaveCount(0);
  await expect(page.locator('.short-nav')).toBeVisible();
  await page.locator('.short-nav button[aria-label="Short siguiente"]').click();
  await expect(page).not.toHaveURL(u1);
});

test('#3 el panel de avisos cabe en la pantalla; #15 la lupa enfoca el campo', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('.vcard').first()).toBeVisible({ timeout: 15_000 });
  await page.locator('.notif > button').click();
  const r = (await page.locator('.notif-panel').boundingBox())!;
  expect(r.x).toBeGreaterThanOrEqual(0); expect(r.x + r.width).toBeLessThanOrEqual(390);
  await page.locator('.notif > button').click();
  await page.locator('.top-right .only-mobile').click();
  await expect(page.locator('#q')).toBeFocused();
});

test('#13 el reproductor ocupa todo el ancho; #16 el menu ⋮ no queda bajo la barra', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('.vcard').first()).toBeVisible({ timeout: 15_000 });
  const last = page.locator('.vcard').nth(1); await last.scrollIntoViewIfNeeded();
  // La tarjeta justo encima de la barra inferior (como la vería una persona al bajar).
  await page.evaluate(() => { const c = document.querySelectorAll('.vcard')[1] as HTMLElement; const bar = document.querySelector('.bottombar')!.getBoundingClientRect().top; window.scrollBy(0, c.getBoundingClientRect().bottom - bar + 8); });
  await last.locator('.kebab').click();
  const m = (await page.locator('.vcard .menu').boundingBox())!; const bar = (await page.locator('.bottombar').boundingBox())!;
  expect(m.y + m.height).toBeLessThanOrEqual(bar.y + 1);
  await page.keyboard.press('Escape');
  await page.locator('.vcard .vthumb').first().click(); await page.waitForTimeout(400);
  expect(Math.round((await page.locator('#player-slot').boundingBox())!.width)).toBe(390);
});

test('minirreproductor móvil: iframe oficial no baja de 200 × 200 px ni tapa controles', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.vcard .vthumb').first()).toBeVisible({ timeout: 15_000 });
  await page.locator('.vcard .vthumb').first().click();
  await expect(page.locator('.player-dock iframe')).toBeAttached();
  await page.locator('.logo-link').click();
  await expect(page.locator('.player-dock')).toHaveClass(/mini/);
  await expect(page.locator('.mini-cover')).toHaveCount(0);
  const frame = await page.locator('.player-dock iframe').boundingBox();
  expect(frame!.width).toBeGreaterThanOrEqual(200);
  expect(frame!.height).toBeGreaterThanOrEqual(200);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
