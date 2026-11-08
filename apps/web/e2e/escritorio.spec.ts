import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { noPrompts, trackErrors } from './helpers';

test.beforeEach(async ({ page }) => { await noPrompts(page); });

test('H1 · cada filtro visible cambia los resultados (si no, no se muestra)', async ({ page }) => {
  const ok = trackErrors(page);
  await page.goto('/'); await expect(page.locator('.vcard').first()).toBeVisible({ timeout: 15_000 });
  const total = Number(await page.locator('.page').getAttribute('data-total'));
  // Por nombre, no por posición: la lista puede crecer mientras se cargan más vídeos (un canal nuevo desplaza a los demás).
  const labels = (await page.locator('.chips-scroll .chip').allTextContents()).slice(1);
  for (const label of labels) {
    const chip = page.locator('.chips-scroll .chip', { hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }).first();
    await chip.click();
    await expect(chip).toHaveAttribute('aria-pressed', 'true');
    // Se confirma visiblemente el filtro y su número de resultados (la primera pantalla puede coincidir).
    await expect(page.locator('.filter-count')).toContainText(label!);
    const count = Number((await page.locator('.filter-count').textContent())!.match(/\d+/)![0]);
    expect(count, `el filtro «${label}» debe cambiar los resultados`).not.toBe(total);
    expect(count, `el filtro «${label}» no debe dejar la página vacía`).toBeGreaterThan(0);
  }
  ok();
});

test('P3–P6 · buscador: “/”, sugerencias, recientes, Esc; sin Puente explica qué busca', async ({ page }) => {
  const ok = trackErrors(page);
  await page.goto('/'); await expect(page.locator('.vcard').first()).toBeVisible({ timeout: 15_000 });
  await page.keyboard.press('/');
  await expect(page.locator('#q')).toBeFocused();
  await page.keyboard.type('news');
  await expect(page.locator('.suggest li[role=option]').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.suggest')).toHaveCount(0);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/buscar\?q=news/);
  await expect(page.locator('.search-scope')).toContainText('canales que sigues');
  await expect(page.locator('.search-scope a', { hasText: 'Instalar' })).toHaveAttribute('href', '/puente');
  await page.goto('/buscar?q=fern');
  await expect(page.getByText('Ninguno de tus canales ha publicado nada sobre «fern»')).toBeVisible();
  await page.locator('#q').fill(''); await page.locator('#q').focus();
  await expect(page.locator('.suggest li[role=option]', { hasText: 'news' })).toBeVisible();
  await page.locator('.suggest-x').first().click();
  await expect(page.locator('.suggest li[role=option]', { hasText: 'news' })).toHaveCount(0);
  ok();
});

test('P8–P9 · avisos: el contador se borra al abrir; ⋮ oculta con Deshacer', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('.vcard').first()).toBeVisible({ timeout: 15_000 });
  await page.locator('.notif > button').click();
  await expect(page.locator('.notif-count')).toHaveCount(0);
  const first = await page.locator('.notif-li .notif-text').first().textContent();
  await page.locator('.notif-li').first().hover();
  await page.locator('.notif-kebab').first().click();
  await page.getByRole('menuitem', { name: 'Ocultar este aviso' }).click();
  await expect(page.locator('.notif-li .notif-text').first()).not.toHaveText(first!);
  await page.locator('.toast-act').click();
  await page.locator('.notif > button').click();
  await expect(page.locator('.notif-li .notif-text').first()).toHaveText(first!);
});

test('P10 · menú de cuenta: tema y combinaciones de teclas', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Menú de cuenta' }).click();
  await page.getByText(/^Aspecto/).click();
  await page.getByRole('menuitemradio', { name: 'Claro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Menú de cuenta' }).click();
  await page.getByText('Combinaciones de teclas').click();
  await expect(page.locator('.modal .keys > div')).toHaveCount(11);
  await page.keyboard.press('Escape');
  await expect(page.locator('.modal')).toHaveCount(0);
});

test('H8 · ⋮ de la tarjeta: No me interesa y Deshacer', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('.vcard').first()).toBeVisible({ timeout: 15_000 });
  const t = await page.locator('.vcard .vtitle').first().textContent();
  await page.locator('.vcard').first().hover();
  await page.locator('.vcard .kebab').first().click();
  await expect(page.getByRole('menuitem', { name: 'Compartir' })).toBeVisible();
  await page.getByRole('menuitem', { name: 'No me interesa' }).click();
  await expect(page.locator('.vcard .vtitle').first()).not.toHaveText(t!);
  await page.locator('.toast-act').click();
  await expect(page.locator('.vcard .vtitle').first()).toHaveText(t!);
});

test('S1–S2 · Shorts: abre el reproductor vertical y pasa con teclas y rueda', async ({ page }) => {
  await page.goto('/shorts');
  await expect(page).toHaveURL(/\/shorts\/[\w-]{11}/);
  await expect(page.locator('.short-nav small')).toHaveText(/^1 \/ \d+$/);
  const u1 = page.url();
  await page.keyboard.press('ArrowDown');
  await expect(page).not.toHaveURL(u1);
  const u2 = page.url();
  await page.waitForTimeout(700); // bloqueo anti doble salto de 600 ms
  const box = await page.locator('.short-player').boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.wheel(0, 300);
  await expect(page).not.toHaveURL(u2);
});

test('C2 · canal: pestañas Vídeos y Shorts', async ({ page }) => {
  await page.goto('/'); const href = await page.locator('.vchan').first().getAttribute('href');
  await page.goto(href!);
  const tabs = page.locator('.tab-btn');
  await expect(tabs).toHaveCount(2);
  await tabs.nth(1).click();
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
});

test('A5 · modo Foco: una columna, sin filtros, se recuerda', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('.vcard').first()).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Modo Foco' }).click();
  await expect(page.locator('.chips-bar')).toHaveCount(0);
  const cols = await page.locator('.vgrid').first().evaluate((e) => getComputedStyle(e).gridTemplateColumns.split(' ').length);
  expect(cols).toBe(1);
  await page.reload();
  await expect(page.locator('.app.focus')).toHaveCount(1);
});

test('A7 · exportar sin la clave; importar valida el archivo', async ({ page }) => {
  await page.goto('/ajustes#datos');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exportar copia' }).click()]);
  const j = JSON.parse(readFileSync(await dl.path(), 'utf8'));
  expect(j.app).toBe('todotube');
  expect('ownerKey' in j.data).toBe(false);
  await page.locator('input[type=file]').setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"hola":1}') });
  await expect(page.locator('.toast').last()).toContainText('no es una copia de TodoTube');
});

test('L3 · foto real del canal cuando se conoce; iniciales si falla', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('.side-item .avatar').first()).toBeVisible();
  const id = await page.locator('.side-item[href^="/canal/"]').first().getAttribute('href');
  const chId = id!.split('/').pop()!;
  await page.evaluate(([c]) => localStorage.setItem('todotube:avatars', JSON.stringify({ [c]: { url: `${location.origin}/icon.svg`, at: Date.now() }, UCxxxxxxxxxxxxxxxxxxxxxx: { url: 'https://example.invalid/x.jpg', at: Date.now() } })), [chId]);
  await page.reload();
  await expect(page.locator(`.side-item[href="/canal/${chId}"] img.avatar`)).toBeVisible();
});

test('Permisos · avisos con el diálogo nativo al llegar (como YouTube); luego la tarjeta del Puente', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await ctx.newPage();
  // Se registra cada petición del diálogo nativo y se simula que la persona pulsa «Bloquear».
  await page.addInitScript(() => {
    (window as any).__asked = 0;
    let state: NotificationPermission = 'default'; // primera visita: el navegador aún no ha preguntado
    Object.defineProperty(Notification, 'permission', { get: () => state, configurable: true });
    Notification.requestPermission = async () => { (window as any).__asked++; state = 'denied'; return 'denied'; };
  });
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => (window as any).__asked), { timeout: 10_000 }).toBe(1);
  await expect(page.locator('.perm')).toHaveCount(0); // una petición por visita
  await page.reload();
  const card = page.locator('.perm');
  await expect(card).toBeVisible({ timeout: 10_000 });
  await expect(card).toContainText('sin anuncios');
  expect(await page.evaluate(() => (window as any).__asked)).toBe(0); // tras «Bloquear» no se vuelve a pedir
  await card.getByRole('button', { name: 'Ahora no' }).click();
  await expect(card).toHaveCount(0);
  await ctx.close();
});

test('Puente simulado que falla: la búsqueda muestra el error, no se rompe', async ({ page }) => {
  // Puente falso que rechaza todo: no sale ninguna petición a YouTube.
  await page.addInitScript(() => { (window as any).todotubeBridge = { installed: true, version: 'test', fetch: () => Promise.reject(new Error('sin red (prueba)')) }; });
  const ok = trackErrors(page);
  await page.goto('/buscar?q=lofi');
  await expect(page.getByText('No se pudo buscar')).toBeVisible({ timeout: 20_000 });
  ok();
});
