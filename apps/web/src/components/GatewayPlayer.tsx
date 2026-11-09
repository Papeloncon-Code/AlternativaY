import { useEffect, useRef, useState } from 'react';
import type { Meta } from '../store';
import { gatewayMediaUrl } from '../mediaGateway';
import { actions } from '../store';

function timeLabel(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const s = Math.floor(seconds);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

const STALL_RECOVERY_MS = 10000;
const MAX_AUTOMATIC_RECOVERIES = 1;

export default function GatewayPlayer({ id, meta }: { id: string; meta: Meta }) {
  const wrap = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSaveRef = useRef(0);
  const retryCountRef = useRef(0);
  const stallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPositionRef = useRef<number | null>(null);
  const resumePlaybackRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [rate, setRate] = useState(1);
  const [error, setError] = useState('');
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    const video = videoRef.current!;
    let disposed = false;
    const clearStallTimer = () => {
      if (stallTimerRef.current) clearTimeout(stallTimerRef.current);
      stallTimerRef.current = null;
    };
    const save = () => {
      if (video.duration && Date.now() - lastSaveRef.current > 4000) {
        lastSaveRef.current = Date.now();
        actions.saveProgress(meta, video.currentTime, video.duration);
      }
    };
    const finishRecovery = () => {
      setRecovering(false);
      setError('');
      clearStallTimer();
    };
    const recover = (reason: string, manual = false) => {
      if (disposed || recovering) return;
      if (!manual && retryCountRef.current >= MAX_AUTOMATIC_RECOVERIES) {
        setError(reason);
        return;
      }
      if (manual) retryCountRef.current = 0;
      retryCountRef.current += 1;
      pendingPositionRef.current = Number.isFinite(video.currentTime) ? video.currentTime : 0;
      resumePlaybackRef.current = !video.paused && !video.ended;
      setRecovering(true);
      setError('');
      clearStallTimer();
      // Reload only the same authorized gateway asset. The browser resumes at the
      // saved timestamp after metadata is available; no alternate video is selected.
      video.src = gatewayMediaUrl(id);
      video.load();
    };
    const scheduleStallRecovery = () => {
      clearStallTimer();
      if (video.paused || video.ended || disposed) return;
      stallTimerRef.current = setTimeout(() => {
        if (video.paused || video.ended || disposed) return;
        recover('La conexión dejó de entregar datos después de un intento de recuperación.');
      }, STALL_RECOVERY_MS);
    };
    const onMetadata = () => {
      setDuration(Number.isFinite(video.duration) ? video.duration : 0);
      if (pendingPositionRef.current !== null) {
        const position = Math.min(pendingPositionRef.current, Number.isFinite(video.duration) ? video.duration : pendingPositionRef.current);
        pendingPositionRef.current = null;
        if (position > 0) {
          try { video.currentTime = position; } catch { /* metadata may not be seekable yet */ }
        }
        if (resumePlaybackRef.current) {
          resumePlaybackRef.current = false;
          void video.play().catch((e) => setError(e instanceof Error ? e.message : String(e)));
        }
      }
    };
    const onTime = () => { setCurrent(video.currentTime); save(); };
    const onPlay = () => { setPlaying(true); };
    const onPause = () => { setPlaying(false); save(); };
    const onHistory = () => actions.addHistory(meta);
    const onError = () => recover(video.error?.message || 'El navegador no pudo leer el archivo multimedia.');
    const onStalled = () => scheduleStallRecovery();
    const onProgress = () => clearStallTimer();
    const onPlaying = () => { finishRecovery(); clearStallTimer(); };
    video.addEventListener('loadedmetadata', onMetadata);
    video.addEventListener('timeupdate', onTime);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('playing', onHistory, { once: true });
    video.addEventListener('playing', onPlaying);
    video.addEventListener('error', onError);
    video.addEventListener('stalled', onStalled);
    video.addEventListener('progress', onProgress);
    return () => {
      disposed = true;
      clearStallTimer();
      save();
      video.removeEventListener('loadedmetadata', onMetadata);
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('playing', onHistory);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('error', onError);
      video.removeEventListener('stalled', onStalled);
      video.removeEventListener('progress', onProgress);
    };
  }, [id, meta]);

  function togglePlay() {
    const video = videoRef.current!;
    if (video.paused) void video.play().catch((e) => setError(e instanceof Error ? e.message : String(e)));
    else video.pause();
  }
  function changeVolume(next: number) {
    const video = videoRef.current!;
    video.volume = next;
    setVolume(next);
  }
  function changeRate(next: number) {
    videoRef.current!.playbackRate = next;
    setRate(next);
  }
  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void wrap.current?.requestFullscreen();
  }
  function retryManually() {
    const video = videoRef.current!;
    retryCountRef.current = 0;
    pendingPositionRef.current = Number.isFinite(video.currentTime) ? video.currentTime : current;
    resumePlaybackRef.current = playing;
    setError('');
    setRecovering(true);
    video.src = gatewayMediaUrl(id);
    video.load();
  }

  return <div className="gateway-player" ref={wrap}>
    <video ref={videoRef} src={gatewayMediaUrl(id)} crossOrigin="anonymous" playsInline preload="metadata" className="gateway-video" />
    {recovering && <div className="gateway-recovering" role="status">Reconectando el mismo archivo…</div>}
    {error && <div className="gateway-error" role="alert"><b>No se pudo recuperar este medio</b><p>{error}</p><button type="button" className="btn" onClick={retryManually}>Reintentar</button><a className="btn" href="/medios">Volver a la biblioteca</a></div>}
    {!error && <div className="gateway-controls" aria-label="Controles del reproductor TodoTube">
      <button type="button" className="gateway-play" onClick={togglePlay} aria-label={playing ? 'Pausar' : 'Reproducir'}>{playing ? 'Pausar' : 'Reproducir'}</button>
      <span className="gateway-time">{timeLabel(current)}</span>
      <input className="gateway-seek" aria-label="Posición del vídeo" type="range" min="0" max={Math.max(0.01, duration)} step="0.1" value={Math.min(current, duration || current)} onChange={(e) => { videoRef.current!.currentTime = Number(e.target.value); setCurrent(Number(e.target.value)); }} />
      <span className="gateway-time">{timeLabel(duration)}</span>
      <label className="gateway-volume">Volumen
        <input aria-label="Volumen" type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => changeVolume(Number(e.target.value))} />
      </label>
      <label className="gateway-rate">Velocidad
        <select aria-label="Velocidad de reproducción" value={rate} onChange={(e) => changeRate(Number(e.target.value))}>
          {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((v) => <option key={v} value={v}>{v}×</option>)}
        </select>
      </label>
      <button type="button" onClick={toggleFullscreen} aria-label="Pantalla completa">Pantalla</button>
    </div>}
  </div>;
}
