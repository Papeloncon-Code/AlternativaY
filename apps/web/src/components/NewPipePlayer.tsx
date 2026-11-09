import { useEffect, useRef, useState } from 'react';
import type { Meta } from '../store';
import { actions } from '../store';
import { resolveYoutubeStream, type ResolvedYouTubeStream } from '../youtubeResolver';

function timeLabel(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const value = Math.floor(seconds);
  return Math.floor(value / 60) + ':' + String(value % 60).padStart(2, '0');
}

const STALL_RECOVERY_MS = 10000;

export default function NewPipePlayer({
  id,
  meta,
  startAt = 0,
  compact = false,
  stream,
}: {
  id: string;
  meta: Meta;
  startAt?: number;
  compact?: boolean;
  stream: ResolvedYouTubeStream;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const metaRef = useRef(meta);
  metaRef.current = meta;
  const sourceRef = useRef(stream);
  const retryCountRef = useRef(0);
  const recoveringRef = useRef(false);
  const retryPromiseRef = useRef(false);
  const pendingPositionRef = useRef<number | null>(null);
  const resumePlaybackRef = useRef(false);
  const initialPositionRef = useRef(Math.max(0, startAt));
  const lastSaveRef = useRef(0);
  const hasHistoryRef = useRef(false);
  const stallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [source, setSource] = useState(stream);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(stream.durationSeconds || 0);
  const [volume, setVolume] = useState(1);
  const [rate, setRate] = useState(1);
  const [error, setError] = useState('');
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    sourceRef.current = stream;
    setSource(stream);
  }, [stream]);

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
        actions.saveProgress(metaRef.current, video.currentTime, video.duration);
      }
    };
    const reloadSource = async (manual = false) => {
      if (disposed || retryPromiseRef.current) return;
      if (!manual && retryCountRef.current >= 1) {
        setError('El flujo dejó de responder después de un reintento. Pulsa Reintentar para volver a resolverlo.');
        return;
      }
      retryPromiseRef.current = true;
      retryCountRef.current += 1;
      pendingPositionRef.current = Number.isFinite(video.currentTime) ? video.currentTime : 0;
      resumePlaybackRef.current = !video.paused && !video.ended;
      recoveringRef.current = true;
      setRecovering(true);
      setError('');
      clearStallTimer();
      try {
        const next = await resolveYoutubeStream(id);
        if (disposed) return;
        sourceRef.current = next;
        setSource(next);
      } catch (cause) {
        if (!disposed) {
          recoveringRef.current = false;
          setRecovering(false);
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      } finally {
        retryPromiseRef.current = false;
      }
    };
    const onMetadata = () => {
      setDuration(Number.isFinite(video.duration) ? video.duration : sourceRef.current.durationSeconds || 0);
      const pending = pendingPositionRef.current;
      if (pending !== null) {
        pendingPositionRef.current = null;
        try { video.currentTime = Math.min(pending, video.duration || pending); } catch { /* wait for seekable metadata */ }
        if (resumePlaybackRef.current) {
          resumePlaybackRef.current = false;
          void video.play().catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)));
        }
      } else if (initialPositionRef.current > 0) {
        const position = initialPositionRef.current;
        initialPositionRef.current = 0;
        try { video.currentTime = Math.min(position, video.duration || position); } catch { /* not seekable yet */ }
      }
    };
    const onTime = () => { setCurrent(video.currentTime); save(); };
    const onPlay = () => setPlaying(true);
    const onPause = () => { setPlaying(false); save(); };
    const onPlaying = () => {
      recoveringRef.current = false;
      retryCountRef.current = 0;
      setRecovering(false);
      setError('');
      clearStallTimer();
      if (!hasHistoryRef.current) {
        hasHistoryRef.current = true;
        actions.addHistory(metaRef.current);
      }
    };
    const onError = () => {
      if (recoveringRef.current) {
        recoveringRef.current = false;
        setRecovering(false);
      }
      void reloadSource(false);
    };
    const scheduleStallRecovery = () => {
      clearStallTimer();
      if (video.paused || video.ended || disposed) return;
      stallTimerRef.current = setTimeout(() => {
        if (!video.paused && !video.ended && !disposed) void reloadSource(false);
      }, STALL_RECOVERY_MS);
    };
    const onProgress = () => clearStallTimer();

    video.addEventListener('loadedmetadata', onMetadata);
    video.addEventListener('timeupdate', onTime);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('error', onError);
    video.addEventListener('stalled', scheduleStallRecovery);
    video.addEventListener('progress', onProgress);

    return () => {
      disposed = true;
      clearStallTimer();
      save();
      video.removeEventListener('loadedmetadata', onMetadata);
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('error', onError);
      video.removeEventListener('stalled', scheduleStallRecovery);
      video.removeEventListener('progress', onProgress);
    };
  }, [id]);

  function togglePlay() {
    const video = videoRef.current!;
    if (video.paused) void video.play().catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)));
    else video.pause();
  }
  function changeVolume(next: number) {
    videoRef.current!.volume = next;
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
    retryCountRef.current = 0;
    const video = videoRef.current!;
    pendingPositionRef.current = Number.isFinite(video.currentTime) ? video.currentTime : current;
    resumePlaybackRef.current = playing;
    void resolveYoutubeStream(id).then((next) => {
      sourceRef.current = next;
      setSource(next);
      recoveringRef.current = true;
      setRecovering(true);
      setError('');
    }).catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)));
  }

  return (
    <div className={'gateway-player newpipe-player' + (compact ? ' compact' : '')} ref={wrap}>
      <video
        ref={videoRef}
        src={source.streamUrl}
        playsInline
        preload="metadata"
        className="gateway-video"
      />
      {recovering && <div className="gateway-recovering" role="status">Reconectando el mismo vídeo…</div>}
      {error && (
        <div className="gateway-error" role="alert">
          <b>No se pudo reproducir este vídeo</b>
          <p>{error}</p>
          <button type="button" className="btn" onClick={retryManually}>Reintentar</button>
        </div>
      )}
      {!error && (
        <div className="gateway-controls" aria-label="Controles del reproductor TodoTube">
          <button type="button" className="gateway-play" onClick={togglePlay} aria-label={playing ? 'Pausar' : 'Reproducir'}>{playing ? 'Pausar' : 'Reproducir'}</button>
          <span className="gateway-time">{timeLabel(current)}</span>
          <input className="gateway-seek" aria-label="Posición del vídeo" type="range" min="0" max={Math.max(0.01, duration)} step="0.1" value={Math.min(current, duration || current)} onChange={(event) => { videoRef.current!.currentTime = Number(event.target.value); setCurrent(Number(event.target.value)); }} />
          <span className="gateway-time">{timeLabel(duration)}</span>
          <label className="gateway-volume">Volumen
            <input aria-label="Volumen" type="range" min="0" max="1" step="0.05" value={volume} onChange={(event) => changeVolume(Number(event.target.value))} />
          </label>
          <label className="gateway-rate">Velocidad
            <select aria-label="Velocidad de reproducción" value={rate} onChange={(event) => changeRate(Number(event.target.value))}>
              {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((value) => <option key={value} value={value}>{value}×</option>)}
            </select>
          </label>
          <button type="button" onClick={toggleFullscreen} aria-label="Pantalla completa">Pantalla</button>
        </div>
      )}
      <span className="newpipe-stream-label" aria-hidden="true">{source.resolution || 'TodoTube'}</span>
    </div>
  );
}
