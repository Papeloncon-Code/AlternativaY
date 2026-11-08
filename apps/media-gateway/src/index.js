// Punto de entrada del Worker experimental (spec 008). Ver src/gateway.js.
import { handle, makeLimiter, readConfig } from './gateway.js';

let cfg; let limiter;
export default {
  async fetch(request, env) {
    try { cfg ??= readConfig(env); } catch (e) { return new Response('Configuración no válida', { status: 500 }); }
    limiter ??= makeLimiter(cfg.rateLimit);
    // Registro mínimo: operación, estado y duración. Nunca URLs, rangos, cabeceras ni identificadores.
    return handle(request, cfg, fetch, limiter, (e) => console.log(JSON.stringify({ gw: 1, ...e })));
  },
};
