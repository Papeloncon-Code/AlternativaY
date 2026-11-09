export function summarizeInnerTubeRequest(body: unknown) {
  if (typeof body !== 'string') {
    return { jsonBody: false };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return { jsonBody: false };
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { jsonBody: true, validObject: false };
  }

  const root = payload as Record<string, unknown>;
  const context = root.context && typeof root.context === 'object'
    ? root.context as Record<string, unknown>
    : undefined;
  const client = context?.client && typeof context.client === 'object'
    ? context.client as Record<string, unknown>
    : undefined;
  const playback = root.playbackContext && typeof root.playbackContext === 'object'
    ? root.playbackContext as Record<string, unknown>
    : undefined;
  const contentPlayback = playback?.contentPlaybackContext &&
      typeof playback.contentPlaybackContext === 'object'
    ? playback.contentPlaybackContext as Record<string, unknown>
    : undefined;

  const safeString = (value: unknown) =>
    typeof value === 'string' ? value.slice(0, 80) : null;

  return {
    jsonBody: true,
    clientName: safeString(client?.clientName),
    clientVersion: safeString(client?.clientVersion),
    videoIdPresent: typeof root.videoId === 'string' && root.videoId.length > 0,
    playbackContextPresent: !!playback,
    contentPlaybackContextKeys: contentPlayback ? Object.keys(contentPlayback).sort() : [],
    paramsPresent: typeof root.params === 'string' && root.params.length > 0,
    poTokenFieldPresent: !!contentPlayback &&
      Object.keys(contentPlayback).some((key) => /po.?token/i.test(key)),
  };
}
