import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';

class MemoryR2 {
  objects = new Map();
  failHead = false;
  neverResolveHead = false;
  failGet = false;
  failList = false;
  async head(key) {
    if (this.neverResolveHead) return new Promise(() => {});
    if (this.failHead) throw new Error('simulated origin outage');
    return this.objects.get(key) || null;
  }
  async get(key, opts = {}) {
    if (this.failGet) throw new Error('simulated read outage');
    const item = this.objects.get(key); if (!item) return null;
    const bytes = item.bytes;
    const offset = opts.range?.offset ?? 0;
    const length = opts.range?.length ?? bytes.length;
    const body = new Uint8Array(bytes.slice(offset, offset + length));
    return { ...item, body: new Response(body).body, writeHttpMetadata: item.writeHttpMetadata };
  }
  async put(key, body, opts) {
    const bytes = new Uint8Array(await new Response(body).arrayBuffer());
    this.objects.set(key, makeObject(bytes, opts));
  }
  async delete(key) { this.objects.delete(key); }
  async list({ prefix }) {
    if (this.failList) throw new Error('simulated list outage');
    return { objects: [...this.objects.entries()].filter(([k]) => k.startsWith(prefix)).map(([key, v]) => ({ key, size: v.size, uploaded: v.uploaded, httpEtag: v.httpEtag, customMetadata: v.customMetadata, httpMetadata: v.httpMetadata })) };
  }
}
function makeObject(bytes, opts = {}) {
  return {
    bytes, size: bytes.length, uploaded: new Date('2026-11-08T00:00:00Z'), httpEtag: '"fixture-etag"',
    httpMetadata: opts.httpMetadata || { contentType: 'video/mp4' }, customMetadata: opts.customMetadata || { title: 'Fixture', creator: 'Owner', license: 'owned', visibility: 'public' },
    writeHttpMetadata(headers) {
      headers.set('Content-Type', this.httpMetadata.contentType);
      if (this.httpMetadata.cacheControl) headers.set('Cache-Control', this.httpMetadata.cacheControl);
    },
  };
}
function env() {
  const bucket = new MemoryR2();
  bucket.objects.set('media/demo_123', makeObject(new TextEncoder().encode('0123456789')));
  return { MEDIA_BUCKET: bucket, MEDIA_UPLOAD_TOKEN: 'a'.repeat(40), ALLOWED_ORIGINS: 'https://todotube.papelon.workers.dev,http://localhost:5173' };
}
const req = (path, init = {}) => new Request('https://gateway.test' + path, init);

test('health endpoint reports configured origin count without claiming a replica exists', async () => {
  const r = await worker.fetch(req('/health'), env());
  assert.equal(r.status, 200);
  const data = await r.json();
  assert.equal(data.service, 'todotube-media-gateway');
  assert.equal(data.originsConfigured, 1);
});

test('GET supports byte ranges and preserves streaming status headers', async () => {
  const r = await worker.fetch(req('/v1/media/demo_123', { headers: { Range: 'bytes=2-5', Origin: 'https://todotube.papelon.workers.dev' } }), env());
  assert.equal(r.status, 206); assert.equal(r.headers.get('Content-Range'), 'bytes 2-5/10');
  assert.equal(await r.text(), '2345');
  assert.match(r.headers.get('Cache-Control') || '', /public/);
  assert.equal(r.headers.get('X-Media-Origin'), 'primary');
});
test('HEAD returns metadata and no body', async () => {
  const r = await worker.fetch(req('/v1/media/demo_123', { method: 'HEAD' }), env());
  assert.equal(r.status, 200); assert.equal(r.headers.get('Content-Length'), '10');
  assert.equal(await r.text(), '');
});
test('unsatisfiable range returns 416', async () => {
  const r = await worker.fetch(req('/v1/media/demo_123', { headers: { Range: 'bytes=99-' } }), env());
  assert.equal(r.status, 416); assert.equal(r.headers.get('Content-Range'), 'bytes */10');
});
test('private objects are not publicly readable and never use a public cache policy', async () => {
  const e = env();
  const object = e.MEDIA_BUCKET.objects.get('media/demo_123');
  object.customMetadata.visibility = 'private';
  object.httpMetadata.cacheControl = 'public, max-age=300';

  const anonymous = await worker.fetch(req('/v1/media/demo_123'), e);
  assert.equal(anonymous.status, 404);

  const authorized = await worker.fetch(req('/v1/media/demo_123', {
    headers: { Authorization: 'Bearer ' + e.MEDIA_UPLOAD_TOKEN },
  }), e);
  assert.equal(authorized.status, 200);
  assert.equal(authorized.headers.get('Cache-Control'), 'private, no-store');
  assert.doesNotMatch(authorized.headers.get('Cache-Control') || '', /public/i);
});
test('upload requires authorization and explicit ownership/licence metadata', async () => {
  const e = env();
  const unauthorized = await worker.fetch(req('/v1/admin/media/new_1', { method: 'PUT', body: 'video', headers: { 'Content-Type': 'video/mp4', 'Content-Length': '5' } }), e);
  assert.equal(unauthorized.status, 401);
  const missingLicence = await worker.fetch(req('/v1/admin/media/new_1', { method: 'PUT', body: 'video', headers: { Authorization: 'Bearer ' + e.MEDIA_UPLOAD_TOKEN, 'Content-Type': 'video/mp4', 'Content-Length': '5', 'X-Media-Title': 'New', 'X-Media-Creator': 'Owner' } }), e);
  assert.equal(missingLicence.status, 400);
  const uploaded = await worker.fetch(req('/v1/admin/media/new_1', { method: 'PUT', body: 'video', headers: { Authorization: 'Bearer ' + e.MEDIA_UPLOAD_TOKEN, 'Content-Type': 'video/mp4', 'Content-Length': '5', 'X-Media-Title': 'New', 'X-Media-Creator': 'Owner', 'X-Media-License': 'owned', 'X-Media-Visibility': 'public' } }), e);
  assert.equal(uploaded.status, 201);

  const duplicate = await worker.fetch(req('/v1/admin/media/new_1', { method: 'PUT', body: 'other', headers: {
    Authorization: 'Bearer ' + e.MEDIA_UPLOAD_TOKEN, 'Content-Type': 'video/mp4', 'Content-Length': '5',
    'X-Media-Title': 'Replacement', 'X-Media-Creator': 'Owner', 'X-Media-License': 'owned',
    'X-Media-Visibility': 'public',
  } }), e);
  assert.equal(duplicate.status, 409);
  assert.equal(new TextDecoder().decode(e.MEDIA_BUCKET.objects.get('media/new_1').bytes), 'video');
});
test('catalog only lists explicitly public objects', async () => {
  const e = env();
  e.MEDIA_BUCKET.objects.set('media/private_1', makeObject(new Uint8Array([1]), { customMetadata: { title: 'Private', creator: 'Owner', license: 'owned', visibility: 'private' } }));
  const r = await worker.fetch(req('/v1/catalog'), e);
  const data = await r.json(); assert.deepEqual(data.items.map((x) => x.id), ['demo_123']);
});
test('unapproved browser origins are rejected', async () => {
  const r = await worker.fetch(req('/v1/catalog', { headers: { Origin: 'https://evil.test' } }), env());
  assert.equal(r.status, 403);
});
test('malformed encoded media IDs return 400 instead of throwing', async () => {
  const r = await worker.fetch(req('/v1/media/%ZZ'), env());
  assert.equal(r.status, 400);
});
test('deleting a missing media ID returns 404', async () => {
  const e = env();
  const r = await worker.fetch(req('/v1/admin/media/not_here', {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + e.MEDIA_UPLOAD_TOKEN },
  }), e);
  assert.equal(r.status, 404);
});

test('a primary 404 does not hide a valid replica copy', async () => {
  const e = env();
  e.MEDIA_BUCKET.objects.clear();
  const replica = new MemoryR2();
  replica.objects.set('media/demo_123', makeObject(new TextEncoder().encode('replica-only')));
  e.MEDIA_BUCKET_REPLICA = replica;
  const r = await worker.fetch(req('/v1/media/demo_123'), e);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('X-Media-Origin'), 'replica-1');
  assert.equal(await r.text(), 'replica-only');
});

test('a failed primary origin is bypassed automatically when the replica has the file', async () => {
  const e = env();
  const replica = new MemoryR2();
  replica.objects.set('media/demo_123', makeObject(new TextEncoder().encode('replica-data')));
  e.MEDIA_BUCKET.failHead = true;
  e.MEDIA_BUCKET_REPLICA = replica;
  const r = await worker.fetch(req('/v1/media/demo_123'), e);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('X-Media-Origin'), 'replica-1');
  assert.equal(await r.text(), 'replica-data');
});

test('a primary read failure after HEAD is retried through the replica', async () => {
  const e = env();
  const replica = new MemoryR2();
  replica.objects.set('media/demo_123', makeObject(new TextEncoder().encode('replica-after-get-error')));
  e.MEDIA_BUCKET.failGet = true;
  e.MEDIA_BUCKET_REPLICA = replica;
  const r = await worker.fetch(req('/v1/media/demo_123'), e);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('X-Media-Origin'), 'replica-1');
  assert.equal(await r.text(), 'replica-after-get-error');
});

test('a hung primary does not block the faster replica', async () => {
  const e = env();
  const replica = new MemoryR2();
  replica.objects.set('media/demo_123', makeObject(new TextEncoder().encode('fast-replica')));
  e.MEDIA_BUCKET.neverResolveHead = true;
  e.MEDIA_BUCKET_REPLICA = replica;
  const r = await worker.fetch(req('/v1/media/demo_123'), e);
  assert.equal(r.status, 200);
  assert.equal(await r.text(), 'fast-replica');
});

test('catalog merges replicas without duplicate IDs and reports degraded origins', async () => {
  const e = env();
  const replica = new MemoryR2();
  replica.objects.set('media/demo_123', makeObject(new TextEncoder().encode('copy')));
  replica.objects.set('media/second_456', makeObject(new TextEncoder().encode('other'), { customMetadata: { title: 'Second', creator: 'Owner', license: 'owned', visibility: 'public' } }));
  e.MEDIA_BUCKET_REPLICA = replica;
  e.MEDIA_BUCKET.failList = true;
  const r = await worker.fetch(req('/v1/catalog'), e);
  assert.equal(r.status, 200);
  const data = await r.json();
  assert.deepEqual(data.items.map((x) => x.id), ['demo_123', 'second_456']);
  assert.deepEqual(data.origins, { configured: 2, available: 1, degraded: true });
});

test('uploads are replicated to each configured origin', async () => {
  const e = env();
  const replica = new MemoryR2();
  e.MEDIA_BUCKET_REPLICA = replica;
  const r = await worker.fetch(req('/v1/admin/media/upload_001', {
    method: 'PUT',
    body: 'video',
    headers: {
      Authorization: 'Bearer ' + e.MEDIA_UPLOAD_TOKEN,
      'Content-Type': 'video/mp4',
      'Content-Length': '5',
      'X-Media-Title': 'Upload',
      'X-Media-Creator': 'Owner',
      'X-Media-License': 'owned',
      'X-Media-Visibility': 'public',
    },
  }), e);
  assert.equal(r.status, 201);
  assert.deepEqual((await r.json()).replicas, { written: 2, configured: 2, degraded: false });
  assert.equal(new TextDecoder().decode(e.MEDIA_BUCKET.objects.get('media/upload_001').bytes), 'video');
  assert.equal(new TextDecoder().decode(replica.objects.get('media/upload_001').bytes), 'video');
});

test('all missing origins return 404, while an origin outage returns 503', async () => {
  const e = env();
  e.MEDIA_BUCKET.objects.clear();
  const missing = await worker.fetch(req('/v1/media/not_here'), e);
  assert.equal(missing.status, 404);
  e.MEDIA_BUCKET.failHead = true;
  const unavailable = await worker.fetch(req('/v1/media/not_here'), e);
  assert.equal(unavailable.status, 503);
});

test('delete removes the file from every configured origin', async () => {
  const e = env();
  const replica = new MemoryR2();
  replica.objects.set('media/demo_123', makeObject(new TextEncoder().encode('replica')));
  e.MEDIA_BUCKET_REPLICA = replica;
  const r = await worker.fetch(req('/v1/admin/media/demo_123', {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + e.MEDIA_UPLOAD_TOKEN },
  }), e);
  assert.equal(r.status, 200);
  assert.equal(e.MEDIA_BUCKET.objects.has('media/demo_123'), false);
  assert.equal(replica.objects.has('media/demo_123'), false);
});
