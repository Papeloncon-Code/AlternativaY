import { test, expect } from '@playwright/test';
import { noPrompts, trackErrors } from './helpers';

test.beforeEach(async ({ page }) => { await noPrompts(page); });

for (const path of ['/', '/suscripciones', '/tu', '/ajustes', '/buscar?q=news', '/puente']) {
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

test('Shorts: deslizar hacia arriba pasa al siguiente', async ({ page }) => {
  await page.goto('/shorts'); await expect(page).toHaveURL(/\/shorts\/[\w-]{11}/);
  const u1 = page.url();
  const box = await page.locator('.short-player').boundingBox();
  const x = box!.x + box!.width / 2, y = box!.y + box!.height * 0.6;
  await page.evaluate(([x, y]) => {
    const el = document.elementFromPoint(x, y)!; const t = (yy: number) => new Touch({ identifier: 1, target: el, clientX: x, clientY: yy });
    el.dispatchEvent(new TouchEvent('touchstart', { touches: [t(y)], changedTouches: [t(y)], bubbles: true }));
    el.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [t(y - 200)], bubbles: true }));
  }, [x, y]);
  await expect(page).not.toHaveURL(u1);
});
