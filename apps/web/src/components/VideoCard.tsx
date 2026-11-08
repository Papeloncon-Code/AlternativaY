import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { thumb } from '../api';
import { ago, agoShort, clock, fmtViews, shortNumber } from '../format';
import { actions, useStore } from '../store';
import Icon from './Icon';
import Avatar from './Avatar';
import { prefetchVideo } from '../player/warm';
import { shareVideo, toast } from '../toast';
import { useBranding } from '../community';
import { openSave } from './SaveDialog';

type Props = {
  id: string; title: string; channel: string; channelId: string;
  publishedAt?: number | null; isNew?: boolean; progress?: number; short?: boolean; compact?: boolean; list?: string; views?: number | null; duration?: number | null;
  /** En la página del canal no se repiten la foto ni el nombre del canal (como en la referencia). */
  noChannel?: boolean;
  /** Estante: datos en forma corta («▷ 4 M  hace 1 d»), como en la referencia. */
  dense?: boolean;
};

// Tarjeta de vídeo con la estructura que la gente ya conoce: miniatura, avatar del canal, título en 2 líneas, canal y fecha, menú ⋮.
export default function VideoCard({ id, title, channel, channelId, publishedAt, isNew, progress, short, compact, list, views, noChannel, dense, duration }: Props) {
  const fav = useStore((s) => Boolean(s.favorites[id]));
  const later = useStore((s) => Boolean(s.watchLater[id]));
  const watched = useStore((s) => Boolean(s.watched[id]));
  const saved = useStore((s) => s.progress[id]);
  const [menu, setMenu] = useState(false);
  const [up, setUp] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLElement>(null);
  const daOn = useStore((s) => s.dearrow);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!daOn || seen || !card.current) return;
    const io = new IntersectionObserver((e) => { if (e.some((x) => x.isIntersecting)) { setSeen(true); io.disconnect(); } }, { rootMargin: '300px' });
    io.observe(card.current);
    return () => io.disconnect();
  }, [daOn, seen]);
  const brand = useBranding(id, daOn && seen);
  const [thumbFailed, setThumbFailed] = useState(false);
  const shownTitle = brand.title ?? title;
  const meta = { id, title, channel, channelId };
  const href = short ? `/shorts/${id}` : `/ver/${id}${list ? `?lista=${list}` : ''}`;
  const pct = progress ?? (saved ? saved.pos / saved.dur : watched ? 1 : undefined);

  // Si no cabe debajo (barra inferior del móvil o final de la pantalla), el menú se abre hacia arriba (#16).
  useLayoutEffect(() => {
    if (!menu) { setUp(false); return; }
    const r = menuRef.current?.getBoundingClientRect();
    const bar = document.querySelector('.bottombar')?.getBoundingClientRect().height ?? 0;
    if (r && r.bottom > window.innerHeight - bar - 8) setUp(true);
  }, [menu]);
  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [menu]);

  return (
    <article ref={card} className={`vcard${compact ? ' compact' : ''}${noChannel ? ' nochan' : ''}`}>
      <Link to={href} className="vthumb" aria-label={shownTitle} onMouseEnter={() => prefetchVideo(id)} onFocus={() => prefetchVideo(id)} onTouchStart={() => prefetchVideo(id)}>
        <img src={brand.thumb && !thumbFailed ? brand.thumb : thumb(id)} alt="" loading="lazy" width={480} height={270} onError={() => setThumbFailed(true)} />
        {duration ? <span className="vdur" aria-label={`Duración ${clock(duration)}`}>{clock(duration)}</span> : null}
        {pct != null && <span className="vprog"><span style={{ width: `${Math.min(100, pct * 100)}%` }} /></span>}
      </Link>
      <div className="vinfo">
        {!compact && !noChannel && <Link to={`/canal/${channelId}`} className="vavatar" aria-label={`Canal ${channel}`}><Avatar name={channel} id={channelId} size={36} /></Link>}
        <div className="vtext">
          <Link to={href} className="vtitle" title={brand.title ? `Título original: ${title}` : title}>{shownTitle}</Link>
          {!noChannel && <Link to={`/canal/${channelId}`} className="vmeta vchan">{channel}</Link>}
          {dense
            ? <span className="vmeta vmeta-dense">{views ? <span><Icon name="play" size={12} />{shortNumber(views)}</span> : null}{publishedAt ? <span>{agoShort(publishedAt)}</span> : null}</span>
            : <span className="vmeta vmeta-row">{[fmtViews(views), publishedAt ? ago(publishedAt) : '', watched ? 'visto' : ''].filter(Boolean).map((t, i) => <span key={i}>{t}</span>)}</span>}
          {isNew && !watched && <span className="badge-nuevo">Nuevo</span>}
        </div>
        <div className="vmenu" ref={ref}>
          <button type="button" className="icon-btn kebab" aria-label="Más opciones" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
            <Icon name="more" size={22} />
          </button>
          {menu && (
            <div className={`menu${up ? ' up' : ''}`} role="menu" ref={menuRef}>
              <button type="button" role="menuitem" onClick={() => { actions.toggleWatchLater(meta); setMenu(false); toast(later ? 'Quitado de Ver más tarde' : 'Guardado en Ver más tarde'); }}>
                <Icon name="clock" size={20} />{later ? 'Quitar de Ver más tarde' : 'Guardar en Ver más tarde'}
              </button>
              <button type="button" role="menuitem" onClick={() => { openSave(meta); setMenu(false); }}>
                <Icon name="library" size={20} />Guardar en una lista
              </button>
              <button type="button" role="menuitem" onClick={() => { actions.toggleFavorite(meta); setMenu(false); toast(fav ? 'Quitado de Me gusta' : 'Añadido a Me gusta'); }}>
                <Icon name="like" size={20} />{fav ? 'Quitar de Me gusta' : 'Me gusta'}
              </button>
              <button type="button" role="menuitem" onClick={() => { actions.toggleWatched(id); setMenu(false); }}>
                <Icon name="eye" size={20} />{watched ? 'Marcar como no visto' : 'Marcar como visto'}
              </button>
              <button type="button" role="menuitem" onClick={() => { void shareVideo(id, title); setMenu(false); }}>
                <Icon name="share" size={20} />Compartir
              </button>
              <hr />
              <button type="button" role="menuitem" onClick={() => {
                actions.hideVideo(id); setMenu(false);
                toast('Vídeo quitado. Lo tendremos en cuenta.', { label: 'Deshacer', run: () => actions.unhideVideo(id) });
              }}>
                <Icon name="ban" size={20} />No me interesa
              </button>
              <Link role="menuitem" to={`/canal/${channelId}`} onClick={() => setMenu(false)}>
                <Icon name="user" size={20} />Ir al canal
              </Link>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
