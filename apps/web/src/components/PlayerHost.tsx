import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import OwnPlayer from './OwnPlayer';
import GatewayPlayer from './GatewayPlayer';
import NewPipePlayer from './NewPipePlayer';
import { hasPublicGatewayVideo } from '../mediaGateway';
import { resolveYoutubeStream, type ResolvedYouTubeStream } from '../youtubeResolver';
import Icon from './Icon';
import { stop, useSession } from '../player/session';

/** Elemento que ocupa el reproductor (para pantalla completa con “f”). */
export const hostEl: { current: HTMLDivElement | null } = { current: null };

type PlayerSourceCheck =
  | { id: string; status: 'checking' | 'gateway' | 'external' }
  | { id: string; status: 'youtube'; stream: ResolvedYouTubeStream };

// El origen R2 tiene prioridad para una copia local. Si no existe, se intenta NewPipe.
export default function PlayerHost() {
  const s = useSession();
  const loc = useLocation();
  const navigate = useNavigate();
  const onPage = !!s && loc.pathname === '/ver/' + s.id;
  const [rect, setRect] = useState<CSSProperties | null>(null);
  const [sourceCheck, setSourceCheck] = useState<PlayerSourceCheck | null>(null);

  useEffect(() => {
    if (!s) { setSourceCheck(null); return; }
    let active = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 30000);
    setSourceCheck({ id: s.id, status: 'checking' });

    void (async () => {
      try {
        if (await hasPublicGatewayVideo(s.id)) {
          if (active) setSourceCheck({ id: s.id, status: 'gateway' });
          return;
        }
        const stream = await resolveYoutubeStream(s.id, controller.signal);
        if (active) setSourceCheck({ id: s.id, status: 'youtube', stream });
      } catch {
        if (active) setSourceCheck({ id: s.id, status: 'external' });
      }
    })();

    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [s?.id]);

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
  const style: CSSProperties = onPage
    ? (rect ? { position: 'absolute', ...rect } : { position: 'absolute', visibility: 'hidden' })
    : {};
  const back = '/ver/' + s.id + (s.list ? '?lista=' + s.list : '');
  const original = 'https://www.youtube.com/watch?v=' + encodeURIComponent(s.id) + (s.startAt > 0 ? '&t=' + Math.floor(s.startAt) + 's' : '');
  const currentSource = sourceCheck?.id === s.id ? sourceCheck : null;
  const gateway = currentSource?.status === 'gateway';
  const youtube = currentSource?.status === 'youtube';

  return (
    <div ref={box} className={'player-dock' + (onPage ? ' on-page' : ' mini') + (s.vertical ? ' vertical' : '') + (gateway ? ' gateway' : '') + (youtube ? ' youtube' : '')} style={style}>
      <div className="player-dock-video">
        {gateway
          ? <GatewayPlayer key={s.id} id={s.id} meta={s.meta} startAt={s.startAt} compact={!onPage} />
          : youtube && currentSource?.status === 'youtube'
            ? <NewPipePlayer key={s.id} id={s.id} meta={s.meta} startAt={s.startAt} compact={!onPage} stream={currentSource.stream} />
            : currentSource?.status === 'external'
              ? <OwnPlayer key={s.id} id={s.id} startAt={s.startAt} compact={!onPage} />
              : <div className="gateway-source-check" role="status">Preparando la reproducción…</div>}
      </div>
      {!onPage && (
        <div className="mini-bar">
          <button type="button" className="mini-text" onClick={() => navigate(back)} title="Volver a la ficha del vídeo">
            <b className="ellipsis">{s.meta.title}</b><span className="ellipsis">{s.meta.channel || 'Contenido externo'}</span>
          </button>
          {currentSource?.status !== 'gateway' && currentSource?.status !== 'youtube' && <a className="icon-btn mini-source" aria-label="Abrir vídeo original" title="Abrir vídeo original" href={original} target="_blank" rel="noreferrer">
            <Icon name="external-link" size={20} />
          </a>}
          <button type="button" className="icon-btn mini-expand" aria-label="Volver a la ficha" onClick={() => navigate(back)}><Icon name="expand" size={20} /></button>
          <button type="button" className="icon-btn" aria-label="Cerrar el minirreproductor" onClick={stop}><Icon name="close" size={20} /></button>
        </div>
      )}
    </div>
  );
}
