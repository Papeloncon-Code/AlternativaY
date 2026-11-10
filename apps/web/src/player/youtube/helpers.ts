import { prepareFetchRequest } from './request';
import { summarizeInnerTubeRequest } from './diagnostics';
import { InnerTubePlayerHttpError } from './failurePolicy';

export interface OnesieHotConfig {
  clientKeyData: Uint8Array;
  encryptedClientKey: Uint8Array;
  onesieUstreamerConfig: Uint8Array;
  baseUrl: string;
  keyExpiresInSeconds: number;
  timestamp?: number;
}

export interface EncryptedRequest {
  encrypted: Uint8Array;
  hmac: Uint8Array;
  iv: Uint8Array;
}

export const REDIRECTOR_STORAGE_KEY = 'todotube_googlevideo_redirector';
export const CLIENT_CONFIG_STORAGE_KEY = 'todotube_onesie_config';

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function encryptRequest(clientKey: Uint8Array, data: Uint8Array): Promise<EncryptedRequest> {
  if (clientKey.length !== 32) throw new Error('Invalid Onesie client key length.');

  const aesKeyData = new ArrayBuffer(16);
  const hmacKeyData = new ArrayBuffer(16);
  new Uint8Array(aesKeyData).set(clientKey.subarray(0, 16));
  new Uint8Array(hmacKeyData).set(clientKey.subarray(16, 32));
  const iv = window.crypto.getRandomValues(new Uint8Array(16));
  const aesKey = await window.crypto.subtle.importKey('raw', aesKeyData, { name: 'AES-CTR', length: 128 }, false, ['encrypt']);
  const dataBuffer = new ArrayBuffer(data.byteLength);
  new Uint8Array(dataBuffer).set(data);
  const encrypted = new Uint8Array(await window.crypto.subtle.encrypt(
    { name: 'AES-CTR', counter: iv, length: 128 }, aesKey, dataBuffer,
  ));
  const hmacKey = await window.crypto.subtle.importKey(
    'raw', hmacKeyData, { name: 'HMAC', hash: { name: 'SHA-256' } }, false, ['sign'],
  );
  const hmac = new Uint8Array(await window.crypto.subtle.sign(
    'HMAC', hmacKey, new Uint8Array([...encrypted, ...iv]),
  ));
  return { encrypted, hmac, iv };
}

export function isConfigValid(config: OnesieHotConfig): boolean {
  if (!config.timestamp || !config.keyExpiresInSeconds) return false;
  return Date.now() < config.timestamp + config.keyExpiresInSeconds * 1000;
}

export function loadCachedClientConfig(): OnesieHotConfig | null {
  try {
    const value = localStorage.getItem(CLIENT_CONFIG_STORAGE_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value);
    if (!isConfigValid(parsed)) {
      localStorage.removeItem(CLIENT_CONFIG_STORAGE_KEY);
      return null;
    }
    return {
      ...parsed,
      clientKeyData: new Uint8Array(Object.values(parsed.clientKeyData)),
      encryptedClientKey: new Uint8Array(Object.values(parsed.encryptedClientKey)),
      onesieUstreamerConfig: new Uint8Array(Object.values(parsed.onesieUstreamerConfig)),
    };
  } catch (error) {
    console.warn('[TodoTube] No se pudo cargar la configuración Onesie almacenada:', error);
    localStorage.removeItem(CLIENT_CONFIG_STORAGE_KEY);
    return null;
  }
}

export async function fetchOnesieHotConfig(): Promise<OnesieHotConfig | null> {
  const cached = loadCachedClientConfig();
  if (cached) return cached;

  try {
    const response = await fetchFunction(
      'https://www.youtube.com/tv_config?action_get_config=true&client=lb4&theme=cl',
      { method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0 (ChromiumStylePlatform) Cobalt/Version' } },
    );
    const configResponse = JSON.parse((await response.text()).slice(4));
    const hot = configResponse.webPlayerContextConfig.WEB_PLAYER_CONTEXT_CONFIG_ID_LIVING_ROOM_WATCH.onesieHotConfig;
    const config: OnesieHotConfig = {
      clientKeyData: decodeBase64(hot.clientKey),
      keyExpiresInSeconds: hot.keyExpiresInSeconds,
      encryptedClientKey: decodeBase64(hot.encryptedClientKey),
      onesieUstreamerConfig: decodeBase64(hot.onesieUstreamerConfig),
      baseUrl: hot.baseUrl,
      timestamp: Date.now(),
    };
    localStorage.setItem(CLIENT_CONFIG_STORAGE_KEY, JSON.stringify({
      ...config,
      clientKeyData: Array.from(config.clientKeyData),
      encryptedClientKey: Array.from(config.encryptedClientKey),
      onesieUstreamerConfig: Array.from(config.onesieUstreamerConfig),
    }));
    return config;
  } catch (error) {
    console.warn('[TodoTube] No se pudo obtener la configuración Onesie:', error);
    return null;
  }
}

export async function fetchRedirectorUrl(): Promise<string> {
  const cached = localStorage.getItem(REDIRECTOR_STORAGE_KEY);
  if (cached?.startsWith('https://')) return cached;
  const response = await fetchFunction(
    'https://redirector.googlevideo.com/initplayback?source=youtube&itag=0&pvi=0&pai=0&owc=yes&cmo:sensitive_content=yes&alr=yes&id=' + Math.round(Math.random() * 1e5),
    { method: 'GET' },
  );
  const url = await response.text();
  if (!url.startsWith('https://')) throw new Error('YouTube redirector returned an invalid URL.');
  localStorage.setItem(REDIRECTOR_STORAGE_KEY, url);
  return url;
}



/** YouTube control requests use the same-origin Worker; media requests remain browser-direct. */
const CONTROL_FORWARD_HEADERS = new Set([
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

type SerializedControlBody = { encoding: 'utf8' | 'base64'; data: string } | null;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

async function serializeControlBody(body: BodyInit | null | undefined): Promise<SerializedControlBody> {
  if (body == null) return null;
  if (typeof body === 'string') return { encoding: 'utf8', data: body };
  if (body instanceof URLSearchParams) return { encoding: 'utf8', data: body.toString() };

  let bytes: Uint8Array;
  if (body instanceof ArrayBuffer) bytes = new Uint8Array(body);
  else if (ArrayBuffer.isView(body)) {
    bytes = new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
  } else if (body instanceof Blob) {
    bytes = new Uint8Array(await body.arrayBuffer());
  } else {
    throw new Error('El tipo de cuerpo de la solicitud de control no es compatible.');
  }
  return { encoding: 'base64', data: bytesToBase64(bytes) };
}

/**
 * InnerTube and BotGuard control requests go through TodoTube's same-origin Worker.
 * Media manifests/segments remain direct browser requests to their Google Video URLs.
 */
export async function fetchFunction(input: string | Request | URL, init?: RequestInit): Promise<Response> {
  const prepared = await prepareFetchRequest(input, init);
  const { url } = prepared;
  const requestInit = prepared.init;

  if (url.pathname.includes('/v1/player')) {
    url.searchParams.set('$fields', 'playerConfig,storyboards,captions,playabilityStatus,streamingData,responseContext.mainAppWebResponseContext.datasyncId,videoDetails.isLive,videoDetails.isLiveContent,videoDetails.title,videoDetails.author,videoDetails.thumbnail');
  }

  const originalHeaders = new Headers(requestInit.headers);
  const forwardedHeaders: Record<string, string> = {};
  originalHeaders.forEach((value, key) => {
    if (CONTROL_FORWARD_HEADERS.has(key.toLowerCase())) forwardedHeaders[key.toLowerCase()] = value;
  });
  const serializedBody = await serializeControlBody(requestInit.body);
  const bodyBytes = serializedBody
    ? serializedBody.encoding === 'base64'
      ? Math.floor(serializedBody.data.length * 3 / 4)
      : new TextEncoder().encode(serializedBody.data).byteLength
    : 0;

  const response = await fetch('/api/youtube/control', {
    method: 'POST',
    cache: 'no-store',
    signal: requestInit.signal ?? undefined,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      target: url.toString(),
      method: requestInit.method ?? 'GET',
      headers: forwardedHeaders,
      body: serializedBody,
    }),
  });

  if (!response.ok && !url.pathname.includes('/youtubei/v1/player')) {
    console.warn('[TodoTube] Falló una solicitud de control de YouTube', JSON.stringify({
      status: response.status,
      method: requestInit.method ?? 'GET',
      host: url.hostname,
      path: url.pathname,
      contentType: response.headers.get('content-type'),
    }));
  }

  if (url.pathname.includes('/youtubei/v1/player') && !response.ok) {
    const responseBody = await response.text().catch(() => '');
    console.error('[TodoTube] InnerTube /player diagnostic', JSON.stringify({
      status: response.status,
      method: requestInit.method ?? 'GET',
      requestTarget: url.hostname + url.pathname,
      bodyBytes,
      requestHeaderNames: Object.keys(forwardedHeaders).sort(),
      requestSummary: summarizeInnerTubeRequest(requestInit.body),
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

