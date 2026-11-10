export const YOUTUBE_CONTROL_HEADERS = new Set([
  'accept',
  'accept-language',
  'content-type',
  'user-agent',
  'x-goog-api-key',
  'x-user-agent',
  'x-youtube-client-name',
  'x-youtube-client-version',
  'x-youtube-page-cl',
  'x-youtube-page-label',
  'x-youtube-utc-offset',
  'x-youtube-time-zone',
  'x-goog-visitor-id',
  'x-goog-api-format-version',
]);

/** Narrow control-plane allowlist; media manifests and segments are never relayed. */
export function isAllowedYouTubeControlTarget(url, method) {
  if (!(url instanceof URL) || url.protocol !== 'https:' || url.username || url.password || url.port) return false;
  const path = url.pathname;
  if (url.hostname === 'www.youtube.com') {
    if (method === 'GET' && (path === '/' || path === '/tv_config' || path.startsWith('/s/player/'))) return true;
    if (method === 'POST' && (path === '/youtubei/v1/player' || path === '/api/jnn/v1/GenerateIT')) return true;
  }
  if (url.hostname === 'youtubei.googleapis.com' && method === 'POST' && path === '/youtubei/v1/player') return true;
  if (url.hostname === 'redirector.googlevideo.com' && method === 'GET' && path === '/initplayback') return true;
  return false;
}
