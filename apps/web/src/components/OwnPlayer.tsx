import { useEffect, useRef, useState } from 'react';
import { actions, type Meta } from '../store';

// Reproductor propio (Shaka + SABR) a través de TodoTube Puente. Se carga bajo demanda: no pesa a quien no tiene el puente.
export default function OwnPlayer({ id, meta, startAt, onFail }: { id: string; meta: Meta; startAt: number; onFail: (reason: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<'cargando' | 'listo'>('cargando');
  const metaRef = useRef(meta);
  metaRef.current = meta;
  const failRef = useRef(onFail);
  failRef.current = onFail;

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

    (async () => {
      try {
        const { TodoTubePlayer } = await import('../player/TodoTubePlayer');
        if (destroyed) return;
        const p = new TodoTubePlayer();
        instance = p;
        await p.attach(video, containerRef.current!);
        await p.load(id, startAt);
        if (destroyed) return;
        setStatus('listo');
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
      instance?.destroy();
    };
  }, [id, startAt]);

  return (
    <div ref={containerRef} className="own-player" data-status={status}>
      <video ref={videoRef} playsInline autoPlay className="own-video" />
      {status === 'cargando' && <div className="own-loading" role="status">Cargando…</div>}
    </div>
  );
}
