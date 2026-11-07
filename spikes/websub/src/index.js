// Spike T-007: avisos WebSub de YouTube → D1 + ntfy. Ver specs/003-spike-websub/spec.md
// Constitución §I.2: solo WebSub y RSS público. Nada de extracción de YouTube.
import { parseAtom, hmacSha1Hex, safeEqual, isFresh } from './atom.js';

const TOPIC = (id) => `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${id}`;
const RSS = (id) => `https://www.youtube.com/feeds/videos.xml?channel_id=${id}`;
const CHANNEL_RE = /^UC[A-Za-z0-9_-]{22}$/;

function randomHex(n = 16) {
  return [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function notify(env, { title, body, url }) {
  if (!env.NTFY_TOPIC) return;
  await fetch(`https://ntfy.sh/${env.NTFY_TOPIC}`, {
    method: 'POST',
    body,
    headers: { Title: title.slice(0, 200), ...(url ? { Click: url } : {}), Tags: 'tv' },
  }).catch(() => {});
}

const mins = (ms) => (ms / 60000).toFixed(1);

// Registra una entrada; devuelve true si es un vídeo nuevo (primera vez visto y reciente).
async function recordEntry(env, e, source, now) {
  await env.DB.prepare(
    'INSERT INTO events (source, video_id, channel_id, title, published_at, updated_at, received_at, is_new) VALUES (?,?,?,?,?,?,?,0)'
  ).bind(source, e.videoId, e.channelId, e.title, e.published, e.updated, now).run();
  const seen = await env.DB.prepare('SELECT 1 FROM videos WHERE video_id = ?').bind(e.videoId).first();
  if (seen || !isFresh(e.published, now)) return false;
  await env.DB.batch([
    env.DB.prepare('INSERT OR IGNORE INTO videos (video_id, channel_id, title, published_at, first_source, first_seen_at) VALUES (?,?,?,?,?,?)')
      .bind(e.videoId, e.channelId, e.title, e.published, source, now),
    env.DB.prepare('UPDATE events SET is_new = 1 WHERE id = (SELECT MAX(id) FROM events WHERE video_id = ? AND source = ?)')
      .bind(e.videoId, source),
  ]);
  return true;
}

async function handleVerify(url, env, channelId) {
  const mode = url.searchParams.get('hub.mode');
  const topic = url.searchParams.get('hub.topic');
  const challenge = url.searchParams.get('hub.challenge');
  const lease = Number(url.searchParams.get('hub.lease_seconds') || 0);
  const ch = await env.DB.prepare('SELECT channel_id FROM channels WHERE channel_id = ?').bind(channelId).first();
  if (!ch || topic !== TOPIC(channelId) || !challenge) return new Response('not found', { status: 404 });
  if (mode === 'subscribe') {
    const now = Date.now();
    await env.DB.prepare("UPDATE channels SET status='verified', verified_at=?, lease_expires=?, last_error=NULL WHERE channel_id=?")
      .bind(now, lease ? now + lease * 1000 : null, channelId).run();
  }
  return new Response(challenge, { status: 200, headers: { 'content-type': 'text/plain' } });
}

async function handlePush(request, env, ctx, channelId) {
  const now = Date.now();
  const ch = await env.DB.prepare('SELECT secret FROM channels WHERE channel_id = ?').bind(channelId).first();
  if (!ch?.secret) return new Response('unknown topic', { status: 404 });
  const body = await request.text();
  if (body.length > 256 * 1024) return new Response('too large', { status: 413 });
  const sig = (request.headers.get('x-hub-signature') || '').replace(/^sha1=/, '');
  const expected = await hmacSha1Hex(ch.secret, body);
  // Según la especificación de PubSubHubbub, si la firma no cuadra se responde 2xx pero se ignora el mensaje.
  // En el spike usamos 403 para que la prueba CA-S4 sea observable.
  if (!safeEqual(sig, expected)) return new Response('bad signature', { status: 403 });

  const { entries, deleted } = parseAtom(body);
  for (const d of deleted) {
    await env.DB.prepare('INSERT INTO events (source, video_id, channel_id, received_at, updated_at) VALUES (?,?,?,?,?)')
      .bind('websub-deleted', d.videoId, channelId, now, d.when).run();
  }
  for (const e of entries) {
    e.channelId ||= channelId;
    if (await recordEntry(env, e, 'websub', now)) {
      const lat = e.published ? ` · ${mins(now - e.published)} min tras publicar` : '';
      ctx.waitUntil(notify(env, {
        title: `Nuevo: ${e.title || e.videoId}`,
        body: `WebSub${lat}`,
        url: `https://www.youtube.com/watch?v=${e.videoId}`,
      }));
    }
  }
  return new Response('ok', { status: 200 });
}

async function subscribe(env, channelId, secret) {
  const form = new URLSearchParams({
    'hub.callback': `${env.PUBLIC_URL}/websub/${channelId}`,
    'hub.topic': TOPIC(channelId),
    'hub.verify': 'async',
    'hub.mode': 'subscribe',
    'hub.lease_seconds': env.LEASE_SECONDS || '432000',
    'hub.secret': secret,
  });
  const r = await fetch(env.HUB_URL, { method: 'POST', body: form });
  return r.status;
}

async function pollRss(env, channelId, baseline, now) {
  const r = await fetch(RSS(channelId), { cf: { cacheTtl: 0 } });
  if (r.status === 404) return { invalid: true };
  if (!r.ok) return { error: `rss ${r.status}` };
  // El RSS público trae como máximo ~15 entradas: se procesan todas para no perder subidas en ráfaga.
  const { entries } = parseAtom(await r.text());
  let fresh = 0;
  for (const e of entries) {
    e.channelId ||= channelId;
    if (baseline) {
      await env.DB.prepare('INSERT OR IGNORE INTO videos (video_id, channel_id, title, published_at, first_source, first_seen_at) VALUES (?,?,?,?,?,?)')
        .bind(e.videoId, e.channelId, e.title, e.published, 'baseline', now).run();
    } else if (await recordEntry(env, e, 'rss', now)) {
      fresh++;
      await notify(env, {
        title: `Nuevo (respaldo RSS): ${e.title || e.videoId}`,
        body: `RSS · ${e.published ? mins(now - e.published) + ' min tras publicar' : ''}`,
        url: `https://www.youtube.com/watch?v=${e.videoId}`,
      });
    }
  }
  return { fresh };
}

async function cron(env) {
  const now = Date.now();
  const stats = { subscribed: 0, renewed: 0, polled: 0, new_from_rss: 0, error: null };
  try {
    // 1. Canales nuevos: línea base por RSS (para no contar vídeos viejos como "nuevos") + suscripción.
    const pending = await env.DB.prepare("SELECT channel_id, secret, last_polled_at FROM channels WHERE status='pending' LIMIT 5").all();
    for (const { channel_id, secret: oldSecret, last_polled_at } of pending.results) {
      if (!CHANNEL_RE.test(channel_id)) {
        await env.DB.prepare("UPDATE channels SET status='invalid', last_error='formato' WHERE channel_id=?").bind(channel_id).run();
        continue;
      }
      // La línea base se hace UNA sola vez por canal (last_polled_at NULL). En los reintentos tras un error
      // del hub se sondea en modo normal, para que los vídeos publicados entre intentos cuenten como nuevos.
      const base = await pollRss(env, channel_id, last_polled_at == null, now);
      if (base.invalid) {
        await env.DB.prepare("UPDATE channels SET status='invalid', last_error='RSS 404' WHERE channel_id=?").bind(channel_id).run();
        continue;
      }
      if (base.error && last_polled_at == null) {
        await env.DB.prepare('UPDATE channels SET last_error=? WHERE channel_id=?').bind(base.error, channel_id).run();
        continue; // sin línea base no se suscribe; se reintenta en la próxima ejecución
      }
      const secret = oldSecret || randomHex();
      const st = await subscribe(env, channel_id, secret);
      await env.DB.prepare("UPDATE channels SET secret=?, status=?, requested_at=?, last_polled_at=?, last_error=? WHERE channel_id=?")
        .bind(secret, st === 202 ? 'requested' : 'pending', now, now, st === 202 ? null : `hub ${st}`, channel_id).run();
      if (st === 202) stats.subscribed++;
    }
    // 2. Renovar leases que caducan en < 24 h (o solicitudes sin verificar tras 1 h).
    const due = await env.DB.prepare(
      "SELECT channel_id, secret FROM channels WHERE (status='verified' AND lease_expires < ?) OR (status='requested' AND requested_at < ?) LIMIT 5"
    ).bind(now + 24 * 3600 * 1000, now - 3600 * 1000).all();
    for (const { channel_id, secret } of due.results) {
      const st = await subscribe(env, channel_id, secret);
      await env.DB.prepare('UPDATE channels SET requested_at=?, last_error=? WHERE channel_id=?')
        .bind(now, st === 202 ? null : `renew ${st}`, channel_id).run();
      if (st === 202) stats.renewed++;
    }
    // 3. Respaldo RSS por rotación.
    const n = Number(env.RSS_PER_RUN || 7);
    const rot = await env.DB.prepare(
      "SELECT channel_id FROM channels WHERE status IN ('requested','verified') ORDER BY COALESCE(last_polled_at,0) ASC LIMIT ?"
    ).bind(n).all();
    for (const { channel_id } of rot.results) {
      const res = await pollRss(env, channel_id, false, now);
      await env.DB.prepare('UPDATE channels SET last_polled_at=? WHERE channel_id=?').bind(now, channel_id).run();
      stats.polled++;
      stats.new_from_rss += res.fresh || 0;
    }
  } catch (err) {
    stats.error = String(err).slice(0, 300);
  }
  await env.DB.prepare('INSERT INTO runs (at, subscribed, renewed, polled, new_from_rss, error) VALUES (?,?,?,?,?,?)')
    .bind(now, stats.subscribed, stats.renewed, stats.polled, stats.new_from_rss, stats.error).run();
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/health') return new Response('ok');
    const m = url.pathname.match(/^\/websub\/(UC[A-Za-z0-9_-]{22})$/);
    if (!m) return new Response('not found', { status: 404 });
    if (request.method === 'GET') return handleVerify(url, env, m[1]);
    if (request.method === 'POST') return handlePush(request, env, ctx, m[1]);
    return new Response('method not allowed', { status: 405 });
  },
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(cron(env));
  },
};
