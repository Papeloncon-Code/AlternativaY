import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { noPrompts } from './helpers';

async function capture(page: Page, info: TestInfo, viewport: string, name: string) {
  const path = info.outputPath('visual-audit', viewport, name + '.png');
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path, fullPage: false, animations: 'disabled' });
}

async function visit(page: Page, path: string, ready: string) {
  await page.goto(path);
  await expect(page.locator(ready).first()).toBeVisible({ timeout: 15_000 });
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(120);
}

test('Visual audit · desktop 1440×900 · navegación y pantallas principales', async ({ page }, info) => {
  await noPrompts(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  const screens = [
    { name: '01-inicio', url: '/', ready: '.vcard' },
    { name: '02-shorts', url: '/shorts', ready: '.short-player' },
    { name: '03-watch', url: '/ver/dQw4w9WgXcQ', ready: '.watch-title' },
    { name: '04-canal', url: '/canal/UCNye-wNBqNL5ZzHSJj3l8Bg', ready: '.ch-head' },
    { name: '05-suscripciones', url: '/suscripciones', ready: '.add-form' },
    { name: '06-busqueda', url: '/buscar?q=news', ready: '.sresult' },
    { name: '07-tu', url: '/tu', ready: '.page-title' },
    { name: '08-ajustes', url: '/ajustes', ready: '.page-head' },
    { name: '09-medios', url: '/medios', ready: '.media-library' },
    { name: '10-privacidad', url: '/privacidad', ready: '.privacy' },
  ];
  for (const screen of screens) {
    await visit(page, screen.url, screen.ready);
    await capture(page, info, 'desktop-1440x900', screen.name);
  }
});

test('Visual audit · tablet 1024×768 · Inicio, Watch y canal', async ({ page }, info) => {
  await noPrompts(page);
  await page.setViewportSize({ width: 1024, height: 768 });
  for (const screen of [
    { name: '01-inicio', url: '/', ready: '.vcard' },
    { name: '02-watch', url: '/ver/dQw4w9WgXcQ', ready: '.watch-title' },
    { name: '03-canal', url: '/canal/UCNye-wNBqNL5ZzHSJj3l8Bg', ready: '.ch-head' },
  ]) {
    await visit(page, screen.url, screen.ready);
    await capture(page, info, 'tablet-1024x768', screen.name);
  }
});

test('Visual audit · móvil 390×844 · superficies clave', async ({ page }, info) => {
  await noPrompts(page);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const screen of [
    { name: '01-inicio', url: '/', ready: '.vcard' },
    { name: '02-shorts', url: '/shorts', ready: '.short-player' },
    { name: '03-watch', url: '/ver/dQw4w9WgXcQ', ready: '.watch-title' },
    { name: '04-suscripciones', url: '/suscripciones', ready: '.add-form' },
    { name: '05-tu', url: '/tu', ready: '.page-title' },
    { name: '06-ajustes', url: '/ajustes', ready: '.page-head' },
  ]) {
    await visit(page, screen.url, screen.ready);
    await capture(page, info, 'mobile-390x844', screen.name);
  }
});
