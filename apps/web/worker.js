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

// Caché en memoria del aislado (segundos): las lecturas repetidas (varias pestañas, pruebas automáticas, recargas)
// no vuelven a D1. 2026-11-08 se agotó el límite gratuito diario de lecturas (5 M filas). Si D1 falla, se sirve la
// última copia buena, aunque haya caducado.
const memo = new Map();
async function cached(key, ttl, load) {
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < ttl * 1000) return hit.data;
  try {
    const data = await load();
    memo.set(key, { at: Date.now(), data });
    if (memo.size > 50) memo.delete(memo.keys().next().value);
    return data;
  } catch (e) {
    if (hit) return hit.data;
    throw e;
  }
}
const forget = (prefix) => { for (const k of memo.keys()) if (k.startsWith(prefix)) memo.delete(k); };

async function api(request, env, url) {
  // Cualquier cambio (seguir, dejar de seguir, campanita, foto) invalida la copia en memoria de este aislado.
  if (request.method !== 'GET' && request.method !== 'HEAD') { forget('channels'); forget('feed'); }
  if (url.pathname === '/api/feed' && request.method === 'GET') {
    // Hasta 1000: la página de canal pide todos los vídeos guardados de una vez (el servidor no sabe qué canal miras).
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 60, 1), 1000);
    const before = Number(url.searchParams.get('before')) || 9e15;
    const results = await cached(`feed:${limit}:${before}`, 60, async () => (await env.DB.prepare(
      `SELECT v.video_id AS id, v.title, v.published_at AS publishedAt, v.channel_id AS channelId,
              COALESCE(c.label, v.channel_id) AS channel, v.first_source AS source, v.first_seen_at AS seenAt, v.kind AS kind,
              v.views AS views, v.likes AS likes, v.duration AS duration
       FROM videos v LEFT JOIN channels c ON c.channel_id = v.channel_id
       WHERE (c.status IS NULL OR c.status <> 'removing') AND v.published_at < ?
       ORDER BY v.published_at DESC LIMIT ?`
    ).bind(before, limit).all()).results);
    return json({ items: results }, 200, { 'cache-control': 'public, max-age=60' });
  }
  // Descripciones, visitas y me gusta (del RSS público) de los vídeos recientes, TODOS en una sola respuesta:
  // así el servidor no sabe qué vídeo abres (revisión independiente, hallazgo M3).
  if (url.pathname === '/api/descriptions' && request.method === 'GET') {
    const results = await cached('descriptions', 600, async () => (await env.DB.prepare(
      `SELECT v.video_id AS id, v.description AS d, v.views AS v, v.likes AS l
       FROM videos v LEFT JOIN channels c ON c.channel_id = v.channel_id
       WHERE (c.status IS NULL OR c.status <> 'removing') AND (v.description IS NOT NULL OR v.views IS NOT NULL)
       ORDER BY v.published_at DESC LIMIT 400`
    ).all()).results);
    return json({ items: results }, 200, { 'cache-control': 'public, max-age=600' });
  }
  if (url.pathname === '/api/channels' && request.method === 'GET') {
    // Recuento de vídeos con un solo GROUP BY sobre el índice de channel_id (antes: una subconsulta por canal).
    const results = await cached('channels', 30, async () => (await env.DB.prepare(
      `SELECT c.channel_id AS id, COALESCE(c.label, c.channel_id) AS name, c.status, c.verified_at AS verifiedAt,
              c.last_error AS lastError, c.notify AS notify, c.avatar AS avatar, c.header AS header, COALESCE(n.n, 0) AS videos
       FROM channels c LEFT JOIN (SELECT channel_id, COUNT(*) AS n FROM videos GROUP BY channel_id) n ON n.channel_id = c.channel_id
       WHERE c.status <> 'removing' ORDER BY name COLLATE NOCASE`
    ).all()).results.map((r) => {
      // Cabecera pública del canal (ADR-006, enmienda 4), guardada como JSON por el servicio de avisos.
      let header = null; try { header = r.header ? JSON.parse(r.header) : null; } catch { /* sin cabecera */ }
      return { ...r, header };
    }));
    return json({ items: results }, 200, { 'cache-control': 'no-store' });
  }
  if (url.pathname === '/api/channels' && request.method === 'POST') {
    if (!env.OWNER_KEY || !safeEqual(request.headers.get('x-owner-key') || '', env.OWNER_KEY)) {
      return json({ error: 'Clave de propietario incorrecta' }, 401);
    }
    let body;
    try { body = await request.json(); } catch { return json({ error: 'JSON inválido' }, 400); }
    const m = String(body?.input || '').match(CHANNEL_RE);
    if (!m) return json({ error: 'Pega el enlace del canal (el que contiene /channel/UC…) o su ID (UC + 22 caracteres)' }, 400);
    const label = typeof body.label === 'string' && body.label.trim() ? body.label.trim().slice(0, 80) : null;
    const r = await env.DB.prepare('INSERT OR IGNORE INTO channels (channel_id, label) VALUES (?, ?)').bind(m[1], label).run();
    return json({ id: m[1], created: r.meta.changes > 0 }, r.meta.changes > 0 ? 201 : 200);
  }
  const isOwner = () => !!env.OWNER_KEY && safeEqual(request.headers.get('x-owner-key') || '', env.OWNER_KEY);
  if (url.pathname === '/api/push/key' && request.method === 'GET') return json({ publicKey: env.VAPID_PUBLIC_KEY });
  if (url.pathname === '/api/push/subscribe' && (request.method === 'POST' || request.method === 'DELETE')) {
    if (!isOwner()) return json({ error: 'Clave de propietario incorrecta' }, 401);
    let sub; try { sub = await request.json(); } catch { return json({ error: 'JSON inválido' }, 400); }
    const endpoint = String(sub?.endpoint || '');
    if (!/^https:\/\//.test(endpoint) || endpoint.length > 1000) return json({ error: 'Suscripción inválida' }, 400);
    if (request.method === 'DELETE') {
      await env.DB.prepare('DELETE FROM push_subs WHERE endpoint=?').bind(endpoint).run();
      return json({ ok: true });
    }
    const { p256dh, auth } = sub.keys || {};
    if (!p256dh || !auth) return json({ error: 'Faltan las claves de la suscripción' }, 400);
    await env.DB.prepare('INSERT INTO push_subs (endpoint, p256dh, auth, created_at) VALUES (?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET p256dh=excluded.p256dh, auth=excluded.auth, failures=0')
      .bind(endpoint, String(p256dh), String(auth), Date.now()).run();
    return json({ ok: true }, 201);
  }
  const bell = url.pathname.match(/^\/api\/channels\/(UC[A-Za-z0-9_-]{22})\/notify$/);
  if (bell && request.method === 'PUT') {
    if (!isOwner()) return json({ error: 'Clave de propietario incorrecta' }, 401);
    let b; try { b = await request.json(); } catch { return json({ error: 'JSON inválido' }, 400); }
    if (!['all', 'noshorts', 'none'].includes(b?.notify)) return json({ error: 'Valor de campanita inválido' }, 400);
    const r = await env.DB.prepare('UPDATE channels SET notify=? WHERE channel_id=?').bind(b.notify, bell[1]).run();
    return json({ id: bell[1], notify: b.notify }, r.meta.changes ? 200 : 404);
  }
  const av = url.pathname.match(/^\/api\/channels\/(UC[A-Za-z0-9_-]{22})\/avatar$/);
  if (av && request.method === 'PUT') {
    if (!isOwner()) return json({ error: 'Clave de propietario incorrecta' }, 401);
    let b; try { b = await request.json(); } catch { return json({ error: 'JSON inválido' }, 400); }
    let u; try { u = new URL(String(b?.url || '')); } catch { return json({ error: 'URL inválida' }, 400); }
    // Solo fotos de la CDN pública de imágenes de canales: nada de URL arbitrarias.
    if (u.protocol !== 'https:' || !/^yt[34]\.(ggpht|googleusercontent)\.com$/.test(u.hostname) || u.href.length > 600) return json({ error: 'URL no permitida' }, 400);
    const r = await env.DB.prepare('UPDATE channels SET avatar=? WHERE channel_id=?').bind(u.href, av[1]).run();
    return json({ id: av[1], avatar: u.href }, r.meta.changes ? 200 : 404);
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
      const body = file.b64 ? Uint8Array.from(atob(file.body), (c) => c.charCodeAt(0)) : file.body;
      return new Response(body, { headers: { 'content-type': file.type, ...(file.b64 ? { 'content-disposition': `attachment; filename="${url.pathname.slice(1)}"` } : {}), 'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=300' } });
    }
    // SPA: cualquier otra ruta devuelve index.html
    return new Response(ASSETS['/index.html'].body, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' } });
  },
};
