import { expect, test } from '@playwright/test';
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
