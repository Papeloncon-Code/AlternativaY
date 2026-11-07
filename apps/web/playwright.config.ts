import { defineConfig, devices } from '@playwright/test';
// Pruebas de aceptación de la spec 007 (una por función que se marca ✅). Se ejecutan antes de cada despliegue.
// BASE_URL permite probar también la web publicada: BASE_URL=https://todotube.papelon.workers.dev npm run e2e
const base = process.env.BASE_URL || 'http://localhost:4173';
export default defineConfig({
  testDir: 'e2e',
  timeout: 45_000,
  retries: 1,
  reporter: [['list']],
  use: { baseURL: base, trace: 'off' },
  projects: [
    { name: 'escritorio', use: { viewport: { width: 1366, height: 768 } }, testIgnore: /movil\.spec\.ts/ },
    // Tamaño y tacto de un iPhone 13, con el Chromium instalado (WebKit no está en este entorno).
    { name: 'movil', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium', browserName: 'chromium' }, testMatch: /movil\.spec\.ts/ },
  ],
  webServer: process.env.BASE_URL ? undefined : { command: 'npx vite preview', url: 'http://localhost:4173', reuseExistingServer: true, timeout: 60_000 },
});
