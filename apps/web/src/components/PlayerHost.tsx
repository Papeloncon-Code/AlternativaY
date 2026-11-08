import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import OfficialPlayer from './OfficialPlayer';
import OwnPlayer from './OwnPlayer';
import Icon from './Icon';
import { handleRef, pageCallbacks, patch, stop, useSession } from '../player/session';
import { useBridge } from '../bridge';
import { useStore } from '../store';
import { useSponsorSkip } from '../community';

/** Elemento que ocupa el reproductor (para la pantalla completa con “f”). */
export const hostEl: { current: HTMLDivElement | null } = { current: null };

// Reproductor único: en la página del vídeo se coloca exactamente sobre su hueco (#player-slot);
// en cualquier otra página pasa a mini reproductor en la esquina, sin recargarse.
export default function PlayerHost() {
  const s = useSession();
  const loc = useLocation();
  const navigate = useNavigate();
  const bridge = useBridge();
  const sbOn = useStore((st) => st.sponsorblock);
  useSponsorSkip(s?.id ?? '', handleRef, sbOn && !!s);
  const onPage = !!s && loc.pathname === `/ver/${s.id}`;
  const [rect, setRect] = useState<CSSProperties | null>(null);
  const [paused, setPaused] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  hostEl.current = box.current;

  // Seguir la posición del hueco en la página (cambia con el modo cine, el tamaño de la ventana, etc.).
  useLayoutEffect(() => {
    if (!onPage) { setRect(null); return; }
    let raf = 0;
    const place = () => {
      const slot = document.getElementById('player-slot');
      if (!slot) return;
      const r = slot.getBoundingClientRect();
      setRect((old) => {
        const n = { top: r.top + window.scrollY, left: r.left + window.scrollX, width: r.width, height: r.height };
        return old && old.top === n.top && old.left === n.left && old.width === n.width && old.height === n.height ? old : n;
      });
    };
    const loop = () => { place(); raf = requestAnimationFrame(loop); };
    loop(); // barato: solo lee una caja por fotograma y actualiza si cambia
    return () => cancelAnimationFrame(raf);
  }, [onPage, s?.id]);

  useEffect(() => { setPaused(false); }, [s?.id]);
  if (!s) return null;

  const props = {
    id: s.id, meta: s.meta, startAt: s.startAt,
    onEnded: () => pageCallbacks.onEnded?.(),
    onReady: (h: Parameters<NonNullable<Parameters<typeof OfficialPlayer>[0]['onReady']>>[0]) => { handleRef.current = h; },
  };
  const own = bridge && !s.fallback;
  const style: CSSProperties = onPage
    ? (rect ? { position: 'absolute', ...rect } : { position: 'absolute', visibility: 'hidden' })
    : {};
  const back = `/ver/${s.id}${s.list ? `?lista=${s.list}` : ''}`;
  return (
    <div ref={box} className={`player-dock${onPage ? ' on-page' : ' mini'}${s.vertical ? ' vertical' : ''}`} style={style}>
      <div className="player-dock-video">
        {own ? <OwnPlayer key={s.id} {...props} onFail={(r) => patch({ fallback: r })} onDetails={(d) => patch({ details: d })} />
          : <OfficialPlayer key={s.id} {...props} />}
      </div>
      {!onPage && (
        <div className="mini-bar">
          <button type="button" className="mini-text" onClick={() => navigate(back)} title="Volver al vídeo">
            <b className="ellipsis">{s.meta.title}</b><span className="ellipsis">{s.meta.channel}</span>
          </button>
          <button type="button" className="icon-btn" aria-label={paused ? 'Reproducir' : 'Pausar'} onClick={() => { handleRef.current?.togglePlay(); setPaused((p) => !p); }}>
            <Icon name={paused ? 'play' : 'pause'} size={20} />
          </button>
          <button type="button" className="icon-btn mini-expand" aria-label="Ampliar" onClick={() => navigate(back)}><Icon name="expand" size={20} /></button>
          <button type="button" className="icon-btn" aria-label="Cerrar el mini reproductor" onClick={stop}><Icon name="close" size={20} /></button>
        </div>
      )}
    </div>
  );
}
