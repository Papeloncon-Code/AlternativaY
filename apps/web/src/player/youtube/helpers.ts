import { summarizeInnerTubeRequest } from './diagnostics';
import { InnerTubePlayerHttpError } from './failurePolicy';

const PROXY_PATH = '/api/youtube/proxy';
const ALLOWED_HOST_SUFFIXES = ['youtube.com', 'googlevideo.com', 'googleapis.com'];

function isAllowedPlaybackUrl(url: URL): boolean {
  return url.protocol === 'https:' &&
    !url.username &&
    !url.password &&
    (!url.port || url.port === '443') &&
    ALLOWED_HOST_SUFFIXES.some((suffix) =>
      url.hostname === suffix || url.hostname.endsWith('.' + suffix),
    );
}

/**
 * Keeps extraction and token generation in the browser but sends upstream
 * HTTP through TodoTube's strict same-origin Worker relay. The relay returns
 * media as a stream and preserves Range responses for seeking.
 */
export async function fetchYouTubeProxy(
  input: string | Request | URL,
  init?: RequestInit,
): Promise<Response> {
  const request = input instanceof Request
    ? new Request(input, init)
    : new Request(input.toString(), init);
  const upstreamUrl = new URL(request.url);

  if (!isAllowedPlaybackUrl(upstreamUrl)) {
    throw new Error('TodoTube bloqueó un destino de reproducción no permitido.');
  }

  const proxyUrl = new URL(PROXY_PATH, window.location.origin);
  proxyUrl.searchParams.set('url', upstreamUrl.toString());

  const headers = new Headers();
  request.headers.forEach((value, name) => {
    const lower = name.toLowerCase();
    if (
      lower === 'accept' ||
      lower === 'accept-language' ||
      lower === 'content-type' ||
      lower === 'range' ||
      lower === 'if-range' ||
      lower.startsWith('x-youtube-') ||
      lower.startsWith('x-goog-')
    ) {
      headers.set(name, value);
    }
  });

  const method = request.method.toUpperCase();
  const body = method === 'GET' || method === 'HEAD' ? undefined : await request.arrayBuffer();
  return fetch(proxyUrl.toString(), {
    method,
    headers,
    body,
    signal: request.signal,
    credentials: 'omit',
    cache: 'no-store',
    redirect: 'follow',
  });
}

/** InnerTube metadata, BotGuard and media-control requests share the same restricted Worker relay. */
export async function fetchFunction(input: string | Request | URL, init?: RequestInit): Promise<Response> {
  let url = input instanceof URL
    ? new URL(input.toString())
    : new URL(typeof input === 'string' ? input : input.url);
  const requestInit: RequestInit = { ...init };

  if (url.pathname.includes('/v1/player')) {
    url.searchParams.set('$fields', 'playerConfig,storyboards,captions,playabilityStatus,streamingData,responseContext.mainAppWebResponseContext.datasyncId,videoDetails.isLive,videoDetails.isLiveContent,videoDetails.title,videoDetails.author,videoDetails.thumbnail');
  }

  if (input instanceof Request) {
    const request = new Request(url.toString(), input);
    const originalBody = requestInit.body;
    if (originalBody === undefined && request.method !== 'GET' && request.method !== 'HEAD' && request.body) {
      requestInit.body = await request.arrayBuffer();
    }
    requestInit.method ??= request.method;
    requestInit.headers ??= request.headers;
  }

  const response = await fetchYouTubeProxy(url, requestInit);
  if (url.pathname.includes('/youtubei/v1/player') && !response.ok) {
    const responseBody = await response.clone().text().catch(() => '');
    const requestHeaders = new Headers(requestInit.headers);
    const body = requestInit.body;
    const bodyBytes = body instanceof ArrayBuffer
      ? body.byteLength
      : body instanceof Uint8Array
        ? body.byteLength
        : typeof body === 'string'
          ? new TextEncoder().encode(body).byteLength
          : 0;
    console.error('[TodoTube] InnerTube /player diagnostic', JSON.stringify({
      status: response.status,
      method: requestInit.method ?? 'GET',
      requestTarget: url.hostname + url.pathname,
      bodyBytes,
      requestHeaderNames: Array.from(requestHeaders.keys()).sort(),
      requestSummary: summarizeInnerTubeRequest(body),
      responseContentType: response.headers.get('content-type'),
      responseBody: responseBody.slice(0, 1600),
    }));
    throw new InnerTubePlayerHttpError(response.status, responseBody);
  }
  return response;
}

export function asMap<K, V>(object: Record<string, V>): Map<K, V> {
  const map = new Map<K, V>();
  for (const key of Object.keys(object)) map.set(key as K, object[key]);
  return map;
}

export function headersToGenericObject(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => { result[key.trim()] = value; });
  return result;
}

