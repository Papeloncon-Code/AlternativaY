import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { noPrompts } from './helpers';

type Metric = {
  screen: string;
  viewport: { width: number; height: number; dpr: number };
  document: { width: number; height: number };
  elements: Record<string, null | { x: number; y: number; width: number; height: number; display: string; position: string; gap: string; fontSize: string; lineHeight: string; columns: string }>;
};

async function measure(page: Page, screen: string): Promise<Metric> {
  return page.evaluate((screenName) => {
    const selectors = [
      '.topbar', '.mobile-feed-tabs', '.side', '.rail', '.bottombar', '.main', '.page',
      '.vgrid', '.vcard', '.vthumb', '.shorts-stage', '.short-player',
      '.short-nav', '.watch-layout', '#player-slot', '.watch-main',
      '.watch-side', '.notif-panel', '.account-menu'
    ];
    const elements: Metric['elements'] = {};
    for (const selector of selectors) {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (!el) { elements[selector] = null; continue; }
      const rect = el.getBoundingClientRect();
      const css = getComputedStyle(el);
      elements[selector] = {
        x: Math.round(rect.x * 100) / 100,
        y: Math.round(rect.y * 100) / 100,
        width: Math.round(rect.width * 100) / 100,
        height: Math.round(rect.height * 100) / 100,
        display: css.display,
        position: css.position,
        gap: css.gap,
        fontSize: css.fontSize,
        lineHeight: css.lineHeight,
        columns: css.gridTemplateColumns
      };
    }
    return {
      screen: screenName,
      viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
      document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
      elements
    };
  }, screen);
}

async function capture(page: Page, info: TestInfo, viewport: string, name: string): Promise<Metric> {
  const dir = info.outputPath('visual-audit', viewport);
  await mkdir(dir, { recursive: true });
  await page.screenshot({ path: info.outputPath('visual-audit', viewport, name + '.png'), fullPage: false, animations: 'disabled' });
  return measure(page, name);
}

async function ready(page: Page, path: string, selector: string) {
  await page.goto(path);
  await expect(page.locator(selector).first()).toBeVisible({ timeout: 15_000 });
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(120);
}

async function saveMetrics(info: TestInfo, viewport: string, metrics: Metric[]) {
  const dir = info.outputPath('visual-audit', viewport);
  await mkdir(dir, { recursive: true });
  await writeFile(info.outputPath('visual-audit', viewport, 'metrics.json'), JSON.stringify(metrics, null, 2));
}

test('Visual audit · desktop 1440×900 · pantallas y menús', async ({ page }, info) => {
  await noPrompts(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  const metrics: Metric[] = [];
  const screens = [
    { name: '01-inicio', url: '/', selector: '.vcard' },
    { name: '02-shorts', url: '/shorts', selector: '.short-player' },
    { name: '03-watch', url: '/ver/dQw4w9WgXcQ', selector: '.watch-title' },
    { name: '04-canal', url: '/canal/UCNye-wNBqNL5ZzHSJj3l8Bg', selector: '.ch-head' },
    { name: '05-suscripciones', url: '/suscripciones', selector: '.subscription-feed' },
    { name: '06-gestionar-suscripciones', url: '/suscripciones/gestionar', selector: '.channel-list' },
    { name: '07-busqueda', url: '/buscar?q=news', selector: '.sresult' },
    { name: '08-tu', url: '/tu', selector: '.page-title' },
    { name: '09-ajustes', url: '/ajustes', selector: '.page-head' },
    { name: '10-medios', url: '/medios', selector: '.media-library' },
    { name: '11-privacidad', url: '/privacidad', selector: '.privacy' }
  ];
  for (const screen of screens) {
    await ready(page, screen.url, screen.selector);
    metrics.push(await capture(page, info, 'desktop-1440x900', screen.name));
  }
  await ready(page, '/', '.vcard');
  await page.getByRole('button', { name: 'Menú de cuenta' }).click();
  await expect(page.locator('.account-menu')).toBeVisible();
  metrics.push(await capture(page, info, 'desktop-1440x900', '11-menu-cuenta-abierto'));
  await page.keyboard.press('Escape');
  await page.locator('.notif > button').click();
  await expect(page.locator('.notif-panel')).toBeVisible();
  metrics.push(await capture(page, info, 'desktop-1440x900', '12-avisos-abiertos'));
  await page.locator('.notif > button').click();
  await page.locator('.menu-btn').click();
  metrics.push(await capture(page, info, 'desktop-1440x900', '13-sidebar-colapsado'));
  await saveMetrics(info, 'desktop-1440x900', metrics);
});

test('Visual audit · tablet 1024×768 · Inicio, Watch y canal', async ({ page }, info) => {
  await noPrompts(page);
  await page.setViewportSize({ width: 1024, height: 768 });
  const metrics: Metric[] = [];
  for (const screen of [
    { name: '01-inicio', url: '/', selector: '.vcard' },
    { name: '02-watch', url: '/ver/dQw4w9WgXcQ', selector: '.watch-title' },
    { name: '03-canal', url: '/canal/UCNye-wNBqNL5ZzHSJj3l8Bg', selector: '.ch-head' }
  ]) {
    await ready(page, screen.url, screen.selector);
    metrics.push(await capture(page, info, 'tablet-1024x768', screen.name));
  }
  await saveMetrics(info, 'tablet-1024x768', metrics);
});

test('Visual audit · móvil 390×844 · pantallas, búsqueda y navegación inferior', async ({ page }, info) => {
  await noPrompts(page);
  await page.setViewportSize({ width: 390, height: 844 });
  const metrics: Metric[] = [];
  for (const screen of [
    { name: '01-inicio', url: '/', selector: '.vcard' },
    { name: '02-shorts', url: '/shorts', selector: '.short-player' },
    { name: '03-watch', url: '/ver/dQw4w9WgXcQ', selector: '.watch-title' },
    { name: '04-suscripciones', url: '/suscripciones', selector: '.subscription-feed' },
    { name: '05-gestionar-suscripciones', url: '/suscripciones/gestionar', selector: '.channel-list' },
    { name: '06-tu', url: '/tu', selector: '.page-title' },
    { name: '07-ajustes', url: '/ajustes', selector: '.page-head' }
  ]) {
    await ready(page, screen.url, screen.selector);
    metrics.push(await capture(page, info, 'mobile-390x844', screen.name));
  }
  await ready(page, '/', '.vcard');
  await page.locator('.top-right .only-mobile').click();
  await page.locator('#q').fill('news');
  await expect(page.locator('.suggest li[role=option]').first()).toBeVisible({ timeout: 10_000 });
  metrics.push(await capture(page, info, 'mobile-390x844', '07-busqueda-abierta'));
  await saveMetrics(info, 'mobile-390x844', metrics);
});
