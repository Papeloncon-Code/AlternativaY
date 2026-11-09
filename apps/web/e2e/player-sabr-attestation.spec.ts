import { expect, test } from '@playwright/test';
import { OnesieRequest } from 'googlevideo/protos';
import { encodeOnesieRequestEnvelope } from '../src/player/youtube/onesie';
import {
  isSabrAttestationRefreshRequired,
  primeSabrAttestation,
} from '../src/player/youtube/sabrAttestation';

test('Onesie request does not explicitly disable video playback configuration', () => {
  const encoded = encodeOnesieRequestEnvelope({
    innertubeRequest: {
      context: {
        client: {
          clientName: 'WEB',
          clientVersion: '2.20261101.00.00',
        },
      },
      playbackContext: {
        reloadPlaybackContext: { playbackStartTimeMs: '12000' },
      },
    },
    clientConfig: {
      clientKeyData: new Uint8Array([1]),
      encryptedClientKey: new Uint8Array([2]),
      onesieUstreamerConfig: new Uint8Array([3]),
      baseUrl: 'https://example.invalid/initplayback',
      keyExpiresInSeconds: 60,
    },
    encrypted: {
      encrypted: new Uint8Array([4]),
      hmac: new Uint8Array([5]),
      iv: new Uint8Array([6]),
    },
  });

  const decoded = OnesieRequest.decode(encoded);
  expect(decoded.innertubeRequest?.serializeResponseAsJson).toBe(true);
  expect(decoded.innertubeRequest?.ustreamerFlags).toBeUndefined();
  expect(decoded.streamerContext?.clientInfo?.clientVersion).toBe('2.20261101.00.00');
});

test('SABR attestation uses the same Innertube session and retries transient failures only', async () => {
  let calls = 0;
  const engagements: string[] = [];
  await primeSabrAttestation({
    getAttestationChallenge: async (engagementType) => {
      calls += 1;
      engagements.push(engagementType);
      if (calls < 2) throw new Error('Temporary network failure');
      return { challenge: 'opaque-test-value' };
    },
  }, {
    attempts: 3,
    timeoutMs: 100,
    delay: async () => undefined,
  });

  expect(calls).toBe(2);
  expect(engagements).toEqual(['ENGAGEMENT_TYPE_UNBOUND', 'ENGAGEMENT_TYPE_UNBOUND']);
});

test('SABR attestation does not retry explicit HTTP access denials', async () => {
  let calls = 0;
  await expect(primeSabrAttestation({
    getAttestationChallenge: async () => {
      calls += 1;
      throw { status: 403, message: 'Forbidden' };
    },
  }, {
    attempts: 3,
    timeoutMs: 100,
    delay: async () => undefined,
  })).rejects.toMatchObject({ status: 403 });
  expect(calls).toBe(1);
});

test('SABR attestation refresh is requested only for stream protection status 3', () => {
  expect(isSabrAttestationRefreshRequired(3)).toBe(true);
  expect(isSabrAttestationRefreshRequired(1)).toBe(false);
  expect(isSabrAttestationRefreshRequired(2)).toBe(false);
  expect(isSabrAttestationRefreshRequired(4)).toBe(false);
});
