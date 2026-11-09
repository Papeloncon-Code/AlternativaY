const PREFIX = 'media/';
const MAX_UPLOAD_BYTES = 90 * 1024 * 1024;
const DEFAULT_ORIGIN_TIMEOUT_MS = 1800;
const MAX_ORIGIN_TIMEOUT_MS = 5000;
const DEFAULT_WRITE_TIMEOUT_MS = 45000;
const MAX_WRITE_TIMEOUT_MS = 120000;
const DEFAULT_STREAM_IDLE_TIMEOUT_MS = 2000;
const MAX_STREAM_IDLE_TIMEOUT_MS = 3000;
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
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, Range, If-Range, If-None-Match, X-Media-Size, X-Media-Title, X-Media-Creator, X-Media-License, X-Media-License-Reference, X-Media-Visibility, X-Media-Size',
    'Access-Control-Expose-Headers': 'Accept-Ranges, Content-Range, Content-Length, Content-Type, ETag, Last-Modified, X-Media-Title, X-Media-Creator, X-Media-License, X-Media-Origin',
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
function etagMatches(value, etag) {
  if (!value || !etag) return false;
  const normalize = (tag) => { const trimmed = tag.trim(); return trimmed.startsWith('W/') ? trimmed.slice(2) : trimmed; };
  return value.split(',').some((tag) => tag.trim() === '*' || normalize(tag) === normalize(etag));
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

// Each binding is an independently configured storage origin. The replica is optional
// until its R2 bucket is provisioned and bound in wrangler.toml.
function mediaOrigins(env) {
  const seen = new Set();
  return [env.MEDIA_BUCKET, env.MEDIA_BUCKET_REPLICA]
    .filter((bucket) => {
      if (!bucket || seen.has(bucket)) return false;
      seen.add(bucket);
      return true;
    });
}
function originTimeout(env) {
  const configured = Number(env.MEDIA_ORIGIN_TIMEOUT_MS);
  if (!Number.isFinite(configured) || configured < 50) return DEFAULT_ORIGIN_TIMEOUT_MS;
  return Math.min(configured, MAX_ORIGIN_TIMEOUT_MS);
}
function writeTimeout(env) {
  const configured = Number(env.MEDIA_WRITE_TIMEOUT_MS);
  if (!Number.isFinite(configured) || configured < 1000) return DEFAULT_WRITE_TIMEOUT_MS;
  return Math.min(configured, MAX_WRITE_TIMEOUT_MS);
}
function streamIdleTimeout(env) {
  const configured = Number(env.MEDIA_STREAM_IDLE_TIMEOUT_MS);
  if (!Number.isFinite(configured) || configured < 50) return DEFAULT_STREAM_IDLE_TIMEOUT_MS;
  return Math.min(configured, MAX_STREAM_IDLE_TIMEOUT_MS);
}
function withTimeout(promise, timeoutMs) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(Object.assign(new Error('Origin timeout'), { code: 'TIMEOUT' })), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
function notFoundError() {
  return Object.assign(new Error('Media not found on this origin'), { code: 'NOT_FOUND' });
}

// Race independent origins. A slow primary does not block a healthy replica.
async function firstReadableOrigin(origins, env, resolver) {
  const errors = [];
  const attempts = origins.map(async (bucket, index) => {
    try {
      const value = await withTimeout(resolver(bucket), originTimeout(env));
      // "Not found" is a failed attempt, not a successful empty response:
      // keep waiting for other origins before returning a global 404.
      if (value == null) throw notFoundError();
      return { bucket, index, value };
    } catch (error) {
      errors[index] = error;
      throw error;
    }
  });
  try {
    return await Promise.any(attempts);
  } catch {
    const failures = errors.filter(Boolean);
    if (failures.length === origins.length && failures.every((error) => error.code === 'NOT_FOUND')) return null;
    throw new Error('MEDIA_ORIGINS_UNAVAILABLE');
  }
}

// A request stream can only be consumed once. Tee it into one stream per replica.
function splitBody(body, count) {
  if (!body) return [];
  const streams = [body];
  while (streams.length < count) {
    const stream = streams.shift();
    const [left, right] = stream.tee();
    streams.unshift(left, right);
  }
  return streams;
}
function originLabel(index) { return index === 0 ? 'primary' : 'replica-' + index; }

// Wrap the chosen body so a truncated/failed R2 stream can resume from the
// exact next byte on another copy. A copy must have the same size and version.
function failoverBody(initialBody, initialIndex, origins, env, key, head, range, isAuthorized) {
  const start = range ? range.start : 0;
  const end = range ? range.end : head.size - 1;
  const expectedSize = head.size;
  let offset = start;
  let reader = initialBody.getReader();
  const tried = new Set([initialIndex]);

  async function nextReader() {
    while (tried.size < origins.length) {
      const index = origins.findIndex((_, i) => !tried.has(i));
      if (index < 0) break;
      tried.add(index);
      try {
        const bucket = origins[index];
        const candidateHead = await withTimeout(bucket.head(key), originTimeout(env));
        const candidateIsPublic = candidateHead?.customMetadata?.visibility === 'public';
        if (!candidateHead || candidateHead.size !== expectedSize) continue;
        // A byte-identical copy must also preserve the same access and licence policy.
        // Never resume a private/public or licensed/owned metadata mismatch.
        const expectedMeta = head.customMetadata || {};
        const candidateMeta = candidateHead.customMetadata || {};
        if ((expectedMeta.visibility || null) !== (candidateMeta.visibility || null)) continue;
        if ((expectedMeta.license || null) !== (candidateMeta.license || null)) continue;
        if ((expectedMeta.licenseReference || null) !== (candidateMeta.licenseReference || null)) continue;
        if (!candidateIsPublic && !isAuthorized) continue;
        const expectedVersion = head.customMetadata?.mediaVersion;
        const candidateVersion = candidateHead.customMetadata?.mediaVersion;
        if (expectedVersion && candidateVersion !== expectedVersion) continue;
        if (!expectedVersion && (!head.httpEtag || !candidateHead.httpEtag || candidateHead.httpEtag !== head.httpEtag)) continue;
        const remaining = end - offset + 1;
        if (remaining <= 0) return null;
        const nextObject = await withTimeout(
          bucket.get(key, { range: { offset, length: remaining } }),
          originTimeout(env),
        );
        if (!nextObject?.body) continue;
        return nextObject.body.getReader();
      } catch {
        // Try the next configured replica. Never restart at byte zero.
      }
    }
    throw new Error('MEDIA_STREAM_ORIGINS_EXHAUSTED');
  }

  return new ReadableStream({
    async pull(controller) {
      try {
        while (true) {
          if (offset > end) {
            controller.close();
            return;
          }
          let result;
          try {
            result = await withTimeout(reader.read(), streamIdleTimeout(env));
          } catch {
            // Some origins stall without closing or erroring the body. Treat an idle
            // read as a recoverable failure and move to the next verified copy.
            void reader.cancel().catch(() => {});
            reader = await nextReader();
            if (!reader) {
              controller.close();
              return;
            }
            continue;
          }
          if (result.done) {
            reader = await nextReader();
            if (!reader) {
              controller.close();
              return;
            }
            continue;
          }
          const chunk = result.value instanceof Uint8Array ? result.value : new Uint8Array(result.value);
          const remaining = end - offset + 1;
          const length = Math.min(chunk.byteLength, remaining);
          if (length <= 0) continue;
          offset += length;
          controller.enqueue(length === chunk.byteLength ? chunk : chunk.subarray(0, length));
          if (offset > end) controller.close();
          return;
        }
      } catch (error) {
        controller.error(error);
      }
    },
    async cancel(reason) {
      try { await reader.cancel(reason); } catch { /* stream already errored */ }
    },
  });
}

async function readMedia(req, env, id) {
  const origins = mediaOrigins(env);
  if (!origins.length) return json(req, env, { error: 'No hay orígenes multimedia configurados' }, 503);
  const key = PREFIX + id;
  const isAuthorized = authorized(req, env);
  let source;
  try {
    source = await firstReadableOrigin(origins, env, async (bucket) => {
      const head = await bucket.head(key);
      const isPublic = head?.customMetadata?.visibility === 'public';
      if (!head || (!isPublic && !isAuthorized)) return null;
      const ifNoneMatch = req.headers.get('If-None-Match');
      if (etagMatches(ifNoneMatch, head.httpEtag)) return { head, range: null, obj: null, notModified: true };
      const range = parseRange(req.headers.get('Range'), head.size);
      if (range?.invalid || req.method === 'HEAD') return { head, range, obj: null };
      const obj = await bucket.get(key, range ? { range: { offset: range.start, length: range.length } } : {});
      return obj ? { head, range, obj } : null;
    });
  } catch {
    return json(req, env, { error: 'Los orígenes multimedia no están disponibles' }, 503);
  }
  if (!source) return json(req, env, { error: 'Medio no encontrado' }, 404);

  const { head, range, obj, notModified } = source.value;
  const cacheControl = head.customMetadata?.visibility === 'public'
    ? 'public, max-age=300, stale-while-revalidate=60'
    : 'private, no-store';
  const headers = cors(req, env);
  objectMetadata(head, headers);
  headers.set('Cache-Control', cacheControl);
  headers.set('X-Media-Origin', originLabel(source.index));

  if (notModified) return new Response(null, { status: 304, headers });
  if (range?.invalid) {
    headers.set('Content-Range', 'bytes */' + head.size);
    return new Response(null, { status: 416, headers });
  }
  if (req.method === 'HEAD') {
    headers.set('Content-Length', String(range ? range.length : head.size));
    if (range) headers.set('Content-Range', 'bytes ' + range.start + '-' + range.end + '/' + head.size);
    return new Response(null, { status: range ? 206 : 200, headers });
  }
  objectMetadata(obj, headers);
  headers.set('Cache-Control', cacheControl);
  headers.set('X-Media-Origin', originLabel(source.index));
  headers.set('Content-Length', String(range ? range.length : head.size));
  if (range) headers.set('Content-Range', 'bytes ' + range.start + '-' + range.end + '/' + head.size);
  return new Response(failoverBody(obj.body, source.index, origins, env, key, head, range, isAuthorized), { status: range ? 206 : 200, headers });
}

async function catalog(req, env) {
  const origins = mediaOrigins(env);
  if (!origins.length) return json(req, env, { error: 'No hay orígenes multimedia configurados' }, 503);
  const results = await Promise.allSettled(origins.map((bucket) =>
    withTimeout(bucket.list({ prefix: PREFIX, limit: 1000, include: ['customMetadata', 'httpMetadata'] }), originTimeout(env))
  ));
  const healthy = results.filter((result) => result.status === 'fulfilled');
  if (!healthy.length) return json(req, env, { error: 'Los orígenes multimedia no están disponibles' }, 503);
  const unique = new Map();
  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    for (const x of (result.value.objects || [])) {
      if (x.customMetadata?.visibility !== 'public') continue;
      const id = x.key.slice(PREFIX.length);
      if (!unique.has(id)) unique.set(id, {
        id,
        title: x.customMetadata?.title || id,
        creator: x.customMetadata?.creator || 'Creador independiente',
        license: x.customMetadata?.license,
        contentType: x.httpMetadata?.contentType || 'application/octet-stream',
        size: x.size,
        updatedAt: x.uploaded?.toISOString?.() || null,
      });
    }
  }
  return json(req, env, {
    items: [...unique.values()],
    origins: { configured: origins.length, available: healthy.length, degraded: healthy.length < origins.length },
  });
}

async function upload(req, env, id) {
  if (!authorized(req, env)) return json(req, env, { error: 'No autorizado' }, 401);
  if (!env.MEDIA_UPLOAD_TOKEN) return json(req, env, { error: 'Falta configurar MEDIA_UPLOAD_TOKEN en el Worker' }, 503);
  const origins = mediaOrigins(env);
  if (!origins.length) return json(req, env, { error: 'No hay orígenes multimedia configurados' }, 503);
  const type = (req.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
  const license = req.headers.get('X-Media-License');
  const visibility = req.headers.get('X-Media-Visibility') === 'public' ? 'public' : 'private';
  const title = (req.headers.get('X-Media-Title') || '').trim().slice(0, 180);
  const creator = (req.headers.get('X-Media-Creator') || '').trim().slice(0, 120);
  const licenseReference = (req.headers.get('X-Media-License-Reference') || '').trim().slice(0, 300);
  const declaredSize = req.headers.get('Content-Length') || req.headers.get('X-Media-Size');
  const length = Number(declaredSize);
  if (!ALLOWED_TYPES.has(type)) return json(req, env, { error: 'Content-Type multimedia no permitido' }, 415);
  if (!Number.isSafeInteger(length) || length <= 0 || length > MAX_UPLOAD_BYTES) return json(req, env, { error: 'Tamaño del archivo obligatorio; máximo 90 MiB' }, 413);
  if (!title || !creator) return json(req, env, { error: 'X-Media-Title y X-Media-Creator son obligatorios' }, 400);
  if (license !== 'owned' && license !== 'licensed') return json(req, env, { error: 'X-Media-License debe ser owned o licensed' }, 400);
  if (license === 'licensed' && !licenseReference) return json(req, env, { error: 'El contenido licenciado requiere X-Media-License-Reference' }, 400);
  if (!req.body) return json(req, env, { error: 'Falta el cuerpo del archivo' }, 400);

  const key = PREFIX + id;
  const heads = await Promise.allSettled(origins.map((bucket) => withTimeout(bucket.head(key), originTimeout(env))));
  if (heads.some((result) => result.status === 'rejected')) {
    return json(req, env, { error: 'No se pudo comprobar la disponibilidad de todos los orígenes; no se modificó el archivo' }, 503);
  }
  if (heads.some((result) => result.value)) return json(req, env, { error: 'Ya existe un medio con ese ID' }, 409);

  // R2 requires a stream with a known length. Tee the incoming request, then
  // wrap each branch in its own FixedLengthStream so each replica receives
  // exactly the declared byte count without buffering the whole video in memory.
  const transfers = splitBody(req.body, origins.length).map((branch) => {
    const fixed = new FixedLengthStream(length);
    const controller = new AbortController();
    const pump = branch.pipeTo(fixed.writable, { signal: controller.signal });
    pump.catch(() => {});
    return { body: fixed.readable, pump, controller };
  });
  const mediaVersion = crypto.randomUUID();
  const options = {
    httpMetadata: { contentType: type, cacheControl: visibility === 'public' ? 'public, max-age=300' : 'private, no-store' },
    customMetadata: { title, creator, license, licenseReference, visibility, mediaVersion },
  };
  const writes = await Promise.allSettled(origins.map((bucket, index) =>
    withTimeout(bucket.put(key, transfers[index].body, options), writeTimeout(env))
  ));
  const written = writes.filter((result) => result.status === 'fulfilled').length;
  if (written !== origins.length) {
    // A public media ID must never be left visible from only one origin.
    // FixedLengthStream makes R2 enforce the exact byte count; abort unused
    // upload branches and rollback any partial write if an origin rejects it.
    transfers.forEach((transfer) => transfer.controller.abort());
    const cleanup = await Promise.allSettled(origins.map((bucket) => withTimeout(bucket.delete(key), originTimeout(env))));
    const cleanupComplete = cleanup.every((result) => result.status === 'fulfilled');
    return json(req, env, {
      error: 'No se pudo completar la carga en todos los orígenes. Comprueba el tamaño del archivo y la conexión; se revirtió cualquier escritura parcial.',
      written,
      configured: origins.length,
      cleanupComplete,
    }, 503);
  }
  return json(req, env, {
    ok: true, id, visibility,
    replicas: { written, configured: origins.length, degraded: false },
  }, 201);
}

export default {
  async fetch(req, env) {
    if (!originAllowed(req, env)) return new Response('Origin not allowed', { status: 403 });
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req, env) });
    const url = new URL(req.url);
    if (url.pathname === '/health' && req.method === 'GET') {
      const origins = mediaOrigins(env);
      const checks = await Promise.allSettled(origins.map((bucket) =>
        withTimeout(bucket.list({ prefix: PREFIX, limit: 1 }), originTimeout(env))
      ));
      const available = checks.filter((check) => check.status === 'fulfilled').length;
      const ok = origins.length > 0 && available > 0;
      return json(req, env, {
        ok,
        service: 'todotube-media-gateway',
        originsConfigured: origins.length,
        originsAvailable: available,
        degraded: available < origins.length,
      }, ok ? 200 : 503);
    }
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
        const origins = mediaOrigins(env);
        if (!origins.length) return json(req, env, { error: 'No hay orígenes multimedia configurados' }, 503);
        const heads = await Promise.allSettled(origins.map((bucket) => withTimeout(bucket.head(PREFIX + id), originTimeout(env))));
        if (heads.some((result) => result.status === 'rejected')) {
          return json(req, env, { error: 'No se pudo comprobar todos los orígenes; no se borró el archivo' }, 503);
        }
        if (!heads.some((result) => result.value)) return json(req, env, { error: 'Medio no encontrado' }, 404);
        const deletions = await Promise.allSettled(origins.map((bucket) => withTimeout(bucket.delete(PREFIX + id), originTimeout(env))));
        const deleted = deletions.filter((result) => result.status === 'fulfilled').length;
        if (deleted !== origins.length) {
          return json(req, env, { error: 'Borrado parcial: revisar orígenes antes de volver a publicar el medio', deleted, configured: origins.length }, 503);
        }
        return json(req, env, { ok: true, id, deletedOrigins: deleted });
      }
    }
    return json(req, env, { error: 'Ruta no encontrada' }, 404);
  },
};
