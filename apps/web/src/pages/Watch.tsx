import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { fetchFeed } from '../api';
import { useAsync } from '../useAsync';
import { actions, useStore, type Meta } from '../store';
import { ago, clock } from '../format';
import VideoCard from '../components/VideoCard';
import Icon from '../components/Icon';
import { ErrorBox } from '../components/States';
import OfficialPlayer from '../components/OfficialPlayer';
import OwnPlayer from '../components/OwnPlayer';

const hasBridge = () => !!(window as unknown as { todotubeBridge?: { installed?: boolean } }).todotubeBridge?.installed;

const ID_RE = /^[A-Za-z0-9_-]{11}$/;

export default function Watch() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const feed = useAsync(() => fetchFeed(150));
  const saved = useStore((s) => s.progress[id]);
  const fav = useStore((s) => Boolean(s.favorites[id]));
  const [fallback, setFallback] = useState('');
  const own = hasBridge() && !fallback;
  const video = feed.data?.find((v) => v.id === id);
  const isShort = params.get('short') === '1' || video?.kind === 'short';
  const meta: Meta = useMemo(() => ({
    id, title: video?.title ?? saved?.title ?? 'Vídeo', channel: video?.channel ?? saved?.channel ?? '', channelId: video?.channelId ?? saved?.channelId ?? '',
  }), [id, video, saved]);
  const metaRef = useRef(meta);
  metaRef.current = meta;
  const startAt = useRef(saved ? Math.max(0, saved.pos - 3) : 0);

  const validId = ID_RE.test(id);

  const more = (feed.data ?? []).filter((v) => v.channelId === meta.channelId && v.id !== id && v.kind !== 'short').slice(0, 8);

  return (
    <div className="page watch">
      <button type="button" className="back" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}>
        <Icon name="back" size={18} /> Volver
      </button>
      <div className={`player-frame${isShort ? ' vertical' : ''}`}>
        {!validId ? <ErrorBox message="Enlace de vídeo no válido." />
          : own ? <OwnPlayer key={id} id={id} meta={meta} startAt={startAt.current} onFail={setFallback} />
          : <OfficialPlayer key={id} id={id} meta={meta} startAt={startAt.current} />}
      </div>
      <div className="watch-info">
        <h1 className="watch-title">{meta.title}</h1>
        <p className="card-meta">
          {meta.channel}{video?.publishedAt ? ` · ${ago(video.publishedAt)}` : ''}
          {startAt.current >= 5 ? ` · continúa en ${clock(startAt.current)}` : ''}
        </p>
        {!hasBridge() && (
          <p className="bridge-hint">¿Sin anuncios ni marcas en el reproductor? <Link to="/puente">Instala TodoTube Puente</Link></p>
        )}
        {fallback && <p className="bridge-hint">El reproductor TodoTube no pudo cargar este vídeo ({fallback}); se usa el reproductor de reserva.</p>}
        <div className="watch-actions">
          <button type="button" className={`btn${fav ? ' on' : ''}`} aria-pressed={fav} onClick={() => actions.toggleFavorite(meta)}>
            <Icon name="heart" size={18} filled={fav} /> {fav ? 'En favoritos' : 'Favorito'}
          </button>
        </div>
      </div>
      {more.length > 0 && (
        <section className="section" aria-labelledby="h-more">
          <h2 id="h-more">Más de {meta.channel}</h2>
          <div className="grid">
            {more.map((v) => <VideoCard key={v.id} id={v.id} title={v.title ?? v.id} channel={v.channel} channelId={v.channelId} publishedAt={v.publishedAt} />)}
          </div>
        </section>
      )}
      {!video && !feed.loading && !saved && <p className="note">Este vídeo no está en tus novedades. <Link to="/">Ir al inicio</Link></p>}
    </div>
  );
}
