// Gateway multimedia experimental (spec 008, ADR-009). SOLO retransmite archivos de prueba propios desde un origen fijo.
// Prohibido por ADR-005 y ADR-009: URLs de YouTube/Googlevideo, InnerTube, BotGuard, PoToken o SABR. No es un proxy genérico:
// el cliente nunca indica el destino; solo elige un nombre de archivo de una lista cerrada.

const ASSET_RE = /^[a-z0-9][a-z0-9-]{0,62}\.(mp4|webm|mpd)$/;
const RANGE_RE = /^bytes=(\d*)-(\d*)$/;
const PASS_HEADERS = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified'];
const EXPOSE = 'Content-Length, Content-Range, Accept-Ranges, Content-Type';

/** Configuración validada una sola vez. Lanza si el origen no es seguro. */
export function readConfig(env) {
  const enabled = env.GATEWAY_ENABLED === '1';
  const devLoopback = env.DEV_ALLOW_LOOPBACK === '1';
  let origin;
  try { origin = new URL(env.ORIGIN_BASE || ''); } catch { throw new Error('ORIGIN_BASE no es una URL válida'); }
  if (origin.username || origin.password || origin.search || origin.hash) throw new Error('ORIGIN_BASE no puede llevar credenciales ni parámetros');
  if (!devLoopback) {
    if (origin.protocol !== 'https:') throw new Error('ORIGIN_BASE debe ser https');
    if (isPrivateHost(origin.hostname)) throw new Error('ORIGIN_BASE no puede apuntar a una red privada');
  } else if (!['http:', 'https:'].includes(origin.protocol)) throw new Error('ORIGIN_BASE debe ser http(s)');
  const assets = new Set(String(env.ASSETS || '').split(',').map((s) => s.trim()).filter((s) => ASSET_RE.test(s)));
  const allowedOrigins = new Set(String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean));
  const rateLimit = Math.max(1, Number(env.RATE_LIMIT_PER_MIN || 600));
  return { enabled, origin, assets, allowedOrigins, rateLimit };
}

/** Hosts de redes privadas, bucle local, enlace local y servicios de metadatos (protección SSRF). */
export function isPrivateHost(host) {
  const h = host.replace(/^\[|\]$/g, '').toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.internal') || h === 'metadata.google.internal') return true;
  if (/^(::1|::|fe80:|fc|fd)/.test(h)) return true;
  const m = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

/** Un único rango de bytes. Devuelve null si no hay cabecera, 'invalid' si es malformado o múltiple. */
export function parseRange(value) {
  if (value == null) return null;
  const m = value.trim().match(RANGE_RE);
  if (!m || (m[1] === '' && m[2] === '')) return 'invalid';
  if (m[1] !== '' && m[2] !== '' && Number(m[2]) < Number(m[1])) return 'invalid';
  return value.trim();
}

function corsHeaders(cfg, origin) {
  if (!origin || !cfg.allowedOrigins.has(origin)) return {};
  return { 'Access-Control-Allow-Origin': origin, 'Access-Control-Expose-Headers': EXPOSE, Vary: 'Origin' };
}

const plain = (status, msg, extra = {}) => new Response(msg, { status, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', ...extra } });

/** Límite básico por IP y aislamiento (orientativo: cada instancia del Worker tiene su propio contador). */
export function makeLimiter(perMin, now = () => Date.now()) {
  const hits = new Map();
  return (key) => {
    const t = now(); const w = Math.floor(t / 60000);
    const e = hits.get(key);
    if (!e || e.w !== w) { hits.set(key, { w, n: 1 }); if (hits.size > 10000) hits.clear(); return true; }
    e.n++; return e.n <= perMin;
  };
}

/**
 * Atiende una petición. `fetchImpl` se inyecta para poder probarlo sin red.
 * Devuelve siempre una Response; nunca materializa el cuerpo multimedia (se reenvía el ReadableStream).
 */
export async function handle(request, cfg, fetchImpl, limiter, log = () => {}) {
  const started = Date.now();
  const url = new URL(request.url);
  const origin = request.headers.get('origin');
  const done = (res, op) => { log({ op, status: res.status, ms: Date.now() - started }); return res; };

  if (!cfg.enabled) return done(plain(503, 'Gateway desactivado'), 'disabled');
  if (limiter && !limiter(request.headers.get('cf-connecting-ip') || 'local')) return done(plain(429, 'Demasiadas solicitudes', { 'retry-after': '60' }), 'ratelimit');

  // Solo /media/<archivo>, sin parámetros: no se acepta ninguna URL ni destino del cliente.
  const m = url.pathname.match(/^\/media\/([^/]+)$/);
  if (!m || url.search) return done(plain(404, 'No encontrado'), 'route');
  let name;
  try { name = decodeURIComponent(m[1]); } catch { return done(plain(400, 'Ruta no válida'), 'route'); }
  if (!ASSET_RE.test(name) || name !== m[1]) return done(plain(400, 'Ruta no válida'), 'route');
  if (!cfg.assets.has(name)) return done(plain(404, 'No encontrado'), 'route');

  if (request.method === 'OPTIONS') {
    if (!origin || !cfg.allowedOrigins.has(origin)) return done(plain(403, 'Origen no permitido'), 'preflight');
    return done(new Response(null, { status: 204, headers: {
      'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range', 'Access-Control-Max-Age': '600', Vary: 'Origin',
    } }), 'preflight');
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') return done(plain(405, 'Método no permitido', { allow: 'GET, HEAD, OPTIONS' }), 'method');
  // Política explícita: si el navegador declara un origen que no está permitido, se rechaza (no se refleja).
  if (origin && !cfg.allowedOrigins.has(origin)) return done(plain(403, 'Origen no permitido'), 'origin');

  const range = parseRange(request.headers.get('range'));
  if (range === 'invalid') return done(plain(416, 'Rango no admitido: se acepta un único rango de bytes'), 'range');

  const target = new URL(name, cfg.origin.href.endsWith('/') ? cfg.origin.href : `${cfg.origin.href}/`);
  if (target.origin !== cfg.origin.origin) return done(plain(400, 'Destino no permitido'), 'route');

  let up;
  try {
    up = await fetchImpl(target.href, {
      method: request.method,
      headers: range ? { Range: range } : {},
      redirect: 'manual', // no se sigue ninguna redirección: podría llevar a un host no permitido
      signal: request.signal, // si el cliente cancela, se cancela la petición al origen
    });
  } catch (e) {
    if (request.signal?.aborted) return done(plain(499, 'Cancelado'), 'cancel');
    return done(plain(502, 'Origen no disponible'), 'upstream');
  }
  if (up.status >= 300 && up.status < 400) {
    up.body?.cancel().catch(() => {});
    return done(plain(502, 'El origen respondió con una redirección; no se sigue'), 'redirect');
  }

  const headers = new Headers({ 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...corsHeaders(cfg, origin) });
  for (const h of PASS_HEADERS) { const v = up.headers.get(h); if (v) headers.set(h, v); }
  // Si el origen ignoró el Range y devolvió 200, se devuelve 200: nunca se fabrica un 206.
  const body = request.method === 'HEAD' ? null : up.body;
  return done(new Response(body, { status: up.status, headers }), request.method === 'HEAD' ? 'head' : range ? 'range' : 'get');
}
