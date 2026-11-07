import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fetchFeed } from '../api';
import { useAsync } from '../useAsync';
import { actions, useStore, type Meta } from '../store';
import { loadYouTubeApi } from '../youtube';
import { ago, clock } from '../format';
import VideoCard from '../components/VideoCard';
import Icon from '../components/Icon';
import { ErrorBox } from '../components/States';

const ID_RE = /^[A-Za-z0-9_-]{11}$/;

export default function Watch() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const feed = useAsync(() => fetchFeed(150));
  const saved = useStore((s) => s.progress[id]);
  const fav = useStore((s) => Boolean(s.favorites[id]));
  const hostRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const video = feed.data?.find((v) => v.id === id);
  const meta: Meta = useMemo(() => ({
    id, title: video?.title ?? saved?.title ?? 'Vídeo', channel: video?.channel ?? saved?.channel ?? '', channelId: video?.channelId ?? saved?.channelId ?? '',
  }), [id, video, saved]);
  const metaRef = useRef(meta);
  metaRef.current = meta;
  const startAt = useRef(saved ? Math.max(0, saved.pos - 3) : 0);

  useEffect(() => {
    if (!ID_RE.test(id)) { setError('Enlace de vídeo no válido.'); return; }
    let player: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    let timer: number | undefined;
    let cancelled = false;
    const save = () => {
      try { actions.saveProgress(metaRef.current, player.getCurrentTime(), player.getDuration()); } catch { /* reproductor no listo */ }
    };
    loadYouTubeApi().then((YT) => {
      if (cancelled || !hostRef.current) return;
      const el = document.createElement('div');
      hostRef.current.replaceChildren(el);
      player = new YT.Player(el, {
        host: 'https://www.youtube-nocookie.com',
        videoId: id,
        playerVars: { start: Math.floor(startAt.current), rel: 0, playsinline: 1, autoplay: 1 },
        events: {
          onStateChange: (e: { data: number }) => {
            if (e.data === 1) { actions.addHistory(metaRef.current); window.clearInterval(timer); timer = window.setInterval(save, 5000); }
            if (e.data === 2 || e.data === 0) { window.clearInterval(timer); save(); }
          },
          onError: (e: { data: number }) => setError(e.data === 101 || e.data === 150
            ? 'El autor no permite reproducir este vídeo fuera de YouTube.'
            : 'Este vídeo no está disponible.'),
        },
      });
    }).catch((e: Error) => setError(e.message));
    return () => { cancelled = true; window.clearInterval(timer); if (player) { save(); player.destroy?.(); } };
  }, [id]);

  const more = (feed.data ?? []).filter((v) => v.channelId === meta.channelId && v.id !== id).slice(0, 8);

  return (
    <div className="page watch">
      <button type="button" className="back" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}>
        <Icon name="back" size={18} /> Volver
      </button>
      <div className="player-frame">
        {error ? <ErrorBox message={error} /> : <div ref={hostRef} className="player-host" />}
      </div>
      <div className="watch-info">
        <h1 className="watch-title">{meta.title}</h1>
        <p className="card-meta">
          {meta.channel}{video?.publishedAt ? ` · ${ago(video.publishedAt)}` : ''}
          {saved ? ` · reanudado en ${clock(startAt.current)}` : ''}
        </p>
        <div className="watch-actions">
          <button type="button" className={`btn${fav ? ' on' : ''}`} aria-pressed={fav} onClick={() => actions.toggleFavorite(meta)}>
            <Icon name="heart" size={18} filled={fav} /> {fav ? 'En favoritos' : 'Favorito'}
          </button>
          <a className="btn ghost" href={`https://www.youtube.com/watch?v=${id}`} target="_blank" rel="noreferrer">Abrir en YouTube</a>
        </div>
        <p className="note">Web v0.1: el vídeo se reproduce con el reproductor oficial de YouTube. Sin anuncios, segundo plano y descargas llegan en la app de Android.</p>
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
