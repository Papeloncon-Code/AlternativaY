import { test, expect } from '@playwright/test';
import { summarizeInnerTubeRequest } from '../src/player/youtube/diagnostics';

test('InnerTube diagnostics expose client identity but never credential values', () => {
  const summary = summarizeInnerTubeRequest(JSON.stringify({
    videoId: 'private-video-id',
    params: 'private-request-params',
    context: {
      client: {
        clientName: 'ANDROID',
        clientVersion: '21.03.36',
        visitorData: 'private-visitor-id',
      },
    },
    playbackContext: {
      contentPlaybackContext: {
        poToken: 'private-po-token',
        playbackNonce: 'private-playback-nonce',
        signatureTimestamp: 12345,
      },
    },
  }));

  expect(summary).toEqual({
    jsonBody: true,
    clientName: 'ANDROID',
    clientVersion: '21.03.36',
    videoIdPresent: true,
    playbackContextPresent: true,
    contentPlaybackContextKeys: ['playbackNonce', 'poToken', 'signatureTimestamp'],
    paramsPresent: true,
    poTokenFieldPresent: true,
  });

  const serialized = JSON.stringify(summary);
  for (const secret of [
    'private-video-id',
    'private-request-params',
    'private-visitor-id',
    'private-po-token',
    'private-playback-nonce',
  ]) {
    expect(serialized).not.toContain(secret);
  }
});

test('InnerTube diagnostics handle missing, binary and malformed request bodies', () => {
  expect(summarizeInnerTubeRequest(undefined)).toEqual({ jsonBody: false });
  expect(summarizeInnerTubeRequest(new Uint8Array([1, 2, 3]))).toEqual({ jsonBody: false });
  expect(summarizeInnerTubeRequest('{')).toEqual({ jsonBody: false });
  expect(summarizeInnerTubeRequest('[]')).toEqual({ jsonBody: true, validObject: false });
});
