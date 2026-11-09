import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import GatewayPlayer from './GatewayPlayer';
import YouTubeSabrPlayer from './YouTubeSabrPlayer';
import { gatewayMediaUrl, hasPublicGatewayVideo } from '../mediaGateway';
import { PlaybackBroker, type PlaybackProvider } from '../player/playbackBroker';
import Icon from './Icon';
import { stop, useSession } from '../player/session';

type ActiveSource = 'checking' | 'gateway' | 'youtube' | 'external';

type PlaybackHandoff = {
  id: string;
  startAt: number;
  autoplay: boolean;
  volume: number;
  playbackRate: number;
};

/** Elemento que ocupa el reproductor (para pantalla completa con “f”). */
export const hostEl: { current: HTMLDivElement | null } = { current: null };

const isYouTubeId = (value: string) => /^[a-zA-Z0-9_-]{11}$/.test(value);

function createPlaybackProviders(): PlaybackProvider[] {
  return [
    {
      id: 'r2',
      priority: 10,
      supports: isYouTubeId,
      resolve: async ({ videoId, signal }) => {
        const available = await hasPublicGatewayVideo(videoId, signal);
        if (signal.aborted) throw new DOMException('Playback resolution aborted.', 'AbortError');
        return available
          ? [{ providerId: 'r2', mode: 'r2', uri: gatewayMediaUrl(videoId) }]
          : [];
      },
    },
    {
      id: 'youtube-web-sabr',
      priority: 20,
      supports: isYouTubeId,
      resolve: async ({ videoId, signal }) => {
        if (signal.aborted) throw new DOMException('Playback resolution aborted.', 'AbortError');
        return [{
          providerId: 'youtube-web-sabr',
          mode: 'sabr-dash',
          uri: 'yt://' + videoId,
        }];
      },
    },
  ];
}

// One application-wide player host. Provider selection and fallback happen here;
// the media runtime remains inside the same dock and the same video page.
export default function PlayerHost() {
  const s = useSession();
  const loc = useLocation();
  const navigate = useNavigate();
  const onPage = !!s && loc.pathname === '/ver/' + s.id;
  const [rect, setRect] = useState<CSSProperties | null>(null);
  const [source, setSource] = useState<{ id: string; status: ActiveSource }>({ id: '', status: 'checking' });
  const [handoff, setHandoff] = useState<PlaybackHandoff | null>(null);
  const [resolveNonce, setResolveNonce] = useState(0);
  const brokerRef = useRef<PlaybackBroker | null>(null);
  if (!brokerRef.current) brokerRef.current = new PlaybackBroker(createPlaybackProviders());

  useEffect(() => {
    if (!s) {
      setSource({ id: '', status: 'checking' });
      setHandoff(null);
      return;
    }

    let active = true;
    const controller = new AbortController();
    const broker = brokerRef.current!;
    setSource({ id: s.id, status: 'checking' });
    setHandoff(null);

    void broker.resolve({
      videoId: s.id,
      resumeAt: s.startAt,
      signal: controller.signal,
    }).then((resolution) => {
      if (!active) return;
      const first = resolution.candidates[0];
      if (first?.providerId === 'r2') {
        broker.reportSuccess('r2');
        setSource({ id: s.id, status: 'gateway' });
      } else if (first?.providerId === 'youtube-web-sabr') {
        setSource({ id: s.id, status: 'youtube' });
      } else {
        setSource({ id: s.id, status: 'external' });
      }
    }).catch((error: unknown) => {
      if (!active || (error instanceof Error && error.name === 'AbortError')) return;
      console.error('[TodoTube] No se pudo resolver una fuente de reproducción:', error);
      setSource({ id: s.id, status: 'external' });
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [s?.id, s?.startAt, resolveNonce]);

  const box = useRef<HTMLDivElement>(null);
  hostEl.current = box.current;

  useLayoutEffect(() => {
    if (!onPage) { setRect(null); return; }
    let raf = 0;
    const place = () => {
      const slot = document.getElementById('player-slot');
      if (!slot) return;
      const r = slot.getBoundingClientRect();
      setRect((old) => {
        const next = { top: r.top + window.scrollY, left: r.left + window.scrollX, width: r.width, height: r.height };
        return old && old.top === next.top && old.left === next.left && old.width === next.width && old.height === next.height ? old : next;
      });
    };
    const loop = () => { place(); raf = requestAnimationFrame(loop); };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [onPage, s?.id]);

  if (!s) return null;
  const status = source.id === s.id ? source.status : 'checking';
  const currentHandoff = handoff?.id === s.id ? handoff : null;
  const startAt = currentHandoff?.startAt ?? s.startAt;
  const autoplay = currentHandoff?.autoplay ?? true;
  const style: CSSProperties = onPage
    ? (rect ? { position: 'absolute', ...rect } : { position: 'absolute', visibility: 'hidden' })
    : {};
  const back = '/ver/' + s.id + (s.list ? '?lista=' + s.list : '');
  const original = 'https://www.youtube.com/watch?v=' + encodeURIComponent(s.id) + (startAt > 0 ? '&t=' + Math.floor(startAt) + 's' : '');

  function failoverToYouTube(failure: {
    position: number;
    wasPlaying: boolean;
    volume: number;
    playbackRate: number;
    error: string;
  }) {
    brokerRef.current?.reportFailure('r2', failure.error);
    setHandoff({
      id: s!.id,
      startAt: failure.position,
      autoplay: failure.wasPlaying,
      volume: failure.volume,
      playbackRate: failure.playbackRate,
    });
    setSource({ id: s!.id, status: 'youtube' });
  }

  function recoverR2AfterYouTubeFailure(failure: {
    position: number;
    wasPlaying: boolean;
    volume: number;
    playbackRate: number;
    error: string;
  }) {
    brokerRef.current?.reportFailure('youtube-web-sabr', failure.error);
    // Recheck rather than trusting the old initial health result; R2 may have
    // recovered while the browser-side playback provider was active.
    void hasPublicGatewayVideo(s!.id).then((available) => {
      if (!available) return;
      brokerRef.current?.reportSuccess('r2');
      setHandoff({
        id: s!.id,
        startAt: failure.position,
        autoplay: failure.wasPlaying,
        volume: failure.volume,
        playbackRate: failure.playbackRate,
      });
      setSource({ id: s!.id, status: 'gateway' });
    });
  }

  return (
    <div
      ref={box}
      className={'player-dock' + (onPage ? ' on-page' : ' mini') +
        (s.vertical ? ' vertical' : '') +
        (status === 'gateway' ? ' gateway' : status === 'youtube' ? ' youtube' : '')}
      style={style}
    >
      <div className="player-dock-video">
        {status === 'gateway'
          ? <GatewayPlayer
              key={s.id + ':r2'}
              id={s.id}
              meta={s.meta}
              startAt={startAt}
              compact={!onPage}
              onPlaybackExhausted={failoverToYouTube}
            />
          : status === 'youtube'
            ? <YouTubeSabrPlayer
                key={s.id + ':youtube'}
                id={s.id}
                meta={s.meta}
                startAt={startAt}
                compact={!onPage}
                autoplay={autoplay}
                initialVolume={currentHandoff?.volume ?? 1}
                initialPlaybackRate={currentHandoff?.playbackRate ?? 1}
                onPlaybackExhausted={recoverR2AfterYouTubeFailure}
              />
            : status === 'external'
              ? <div className="own-player own-player-error" role="status">
                  <strong>Este vídeo no está disponible en los proveedores configurados.</strong>
                  <p>TodoTube ya probó las fuentes internas disponibles. Puedes reintentar o abrir el origen.</p>
                  <div className="player-message-actions">
                    <button className="btn primary" type="button" onClick={() => setResolveNonce((value) => value + 1)}>Reintentar fuentes</button>
                    <a className="btn" href={original} target="_blank" rel="noreferrer">Abrir vídeo original</a>
                  </div>
                </div>
              : <div className="gateway-source-check" role="status">Buscando la primera fuente y comprobando redundancia…</div>}
      </div>
      {!onPage && (
        <div className="mini-bar">
          <button type="button" className="mini-text" onClick={() => navigate(back)} title="Volver a la ficha del vídeo">
            <b className="ellipsis">{s.meta.title}</b><span className="ellipsis">{s.meta.channel || 'Contenido externo'}</span>
          </button>
          {(status === 'youtube' || status === 'external') && <a className="icon-btn mini-source" aria-label="Abrir vídeo original" title="Abrir vídeo original" href={original} target="_blank" rel="noreferrer">
            <Icon name="external-link" size={20} />
          </a>}
          <button type="button" className="icon-btn mini-expand" aria-label="Volver a la ficha" onClick={() => navigate(back)}><Icon name="expand" size={20} /></button>
          <button type="button" className="icon-btn" aria-label="Cerrar el minirreproductor" onClick={stop}><Icon name="close" size={20} /></button>
        </div>
      )}
    </div>
  );
}
