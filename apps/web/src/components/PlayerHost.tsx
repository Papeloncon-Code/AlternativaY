import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import YouTubePlayer from './YouTubePlayer';
import Icon from './Icon';
import { stop, useSession } from '../player/session';

/** Elemento que ocupa el reproductor (para pantalla completa con “f”). */
export const hostEl: { current: HTMLDivElement | null } = { current: null };

// Una sola sesión de reproducción: el iframe permanece montado al navegar fuera de la ficha.
export default function PlayerHost() {
  const s = useSession();
  const loc = useLocation();
  const navigate = useNavigate();
  const onPage = !!s && loc.pathname === '/ver/' + s.id;
  const [rect, setRect] = useState<CSSProperties | null>(null);
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

  return (
    <div ref={box} className={'player-dock' + (onPage ? ' on-page' : ' mini') + (s.vertical ? ' vertical' : '')} style={style}>
      <div className="player-dock-video">
        <YouTubePlayer key={s.id} id={s.id} startAt={s.startAt} title={s.meta.title} />
      </div>
      {!onPage && (
        <div className="mini-bar">
          <button type="button" className="mini-text" onClick={() => navigate(back)} title="Volver a la ficha del vídeo">
            <b className="ellipsis">{s.meta.title}</b><span className="ellipsis">{s.meta.channel || 'YouTube'}</span>
          </button>
          <button type="button" className="icon-btn mini-expand" aria-label="Volver a la ficha" onClick={() => navigate(back)}><Icon name="expand" size={20} /></button>
          <button type="button" className="icon-btn" aria-label="Cerrar el minirreproductor" onClick={stop}><Icon name="close" size={20} /></button>
        </div>
      )}
    </div>
  );
}
