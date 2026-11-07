import { useEffect, useRef, useState } from 'react';
import { actions, type Meta } from '../store';
import { loadYouTubeApi } from '../youtube';
import { ErrorBox } from './States';

// Reproductor de reserva: el oficial incrustado (cuando no hay TodoTube Puente o falla el reproductor propio).
export default function OfficialPlayer({ id, meta, startAt }: { id: string; meta: Meta; startAt: number }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const metaRef = useRef(meta);
  metaRef.current = meta;

  useEffect(() => {
    let player: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    let timer: number | undefined;
    let cancelled = false;
    const save = () => { try { actions.saveProgress(metaRef.current, player.getCurrentTime(), player.getDuration()); } catch { /* no listo */ } };
    loadYouTubeApi().then((YT) => {
      if (cancelled || !hostRef.current) return;
      const el = document.createElement('div');
      hostRef.current.replaceChildren(el);
      player = new YT.Player(el, {
        host: 'https://www.youtube-nocookie.com',
        videoId: id,
        playerVars: { start: Math.floor(startAt), rel: 0, playsinline: 1, autoplay: 1 },
        events: {
          onStateChange: (e: { data: number }) => {
            if (e.data === 1) { actions.addHistory(metaRef.current); window.clearInterval(timer); timer = window.setInterval(save, 5000); }
            if (e.data === 2 || e.data === 0) { window.clearInterval(timer); save(); }
          },
          onError: (e: { data: number }) => setError(e.data === 101 || e.data === 150 ? 'El autor no permite reproducir este vídeo aquí.' : 'Este vídeo no está disponible.'),
        },
      });
    }).catch((e: Error) => setError(e.message));
    return () => { cancelled = true; window.clearInterval(timer); if (player) { save(); player.destroy?.(); } };
  }, [id, startAt]);

  return error ? <ErrorBox message={error} /> : <div ref={hostRef} className="player-host" />;
}
