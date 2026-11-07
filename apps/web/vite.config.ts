import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { HttpsProxyAgent } from 'https-proxy-agent';

// Si el entorno sale a Internet por un proxy (HTTPS_PROXY), el reenvío de /api también lo usa.
const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
const agent = proxy ? new HttpsProxyAgent(proxy) : undefined;
// `vite preview` sirve la versión compilada y reenvía /api al servicio publicado: así las pruebas de aceptación
// se ejecutan contra lo que se va a desplegar, con datos reales, antes de desplegarlo.
export default defineConfig({
  plugins: [react()],
  preview: { port: 4173, strictPort: true, proxy: { '/api': { target: 'https://todotube.papelon.workers.dev', changeOrigin: true, agent } } },
});
