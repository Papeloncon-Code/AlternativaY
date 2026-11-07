import { useEffect, useRef, useState } from 'react';
import { actions, type Meta } from '../store';
import { loadYouTubeApi } from '../youtube';
import { ErrorBox } from './States';
import type { PlayerHandle } from '../player/handle';

// Reproductor de reserva: el oficial incrustado (cuando no hay TodoTube Puente o falla el reproductor propio).
type Props = { id: string; meta: Meta; startAt: number; onEnded?: () => void; onReady?: (h: PlayerHandle) => void; loop?: boolean };

export default function OfficialPlayer({ id, meta, startAt, onEnded, onReady, loop }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const metaRef = useRef(meta);
  metaRef.current = meta;
  const cb = useRef({ onEnded, onReady });
  cb.current = { onEnded, onReady };

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
        playerVars: { start: Math.floor(startAt), rel: 0, playsinline: 1, autoplay: 1, ...(loop ? { loop: 1, playlist: id } : {}) },
        events: {
          onReady: () => {
            cb.current.onReady?.({
              togglePlay: () => (player.getPlayerState() === 1 ? player.pauseVideo() : player.playVideo()),
              seekBy: (sec: number) => player.seekTo(Math.max(0, player.getCurrentTime() + sec), true),
              seekToFraction: (f: number) => player.seekTo(player.getDuration() * f, true),
              toggleMute: () => (player.isMuted() ? player.unMute() : player.mute()),
              changeRate: (d: number) => { const r = Math.min(2, Math.max(0.25, +(player.getPlaybackRate() + d).toFixed(2))); player.setPlaybackRate(r); return r; },
              restart: () => { player.seekTo(0, true); player.playVideo(); },
            });
          },
          onStateChange: (e: { data: number }) => {
            if (e.data === 1) { actions.addHistory(metaRef.current); window.clearInterval(timer); timer = window.setInterval(save, 5000); }
            if (e.data === 2 || e.data === 0) { window.clearInterval(timer); save(); }
            if (e.data === 0 && !loop) cb.current.onEnded?.();
          },
          onError: (e: { data: number }) => setError(e.data === 101 || e.data === 150 ? 'El autor no permite reproducir este vídeo aquí.' : 'Este vídeo no está disponible.'),
        },
      });
    }).catch((e: Error) => setError(e.message));
    return () => { cancelled = true; window.clearInterval(timer); if (player) { save(); player.destroy?.(); } };
  }, [id, startAt, loop]);

  return error ? <ErrorBox message={error} /> : <div ref={hostRef} className="player-host" />;
}
