import { test, expect } from '@playwright/test';
import { noPrompts, trackErrors } from './helpers';

test.beforeEach(async ({ page }) => { await noPrompts(page); });

for (const path of ['/', '/suscripciones', '/suscripciones/gestionar', '/tu', '/ajustes', '/buscar?q=news', '/medios', '/canal/UCNye-wNBqNL5ZzHSJj3l8Bg', '/canal/UCNye-wNBqNL5ZzHSJj3l8Bg/videos']) {
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

test('Shorts móvil: usa el reproductor TodoTube y navega sin iframe externo', async ({ page }) => {
  await page.goto('/shorts');
  await expect(page).toHaveURL(/\/shorts\/[\w-]{11}/);
  const u1 = page.url();
  await expect(page.locator('.short-player .own-player')).toBeVisible();
  await expect(page.locator('.short-player iframe')).toHaveCount(0);
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

test('minirreproductor móvil: conserva la ficha externa y no crea iframe', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.vcard .vthumb').first()).toBeVisible({ timeout: 15_000 });
  await page.locator('.vcard .vthumb').first().click();
  await expect(page.locator('.player-dock .own-player-error')).toBeVisible();
  await expect(page.locator('.player-dock iframe')).toHaveCount(0);
  await page.locator('.logo-link').click();
  await expect(page.locator('.player-dock')).toHaveClass(/mini/);
  await expect(page.locator('.player-dock .own-player-compact')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Abrir vídeo original' })).toBeVisible();
  await expect(page.locator('.mini-cover')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});


test('ficha externa móvil: mensaje y ambos CTA quedan dentro del reproductor', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/ver/dQw4w9WgXcQ');
  await expect(page.locator('.player-message')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Abrir origen' })).toBeVisible();
  await expect(page.locator('.player-message').getByRole('link', { name: 'Medios propios' })).toBeVisible();
  const [frame, message] = await Promise.all([
    page.locator('#player-slot').boundingBox(),
    page.locator('.player-message').boundingBox(),
  ]);
  expect(frame).not.toBeNull();
  expect(message).not.toBeNull();
  expect(message!.y).toBeGreaterThanOrEqual(frame!.y - 1);
  expect(message!.y + message!.height).toBeLessThanOrEqual(frame!.y + frame!.height + 1);
});


test('Suscripciones muestra un feed y conserva la gestión de canales en una ruta aparte', async ({ page }) => {
  await page.goto('/suscripciones');
  await expect(page.locator('.subscription-feed')).toBeVisible();
  await expect(page.locator('.subscription-feed .vcard').first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('heading', { name: 'Vídeos recientes' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Gestionar suscripciones/ }).first()).toHaveAttribute('href', '/suscripciones/gestionar');
  await page.locator('.chips-scroll .chip', { hasText: /^Shorts$/ }).click();
  await expect(page.locator('.subscription-feed .short').first()).toBeVisible();
  await expect(page.locator('.subscription-feed .vcard')).toHaveCount(0);
  await page.goto('/suscripciones/gestionar');
  await expect(page.getByRole('heading', { name: 'Gestionar suscripciones', exact: true })).toBeVisible();
  await expect(page.locator('.channel-list')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Seguir canal' })).toBeVisible();
});


test('navegación móvil actual: Inicio/Subs arriba y Inicio/Shorts/Crear/Tú abajo', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.vcard').first()).toBeVisible({ timeout: 15_000 });
  const feeds = page.locator('.mobile-feed-tabs');
  await expect(feeds).toBeVisible();
  await expect(feeds.locator('.mobile-feed-tab.active')).toHaveText('Inicio');
  // Tras el primer vistazo, la fila se oculta; el gesto de volver hacia arriba la recupera.
  await page.waitForTimeout(2350);
  await expect(feeds).toHaveClass(/is-collapsed/);
  await page.evaluate(() => window.scrollTo(0, 320));
  await page.mouse.wheel(0, -140);
  await expect(feeds).not.toHaveClass(/is-collapsed/);

  const bottom = page.locator('.bottombar');
  await expect(bottom.locator('.tab')).toHaveCount(4);
  await expect(bottom.getByRole('link', { name: 'Inicio' })).toBeVisible();
  await expect(bottom.getByRole('link', { name: 'Shorts' })).toBeVisible();
  await expect(bottom.getByRole('button', { name: 'Crear' })).toBeVisible();
  await expect(bottom.getByRole('link', { name: 'Tú' })).toBeVisible();
  await expect(bottom.getByRole('link', { name: 'Suscripciones' })).toHaveCount(0);

  await feeds.getByRole('tab', { name: 'Subs' }).click();
  await expect(page).toHaveURL(new RegExp('/suscripciones$'));
  await expect(feeds.locator('.mobile-feed-tab.active')).toHaveText('Subs');
  await expect(page.locator('.subscription-feed')).toBeVisible();

  await bottom.getByRole('button', { name: 'Crear' }).click();
  const dialog = page.getByRole('dialog', { name: 'Crear en TodoTube' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('link', { name: /Seguir canales/ })).toHaveAttribute('href', '/suscripciones/gestionar');
  await expect(dialog.getByRole('link', { name: /Medios propios/ })).toHaveAttribute('href', '/medios');
  const name = 'Lista móvil de prueba';
  await dialog.getByLabel('Nueva lista de reproducción').fill(name);
  await dialog.getByRole('button', { name: 'Crear lista' }).click();
  await expect(page).toHaveURL(new RegExp('/lista/'));
  const lists = await page.evaluate(() => (JSON.parse(localStorage.getItem('todotube:v1') || '{}').playlists ?? []) as { name: string }[]);
  expect(lists.some((list) => list.name === name)).toBe(true);

  await page.goto('/ver/dQw4w9WgXcQ');
  await expect(page.locator('.mobile-feed-tabs')).toHaveCount(0);
});
