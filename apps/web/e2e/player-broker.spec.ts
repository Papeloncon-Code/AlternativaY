import { expect, test } from '@playwright/test';
import { prepareFetchRequest } from '../src/player/youtube/request';
import { fetchFunction } from '../src/player/youtube/helpers';
import { isAllowedYouTubeControlTarget } from '../server/youtube-control-policy.js';
import {
  activateWithFallback,
  PlaybackBroker,
  ProviderHealthRegistry,
  type PlaybackCandidate,
  type PlaybackProvider,
} from '../src/player/playbackBroker';

const candidate = (providerId: string, mode: PlaybackCandidate['mode'], uri: string): PlaybackCandidate => ({
  providerId, mode, uri,
});

function provider(
  id: string,
  priority: number,
  resolve: PlaybackProvider['resolve'],
): PlaybackProvider {
  return { id, priority, supports: () => true, resolve };
}

test('usa el proveedor secundario cuando falla la resolución del principal', async () => {
  const broker = new PlaybackBroker([
    provider('primary', 1, async () => { throw new Error('primary unavailable'); }),
    provider('secondary', 2, async () => [candidate('secondary', 'dash', 'https://backup.test/video.mpd')]),
  ]);

  const result = await broker.resolve({
    videoId: 'video-1', resumeAt: 82, signal: new AbortController().signal,
  });

  expect(result.candidates.map((x) => x.providerId)).toEqual(['secondary']);
  expect(result.failures[0].providerId).toBe('primary');
  expect(broker.health.isCoolingDown('primary')).toBe(true);
});

test('respeta el timeout y continúa con otro proveedor', async () => {
  const broker = new PlaybackBroker([
    provider('slow', 1, () => new Promise(() => undefined)),
    provider('fast', 2, async () => [candidate('fast', 'hls', 'https://backup.test/live.m3u8')]),
  ], new ProviderHealthRegistry(), 5);

  const result = await broker.resolve({
    videoId: 'live-1', resumeAt: 0, signal: new AbortController().signal,
  });

  expect(result.candidates[0].providerId).toBe('fast');
  expect(result.failures[0].error).toContain('timed out');
});

test('cambia de modo conservando posición y estado de reproducción', async () => {
  const attempted: string[] = [];
  const snapshot = { resumeAt: 245, wasPlaying: true, signal: new AbortController().signal };

  const result = await activateWithFallback([
    candidate('youtube-sabr', 'sabr-dash', 'sabr://video'),
    candidate('youtube-sabr', 'dash', 'https://video.test/manifest.mpd'),
    candidate('youtube-direct', 'direct', 'https://video.test/file.mp4'),
  ], snapshot, async (source, context) => {
    attempted.push(source.mode);
    expect(context.resumeAt).toBe(245);
    expect(context.wasPlaying).toBe(true);
    if (source.mode === 'sabr-dash') throw new Error('SABR session expired');
    return 'loaded';
  });

  expect(attempted).toEqual(['sabr-dash', 'dash']);
  expect(result.candidate.mode).toBe('dash');
});

test('pone temporalmente en cuarentena un proveedor que falla y lo recupera', () => {
  let now = 1_000;
  const health = new ProviderHealthRegistry(() => now, 100, 500);
  health.recordFailure('provider-a', new Error('offline'));
  expect(health.isCoolingDown('provider-a')).toBe(true);

  now += 101;
  expect(health.isCoolingDown('provider-a')).toBe(false);
  health.recordSuccess('provider-a');
  expect(health.get('provider-a').failures).toBe(0);
  expect(health.get('provider-a').successes).toBe(1);
});

test('un aborto del usuario no se confunde con un fallo del proveedor', async () => {
  const controller = new AbortController();
  const broker = new PlaybackBroker([
    provider('blocked', 1, () => new Promise(() => undefined)),
  ], new ProviderHealthRegistry(), 1000);

  const pending = broker.resolve({ videoId: 'video-2', resumeAt: 0, signal: controller.signal });
  controller.abort();

  await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
});


test('preserva método POST, body y cabeceras al normalizar una solicitud', async () => {
  const payload = JSON.stringify({ videoId: 'dQw4w9WgXcQ', context: { client: { clientName: 'WEB' } } });
  const request = new Request('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: payload,
  });

  const forwarded = await prepareFetchRequest(request);
  expect(forwarded.init.method).toBe('POST');
  expect(forwarded.init.body).toBeInstanceOf(ArrayBuffer);
  expect(new TextDecoder().decode(forwarded.init.body as ArrayBuffer)).toBe(payload);
  expect(new Headers(forwarded.init.headers).get('content-type')).toBe('application/json');
  expect(forwarded.url.pathname).toBe('/youtubei/v1/player');
});

test('mantiene vídeo y controles SABR dentro del dock en página y minirreproductor', async ({ page }) => {
  await page.goto('/');
  const results = await page.evaluate(() => {
    const layouts = ['on-page', 'mini'];
    return layouts.map((layout) => {
      const dock = document.createElement('div');
      dock.className = 'player-dock youtube ' + layout;
      Object.assign(dock.style, {
        position: layout === 'mini' ? 'fixed' : 'absolute',
        left: '24px',
        top: '24px',
        width: layout === 'mini' ? '400px' : '640px',
        height: layout === 'mini' ? 'auto' : '360px',
        zIndex: '9999',
      });
      const slot = document.createElement('div');
      slot.className = 'player-dock-video';
      const player = document.createElement('div');
      player.className = 'gateway-player youtube-sabr-player compact';
      const video = document.createElement('video');
      video.className = 'gateway-video';
      const controls = document.createElement('div');
      controls.className = 'gateway-controls';
      controls.textContent = 'Reproducir 0:00 0:00 Velocidad Pantalla';
      player.append(video, controls);
      slot.append(player);
      dock.append(slot);
      document.body.append(dock);
      const d = dock.getBoundingClientRect();
      const v = video.getBoundingClientRect();
      const c = controls.getBoundingClientRect();
      const result = {
        layout,
        dockBottom: d.bottom,
        videoBottom: v.bottom,
        controlsTop: c.top,
        controlsBottom: c.bottom,
        dockWidth: d.width,
        controlsWidth: c.width,
      };
      dock.remove();
      return result;
    });
  });

  for (const layout of results) {
    expect(layout.controlsBottom, layout.layout + ' controls must not be clipped').toBeLessThanOrEqual(layout.dockBottom + 1);
    expect(layout.videoBottom, layout.layout + ' video must not overlap the controls').toBeLessThanOrEqual(layout.controlsTop + 1);
    expect(layout.controlsWidth, layout.layout + ' controls must fit the dock').toBeLessThanOrEqual(layout.dockWidth + 1);
  }
});


test('solo permite endpoints de control concretos y nunca endpoints de segmentos', () => {
  expect(isAllowedYouTubeControlTarget(new URL('https://www.youtube.com/'), 'GET')).toBe(true);
  expect(isAllowedYouTubeControlTarget(new URL('https://www.youtube.com/youtubei/v1/player'), 'POST')).toBe(true);
  expect(isAllowedYouTubeControlTarget(new URL('https://www.youtube.com/api/jnn/v1/GenerateIT'), 'POST')).toBe(true);
  expect(isAllowedYouTubeControlTarget(new URL('https://redirector.googlevideo.com/initplayback'), 'GET')).toBe(true);
  expect(isAllowedYouTubeControlTarget(new URL('https://r1.googlevideo.com/videoplayback?id=asset'), 'GET')).toBe(false);
  expect(isAllowedYouTubeControlTarget(new URL('https://www.youtube.com/videoplayback'), 'GET')).toBe(false);
  expect(isAllowedYouTubeControlTarget(new URL('http://www.youtube.com/youtubei/v1/player'), 'POST')).toBe(false);
  expect(isAllowedYouTubeControlTarget(new URL('https://www.youtube.com/youtubei/v1/player'), 'GET')).toBe(false);
  expect(isAllowedYouTubeControlTarget(new URL('https://www.youtube.com.evil.test/youtubei/v1/player'), 'POST')).toBe(false);
});

test('fetchFunction envía InnerTube al Worker del mismo origen sin cookies ni credenciales', async () => {
  const originalFetch = globalThis.fetch;
  let forwarded: { input: RequestInfo | URL; init?: RequestInit } | undefined;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    forwarded = { input, init };
    return new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;

  try {
    const response = await fetchFunction('https://www.youtube.com/youtubei/v1/player?key=public-key', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': 'public-key',
        authorization: 'Bearer must-not-forward',
        cookie: 'must-not-forward',
      },
      body: JSON.stringify({ videoId: 'dQw4w9WgXcQ' }),
    });
    expect(await response.json()).toEqual({ ok: true });
    expect(forwarded?.input).toBe('/api/youtube/control');
    const payload = JSON.parse(String(forwarded?.init?.body));
    expect(payload.target).toContain('https://www.youtube.com/youtubei/v1/player');
    expect(payload.method).toBe('POST');
    expect(payload.headers['content-type']).toBe('application/json');
    expect(payload.headers['x-goog-api-key']).toBe('public-key');
    expect(payload.headers.authorization).toBeUndefined();
    expect(payload.headers.cookie).toBeUndefined();
    expect(payload.body.encoding).toBe('utf8');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('fetchFunction conserva cuerpos binarios para las solicitudes de control', async () => {
  const originalFetch = globalThis.fetch;
  let payload: any;
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    payload = JSON.parse(String(init?.body));
    return new Response('{}', { status: 200 });
  }) as typeof fetch;

  try {
    await fetchFunction('https://www.youtube.com/youtubei/v1/player?key=public-key', {
      method: 'POST',
      body: new Uint8Array([0, 1, 127, 255]),
    });
    expect(payload.body.encoding).toBe('base64');
    expect(Array.from(Buffer.from(payload.body.data, 'base64'))).toEqual([0, 1, 127, 255]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
