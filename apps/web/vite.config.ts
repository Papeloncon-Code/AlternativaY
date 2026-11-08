import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { existsSync } from 'node:fs';

// Si el entorno sale a Internet por un proxy (HTTPS_PROXY), el reenvío de /api también lo usa.
const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
const agent = proxy ? new HttpsProxyAgent(proxy) : undefined;

// Producción sigue usando la API publicada. CI puede inyectar un servidor local con datos deterministas.
// Esto evita que las pruebas de interfaz dependan de cuotas, disponibilidad o datos cambiantes de la D1 real.
const apiTarget = process.env.E2E_API_TARGET || 'https://todotube.papelon.workers.dev';
const apiProtocol = new URL(apiTarget).protocol;
const apiAgent = apiProtocol === 'https:' ? agent : undefined;

export default defineConfig({
  plugins: [react()],
  // ¿Hay versión del Puente firmada por Mozilla? Si la hay, Firefox la instala con un clic desde la propia página.
  define: { __XPI__: JSON.stringify(existsSync('public/todotube-puente.xpi')) },
  preview: {
    port: 4173,
    strictPort: true,
    proxy: { '/api': { target: apiTarget, changeOrigin: true, agent: apiAgent } },
  },
});
