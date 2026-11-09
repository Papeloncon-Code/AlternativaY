import { expect, test } from '@playwright/test';
import {
  InnerTubePlayerHttpError,
  shouldStopClientFallback,
  shouldStopSourceFallback,
} from '../src/player/youtube/failurePolicy';
import {
  PLAYBACK_STALL_TIMEOUT_MS,
  shouldRecoverPlaybackStall,
  type PlaybackStallSnapshot,
} from '../src/player/youtube/stallWatchdog';

const idleStall = (patch: Partial<PlaybackStallSnapshot> = {}): PlaybackStallSnapshot => ({
  now: 30_000,
  lastProgressAt: 17_000,
  currentTime: 45,
  lastCurrentTime: 45,
  bufferedAhead: 0,
  paused: false,
  seeking: false,
  ended: false,
  visible: true,
  online: true,
  ...patch,
});

test('a transient network failure remains eligible for recovery', () => {
  expect(shouldStopClientFallback(new Error('Provider timed out after 10000 ms.'))).toBe(false);
  expect(shouldStopSourceFallback(new Error('Failed to fetch'))).toBe(false);
  expect(shouldStopClientFallback({ status: 503, message: 'Service unavailable' })).toBe(false);
});

test('HTTP 400 blocks client rotation; permission and throttling errors block source rotation', () => {
  const badRequest = new InnerTubePlayerHttpError(400, 'Bad request');
  expect(shouldStopClientFallback(badRequest)).toBe(true);
  expect(shouldStopSourceFallback(badRequest)).toBe(false);
  expect(JSON.stringify(badRequest)).not.toContain('Bad request');

  const failedPrecondition = new InnerTubePlayerHttpError(
    400,
    'FAILED_PRECONDITION: Precondition check failed.',
  );
  expect(shouldStopClientFallback(failedPrecondition)).toBe(true);
  expect(shouldStopSourceFallback(failedPrecondition)).toBe(true);

  for (const status of [401, 403, 407, 429]) {
    const error = new InnerTubePlayerHttpError(status, 'Request rejected');
    expect(shouldStopClientFallback(error)).toBe(true);
    expect(shouldStopSourceFallback(error)).toBe(true);
  }
});

test('known access, consent and automated-query restrictions do not rotate client identity', () => {
  for (const message of [
    'LOGIN_REQUIRED',
    'AGE_CHECK_REQUIRED',
    'Sign in to confirm you are not a bot',
    'This network is sending automated queries',
    'FAILED_PRECONDITION: Precondition check failed.',
  ]) {
    expect(shouldStopClientFallback(new Error(message))).toBe(true);
    expect(shouldStopSourceFallback(new Error(message))).toBe(true);
  }
});

test('Shaka HTTP error detail preserves the permission status for the recovery policy', () => {
  const shakaError = {
    message: 'HTTP error',
    data: ['https://media.example/video', 403, 'Forbidden'],
  };
  expect(shouldStopSourceFallback(shakaError)).toBe(true);
});

test('stall watchdog triggers at 2 seconds without progress and without buffered media', () => {
  expect(PLAYBACK_STALL_TIMEOUT_MS).toBe(2_000);
  expect(shouldRecoverPlaybackStall(idleStall({ now: 18_999 }))).toBe(false);
  expect(shouldRecoverPlaybackStall(idleStall({ now: 19_000 }))).toBe(true);
  expect(shouldRecoverPlaybackStall(idleStall({ bufferedAhead: 3 }))).toBe(false);
  expect(shouldRecoverPlaybackStall(idleStall({ bufferedAhead: 0.25 }))).toBe(true);
  expect(shouldRecoverPlaybackStall(idleStall({ currentTime: 45.2 }))).toBe(false);
});

test('stall watchdog ignores pause, seek, ended, background and offline states', () => {
  for (const patch of [
    { paused: true },
    { seeking: true },
    { ended: true },
    { visible: false },
    { online: false },
  ]) {
    expect(shouldRecoverPlaybackStall(idleStall(patch))).toBe(false);
  }
});
