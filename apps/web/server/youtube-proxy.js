const ALLOWED_HOST_SUFFIXES = [
  'youtube.com',
  'googlevideo.com',
  'googleapis.com',
];

const PROXY_PATH = '/api/youtube/proxy';
const MAX_REQUEST_BODY_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 5;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT_PER_IP = 600;
const rateBuckets = new Map();

const FORWARDED_REQUEST_HEADERS = new Set([
  'accept',
  'accept-language',
  'content-type',
  'range',
  'if-range',
  'x-goog-api-format-version',
  'x-goog-visitor-id',
  'x-youtube-client-name',
  'x-youtube-client-version',
  'x-youtube-page-cl',
  'x-youtube-page-label',
  'x-youtube-utc-offset',
  'x-youtube-time-zone',
]);

const FORWARDED_RESPONSE_HEADERS = [
  'accept-ranges',
  'cache-control',
  'content-disposition',
  'content-range',
  'content-type',
  'etag',
  'last-modified',
];

export function isAllowedYouTubeTarget(value) {
  try {
    const target = new URL(value);
    return target.protocol === 'https:' &&
      !target.username &&
      !target.password &&
      (!target.port || target.port === '443') &&
      ALLOWED_HOST_SUFFIXES.some((suffix) =>
        target.hostname === suffix || target.hostname.endsWith('.' + suffix),
      ) &&
      target.hostname.length <= 253;
  } catch {
    return false;
  }
}

function isSameOriginRequest(request) {
  const ownOrigin = new URL(request.url).origin;
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');
  const referer = request.headers.get('referer');

  if (origin && origin !== ownOrigin) return false;
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') return false;
  if (referer) {
    try {
      if (new URL(referer).origin !== ownOrigin) return false;
    } catch {
      return false;
    }
  }
  return true;
}

function consumeRateLimit(request, now = Date.now()) {
  const key = request.headers.get('cf-connecting-ip') || 'unknown';
  let bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.startedAt >= RATE_WINDOW_MS) {
    bucket = { startedAt: now, count: 0 };
    rateBuckets.set(key, bucket);
  }
  bucket.count += 1;

  if (rateBuckets.size > 10_000) {
    for (const [candidate, entry] of rateBuckets) {
      if (now - entry.startedAt >= RATE_WINDOW_MS) rateBuckets.delete(candidate);
      if (rateBuckets.size <= 8_000) break;
    }
  }
  return bucket.count <= RATE_LIMIT_PER_IP;
}

function selectUpstreamHeaders(headers) {
  const selected = new Headers();
  for (const [name, value] of headers) {
    if (FORWARDED_REQUEST_HEADERS.has(name.toLowerCase())) {
      selected.set(name, value);
    }
  }
  return selected;
}

function responseFromUpstream(upstream) {
  const headers = new Headers();
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  headers.set('cache-control', 'no-store');
  headers.set('x-content-type-options', 'nosniff');

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}

/**
 * Narrow same-origin relay for TodoTube's public YouTube playback runtime.
 * It does not accept cookies/auth, arbitrary hosts, alternate identities or
 * retry a denied upstream response. Media bodies remain streaming responses.
 */
export async function handleYouTubeProxy(request, fetchImpl = fetch) {
  if (new URL(request.url).pathname !== PROXY_PATH) {
    return new Response('Not found', { status: 404 });
  }

  if (!['GET', 'HEAD', 'POST'].includes(request.method)) {
    return new Response('Method not allowed', { status: 405 });
  }
  if (!isSameOriginRequest(request)) {
    return new Response('Same-origin requests only', { status: 403 });
  }
  if (!consumeRateLimit(request)) {
    return new Response('TodoTube playback request limit exceeded', {
      status: 429,
      headers: { 'retry-after': '60', 'cache-control': 'no-store' },
    });
  }

  const proxyUrl = new URL(request.url);
  const targetValue = proxyUrl.searchParams.get('url');
  if (!targetValue || !isAllowedYouTubeTarget(targetValue)) {
    return new Response('YouTube playback target is not allowed', { status: 400 });
  }

  let body;
  if (request.method === 'POST') {
    const declaredLength = Number(request.headers.get('content-length') || 0);
    if (declaredLength > MAX_REQUEST_BODY_BYTES) {
      return new Response('Request body is too large', { status: 413 });
    }
    body = await request.arrayBuffer();
    if (body.byteLength > MAX_REQUEST_BODY_BYTES) {
      return new Response('Request body is too large', { status: 413 });
    }
  }

  let target = new URL(targetValue);
  let method = request.method;
  let requestBody = body;
  const headers = selectUpstreamHeaders(request.headers);

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    let upstream;
    try {
      upstream = await fetchImpl(target.toString(), {
        method,
        headers,
        body: method === 'GET' || method === 'HEAD' ? undefined : requestBody,
        redirect: 'manual',
        credentials: 'omit',
      });
    } catch {
      return new Response('YouTube upstream request failed', {
        status: 502,
        headers: { 'cache-control': 'no-store' },
      });
    }

    const location = upstream.headers.get('location');
    if (![301, 302, 303, 307, 308].includes(upstream.status) || !location) {
      // 401/403/407/429 and all other upstream statuses are returned as-is;
      // a denial is never retried through another identity or network.
      return responseFromUpstream(upstream);
    }

    if (redirectCount === MAX_REDIRECTS) {
      return new Response('Too many upstream redirects', { status: 502 });
    }

    let nextTarget;
    try {
      nextTarget = new URL(location, target);
    } catch {
      return new Response('Invalid upstream redirect', { status: 502 });
    }
    if (!isAllowedYouTubeTarget(nextTarget.toString())) {
      return new Response('Upstream redirect target is not allowed', { status: 502 });
    }

    if (upstream.status === 303 ||
      ((upstream.status === 301 || upstream.status === 302) && method === 'POST')) {
      method = 'GET';
      requestBody = undefined;
      headers.delete('content-type');
    }

    target = nextTarget;
  }

  return new Response('YouTube upstream request failed', { status: 502 });
}
