import { useEffect, useRef, useState } from 'react';
import { YouTubeSabrRuntime } from '../player/youtube/YouTubeSabrRuntime';

type Props = {
  id: string;
  startAt?: number;
  compact?: boolean;
  autoplay?: boolean;
  initialVolume?: number;
  initialPlaybackRate?: number;
};

function timeLabel(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const value = Math.floor(seconds);
  return Math.floor(value / 60) + ':' + String(value % 60).padStart(2, '0');
}

export default function YouTubeSabrPlayer({
  id,
  startAt = 0,
  compact = false,
  autoplay = true,
  initialVolume = 1,
  initialPlaybackRate = 1,
}: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const runtimeRef = useRef<YouTubeSabrRuntime | null>(null);
  const [status, setStatus] = useState<'loading' | 'playing' | 'switching' | 'error'>('loading');
  const [detail, setDetail] = useState('Preparando el reproductor TodoTube…');
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(Math.max(0, startAt));
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(initialVolume);
  const [rate, setRate] = useState(initialPlaybackRate);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let active = true;
    const runtime = new YouTubeSabrRuntime({
      onStatus: (next, message) => {
        if (!active) return;
        setStatus(next);
        if (message) setDetail(message);
      },
      onFatal: (error) => {
        if (!active) return;
        setStatus('error');
        setDetail(error.message);
      },
    });
    runtimeRef.current = runtime;
    video.volume = initialVolume;
    video.playbackRate = initialPlaybackRate;
    setVolume(initialVolume);
    setRate(initialPlaybackRate);
    setStatus('loading');
    setDetail('Conectando con los proveedores de reproducción…');
    setCurrent(Math.max(0, startAt));
    setDuration(0);

    void runtime.attach(video)
      .then(() => runtime.load(id, startAt, autoplay))
      .catch((error: unknown) => {
        if (!active) return;
        setStatus('error');
        setDetail(error instanceof Error ? error.message : String(error));
      });

    return () => {
      active = false;
      runtimeRef.current = null;
      void runtime.dispose();
    };
  }, [id, startAt, autoplay, initialVolume, initialPlaybackRate, retry]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTime = () => setCurrent(video.currentTime);
    const onDuration = () => setDuration(Number.isFinite(video.duration) ? video.duration : 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    video.addEventListener('timeupdate', onTime);
    video.addEventListener('durationchange', onDuration);
    video.addEventListener('loadedmetadata', onDuration);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    return () => {
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('durationchange', onDuration);
      video.removeEventListener('loadedmetadata', onDuration);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, [id]);

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch((error) => {
      setStatus('error');
      setDetail(error instanceof Error ? error.message : String(error));
    });
    else video.pause();
  }

  function changeVolume(next: number) {
    if (videoRef.current) videoRef.current.volume = next;
    setVolume(next);
  }

  function changeRate(next: number) {
    if (videoRef.current) videoRef.current.playbackRate = next;
    setRate(next);
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void wrap.current?.requestFullscreen();
  }

  function retryPlayback() {
    setRetry((value) => value + 1);
  }

  const original = 'https://www.youtube.com/watch?v=' + encodeURIComponent(id) +
    (startAt > 0 ? '&t=' + Math.floor(startAt) + 's' : '');

  return (
    <div className={'gateway-player youtube-sabr-player' + (compact ? ' compact' : '')} ref={wrap}>
      <video
        ref={videoRef}
        playsInline
        preload="metadata"
        className="gateway-video"
        aria-label="Reproductor TodoTube"
      />
      {(status === 'loading' || status === 'switching') && (
        <div className="gateway-recovering" role="status" aria-live="polite">{detail}</div>
      )}
      {status === 'error' && (
        <div className="gateway-error" role="alert">
          <b>No se pudo iniciar la reproducción propia</b>
          <p>{detail}</p>
          <div className="player-message-actions">
            <button type="button" className="btn primary" onClick={retryPlayback}>Reintentar proveedores</button>
            <a className="btn" href={original} target="_blank" rel="noreferrer">Abrir vídeo original</a>
          </div>
        </div>
      )}
      <div className="gateway-controls" aria-label="Controles del reproductor TodoTube">
        <button type="button" className="gateway-play" onClick={togglePlay} aria-label={playing ? 'Pausar' : 'Reproducir'}>
          {playing ? 'Pausar' : 'Reproducir'}
        </button>
        <span className="gateway-time">{timeLabel(current)}</span>
        <input
          className="gateway-seek"
          aria-label="Posición del vídeo"
          type="range"
          min="0"
          max={Math.max(0.01, duration)}
          step="0.1"
          value={Math.min(current, duration || current)}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (videoRef.current) videoRef.current.currentTime = next;
            setCurrent(next);
          }}
        />
        <span className="gateway-time">{timeLabel(duration)}</span>
        <label className="gateway-volume">Volumen
          <input aria-label="Volumen" type="range" min="0" max="1" step="0.05" value={volume}
            onChange={(event) => changeVolume(Number(event.target.value))} />
        </label>
        <label className="gateway-rate">Velocidad
          <select aria-label="Velocidad de reproducción" value={rate}
            onChange={(event) => changeRate(Number(event.target.value))}>
            {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((value) => (
              <option key={value} value={value}>{value}×</option>
            ))}
          </select>
        </label>
        <button type="button" onClick={toggleFullscreen} aria-label="Pantalla completa">Pantalla</button>
      </div>
      <span className="youtube-sabr-source" aria-live="polite">{status === 'playing' ? detail : ''}</span>
    </div>
  );
}
