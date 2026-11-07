import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { buildPushPayload } from '@block65/webcrypto-web-push';

const b64u = (buf) => Buffer.from(buf).toString('base64url');

test('cifra un aviso Web Push (aes128gcm + VAPID) para una suscripción simulada', async () => {
  // Claves del "navegador" (como las que da PushManager.subscribe)
  const client = await webcrypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const p256dh = b64u(await webcrypto.subtle.exportKey('raw', client.publicKey));
  const auth = b64u(webcrypto.getRandomValues(new Uint8Array(16)));
  // Claves VAPID del servidor
  const server = await webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']);
  const vapid = {
    subject: 'https://todotube.papelon.workers.dev',
    publicKey: b64u(await webcrypto.subtle.exportKey('raw', server.publicKey)),
    privateKey: (await webcrypto.subtle.exportKey('jwk', server.privateKey)).d,
  };
  const payload = await buildPushPayload(
    { data: JSON.stringify({ title: 'Canal', body: 'Vídeo nuevo', url: '/ver/abcdefghijk' }), options: { ttl: 3600, urgency: 'high' } },
    { endpoint: 'https://fcm.googleapis.com/fcm/send/prueba', expirationTime: null, keys: { p256dh, auth } },
    vapid,
  );
  assert.equal(payload.method.toUpperCase(), 'POST');
  assert.equal(payload.headers['content-encoding'], 'aes128gcm');
  assert.match(payload.headers.authorization, /^vapid t=.+, k=.+/);
  assert.equal(payload.headers.urgency, 'high');
  assert.equal(payload.body.byteLength, 4096, 'mensaje rellenado a 4096 octetos constantes');
});
