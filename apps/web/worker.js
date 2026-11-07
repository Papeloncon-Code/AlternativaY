// TodoTube Web v0.1: sirve la web (embebida en assets.generated.js) y una API mínima sobre la D1 del servicio de avisos.
import ASSETS from './assets.generated.js';
// specs/004-web-v0/spec.md · Constitución §I.2: no se extrae YouTube; solo se leen datos de WebSub/RSS.
const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...extra } });

const CHANNEL_RE = /(UC[A-Za-z0-9_-]{22})/;

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

async function api(request, env, url) {
  if (url.pathname === '/api/feed' && request.method === 'GET') {
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 60, 1), 200);
    const { results } = await env.DB.prepare(
      `SELECT v.video_id AS id, v.title, v.published_at AS publishedAt, v.channel_id AS channelId,
              COALESCE(c.label, v.channel_id) AS channel, v.first_source AS source, v.first_seen_at AS seenAt, v.kind AS kind
       FROM videos v LEFT JOIN channels c ON c.channel_id = v.channel_id
       WHERE c.status IS NULL OR c.status <> 'removing'
       ORDER BY v.published_at DESC LIMIT ?`
    ).bind(limit).all();
    return json({ items: results }, 200, { 'cache-control': 'public, max-age=60' });
  }
  if (url.pathname === '/api/channels' && request.method === 'GET') {
    const { results } = await env.DB.prepare(
      `SELECT c.channel_id AS id, COALESCE(c.label, c.channel_id) AS name, c.status, c.verified_at AS verifiedAt,
              c.last_error AS lastError, (SELECT COUNT(*) FROM videos v WHERE v.channel_id = c.channel_id) AS videos
       FROM channels c WHERE c.status <> 'removing' ORDER BY name COLLATE NOCASE`
    ).all();
    return json({ items: results }, 200, { 'cache-control': 'no-store' });
  }
  if (url.pathname === '/api/channels' && request.method === 'POST') {
    if (!env.OWNER_KEY || !safeEqual(request.headers.get('x-owner-key') || '', env.OWNER_KEY)) {
      return json({ error: 'Clave de propietario incorrecta' }, 401);
    }
    let body;
    try { body = await request.json(); } catch { return json({ error: 'JSON inválido' }, 400); }
    const m = String(body?.input || '').match(CHANNEL_RE);
    if (!m) return json({ error: 'Pega la URL del canal con /channel/UC… o su ID (UC + 22 caracteres)' }, 400);
    const label = typeof body.label === 'string' && body.label.trim() ? body.label.trim().slice(0, 80) : null;
    const r = await env.DB.prepare('INSERT OR IGNORE INTO channels (channel_id, label) VALUES (?, ?)').bind(m[1], label).run();
    return json({ id: m[1], created: r.meta.changes > 0 }, r.meta.changes > 0 ? 201 : 200);
  }
  const del = url.pathname.match(/^\/api\/channels\/(UC[A-Za-z0-9_-]{22})$/);
  if (del && request.method === 'DELETE') {
    if (!env.OWNER_KEY || !safeEqual(request.headers.get('x-owner-key') || '', env.OWNER_KEY)) {
      return json({ error: 'Clave de propietario incorrecta' }, 401);
    }
    // El servicio de avisos se da de baja en YouTube y borra el canal en su próxima ejecución (≤ 5 min).
    const r = await env.DB.prepare("UPDATE channels SET status='removing' WHERE channel_id=?").bind(del[1]).run();
    return json({ id: del[1], removed: r.meta.changes > 0 }, r.meta.changes > 0 ? 200 : 404);
  }
  return json({ error: 'No encontrado' }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      try { return await api(request, env, url); }
      catch (e) { return json({ error: 'Error interno', detail: String(e).slice(0, 200) }, 500); }
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Método no permitido', { status: 405 });
    const file = ASSETS[url.pathname];
    if (file) {
      const immutable = url.pathname.startsWith('/assets/');
      return new Response(file.body, { headers: { 'content-type': file.type, 'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=300' } });
    }
    // SPA: cualquier otra ruta devuelve index.html
    return new Response(ASSETS['/index.html'].body, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' } });
  },
};
