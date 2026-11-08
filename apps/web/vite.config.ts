import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { existsSync } from 'node:fs';

// La API real continúa siendo el destino predeterminado. CI puede inyectar fixtures locales.
// Así, las pruebas de interfaz no dependen de cuotas, disponibilidad ni cambios en datos de producción.
const apiTarget = process.env.E2E_API_TARGET || 'https://todotube.papelon.workers.dev';
const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
const agent = proxy && new URL(apiTarget).protocol === 'https:' ? new HttpsProxyAgent(proxy) : undefined;

export default defineConfig({
  plugins: [react()],
  // ¿Hay versión del Puente firmada por Mozilla? Si la hay, Firefox la instala con un clic desde la propia página.
  define: { __XPI__: JSON.stringify(existsSync('public/todotube-puente.xpi')) },
  preview: {
    port: 4173,
    strictPort: true,
    proxy: { '/api': { target: apiTarget, changeOrigin: true, agent } },
  },
});
