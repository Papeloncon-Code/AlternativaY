import { expect, test } from '@playwright/test';
import { tryBuildSabrManifest } from '../src/player/youtube/sabrManifest';

test('a valid SABR manifest is returned as an optional transport candidate', async () => {
  const optionsSeen: unknown[] = [];
  const manifest = await tryBuildSabrManifest({
    toDash: async (options) => {
      optionsSeen.push(options);
      return '<MPD id="valid-sabr" />';
    },
  });

  expect(manifest).toBe('<MPD id="valid-sabr" />');
  expect(optionsSeen).toEqual([{
    manifest_options: {
      is_sabr: true,
      captions_format: 'vtt',
      include_thumbnails: false,
    },
  }]);
});

test('a malformed SABR URL does not throw away other transports from the same client', async () => {
  const malformedFormatError = new TypeError('Failed to construct URL: Invalid URL');
  const manifest = await tryBuildSabrManifest({
    toDash: async () => { throw malformedFormatError; },
  });

  expect(manifest).toBeNull();
  // The caller can continue constructing the same response's DASH, HLS,
  // and progressive candidates instead of discarding this client response.
});
