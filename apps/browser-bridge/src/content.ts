import type { ProxyFetchRequest } from './types';

function injectScript(): void {
  try {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('dist/injected.bundle.js');
    script.addEventListener('load', () => script.remove(), { once: true });
    (document.head || document.documentElement).appendChild(script);

    window.addEventListener('message', (event: MessageEvent) => {
      if (event.source !== window || event.origin !== window.location.origin ||
          !event.data || event.data.type !== 'PROXY_FETCH_REQUEST') return;

      const request = event.data as ProxyFetchRequest;
      chrome.runtime.sendMessage({
        action: 'fetch',
        url: request.url,
        options: request.options,
      }, (response) => {
        const runtimeError = chrome.runtime.lastError;
        window.postMessage({
          type: 'PROXY_FETCH_RESPONSE',
          requestId: request.requestId,
          success: !runtimeError && !!response?.success,
          ...(runtimeError ? { error: runtimeError.message } : response),
        }, window.location.origin);
      });
    });
  } catch (error) {
    console.error('[TodoTube Bridge] No se pudo inyectar el puente:', error);
  }
}

injectScript();
