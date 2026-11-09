const PREFIX = 'media/';
const MAX_BYTES = 20 * 1024 * 1024;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
function isAuthorized(request, env) {
  const header = request.headers.get('Authorization') || '';
  return !!env.MEDIA_TEST_TOKEN && header === 'Bearer ' + env.MEDIA_TEST_TOKEN;
}
function validId(value) {
  return /^tt[A-Za-z0-9]{9}$/.test(value);
}
async function checksum(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (x) => x.toString(16).padStart(2, '0')).join('');
}
async function put(bucket, key, bytes, mediaVersion) {
  await bucket.put(key, bytes, {
    httpMetadata: {
      contentType: 'video/webm',
      cacheControl: 'public, max-age=60',
    },
    customMetadata: {
      title: 'TodoTube Live Gateway Test',
      creator: 'TodoTube QA',
      license: 'owned',
      visibility: 'public',
      mediaVersion,
    },
  });
}
export default {
  async fetch(request, env) {
    if (!isAuthorized(request, env)) return json({ error: 'Unauthorized' }, 401);
    const url = new URL(request.url);
    const match = /^\/(setup|restore-replica|drop-replica|drop-primary|cleanup)\/([^/]+)$/.exec(url.pathname);
    if (!match) return json({ error: 'Not found' }, 404);
    const [, action, id] = match;
    if (!validId(id)) return json({ error: 'Invalid test media ID' }, 400);
    const key = PREFIX + id;

    if (action === 'setup' || action === 'restore-replica') {
      if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
      const contentType = (request.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
      if (contentType !== 'video/webm') return json({ error: 'Expected video/webm' }, 415);
      const bytes = await request.arrayBuffer();
      if (bytes.byteLength < 1024 || bytes.byteLength > MAX_BYTES) return json({ error: 'Test video size is outside the allowed range' }, 413);
      const digest = await checksum(bytes);
      const mediaVersion = 'e2e-' + digest;
      if (action === 'setup') {
        const heads = await Promise.all([env.MEDIA_BUCKET.head(key), env.MEDIA_BUCKET_REPLICA.head(key)]);
        if (heads.some(Boolean)) return json({ error: 'Test ID already exists; refusing to overwrite' }, 409);
        const writes = await Promise.allSettled([
          put(env.MEDIA_BUCKET, key, bytes.slice(0), mediaVersion),
          put(env.MEDIA_BUCKET_REPLICA, key, bytes.slice(0), mediaVersion),
        ]);
        if (writes.some((result) => result.status === 'rejected')) {
          await Promise.allSettled([
            env.MEDIA_BUCKET.delete(key),
            env.MEDIA_BUCKET_REPLICA.delete(key),
          ]);
          return json({ error: 'A test copy failed to write; partial fixture was rolled back' }, 503);
        }
      } else {
        const primary = await env.MEDIA_BUCKET.head(key);
        if (!primary || primary.size !== bytes.byteLength || primary.customMetadata?.mediaVersion !== mediaVersion) {
          return json({ error: 'Primary copy does not match the uploaded test fixture' }, 409);
        }
        await put(env.MEDIA_BUCKET_REPLICA, key, bytes, mediaVersion);
      }
      const [primary, replica] = await Promise.all([
        env.MEDIA_BUCKET.head(key),
        env.MEDIA_BUCKET_REPLICA.head(key),
      ]);
      if (!primary || !replica || primary.size !== bytes.byteLength || replica.size !== bytes.byteLength ||
          primary.customMetadata?.mediaVersion !== mediaVersion || replica.customMetadata?.mediaVersion !== mediaVersion) {
        return json({ error: 'R2 replication verification failed', primary: !!primary, replica: !!replica }, 503);
      }
      return json({ ok: true, id, size: bytes.byteLength, sha256: digest, replicas: 2 });
    }

    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    if (action === 'drop-replica') {
      const primary = await env.MEDIA_BUCKET.head(key);
      const replica = await env.MEDIA_BUCKET_REPLICA.head(key);
      if (!primary || !replica) return json({ error: 'Both copies must exist before isolating primary' }, 409);
      await env.MEDIA_BUCKET_REPLICA.delete(key);
      return json({ ok: true, id, isolated: 'primary' });
    }
    if (action === 'drop-primary') {
      const primary = await env.MEDIA_BUCKET.head(key);
      const replica = await env.MEDIA_BUCKET_REPLICA.head(key);
      if (!primary || !replica) return json({ error: 'Both copies must exist before isolating replica' }, 409);
      await env.MEDIA_BUCKET.delete(key);
      return json({ ok: true, id, isolated: 'replica' });
    }
    if (action === 'cleanup') {
      const results = await Promise.allSettled([
        env.MEDIA_BUCKET.delete(key),
        env.MEDIA_BUCKET_REPLICA.delete(key),
      ]);
      const failed = results.filter((result) => result.status === 'rejected').length;
      return json({ ok: failed === 0, id, deleted: 2 - failed, failed }, failed ? 503 : 200);
    }
    return json({ error: 'Not found' }, 404);
  },
};
