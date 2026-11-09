import shaka from 'shaka-player/dist/shaka-player.ui';

declare global {
  interface Window {
    ytcBridge?: { installed: boolean };
    proxyFetch?: (url: string, options?: RequestInit) => Promise<Response>;
  }
}

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

export function checkExtension(): boolean {
  return window.ytcBridge?.installed === true && typeof window.proxyFetch === 'function';
}

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


export function getInjectedProxyFunction() {
  return window.proxyFetch;
}

/** InnerTube requests use the browser bridge; googlevideo media requests stay in Shaka's normal fetch path. */
export async function fetchFunction(input: string | Request | URL, init?: RequestInit): Promise<Response> {
  const url = input instanceof URL ? input : new URL(typeof input === 'string' ? input : input.url);
  const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
  const requestInit = { ...init, headers };

  if (url.pathname.includes('/v1/player')) {
    url.searchParams.set('$fields', 'playerConfig,storyboards,captions,playabilityStatus,streamingData,responseContext.mainAppWebResponseContext.datasyncId,videoDetails.isLive,videoDetails.isLiveContent,videoDetails.title,videoDetails.author,videoDetails.thumbnail');
  }

  if (url.pathname.includes('initplayback')) return fetch(url, requestInit);

  const proxyFetch = getInjectedProxyFunction();
  if (!proxyFetch) throw new Error('TodoTube Bridge no está instalado o no está activo en este sitio.');
  return proxyFetch(url.toString(), requestInit);
}

export function asMap<K, V>(object: Record<string, V>): Map<K, V> {
  const map = new Map<K, V>();
  for (const key of Object.keys(object)) map.set(key as K, object[key]);
  return map;
}

export function createRecoverableError(message: string, info?: Record<string, any>) {
  return new shaka.util.Error(
    shaka.util.Error.Severity.RECOVERABLE,
    shaka.util.Error.Category.NETWORK,
    shaka.util.Error.Code.HTTP_ERROR,
    message,
    { info },
  );
}

export function headersToGenericObject(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => { result[key.trim()] = value; });
  return result;
}

export function makeResponse(
  headers: Record<string, string>,
  data: BufferSource,
  status: number,
  uri: string,
  responseURL: string,
  request: shaka.extern.Request,
  requestType: shaka.net.NetworkingEngine.RequestType,
): shaka.extern.Response & { originalRequest: shaka.extern.Request } {
  if (status >= 200 && status <= 299 && status !== 202) {
    return {
      uri: responseURL || uri,
      originalUri: uri,
      data,
      status,
      headers,
      originalRequest: request,
      fromCache: !!headers['x-shaka-from-cache'],
    };
  }

  let responseText: string | null = null;
  try { responseText = shaka.util.StringUtils.fromBytesAutoDetect(data); } catch { /* non-text response */ }

  const severity = status === 401 || status === 403
    ? shaka.util.Error.Severity.CRITICAL
    : shaka.util.Error.Severity.RECOVERABLE;

  throw new shaka.util.Error(
    severity,
    shaka.util.Error.Category.NETWORK,
    shaka.util.Error.Code.BAD_HTTP_STATUS,
    uri,
    status,
    responseText,
    headers,
    requestType,
    responseURL || uri,
  );
}
