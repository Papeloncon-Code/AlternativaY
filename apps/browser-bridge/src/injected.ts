import type { PendingRequest, ProxyResponse, ProxyResponseData } from './types';

Object.assign(window, { ytcBridge: { installed: true } });

let requestId = 0;
const pendingRequests = new Map<number, PendingRequest>();

const BINARY_BODY_PREFIX = '__TODOTUBE_BINARY_BASE64__:';

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function decodeBase64(value: string): ArrayBuffer {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

(window as Window & { proxyFetch?: (url: string, options?: RequestInit) => Promise<ProxyResponse> }).proxyFetch =
  (url: string, options: RequestInit = {}) => new Promise((resolve, reject) => {
    const id = ++requestId;
    pendingRequests.set(id, { resolve, reject });

    const requestOptions: Record<string, unknown> = { ...options, signal: undefined };
    if (options.body instanceof ArrayBuffer) requestOptions.body = BINARY_BODY_PREFIX + toBase64(new Uint8Array(options.body));
    else if (options.body instanceof Uint8Array) requestOptions.body = BINARY_BODY_PREFIX + toBase64(options.body);

    if (options.headers) {
      const headers: Record<string, string> = {};
      new Headers(options.headers).forEach((value, key) => { headers[key] = value; });
      requestOptions.headers = headers;
    }

    if (options.signal) {
      const abort = () => {
        const pending = pendingRequests.get(id);
        if (!pending) return;
        pendingRequests.delete(id);
        pending.reject(new DOMException('The request was aborted.', 'AbortError'));
      };
      if (options.signal.aborted) {
        abort();
        return;
      }
      options.signal.addEventListener('abort', abort, { once: true });
    }

    window.postMessage({
      type: 'PROXY_FETCH_REQUEST',
      requestId: id,
      url,
      options: requestOptions,
    }, window.location.origin);
  });

window.addEventListener('message', (event: MessageEvent) => {
  if (event.source !== window || event.origin !== window.location.origin || !event.data ||
      event.data.type !== 'PROXY_FETCH_RESPONSE') return;

  const data = event.data as ProxyResponseData;
  const pending = pendingRequests.get(data.requestId);
  if (!pending) return;
  pendingRequests.delete(data.requestId);

  if (!data.success) {
    pending.reject(new Error(data.error || 'TodoTube Bridge request failed.'));
    return;
  }

  const payload = data.data;
  const response: ProxyResponse = {
    ok: data.status !== undefined && data.status >= 200 && data.status < 300,
    status: data.status ?? 200,
    statusText: data.statusText ?? '',
    headers: new Headers(data.headers ?? {}),
    url: data.url ?? '',
    json: async () => {
      if (typeof payload !== 'string') return payload;
      return JSON.parse(payload);
    },
    text: async () => typeof payload === 'string' ? payload : JSON.stringify(payload),
    arrayBuffer: async () => {
      if (typeof payload === 'string' && /^[A-Za-z0-9+/]*={0,2}$/.test(payload)) return decodeBase64(payload);
      return new TextEncoder().encode(typeof payload === 'string' ? payload : JSON.stringify(payload)).buffer;
    },
  };
  pending.resolve(response);
});
