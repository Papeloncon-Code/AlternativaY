import { test, expect } from '@playwright/test';
import { noPrompts } from './helpers';

test.beforeEach(async ({ page }) => { await noPrompts(page); });

test('H10 · carga continua: al bajar aparecen más vídeos', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('.vcard').first()).toBeVisible({ timeout: 15_000 });
  const n0 = await page.locator('.vcard').count();
  expect(n0).toBeLessThanOrEqual(24);
  for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, 4000); await page.waitForTimeout(400); }
  expect(await page.locator('.vcard').count()).toBeGreaterThan(n0);
});

test('A4 · ocultar por palabras quita esos vídeos de Principal', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('.vcard').first()).toBeVisible({ timeout: 15_000 });
  const title = (await page.locator('.vcard .vtitle').first().textContent())!;
  const word = title.split(/\s+/).find((w) => w.length > 4)!.replace(/[^\p{L}\p{N}]/gu, '');
  await page.goto('/ajustes#filtros');
  await page.getByLabel('Palabra o frase a ocultar').fill(word);
  await page.getByRole('button', { name: 'Añadir' }).click();
  await page.goto('/'); await expect(page.locator('.vcard').first()).toBeVisible({ timeout: 15_000 });
  const titles = await page.locator('.vcard .vtitle').allTextContents();
  expect(titles.some((t) => t.toLowerCase().includes(word.toLowerCase()))).toBe(false);
});

test('A3 · un grupo aparece como filtro y solo muestra sus canales', async ({ page }) => {
  await page.goto('/suscripciones');
  await page.getByLabel('Nombre del grupo nuevo').fill('Noticias');
  await page.getByRole('button', { name: 'Crear grupo' }).click();
  const chip = page.locator('.groups .group .chip').first();
  const chName = (await chip.textContent())!;
  await chip.click();
  await page.goto('/'); await expect(page.locator('.vcard').first()).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Noticias', exact: true }).click();
  const chans = new Set(await page.locator('.vcard .vchan').allTextContents());
  expect([...chans]).toEqual([chName]);
});

test('L7 · guardar en una lista nueva y reproducirla en orden', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('.vcard').first()).toBeVisible({ timeout: 15_000 });
  const ids: string[] = [];
  for (const i of [0, 1]) {
    const card = page.locator('.vcard').nth(i);
    ids.push((await card.locator('.vthumb').getAttribute('href'))!.split('/').pop()!);
    await card.hover(); await card.locator('.kebab').click();
    await page.getByRole('menuitem', { name: 'Guardar en una lista' }).click();
    if (i === 0) { await page.getByLabel('Nombre de la lista nueva').fill('Para el finde'); await page.getByRole('button', { name: 'Crear' }).click(); }
    else await page.locator('.save-row', { hasText: 'Para el finde' }).locator('input').check();
    await page.keyboard.press('Escape');
  }
  await page.locator('.side-item', { hasText: 'Para el finde' }).click();
  await expect(page.locator('.pl-item')).toHaveCount(2);
  await page.getByRole('link', { name: 'Reproducir todo' }).click();
  await expect(page).toHaveURL(new RegExp(`/ver/${ids[0]}\\?lista=`));
  await expect(page.locator('.watch-side .side-head b')).toHaveText('Para el finde · 1/2');
  await expect(page.locator('.watch-side .vcard')).toHaveCount(1);
  await page.keyboard.press('Shift+N');
  await expect(page).toHaveURL(new RegExp(`/ver/${ids[1]}\\?lista=`));
});
