// Servicio de avisos de TodoTube: WebSub de YouTube → D1 → Web Push. Ver specs/003-spike-websub/spec.md
// Constitución §I.2: solo WebSub, RSS público y (enmienda 2026-11-07) la vista previa pública del canal una vez al día.
// Privacidad: aquí no se guarda nada de las personas salvo la dirección de avisos de quien los activa.
import { parseAtom, hmacSha1Hex, safeEqual, isFresh } from './atom.js';
import { buildPushPayload } from '@block65/webcrypto-web-push';

const TOPIC = (id) => `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${id}`;
const RSS = (id) => `https://www.youtube.com/feeds/videos.xml?channel_id=${id}`;
const CHANNEL_RE = /^UC[A-Za-z0-9_-]{22}$/;

function randomHex(n = 16) {
  return [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, '0')).join('');
}


// Shorts vs vídeo (ADR-006, enmienda 2). Señal principal: la URL pública youtube.com/shorts/<id> responde 200 si es un Short
// y redirige (3xx) a /watch si no lo es. Solo se lee el código de estado (HEAD, sin descargar contenido).
// Respaldo: miniatura vertical oardefault.jpg (falla con algunos canales, p. ej. CNN/NBC; por eso ya no es la principal).
async function classify(videoId) {
  try {
    const r = await fetch(`https://www.youtube.com/shorts/${videoId}`, { method: 'HEAD', redirect: 'manual' });
    if (r.status === 200) return 'short';
    if (r.status >= 300 && r.status < 400) return 'video';
  } catch { /* red */ }
  try {
    const r = await fetch(`https://i.ytimg.com/vi/${videoId}/oardefault.jpg`, { method: 'HEAD' });
    if (r.status === 200) return 'short';
  } catch { /* red */ }
  return null; // sin clasificar: se reintenta en el siguiente cron
}

// Registra una entrada; devuelve true si es un vídeo nuevo (primera vez visto y reciente).
async function recordEntry(env, e, source, now) {
  await env.DB.prepare(
    'INSERT INTO events (source, video_id, channel_id, title, published_at, updated_at, received_at, is_new) VALUES (?,?,?,?,?,?,?,0)'
  ).bind(source, e.videoId, e.channelId, e.title, e.published, e.updated, now).run();
  const seen = await env.DB.prepare('SELECT 1 FROM videos WHERE video_id = ?').bind(e.videoId).first();
  if (seen || !isFresh(e.published, now)) return false;
  const kind = e.isShort != null ? (e.isShort ? 'short' : 'video') : await classify(e.videoId);
  await env.DB.batch([
    env.DB.prepare('INSERT OR IGNORE INTO videos (video_id, channel_id, title, published_at, first_source, first_seen_at, kind, views, likes, description, stats_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
      .bind(e.videoId, e.channelId, e.title, e.published, source, now, kind, e.views ?? null, e.likes ?? null, e.description ?? null, e.views != null ? now : null),
    env.DB.prepare('UPDATE events SET is_new = 1 WHERE id = (SELECT MAX(id) FROM events WHERE video_id = ? AND source = ?)')
      .bind(e.videoId, source),
  ]);
  return { kind };
}

// Avisos push del navegador (Web Push, RFC 8291/8292) según la campanita del canal: all | noshorts | none.
async function pushNew(env, e, kind) {
  if (!env.VAPID_PRIVATE_KEY || !env.VAPID_PUBLIC_KEY) return;
  const ch = await env.DB.prepare('SELECT label, notify FROM channels WHERE channel_id = ?').bind(e.channelId).first();
  const pref = ch?.notify || 'all';
  if (pref === 'none' || (pref === 'noshorts' && kind === 'short')) return;
  const { results: subs } = await env.DB.prepare('SELECT endpoint, p256dh, auth FROM push_subs').all();
  const vapid = { subject: env.PUBLIC_WEB_URL || 'https://todotube.papelon.workers.dev', publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY };
  const data = JSON.stringify({
    title: ch?.label || 'Nuevo vídeo',
    body: (kind === 'short' ? 'Short · ' : '') + (e.title || 'Nuevo vídeo'),
    url: `/ver/${e.videoId}${kind === 'short' ? '?short=1' : ''}`,
    image: `https://i.ytimg.com/vi/${e.videoId}/hqdefault.jpg`,
    tag: e.videoId,
  });
  for (const sub of subs) {
    try {
      const payload = await buildPushPayload({ data, options: { ttl: 3600, urgency: 'high' } },
        { endpoint: sub.endpoint, expirationTime: null, keys: { p256dh: sub.p256dh, auth: sub.auth } }, vapid);
      const r = await fetch(sub.endpoint, payload);
      if (r.status === 404 || r.status === 410) await env.DB.prepare('DELETE FROM push_subs WHERE endpoint=?').bind(sub.endpoint).run();
      else if (r.ok) await env.DB.prepare('UPDATE push_subs SET last_ok_at=?, failures=0 WHERE endpoint=?').bind(Date.now(), sub.endpoint).run();
      else await env.DB.prepare('UPDATE push_subs SET failures=failures+1 WHERE endpoint=?').bind(sub.endpoint).run();
    } catch { /* un suscriptor roto no frena a los demás */ }
  }
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
    const rec = await recordEntry(env, e, 'websub', now);
    if (rec) {
      ctx.waitUntil(pushNew(env, e, rec.kind));
    }
  }
  return new Response('ok', { status: 200 });
}

async function unsubscribe(env, channelId, secret) {
  const form = new URLSearchParams({
    'hub.callback': `${env.PUBLIC_URL}/websub/${channelId}`, 'hub.topic': TOPIC(channelId),
    'hub.verify': 'async', 'hub.mode': 'unsubscribe', ...(secret ? { 'hub.secret': secret } : {}),
  });
  const r = await fetch(env.HUB_URL, { method: 'POST', body: form });
  return r.status;
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
  const xml = await r.text();
  // Nombre del canal: primer <title> del feed (antes de la primera <entry>). Solo rellena si falta.
  const head = xml.split('<entry>')[0];
  const name = head.match(/<title>([^<]+)<\/title>/)?.[1];
  if (name) await env.DB.prepare('UPDATE channels SET label = ? WHERE channel_id = ? AND label IS NULL').bind(name.trim().slice(0, 80), channelId).run();
  const { entries } = parseAtom(xml);
  let fresh = 0;
  let rec;
  for (const e of entries) {
    e.channelId ||= channelId;
    if (baseline) {
      await env.DB.prepare('INSERT OR IGNORE INTO videos (video_id, channel_id, title, published_at, first_source, first_seen_at, kind) VALUES (?,?,?,?,?,?,?)')
        .bind(e.videoId, e.channelId, e.title, e.published, 'baseline', now, e.isShort == null ? null : e.isShort ? 'short' : 'video').run();
    } else if ((rec = await recordEntry(env, e, 'rss', now))) {
      fresh++;
      await pushNew(env, e, rec.kind);
    }
  }
  // Datos públicos del feed (visitas, me gusta, descripción): se refrescan en cada lectura (ADR-006, enmienda 3).
  const upd = entries.filter((e) => e.views != null || e.description != null).map((e) =>
    env.DB.prepare('UPDATE videos SET views=COALESCE(?, views), likes=COALESCE(?, likes), description=COALESCE(?, description), stats_at=?, kind=COALESCE(kind, ?) WHERE video_id=?')
      .bind(e.views ?? null, e.likes ?? null, e.description ?? null, now, e.isShort == null ? null : e.isShort ? 'short' : 'video', e.videoId));
  if (upd.length) await env.DB.batch(upd);
  return { fresh };
}

// Foto y nombre del canal desde sus metadatos públicos de vista previa (og:image, og:title), como hacen las apps de
// mensajería al compartir un enlace. Constitución §I.2, enmienda 2026-11-07: una vez al día por canal y nada más.
// La página pesa ~2,6 MB y og:image está hacia el byte 835 000: se lee por partes y se corta en cuanto aparece.
// Fotos de canal cada 10 minutos (desfasado del cron principal), hasta 5 por vez; cada canal como mucho una vez al día.
export const PREVIEW_CRON = '3-59/10 * * * *';
const AVATAR_HOST = /^yt[34]\.(ggpht|googleusercontent)\.com$/;
const after = (buf, key) => {
  const i = buf.indexOf(key); if (i < 0) return null;
  const j = buf.indexOf('"', i + key.length); return j < 0 ? null : buf.slice(i + key.length, j);
};
export async function readChannelPreview(fetchFn, channelId) {
  const r = await fetchFn(`https://www.youtube.com/channel/${channelId}`, { headers: { 'accept-language': 'es' }, redirect: 'follow' });
  if (!r.ok || !r.body) return { status: r.status };
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = ''; let read = 0; let image = null; let title = null;
  try {
    while (read < 1_500_000 && !(image && title)) {
      const { value, done } = await reader.read();
      if (done) break;
      read += value.byteLength;
      buf = buf.slice(-600) + dec.decode(value, { stream: true }); // ventana deslizante: las etiquetas pueden partirse entre trozos
      // Búsqueda de texto nativa (más barata que una expresión regular en cada trozo).
      image ??= after(buf, '<meta property="og:image" content="');
      title ??= after(buf, '<meta property="og:title" content="');
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  let avatar = null;
  try {
    const u = new URL(image || '');
    if (u.protocol === 'https:' && AVATAR_HOST.test(u.hostname)) avatar = u.href.replace(/=s\d+(-|$)/, '=s176$1');
  } catch { /* sin foto */ }
  const name = title ? title.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim().slice(0, 80) : null;
  return { status: r.status, avatar, name, read };
}

async function refreshChannelPreview(env, now) {
  // Hasta 5 canales por ejecución (relleno inicial en ~30 min); cada canal, como mucho una vez al día.
  const { results } = await env.DB.prepare(
    "SELECT channel_id FROM channels WHERE status IN ('requested','verified','pending') AND (avatar_at IS NULL OR avatar_at < ?) ORDER BY COALESCE(avatar_at, 0) ASC LIMIT 5"
  ).bind(now - 24 * 3600 * 1000).all();
  for (const ch of results) {
    let res = {};
    try { res = await readChannelPreview(fetch, ch.channel_id); } catch { /* red */ }
    // Se anota la fecha aunque falle: como mucho un intento al día por canal (si YouTube lo bloquea, quedan iniciales).
    await env.DB.prepare('UPDATE channels SET avatar = COALESCE(?, avatar), avatar_at = ?, label = COALESCE(label, ?) WHERE channel_id = ?')
      .bind(res.avatar ?? null, now, res.name ?? null, ch.channel_id).run();
  }
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
      // El RSS de YouTube devuelve 404/500 intermitentes desde servidores (problema conocido desde dic-2025),
      // así que NO se usa para validar canales ni bloquea la suscripción WebSub. Solo se anota el error.
      if (base.invalid || base.error) {
        await env.DB.prepare('UPDATE channels SET rss_failures = rss_failures + 1, last_error=? WHERE channel_id=?')
          .bind(base.invalid ? 'RSS 404 (intermitente)' : base.error, channel_id).run();
      } else {
        await env.DB.prepare('UPDATE channels SET rss_failures = 0 WHERE channel_id=?').bind(channel_id).run();
      }
      const secret = oldSecret || randomHex();
      const st = await subscribe(env, channel_id, secret);
      await env.DB.prepare("UPDATE channels SET secret=?, status=?, requested_at=?, last_polled_at=?, last_error=? WHERE channel_id=?")
        .bind(secret, st === 202 ? 'requested' : 'pending', now, now, st === 202 ? null : `hub ${st}`, channel_id).run();
      if (st === 202) stats.subscribed++;
    }
    // 1b. Bajas pedidas desde la web (status 'removing'): darse de baja en el hub y borrar.
    const removing = await env.DB.prepare("SELECT channel_id, secret FROM channels WHERE status='removing' LIMIT 5").all();
    for (const { channel_id, secret } of removing.results) {
      await unsubscribe(env, channel_id, secret).catch(() => 0);
      await env.DB.batch([
        env.DB.prepare('DELETE FROM videos WHERE channel_id=?').bind(channel_id),
        env.DB.prepare('DELETE FROM channels WHERE channel_id=?').bind(channel_id),
      ]);
    }
    // 1c. Clasificar Short/vídeo los que aún no lo están (relleno gradual).
    const unk = await env.DB.prepare('SELECT video_id FROM videos WHERE kind IS NULL ORDER BY published_at DESC LIMIT 60').all();
    for (const { video_id } of unk.results) {
      const k = await classify(video_id);
      if (k) await env.DB.prepare('UPDATE videos SET kind=? WHERE video_id=?').bind(k, video_id).run();
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
    // 2c. Privacidad y orden: los registros técnicos (vídeos públicos recibidos, ejecuciones) se borran a los 7 días.
    await env.DB.batch([
      env.DB.prepare('DELETE FROM events WHERE received_at < ?').bind(now - 7 * 86_400_000),
      env.DB.prepare('DELETE FROM runs WHERE at < ?').bind(now - 7 * 86_400_000),
    ]);
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
  async scheduled(event, env, ctx) {
    // Tarea aparte para la foto del canal: si algún día excede el tiempo de CPU, los avisos no se ven afectados.
    if (event.cron === PREVIEW_CRON) ctx.waitUntil(refreshChannelPreview(env, Date.now()));
    else ctx.waitUntil(cron(env));
  },
};
