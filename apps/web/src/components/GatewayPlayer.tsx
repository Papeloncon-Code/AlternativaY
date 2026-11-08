import { useEffect, useRef, useState } from 'react';
import type { Meta } from '../store';
import { gatewayMediaUrl } from '../mediaGateway';
import { actions } from '../store';

function timeLabel(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const s = Math.floor(seconds);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

export default function GatewayPlayer({ id, meta }: { id: string; meta: Meta }) {
  const wrap = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [rate, setRate] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    const video = videoRef.current!;
    let lastSave = 0;
    const save = () => {
      if (video.duration && Date.now() - lastSave > 4000) {
        lastSave = Date.now();
        actions.saveProgress(meta, video.currentTime, video.duration);
      }
    };
    const onMetadata = () => setDuration(Number.isFinite(video.duration) ? video.duration : 0);
    const onTime = () => { setCurrent(video.currentTime); save(); };
    const onPlay = () => { setPlaying(true); };
    const onPause = () => { setPlaying(false); save(); };
    const onHistory = () => actions.addHistory(meta);
    const onError = () => setError(video.error?.message || 'El navegador no pudo leer el archivo multimedia.');
    video.addEventListener('loadedmetadata', onMetadata);
    video.addEventListener('timeupdate', onTime);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('playing', onHistory, { once: true });
    video.addEventListener('error', onError);
    return () => {
      save();
      video.removeEventListener('loadedmetadata', onMetadata);
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('playing', onHistory);
      video.removeEventListener('error', onError);
    };
  }, [id]);

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

  return <div className="gateway-player" ref={wrap}>
    <video ref={videoRef} src={gatewayMediaUrl(id)} crossOrigin="anonymous" playsInline preload="metadata" className="gateway-video" />
    {error && <div className="gateway-error" role="alert"><b>No se pudo reproducir este medio</b><p>{error}</p><a className="btn" href="/medios">Volver a la biblioteca</a></div>}
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
