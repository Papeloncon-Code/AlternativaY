import { useEffect, useRef, useState } from 'react';
import { actions, type Meta } from '../store';
import { EmbedPlayer } from '../player/embed';
import { ErrorBox } from './States';
import type { PlayerHandle } from '../player/handle';

// Reproductor de reserva: el oficial incrustado (cuando no hay TodoTube Puente o falla el reproductor propio).
type Props = { id: string; meta: Meta; startAt: number; onEnded?: () => void; onReady?: (h: PlayerHandle) => void; loop?: boolean };

export default function OfficialPlayer({ id, meta, startAt, onEnded, onReady, loop }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const metaRef = useRef(meta);
  metaRef.current = meta;
  const cb = useRef({ onEnded, onReady });
  cb.current = { onEnded, onReady };

  useEffect(() => {
    let player: EmbedPlayer | undefined;
    let timer: number | undefined;
    const save = () => { if (player && player.getDuration() > 0) actions.saveProgress(metaRef.current, player.getCurrentTime(), player.getDuration()); };
    if (hostRef.current) {
      const p = new EmbedPlayer(hostRef.current, id, {
        start: Math.floor(startAt), rel: 0, playsinline: 1, autoplay: 1,
        ...(loop ? { loop: 1, playlist: id, controls: 1 } : {}),
      }, {
        onReady: () => {
          cb.current.onReady?.({
            togglePlay: () => (p.getPlayerState() === 1 ? p.pauseVideo() : p.playVideo()),
            seekBy: (sec: number) => p.seekTo(Math.max(0, p.getCurrentTime() + sec)),
            seekToFraction: (f: number) => p.seekTo(p.getDuration() * f),
            toggleMute: () => (p.isMuted() ? p.unMute() : p.mute()),
            changeRate: (d: number) => { const r = Math.min(2, Math.max(0.25, +(p.getPlaybackRate() + d).toFixed(2))); p.setPlaybackRate(r); return r; },
            restart: () => { p.seekTo(0); p.playVideo(); },
            getTime: () => p.getCurrentTime(),
            seekTo: (sec: number) => p.seekTo(sec),
          });
        },
        onStateChange: (st) => {
          if (st === 1) { actions.addHistory(metaRef.current); window.clearInterval(timer); timer = window.setInterval(save, 5000); }
          if (st === 2 || st === 0) { window.clearInterval(timer); save(); }
          if (st === 0 && !loop) cb.current.onEnded?.();
        },
        onError: (code) => setError(code === 101 || code === 150 ? 'El autor no permite reproducir este vídeo aquí.' : 'Este vídeo no está disponible.'),
      });
      player = p;
    }
    return () => { window.clearInterval(timer); if (player) { save(); player.destroy(); } };
  }, [id, startAt, loop, retry]);

  return error ? <ErrorBox message={error} onRetry={() => { setError(''); setRetry((n) => n + 1); }} /> : <div ref={hostRef} className="player-host" />;
}
