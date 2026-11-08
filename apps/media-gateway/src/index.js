const PREFIX = 'media/';
const MAX_UPLOAD_BYTES = 90 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'video/mp4', 'video/webm', 'video/ogg',
  'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/webm',
]);
function allowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS || '').split(',').map((x) => x.trim()).filter(Boolean);
}
function cors(req, env) {
  const h = new Headers({
    'Access-Control-Allow-Methods': 'GET, HEAD, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, Range, If-Range, If-None-Match, X-Media-Title, X-Media-Creator, X-Media-License, X-Media-License-Reference, X-Media-Visibility',
    'Access-Control-Expose-Headers': 'Accept-Ranges, Content-Range, Content-Length, Content-Type, ETag, Last-Modified, X-Media-Title, X-Media-Creator, X-Media-License',
    'Vary': 'Origin',
  });
  const origin = req.headers.get('Origin');
  if (origin && allowedOrigins(env).includes(origin)) h.set('Access-Control-Allow-Origin', origin);
  return h;
}
function json(req, env, data, status = 200) {
  const headers = cors(req, env);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('Cache-Control', 'no-store');
  return new Response(JSON.stringify(data), { status, headers });
}
function originAllowed(req, env) {
  const origin = req.headers.get('Origin');
  return !origin || allowedOrigins(env).includes(origin);
}
function authorized(req, env) {
  const expected = env.MEDIA_UPLOAD_TOKEN;
  const actual = req.headers.get('Authorization') || '';
  return typeof expected === 'string' && expected.length > 20 && actual.startsWith('Bearer ') && actual.slice(7) === expected;
}
function validId(id) { return /^[A-Za-z0-9_-]{1,80}$/.test(id); }
function decodeValidId(value) {
  try {
    const id = decodeURIComponent(value);
    return validId(id) ? id : null;
  } catch {
    return null;
  }
}
function parseRange(value, size) {
  if (!value) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(value.trim());
  if (!m || (!m[1] && !m[2])) return { invalid: true };
  let start; let end;
  if (!m[1]) {
    const suffix = Number(m[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0 || size <= 0) return { invalid: true };
    start = Math.max(0, size - suffix); end = size - 1;
  } else {
    start = Number(m[1]); end = m[2] ? Number(m[2]) : size - 1;
  }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || start >= size) return { invalid: true };
  end = Math.min(end, size - 1);
  return { start, end, length: end - start + 1 };
}
function objectMetadata(obj, headers) {
  obj.writeHttpMetadata?.(headers);
  headers.set('Accept-Ranges', 'bytes');
  if (obj.httpEtag) headers.set('ETag', obj.httpEtag);
  if (obj.uploaded) headers.set('Last-Modified', obj.uploaded.toUTCString());
  if (obj.customMetadata?.title) headers.set('X-Media-Title', obj.customMetadata.title);
  if (obj.customMetadata?.creator) headers.set('X-Media-Creator', obj.customMetadata.creator);
  if (obj.customMetadata?.license) headers.set('X-Media-License', obj.customMetadata.license);
}
async function readMedia(req, env, id) {
  const key = PREFIX + id;
  const head = await env.MEDIA_BUCKET.head(key);
  const isPublic = head?.customMetadata?.visibility === 'public';
  if (!head || (!isPublic && !authorized(req, env))) return json(req, env, { error: 'Medio no encontrado' }, 404);

  // Never allow an authenticated private object to inherit a public cache policy from R2 metadata.
  const cacheControl = isPublic ? 'public, max-age=300, stale-while-revalidate=60' : 'private, no-store';
  const headers = cors(req, env);
  objectMetadata(head, headers);
  headers.set('Cache-Control', cacheControl);
  if (req.headers.get('If-None-Match') && req.headers.get('If-None-Match') === head.httpEtag) return new Response(null, { status: 304, headers });
  const range = parseRange(req.headers.get('Range'), head.size);
  if (range?.invalid) {
    headers.set('Content-Range', 'bytes */' + head.size);
    return new Response(null, { status: 416, headers });
  }
  if (req.method === 'HEAD') {
    headers.set('Content-Length', String(range ? range.length : head.size));
    if (range) headers.set('Content-Range', 'bytes ' + range.start + '-' + range.end + '/' + head.size);
    return new Response(null, { status: range ? 206 : 200, headers });
  }
  const obj = await env.MEDIA_BUCKET.get(key, range ? { range: { offset: range.start, length: range.length } } : {});
  if (!obj) return json(req, env, { error: 'Medio no encontrado' }, 404);
  objectMetadata(obj, headers);
  headers.set('Cache-Control', cacheControl);
  headers.set('Content-Length', String(range ? range.length : head.size));
  if (range) headers.set('Content-Range', 'bytes ' + range.start + '-' + range.end + '/' + head.size);
  return new Response(obj.body, { status: range ? 206 : 200, headers });
}
async function catalog(req, env) {
  const result = await env.MEDIA_BUCKET.list({ prefix: PREFIX, limit: 1000, include: ['customMetadata', 'httpMetadata'] });
  const items = (result.objects || []).filter((x) => x.customMetadata?.visibility === 'public').map((x) => ({
    id: x.key.slice(PREFIX.length),
    title: x.customMetadata?.title || x.key.slice(PREFIX.length),
    creator: x.customMetadata?.creator || 'Creador independiente',
    license: x.customMetadata?.license,
    contentType: x.httpMetadata?.contentType || 'application/octet-stream',
    size: x.size,
    updatedAt: x.uploaded?.toISOString?.() || null,
  }));
  return json(req, env, { items });
}
async function upload(req, env, id) {
  if (!authorized(req, env)) return json(req, env, { error: 'No autorizado' }, 401);
  if (!env.MEDIA_UPLOAD_TOKEN) return json(req, env, { error: 'Falta configurar MEDIA_UPLOAD_TOKEN en el Worker' }, 503);
  const type = (req.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
  const license = req.headers.get('X-Media-License');
  const visibility = req.headers.get('X-Media-Visibility') === 'public' ? 'public' : 'private';
  const title = (req.headers.get('X-Media-Title') || '').trim().slice(0, 180);
  const creator = (req.headers.get('X-Media-Creator') || '').trim().slice(0, 120);
  const licenseReference = (req.headers.get('X-Media-License-Reference') || '').trim().slice(0, 300);
  const length = Number(req.headers.get('Content-Length'));
  if (!ALLOWED_TYPES.has(type)) return json(req, env, { error: 'Content-Type multimedia no permitido' }, 415);
  if (!Number.isSafeInteger(length) || length <= 0 || length > MAX_UPLOAD_BYTES) return json(req, env, { error: 'Content-Length obligatorio; máximo 90 MiB' }, 413);
  if (!title || !creator) return json(req, env, { error: 'X-Media-Title y X-Media-Creator son obligatorios' }, 400);
  if (license !== 'owned' && license !== 'licensed') return json(req, env, { error: 'X-Media-License debe ser owned o licensed' }, 400);
  if (license === 'licensed' && !licenseReference) return json(req, env, { error: 'El contenido licenciado requiere X-Media-License-Reference' }, 400);
  const key = PREFIX + id;
  if (await env.MEDIA_BUCKET.head(key)) return json(req, env, { error: 'Ya existe un medio con ese ID' }, 409);
  await env.MEDIA_BUCKET.put(key, req.body, {
    httpMetadata: { contentType: type, cacheControl: visibility === 'public' ? 'public, max-age=300' : 'private, no-store' },
    customMetadata: { title, creator, license, licenseReference, visibility },
  });
  return json(req, env, { ok: true, id, visibility }, 201);
}
export default {
  async fetch(req, env) {
    if (!originAllowed(req, env)) return new Response('Origin not allowed', { status: 403 });
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req, env) });
    const url = new URL(req.url);
    if (url.pathname === '/health' && req.method === 'GET') return json(req, env, { ok: true, service: 'todotube-media-gateway' });
    if (url.pathname === '/v1/catalog' && req.method === 'GET') return catalog(req, env);
    const media = /^\/v1\/media\/([^/]+)$/.exec(url.pathname);
    if (media && ['GET', 'HEAD'].includes(req.method)) {
      const id = decodeValidId(media[1]);
      if (!id) return json(req, env, { error: 'ID inválido' }, 400);
      return readMedia(req, env, id);
    }
    const admin = /^\/v1\/admin\/media\/([^/]+)$/.exec(url.pathname);
    if (admin) {
      const id = decodeValidId(admin[1]);
      if (!id) return json(req, env, { error: 'ID inválido' }, 400);
      if (req.method === 'PUT') return upload(req, env, id);
      if (req.method === 'DELETE') {
        if (!authorized(req, env)) return json(req, env, { error: 'No autorizado' }, 401);
        const key = PREFIX + id;
        if (!(await env.MEDIA_BUCKET.head(key))) return json(req, env, { error: 'Medio no encontrado' }, 404);
        await env.MEDIA_BUCKET.delete(key);
        return json(req, env, { ok: true, id });
      }
    }
    return json(req, env, { error: 'Ruta no encontrada' }, 404);
  },
};
