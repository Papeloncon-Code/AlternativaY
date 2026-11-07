// Carga única de la IFrame Player API oficial de YouTube (constitución §I.2: la web usa el reproductor oficial).
/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window { YT?: any; onYouTubeIframeAPIReady?: () => void }
}
let ready: Promise<any> | null = null;
export function loadYouTubeApi(): Promise<any> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!ready) {
    ready = new Promise((resolve, reject) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT); };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.async = true;
      s.onerror = () => { ready = null; reject(new Error('No se pudo cargar el reproductor. Revisa tu conexión.')); };
      document.head.appendChild(s);
    });
  }
  return ready;
}
