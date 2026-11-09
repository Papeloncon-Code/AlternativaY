import { expect, test } from '@playwright/test';
import { handleYouTubeProxy, isAllowedYouTubeTarget } from '../server/youtube-proxy.js';

function proxyRequest(
  target: string,
  options: {
    method?: 'GET' | 'HEAD' | 'POST';
    body?: string;
    headers?: Record<string, string>;
    ip?: string;
  } = {},
) {
  const url = new URL('https://todotube.test/api/youtube/proxy');
  url.searchParams.set('url', target);
  const method = options.method ?? 'GET';
  return new Request(url, {
    method,
    headers: {
      'sec-fetch-site': 'same-origin',
      'cf-connecting-ip': options.ip ?? '192.0.2.10',
      ...options.headers,
    },
    ...(method === 'POST' ? { body: options.body ?? '' } : {}),
  });
}

test('solo acepta HTTPS en hosts de YouTube/Google Video/Google APIs', () => {
  expect(isAllowedYouTubeTarget('https://www.youtube.com/youtubei/v1/player')).toBe(true);
  expect(isAllowedYouTubeTarget('https://rr3---sn.googlevideo.com/videoplayback')).toBe(true);
  expect(isAllowedYouTubeTarget('https://jnn-pa.googleapis.com/$rpc/google.internal.waa.v1.Waa/Create')).toBe(true);
  expect(isAllowedYouTubeTarget('http://www.youtube.com/')).toBe(false);
  expect(isAllowedYouTubeTarget('https://youtube.com.attacker.invalid/')).toBe(false);
  expect(isAllowedYouTubeTarget('https://example.com/')).toBe(false);
  expect(isAllowedYouTubeTarget('https://user:password@youtube.com/')).toBe(false);
  expect(isAllowedYouTubeTarget('https://youtube.com:8443/')).toBe(false);
});

test('reenvía POST de InnerTube sin credenciales y conserva el cuerpo', async () => {
  let observedUrl = '';
  let observedMethod = '';
  let observedBody = '';
  let observedCredentials = '';

  const response = await handleYouTubeProxy(
    proxyRequest('https://www.youtube.com/youtubei/v1/player', {
      method: 'POST',
      body: JSON.stringify({ videoId: 'dQw4w9WgXcQ' }),
      headers: { 'content-type': 'application/json', accept: 'application/json' },
    }),
    async (input, init) => {
      observedUrl = String(input);
      observedMethod = String(init?.method);
      observedBody = await new Response(init?.body).text();
      observedCredentials = String(init?.credentials);
      return new Response('{"ok":true}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  );

  expect(response.status).toBe(200);
  expect(observedUrl).toBe('https://www.youtube.com/youtubei/v1/player');
  expect(observedMethod).toBe('POST');
  expect(observedBody).toBe(JSON.stringify({ videoId: 'dQw4w9WgXcQ' }));
  expect(observedCredentials).toBe('omit');
});

test('mantiene el streaming HTTP 206 y las cabeceras Range para seek', async () => {
  let observedRange = '';
  const bytes = new Uint8Array([1, 2, 3, 4]);
  const response = await handleYouTubeProxy(
    proxyRequest('https://rr3---sn.googlevideo.com/videoplayback?source=youtube', {
      headers: { range: 'bytes=100-103' },
    }),
    async (_input, init) => {
      observedRange = new Headers(init?.headers).get('range') ?? '';
      return new Response(bytes, {
        status: 206,
        headers: {
          'content-type': 'video/mp4',
          'content-range': 'bytes 100-103/2048',
          'accept-ranges': 'bytes',
        },
      });
    },
  );

  expect(observedRange).toBe('bytes=100-103');
  expect(response.status).toBe(206);
  expect(response.headers.get('content-range')).toBe('bytes 100-103/2048');
  expect(response.headers.get('accept-ranges')).toBe('bytes');
  expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
});

test('una denegación 403 se devuelve sin reintentos ni cambio de host', async () => {
  let calls = 0;
  const response = await handleYouTubeProxy(
    proxyRequest('https://www.youtube.com/youtubei/v1/player', { ip: '192.0.2.11' }),
    async () => {
      calls += 1;
      return new Response('Forbidden', { status: 403 });
    },
  );

  expect(response.status).toBe(403);
  expect(await response.text()).toBe('Forbidden');
  expect(calls).toBe(1);
});

test('solo sigue redirecciones hacia hosts permitidos', async () => {
  let calls = 0;
  const response = await handleYouTubeProxy(
    proxyRequest('https://www.youtube.com/tv_config', { ip: '192.0.2.12' }),
    async () => {
      calls += 1;
      return new Response(null, {
        status: 302,
        headers: { location: 'https://attacker.invalid/collect' },
      });
    },
  );

  expect(response.status).toBe(502);
  expect(calls).toBe(1);
});

test('rechaza peticiones cross-origin', async () => {
  let calls = 0;
  const response = await handleYouTubeProxy(
    proxyRequest('https://www.youtube.com/', {
      ip: '192.0.2.13',
      headers: { origin: 'https://attacker.invalid', 'sec-fetch-site': 'cross-site' },
    }),
    async () => {
      calls += 1;
      return new Response('should not be called');
    },
  );

  expect(response.status).toBe(403);
  expect(calls).toBe(0);
});
