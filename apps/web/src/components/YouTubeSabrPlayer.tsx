import { useEffect, useRef, useState } from 'react';
import type { Meta } from '../store';
import { actions } from '../store';
import { YouTubeSabrRuntime } from '../player/youtube/YouTubeSabrRuntime';

type PlaybackFailure = {
  position: number;
  wasPlaying: boolean;
  volume: number;
  playbackRate: number;
  error: string;
};

type Props = {
  id: string;
  meta: Meta;
  startAt?: number;
  compact?: boolean;
  autoplay?: boolean;
  initialVolume?: number;
  initialPlaybackRate?: number;
  onPlaybackExhausted?: (failure: PlaybackFailure) => void;
};

function timeLabel(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const value = Math.floor(seconds);
  return Math.floor(value / 60) + ':' + String(value % 60).padStart(2, '0');
}

export default function YouTubeSabrPlayer({
  id,
  meta,
  startAt = 0,
  compact = false,
  autoplay = true,
  initialVolume = 1,
  initialPlaybackRate = 1,
  onPlaybackExhausted,
}: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const metaRef = useRef(meta);
  metaRef.current = meta;
  const lastSaveRef = useRef(0);
  const fatalReportedRef = useRef(false);
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
    fatalReportedRef.current = false;
    const runtime = new YouTubeSabrRuntime({
      onStatus: (next, message) => {
        if (!active) return;
        setStatus(next);
        if (message) setDetail(message);
      },
      onFatal: (error) => {
        if (!active || fatalReportedRef.current) return;
        fatalReportedRef.current = true;
        setStatus('error');
        setDetail(error.message);
        onPlaybackExhausted?.({
          position: Number.isFinite(video.currentTime) ? video.currentTime : Math.max(0, startAt),
          wasPlaying: !video.paused && !video.ended,
          volume: video.volume,
          playbackRate: video.playbackRate,
          error: error.message,
        });
      },
    });

    video.volume = initialVolume;
    video.playbackRate = initialPlaybackRate;
    setVolume(initialVolume);
    setRate(initialPlaybackRate);
    setStatus('loading');
    setDetail('Conectando con los proveedores de reproducción…');
    setCurrent(Math.max(0, startAt));
    setDuration(0);
    lastSaveRef.current = 0;

    void runtime.attach(video)
      .then(() => runtime.load(id, startAt, autoplay))
      .catch((error: unknown) => {
        if (!active) return;
        const failure = error instanceof Error ? error : new Error(String(error));
        setStatus('error');
        setDetail(failure.message);
        if (!fatalReportedRef.current) {
          fatalReportedRef.current = true;
          onPlaybackExhausted?.({
            position: Number.isFinite(video.currentTime) ? video.currentTime : Math.max(0, startAt),
            wasPlaying: !video.paused && !video.ended,
            volume: video.volume,
            playbackRate: video.playbackRate,
            error: failure.message,
          });
        }
      });

    return () => {
      active = false;
      if (video.duration && Number.isFinite(video.currentTime)) {
        actions.saveProgress(metaRef.current, video.currentTime, video.duration);
      }
      void runtime.dispose();
    };
  }, [id, startAt, autoplay, initialVolume, initialPlaybackRate, retry]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const save = () => {
      if (video.duration && Date.now() - lastSaveRef.current > 4000) {
        lastSaveRef.current = Date.now();
        actions.saveProgress(metaRef.current, video.currentTime, video.duration);
      }
    };
    const onTime = () => { setCurrent(video.currentTime); save(); };
    const onDuration = () => setDuration(Number.isFinite(video.duration) ? video.duration : 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => {
      setPlaying(false);
      if (video.duration) actions.saveProgress(metaRef.current, video.currentTime, video.duration);
    };
    const onHistory = () => actions.addHistory(metaRef.current);
    video.addEventListener('timeupdate', onTime);
    video.addEventListener('durationchange', onDuration);
    video.addEventListener('loadedmetadata', onDuration);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('playing', onHistory, { once: true });
    return () => {
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('durationchange', onDuration);
      video.removeEventListener('loadedmetadata', onDuration);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('playing', onHistory);
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

  const bridgeMissing = detail.includes('Falta TodoTube Bridge');

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
        <div className="gateway-recovering" role="status" aria-live="polite">
          {status === 'switching' ? 'Buscando otra ruta de reproducción…' : 'Preparando la reproducción…'}
        </div>
      )}
      {status === 'error' && (
        <div className="gateway-error" role="alert">
          <b>{bridgeMissing ? 'Hay que habilitar la reproducción en este navegador' : 'No se pudo reproducir este vídeo'}</b>
          <p>{bridgeMissing
            ? 'Activa TodoTube Bridge para permitir la reproducción y vuelve a cargar la página.'
            : 'TodoTube no pudo iniciar el vídeo con las rutas disponibles. Puedes volver a intentarlo.'}</p>
          {bridgeMissing ? (
            <div className="gateway-bridge-actions">
              <a className="btn primary" href="/todotube-browser-bridge.zip" download="todotube-browser-bridge.zip">Descargar TodoTube Bridge</a>
              <p className="gateway-bridge-install-note">
                Después: extrae el ZIP, abre <b>chrome://extensions</b>, activa «Modo desarrollador»,
                pulsa «Cargar descomprimida» y selecciona la carpeta extraída. Luego vuelve a cargar TodoTube.
              </p>
            </div>
          ) : (
            <div className="player-message-actions">
              <button type="button" className="btn primary" onClick={retryPlayback}>Reintentar reproducción</button>
            </div>
          )}
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
      <span className="youtube-sabr-source" aria-live="polite">{status === 'playing' ? 'Reproducción activa' : ''}</span>
    </div>
  );
}
