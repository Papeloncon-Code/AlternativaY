import { useEffect, useRef, useState } from 'react';
import shaka from 'shaka-player/dist/shaka-player.ui';
import type { Meta } from '../store';
import { gatewayMediaUrl } from '../mediaGateway';
import { actions } from '../store';
export default function GatewayPlayer({ id, meta }: { id: string; meta: Meta }) {
  const wrap = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState('Preparando reproductor…');
  const [error, setError] = useState('');
  useEffect(() => {
    let destroyed = false;
    let player: shaka.Player | undefined;
    let overlay: shaka.ui.Overlay | undefined;
    const video = videoRef.current!;
    let lastSave = 0;
    const save = () => {
      if (video.duration && Date.now() - lastSave > 4000) {
        lastSave = Date.now();
        actions.saveProgress(meta, video.currentTime, video.duration);
      }
    };
    const onPlay = () => actions.addHistory(meta);
    video.addEventListener('timeupdate', save);
    video.addEventListener('pause', save);
    video.addEventListener('playing', onPlay, { once: true });
    (async () => {
      try {
        shaka.polyfill.installAll();
        if (!shaka.Player.isBrowserSupported()) throw new Error('Este navegador no admite el reproductor multimedia de TodoTube.');
        player = new shaka.Player();
        await player.attach(video);
        if (destroyed) return;
        overlay = new shaka.ui.Overlay(player, wrap.current!, video);
        overlay.configure({
          addBigPlayButton: true,
          overflowMenuButtons: ['captions', 'quality', 'language', 'chapter', 'picture_in_picture', 'playback_rate'],
          seekBarColors: { base: 'rgba(255,255,255,.25)', buffered: 'rgba(255,255,255,.45)', played: '#C8F169' },
          customContextMenu: true,
        });
        player.configure({ abr: { enabled: true, defaultBandwidthEstimate: 5000000 }, streaming: { bufferingGoal: 30, rebufferingGoal: 1 } });
        await player.load(gatewayMediaUrl(id));
        if (!destroyed) setStatus('');
      } catch (e) {
        if (!destroyed) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      destroyed = true;
      save();
      video.removeEventListener('timeupdate', save);
      video.removeEventListener('pause', save);
      video.removeEventListener('playing', onPlay);
      void overlay?.destroy();
      void player?.destroy();
    };
  }, [id]);
  return <div className="gateway-player" ref={wrap}>
    <video ref={videoRef} playsInline className="gateway-video" />
    {error && <div className="gateway-error" role="alert"><b>No se pudo reproducir este medio</b><p>{error}</p><a className="btn" href="/medios">Volver a la biblioteca</a></div>}
    {!error && status && <div className="gateway-loading" role="status">{status}</div>}
  </div>;
}
