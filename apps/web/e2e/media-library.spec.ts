import { Buffer } from 'node:buffer';
import { test, expect } from '@playwright/test';
import { noPrompts } from './helpers';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'http://localhost:4173',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Media-Size, X-Media-Title, X-Media-Creator, X-Media-License, X-Media-License-Reference, X-Media-Visibility',
};

async function mockCatalog(page: import('@playwright/test').Page) {
  await page.route('**/v1/catalog', (route) => route.fulfill({
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: [] }),
  }));
}

test.beforeEach(async ({ page }) => { await noPrompts(page); });

test('la biblioteca informa que un único origen no tiene redundancia', async ({ page }) => {
  await page.route('**/health', (route) => route.fulfill({
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ok: true, service: 'todotube-media-gateway',
      originsConfigured: 1, originsAvailable: 1, degraded: false,
    }),
  }));
  await mockCatalog(page);

  await page.goto('/medios');
  const status = page.locator('.media-origin-status');
  await expect(status).toContainText('un solo origen');
  await expect(status).toContainText('no tiene redundancia');
  await expect(page.getByText(/dos buckets|ambos buckets|ambas copias/i)).toHaveCount(0);
});

test('la biblioteca muestra el recuento real cuando hay dos orígenes disponibles', async ({ page }) => {
  await page.route('**/health', (route) => route.fulfill({
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ok: true, service: 'todotube-media-gateway',
      originsConfigured: 2, originsAvailable: 2, degraded: false,
    }),
  }));
  await mockCatalog(page);

  await page.goto('/medios');
  const status = page.locator('.media-origin-status');
  await expect(status).toContainText('2 de 2 orígenes disponibles');
  await expect(status).toHaveAttribute('data-state', 'ready');
});

test('la confirmación de carga no afirma una réplica cuando solo existe un origen', async ({ page }) => {
  await page.route('**/health', (route) => route.fulfill({
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ok: true, service: 'todotube-media-gateway',
      originsConfigured: 1, originsAvailable: 1, degraded: false,
    }),
  }));
  await mockCatalog(page);
  await page.route('**/v1/admin/media/**', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }
    await route.fulfill({
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: true, id: 'media_test', visibility: 'public',
        replicas: { written: 1, configured: 1, degraded: false },
      }),
    });
  });

  await page.goto('/medios');
  const fields = page.locator('.media-field');
  await fields.nth(0).locator('input').fill('media_test');
  await fields.nth(1).locator('input').fill('Vídeo de prueba');
  await fields.nth(2).locator('input').fill('Creador');
  await fields.nth(4).locator('input').setInputFiles({
    name: 'sample.mp4', mimeType: 'video/mp4', buffer: Buffer.from('test-video'),
  });
  await fields.nth(5).locator('input').fill('test-token-for-e2e-only-1234567890');
  await page.getByRole('button', { name: 'Subir archivo' }).click();

  await expect(page.locator('.media-upload-success')).toContainText(
    'Carga completada en un único origen. El archivo queda disponible, pero sin redundancia.',
  );
});
