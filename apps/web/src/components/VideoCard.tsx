import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { thumb } from '../api';
import { ago } from '../format';
import { actions, useStore } from '../store';
import Icon from './Icon';
import Avatar from './Avatar';
import { prefetchVideo } from '../player/warm';

type Props = {
  id: string; title: string; channel: string; channelId: string;
  publishedAt?: number | null; isNew?: boolean; progress?: number; short?: boolean; compact?: boolean;
};

// Tarjeta de vídeo con la estructura que la gente ya conoce: miniatura, avatar del canal, título en 2 líneas, canal y fecha, menú ⋮.
export default function VideoCard({ id, title, channel, channelId, publishedAt, isNew, progress, short, compact }: Props) {
  const fav = useStore((s) => Boolean(s.favorites[id]));
  const later = useStore((s) => Boolean(s.watchLater[id]));
  const watched = useStore((s) => Boolean(s.watched[id]));
  const saved = useStore((s) => s.progress[id]);
  const [menu, setMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const meta = { id, title, channel, channelId };
  const href = short ? `/shorts/${id}` : `/ver/${id}`;
  const pct = progress ?? (saved ? saved.pos / saved.dur : watched ? 1 : undefined);

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
    <article className={`vcard${compact ? ' compact' : ''}`}>
      <Link to={href} className="vthumb" aria-label={title} onMouseEnter={() => prefetchVideo(id)} onFocus={() => prefetchVideo(id)} onTouchStart={() => prefetchVideo(id)}>
        <img src={thumb(id)} alt="" loading="lazy" width={480} height={270} />
        {pct != null && <span className="vprog"><span style={{ width: `${Math.min(100, pct * 100)}%` }} /></span>}
      </Link>
      <div className="vinfo">
        {!compact && <Link to={`/canal/${channelId}`} className="vavatar" aria-label={`Canal ${channel}`}><Avatar name={channel} id={channelId} size={36} /></Link>}
        <div className="vtext">
          <Link to={href} className="vtitle" title={title}>{title}</Link>
          <Link to={`/canal/${channelId}`} className="vmeta vchan">{channel}</Link>
          <span className="vmeta">{publishedAt ? ago(publishedAt) : ''}{watched ? ' · visto' : ''}</span>
          {isNew && !watched && <span className="badge-nuevo">Nuevo</span>}
        </div>
        <div className="vmenu" ref={ref}>
          <button type="button" className="icon-btn kebab" aria-label="Más opciones" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
            <Icon name="more" size={22} />
          </button>
          {menu && (
            <div className="menu" role="menu">
              <button type="button" role="menuitem" onClick={() => { actions.toggleWatchLater(meta); setMenu(false); }}>
                <Icon name="clock" size={20} />{later ? 'Quitar de Ver más tarde' : 'Guardar en Ver más tarde'}
              </button>
              <button type="button" role="menuitem" onClick={() => { actions.toggleFavorite(meta); setMenu(false); }}>
                <Icon name="like" size={20} />{fav ? 'Quitar de Me gusta' : 'Me gusta'}
              </button>
              <button type="button" role="menuitem" onClick={() => { actions.toggleWatched(id); setMenu(false); }}>
                <Icon name="eye" size={20} />{watched ? 'Marcar como no visto' : 'Marcar como visto'}
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
