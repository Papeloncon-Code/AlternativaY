import { Link } from 'react-router-dom';
import { thumb } from '../api';
import { ago } from '../format';
import { actions, useStore } from '../store';
import Icon from './Icon';

type Props = {
  id: string; title: string; channel: string; channelId: string;
  publishedAt?: number | null; isNew?: boolean; progress?: number;
};

export default function VideoCard({ id, title, channel, channelId, publishedAt, isNew, progress }: Props) {
  const fav = useStore((s) => Boolean(s.favorites[id]));
  const watched = useStore((s) => Boolean(s.watched[id]));
  const meta = { id, title, channel, channelId };
  return (
    <article className={`card${watched ? ' is-watched' : ''}`}>
      <Link to={`/ver/${id}`} className="thumb" aria-label={`Ver: ${title}`}>
        <img src={thumb(id)} alt="" loading="lazy" width={480} height={360} />
        {isNew && <span className="badge-new">Nuevo</span>}
        {watched && <span className="badge-watched"><Icon name="check" size={14} /> Visto</span>}
        {progress != null && <span className="progress" style={{ width: `${Math.min(100, progress * 100)}%` }} />}
      </Link>
      <div className="card-body">
        <Link to={`/ver/${id}`} className="card-title">{title}</Link>
        <p className="card-meta">{channel}{publishedAt ? ` · ${ago(publishedAt)}` : ''}</p>
      </div>
      <div className="card-actions">
        <button type="button" className={`icon-btn${fav ? ' on' : ''}`} onClick={() => actions.toggleFavorite(meta)}
          aria-pressed={fav} aria-label={fav ? 'Quitar de favoritos' : 'Añadir a favoritos'} title="Favorito">
          <Icon name="heart" size={18} filled={fav} />
        </button>
        <button type="button" className={`icon-btn${watched ? ' on' : ''}`} onClick={() => actions.toggleWatched(id)}
          aria-pressed={watched} aria-label={watched ? 'Marcar como no visto' : 'Marcar como visto'} title="Visto">
          <Icon name="check" size={18} />
        </button>
      </div>
    </article>
  );
}
