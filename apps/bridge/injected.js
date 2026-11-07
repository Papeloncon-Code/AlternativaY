// TodoTube Puente · expone window.todotubeBridge.fetch(url, init) → Response, para la página de TodoTube.
(() => {
  let next = 0;
  const pending = new Map();
  const toB64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };

  async function bridgeFetch(input, init = {}) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const headers = {};
    new Headers(init.headers || (input instanceof Request ? input.headers : undefined)).forEach((v, k) => { headers[k] = v; });
    let body = init.body ?? (input instanceof Request && input.method !== 'GET' ? await input.arrayBuffer() : undefined);
    let bodyIsBase64 = false;
    if (body instanceof ArrayBuffer) body = new Uint8Array(body);
    if (ArrayBuffer.isView(body)) { body = toB64(new Uint8Array(body.buffer, body.byteOffset, body.byteLength)); bodyIsBase64 = true; }
    const method = init.method || (input instanceof Request ? input.method : undefined);
    const requestId = ++next;
    return new Promise((resolve, reject) => {
      pending.set(requestId, { resolve, reject });
      init.signal?.addEventListener('abort', () => { pending.delete(requestId); reject(new DOMException('Aborted', 'AbortError')); });
      window.postMessage({ type: 'TODOTUBE_FETCH_REQUEST', requestId, url, options: { method, headers, body, bodyIsBase64 } }, window.location.origin);
    });
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window || event.data?.type !== 'TODOTUBE_FETCH_RESPONSE') return;
    const { requestId, success, error, status, statusText, headers, body } = event.data;
    const p = pending.get(requestId);
    if (!p) return;
    pending.delete(requestId);
    if (!success) { p.reject(new TypeError(error || 'Fallo del puente')); return; }
    const bytes = Uint8Array.from(atob(body || ''), (c) => c.charCodeAt(0));
    p.resolve(new Response([204, 304].includes(status) ? null : bytes, { status, statusText, headers }));
  });

  window.todotubeBridge = { installed: true, version: '0.1.0', fetch: bridgeFetch };
  window.dispatchEvent(new Event('todotube-bridge-ready'));
})();
