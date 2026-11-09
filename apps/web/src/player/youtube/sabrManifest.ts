export interface SabrManifestBuilder {
  toDash: (options: {
    manifest_options: {
      is_sabr: true;
      captions_format: 'vtt';
      include_thumbnails: false;
    };
  }) => Promise<string | undefined>;
}

/**
 * SABR is an optional transport candidate. A malformed adaptive format or
 * URL must not discard the other DASH/HLS/progressive candidates from the
 * same player response and client session.
 */
export async function tryBuildSabrManifest(
  info: SabrManifestBuilder,
): Promise<string | null> {
  try {
    const manifest = await info.toDash({
      manifest_options: {
        is_sabr: true,
        captions_format: 'vtt',
        include_thumbnails: false,
      },
    });
    return manifest || null;
  } catch (error) {
    console.warn('[TodoTube] No se pudo construir el manifiesto SABR; se conservarán los otros transportes del mismo cliente:', error);
    return null;
  }
}
