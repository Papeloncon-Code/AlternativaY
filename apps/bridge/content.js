// TodoTube Puente · solo se carga en TodoTube (ver manifest). Pasa mensajes entre la página y el fondo de la extensión.
const api = globalThis.browser ?? globalThis.chrome;
const s = document.createElement('script');
s.src = api.runtime.getURL('injected.js');
s.onload = () => s.remove();
(document.head || document.documentElement).appendChild(s);

window.addEventListener('message', (event) => {
  if (event.source !== window || event.data?.type !== 'TODOTUBE_FETCH_REQUEST') return;
  const { requestId, url, options } = event.data;
  api.runtime.sendMessage({ action: 'todotube-fetch', url, options }, (response) => {
    window.postMessage({ type: 'TODOTUBE_FETCH_RESPONSE', requestId, ...(response || { success: false, error: 'Sin respuesta del puente' }) }, window.location.origin);
  });
});
