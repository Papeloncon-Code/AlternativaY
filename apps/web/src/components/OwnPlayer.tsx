import { useEffect, useRef, useState } from 'react';
import { actions, type Meta } from '../store';
import type { PlayerHandle, VideoDetails } from '../player/handle';

// Reproductor propio (Shaka + SABR) a través de TodoTube Puente. Se carga bajo demanda: no pesa a quien no tiene el puente.
type Props = { id: string; meta: Meta; startAt: number; onFail: (reason: string) => void; onEnded?: () => void; onReady?: (h: PlayerHandle) => void; onDetails?: (d: VideoDetails) => void; loop?: boolean };

export default function OwnPlayer({ id, meta, startAt, onFail, onEnded, onReady, onDetails, loop }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<'cargando' | 'listo'>('cargando');
  const metaRef = useRef(meta);
  metaRef.current = meta;
  const failRef = useRef(onFail);
  failRef.current = onFail;
  const cb = useRef({ onEnded, onReady, onDetails });
  cb.current = { onEnded, onReady, onDetails };

  useEffect(() => {
    let destroyed = false;
    let instance: { destroy: () => Promise<void> } | undefined;
    const video = videoRef.current!;
    const t0 = performance.now();
    let lastSave = 0;
    const save = () => { if (video.duration) actions.saveProgress(metaRef.current, video.currentTime, video.duration); };
    const onTime = () => { if (performance.now() - lastSave > 5000) { lastSave = performance.now(); save(); } };
    const onPlay = () => actions.addHistory(metaRef.current);
    const onFirstFrame = () => console.info(`[TodoTube] primer fotograma en ${Math.round(performance.now() - t0)} ms`);
    video.addEventListener('timeupdate', onTime);
    video.addEventListener('pause', save);
    video.addEventListener('playing', onPlay, { once: true });
    video.addEventListener('loadeddata', onFirstFrame, { once: true });
    const onEnd = () => { save(); if (loop) { video.currentTime = 0; video.play().catch(() => {}); } else cb.current.onEnded?.(); };
    video.addEventListener('ended', onEnd);
    const handle: PlayerHandle = {
      togglePlay: () => (video.paused ? video.play().catch(() => {}) : video.pause()),
      seekBy: (sec) => { video.currentTime = Math.max(0, Math.min((video.duration || 0) - 0.5, video.currentTime + sec)); },
      seekToFraction: (f) => { if (video.duration) video.currentTime = video.duration * f; },
      toggleMute: () => { video.muted = !video.muted; },
      changeRate: (d) => { const r = Math.min(3, Math.max(0.25, +(video.playbackRate + d).toFixed(2))); video.playbackRate = r; return r; },
      restart: () => { video.currentTime = 0; video.play().catch(() => {}); },
      getTime: () => video.currentTime,
      seekTo: (sec) => { video.currentTime = sec; },
    };

    (async () => {
      try {
        const { TodoTubePlayer } = await import('../player/TodoTubePlayer');
        if (destroyed) return;
        const p = new TodoTubePlayer();
        instance = p;
        await p.attach(video, containerRef.current!);
        const info = await p.load(id, startAt);
        if (destroyed) return;
        setStatus('listo');
        cb.current.onReady?.(handle);
        cb.current.onDetails?.(info);
        video.play().catch(() => { /* el navegador puede exigir un toque para reproducir con sonido */ });
      } catch (e) {
        console.error('[TodoTube] Reproductor propio falló', e);
        if (!destroyed) failRef.current(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => {
      destroyed = true;
      save();
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('pause', save);
      video.removeEventListener('ended', onEnd);
      instance?.destroy();
    };
  }, [id, startAt, loop]);

  return (
    <div ref={containerRef} className="own-player" data-status={status}>
      <video ref={videoRef} playsInline autoPlay className="own-video" />
      {status === 'cargando' && <div className="own-loading" role="status">Cargando…</div>}
    </div>
  );
}
