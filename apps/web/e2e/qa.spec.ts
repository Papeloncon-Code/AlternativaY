// Regresiones de la revisión independiente (QA 2026-11-07). Cada prueba lleva el número del hallazgo.
import { test, expect } from '@playwright/test';
import { noPrompts } from './helpers';

test.beforeEach(async ({ page }) => { await noPrompts(page); });
const firstVideo = async (page: import('@playwright/test').Page) => {
  await page.goto('/'); await expect(page.locator('.vcard').first()).toBeVisible({ timeout: 15_000 });
  return (await page.locator('.vcard .vthumb').first().getAttribute('href'))!;
};

test('#1 el título va justo debajo del reproductor', async ({ page }) => {
  await page.goto(await firstVideo(page)); await page.waitForTimeout(300);
  const gap = await page.evaluate(() => document.querySelector('.watch-title')!.getBoundingClientRect().top - document.querySelector('#player-slot')!.getBoundingClientRect().bottom);
  expect(gap).toBeLessThan(40);
});

test('#12 modo cine a todo el ancho', async ({ page }) => {
  await page.goto(await firstVideo(page));
  await expect(page.locator('.watch-title')).toBeVisible(); await page.waitForTimeout(300);
  await page.keyboard.press('t'); await expect(page.locator('.watch-layout.theater')).toHaveCount(1); await page.waitForTimeout(300);
  const [w, vw] = await page.evaluate(() => [document.querySelector('#player-slot')!.getBoundingClientRect().width, document.documentElement.clientWidth]);
  expect(Math.abs(w - vw)).toBeLessThan(2);
  await page.keyboard.press('t');
});

// Tamaño como YouTube (bloque 7): 1243 px (captura del propietario) → 3 columnas; 1920 con menú ampliado → 4.
for (const [w, cols] of [[600, 1], [1024, 2], [1243, 3], [1920, 4]] as const) {
  test(`#11 ${cols} columnas a ${w} px`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto('/'); await expect(page.locator('.vcard').first()).toBeVisible({ timeout: 15_000 });
    expect(await page.locator('.vgrid').first().evaluate((e) => getComputedStyle(e).gridTemplateColumns.split(' ').length)).toBe(cols);
  });
}

test('#10 sin huecos antes de la fila de Shorts', async ({ page }) => {
  for (const w of [1366, 1920]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto('/'); await expect(page.locator('.shelf')).toBeVisible({ timeout: 15_000 });
    const [n, cols] = await page.locator('.vgrid').first().evaluate((e) => [e.children.length, getComputedStyle(e).gridTemplateColumns.split(' ').length]);
    expect(n % cols, `a ${w} px`).toBe(0);
  }
});

test('#4 un Short de fuera de tus canales se puede ver', async ({ page }) => {
  await page.goto('/shorts/dQw4w9WgXcQ');
  await expect(page.locator('.short-player')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('no está entre los de tus canales')).toHaveCount(0);
});

test('Shorts nunca carga el reproductor oficial de YouTube', async ({ page }) => {
  await page.goto('/shorts');
  await expect(page.locator('.short-player .own-player')).toBeVisible();
  await expect(page.locator('.short-player iframe')).toHaveCount(0);
  await expect(page.locator('.own-player-error')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Activar TodoTube Puente' })).toBeVisible();
});

test('#19 ↓ en el buscador no cambia de Short; #20 «Atrás» vuelve al Short anterior', async ({ page }) => {
  await page.goto('/shorts'); await expect(page.locator('.short-nav small')).toHaveText(/^1 \//, { timeout: 15_000 });
  const u1 = page.url();
  await page.locator('#q').click(); await page.keyboard.type('a'); await page.keyboard.press('ArrowDown');
  await expect(page.locator('.short-nav small')).toHaveText(/^1 \//);
  await page.keyboard.press('Escape'); await page.locator('.short-nav button[aria-label="Short siguiente"]').focus();
  await page.keyboard.press('ArrowDown');
  await expect(page).not.toHaveURL(u1);
  await page.goBack();
  await expect(page).toHaveURL(u1);
});

test('#18 el siguiente Short navega sin cargar el iframe oficial', async ({ page }) => {
  await page.goto('/shorts');
  await expect(page.locator('.short-nav small')).toHaveText(/^1 \/, { timeout: 15_000 });
  await expect(page.locator('.short-player iframe')).toHaveCount(0);
  await page.locator('.short-nav button[aria-label="Short siguiente"]').click();
  await expect(page.locator('.short-nav small')).toHaveText(/^2 \/);
});

test('#8 la búsqueda no mezcla Shorts con vídeos', async ({ page }) => {
  await page.goto('/buscar?q=news');
  await expect(page.locator('.sresult').first()).toBeVisible({ timeout: 20_000 });
  const shortIdsInRows = await page.locator('.sresult .vthumb').evaluateAll((as) => as.map((a) => a.getAttribute('href')).filter((h) => h?.startsWith('/shorts/')));
  expect(shortIdsInRows).toEqual([]);
});

test('#9 se ve el «hace X» en cada aviso', async ({ page }) => {
  await page.goto('/'); await page.locator('.notif > button').click();
  const ok = await page.locator('.notif-li').first().evaluate((li) => { const sm = li.querySelector('small')!.getBoundingClientRect(); const t = li.querySelector('.notif-text')!.getBoundingClientRect(); return sm.height > 0 && sm.bottom <= t.bottom + 1; });
  expect(ok).toBe(true);
});

test('#21 «Atrás» recupera el filtro elegido', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('.vcard').first()).toBeVisible({ timeout: 15_000 });
  const chip = page.locator('.chips-scroll .chip').nth(1); const label = await chip.textContent();
  await chip.click(); await page.locator('.vcard .vthumb').first().click();
  await expect(page).toHaveURL(/\/ver\//); await page.goBack();
  await expect(page.locator('.chip.on')).toHaveText(label!);
});

test('#23 la pestaña lleva el título del vídeo; #24 vídeo por enlace con su título real', async ({ page }) => {
  await page.goto('/ver/dQw4w9WgXcQ');
  await expect(page.locator('.watch-title')).not.toHaveText('Vídeo', { timeout: 15_000 });
  await expect(page).toHaveTitle(/ - TodoTube$/);
});

test('#17 el botón Crear cabe en «Guardar en…»', async ({ page }) => {
  await page.goto(await firstVideo(page));
  await page.getByRole('button', { name: /Guardar/ }).first().click();
  const [b, d] = await Promise.all([page.locator('.save-new .btn').boundingBox(), page.locator('.save-dialog').boundingBox()]);
  expect(b!.x + b!.width).toBeLessThanOrEqual(d!.x + d!.width);
});

test('#6 sin clave, la campanita lo explica en vez de fallar', async ({ page }) => {
  await page.goto(await firstVideo(page));
  await page.locator('.bell-btn').click();
  await expect(page.locator('.bell-lock')).toContainText('clave de propietario');
});
