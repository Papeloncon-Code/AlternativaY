import { useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useFeed } from '../data';
import Avatar from '../components/Avatar';
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
  const [params] = useSearchParams();
  const feed = useFeed();
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

  const later = useStore((s) => Boolean(s.watchLater[id]));
  const all = (feed.data ?? []).filter((v) => v.id !== id && v.kind !== 'short');
  const next = [...all.filter((v) => v.channelId === meta.channelId), ...all.filter((v) => v.channelId !== meta.channelId)].slice(0, 20);

  return (
    <div className="watch-layout">
      <div className="watch-main">
        <div className={`player-frame${isShort ? ' vertical' : ''}`}>
          {!validId ? <ErrorBox message="Enlace de vídeo no válido." />
            : own ? <OwnPlayer key={id} id={id} meta={meta} startAt={startAt.current} onFail={setFallback} />
            : <OfficialPlayer key={id} id={id} meta={meta} startAt={startAt.current} />}
        </div>
        <h1 className="watch-title">{meta.title}</h1>
        <div className="watch-row">
          <Link to={`/canal/${meta.channelId}`} className="watch-channel">
            <Avatar name={meta.channel || 'Canal'} id={meta.channelId || id} size={40} />
            <span><b>{meta.channel}</b><span className="vmeta">{video?.publishedAt ? ago(video.publishedAt) : ''}{startAt.current >= 5 ? ` · continúa en ${clock(startAt.current)}` : ''}</span></span>
          </Link>
          <div className="watch-actions">
            <button type="button" className={`btn${fav ? ' on' : ''}`} aria-pressed={fav} onClick={() => actions.toggleFavorite(meta)}>
              <Icon name="like" size={18} /> {fav ? 'Te gusta' : 'Me gusta'}
            </button>
            <button type="button" className={`btn${later ? ' on' : ''}`} aria-pressed={later} onClick={() => actions.toggleWatchLater(meta)}>
              <Icon name="clock" size={18} /> {later ? 'Guardado' : 'Ver más tarde'}
            </button>
          </div>
        </div>
        {!hasBridge() && (
          <p className="bridge-hint">¿Sin anuncios ni marcas en el reproductor? <Link to="/puente">Instala TodoTube Puente</Link></p>
        )}
        {fallback && <p className="bridge-hint">El reproductor TodoTube no pudo cargar este vídeo ({fallback}); se usa el reproductor de reserva.</p>}
        {!video && !feed.loading && !saved && <p className="note">Este vídeo no está en tus novedades. <Link to="/">Ir a Principal</Link></p>}
      </div>
      <aside className="watch-side" aria-label="Más vídeos">
        {next.map((v) => <VideoCard key={v.id} {...v} title={v.title ?? v.id} compact />)}
      </aside>
    </div>
  );
}
