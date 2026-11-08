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

test('P3–P6 · buscador: “/”, sugerencias, recientes, Esc; consulta remota sin extensión', async ({ page }) => {
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
  // La búsqueda se resuelve mediante el servicio propio, sin extensión de navegador.
  await expect(page.locator('.sresult').first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.search-scope')).toHaveCount(0);
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
  // Solo la línea del aviso: el «hace X minutos» puede cambiar durante la prueba (causa de los fallos intermitentes).
  const first = await page.locator('.notif-li .notif-line').first().textContent();
  await page.locator('.notif-li').first().hover();
  await page.locator('.notif-kebab').first().click();
  await page.getByRole('menuitem', { name: 'Ocultar este aviso' }).click();
  await expect(page.locator('.notif-li .notif-line').first()).not.toHaveText(first!);
  await page.locator('.toast-act').click();
  await page.locator('.notif > button').click();
  await expect(page.locator('.notif-li .notif-line').first()).toHaveText(first!);
});

test('P10 · menú de cuenta: tema y combinaciones de teclas', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Menú de cuenta' }).click();
  await page.getByText(/^Aspecto/).click();
  await page.getByRole('menuitemradio', { name: 'Claro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Menú de cuenta' }).click();
  await page.getByText('Combinaciones de teclas').click();
  await expect(page.locator('.modal .keys > div')).toHaveCount(5);
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
  // Rueda sobre el escenario, a un lado del vídeo. Desde 4931fed no se pone ninguna capa encima del reproductor oficial
  // (sus controles y su atribución deben quedar libres), así que la rueda sobre el propio iframe la recibe YouTube.
  const stage = await page.locator('.shorts-stage').boundingBox();
  const player = await page.locator('.short-player').boundingBox();
  await page.mouse.move(stage!.x + Math.max(10, (player!.x - stage!.x) / 2), player!.y + player!.height / 2);
  await page.mouse.wheel(0, 300);
  await expect(page).not.toHaveURL(u2);
});

test('C2 · canal: pestañas Inicio, Vídeos y Shorts (con su dirección)', async ({ page }) => {
  await page.goto('/'); const href = await page.locator('.vchan').first().getAttribute('href');
  await page.goto(href!);
  const tabs = page.locator('.ch-tab');
  await expect(tabs).toHaveText(['Inicio', 'Vídeos', 'Shorts']);
  await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
  await tabs.nth(1).click();
  await expect(page).toHaveURL(/\/videos$/);
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
});

test('A5 · modo Foco: una columna, sin filtros, se recuerda', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('.vcard').first()).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Menú de cuenta' }).click();
  await page.getByRole('menuitemcheckbox', { name: 'Modo Foco' }).click();
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

test('Biblioteca de medios: estado claro cuando el Gateway todavía no está desplegado', async ({ page }) => {
  await page.route('**/v1/catalog', (route) => route.fulfill({
    status: 503,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': 'https://todotube.papelon.workers.dev' },
    body: JSON.stringify({ error: 'Gateway no disponible' }),
  }));
  await page.goto('/medios');
  await expect(page.getByRole('heading', { name: 'Medios propios' })).toBeVisible();
  await expect(page.getByText('Gateway no disponible')).toBeVisible();
  await expect(page.getByText(/Puente/i)).toHaveCount(0);
});

test('YouTube se abre en su origen; TodoTube no intenta extraer ni insertar iframe', async ({ page }) => {
  await page.goto('/shorts');
  await expect(page.locator('.short-player .own-player')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.short-player iframe')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Abrir origen' })).toBeVisible();
  await expect(page.locator('#main').getByRole('link', { name: 'Medios propios' })).toBeVisible();
});


test('Watch · Me gusta se guarda en la biblioteca local de TodoTube, no en YouTube', async ({ page }) => {
  await page.goto('/ver/dQw4w9WgXcQ');
  const add = page.getByRole('button', { name: 'Guardar en Mis Me gusta' });
  await expect(add).toBeVisible();
  await add.click();
  await expect(page.getByRole('button', { name: 'Quitar de Mis Me gusta' })).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/me-gusta');
  await expect(page.locator('.vcard').first()).toBeVisible();
});


test('Suscripciones: el formulario de alta se despliega cuando se solicita', async ({ page }) => {
  await page.goto('/suscripciones');
  await expect(page.locator('.channel-list')).toBeVisible();
  await expect(page.locator('.add-form')).toHaveCount(0);
  await page.getByRole('button', { name: 'Seguir canal' }).click();
  await expect(page.locator('#add-channel-panel')).toBeVisible();
  await expect(page.locator('#add-channel-panel')).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.locator('#add-channel-panel')).toHaveCount(0);
});
