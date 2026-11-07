import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchFeed } from '../api';
import { useAsync } from '../useAsync';
import { useStore } from '../store';
import VideoCard from '../components/VideoCard';
import { Empty, ErrorBox, SkeletonGrid } from '../components/States';

type Filter = 'todo' | 'sin-ver' | 'hoy';
const DAY = 86400000;

export default function Home() {
  const feed = useAsync(() => fetchFeed(150));
  const progress = useStore((s) => s.progress);
  const watched = useStore((s) => s.watched);
  const [filter, setFilter] = useState<Filter>('todo');
  const [channel, setChannel] = useState<string>('');

  const continuing = useMemo(
    () => Object.values(progress).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 8),
    [progress],
  );
  const channels = useMemo(() => {
    const m = new Map<string, string>();
    feed.data?.forEach((v) => m.set(v.channelId, v.channel));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [feed.data]);
  const items = useMemo(() => {
    const now = Date.now();
    return (feed.data ?? []).filter((v) =>
      (filter !== 'sin-ver' || !watched[v.id]) &&
      (filter !== 'hoy' || (v.publishedAt ?? 0) > now - DAY) &&
      (!channel || v.channelId === channel));
  }, [feed.data, filter, channel, watched]);

  return (
    <div className="page">
      <header className="page-head">
        <h1>Inicio</h1>
      </header>

      {continuing.length > 0 && (
        <section aria-labelledby="h-seguir" className="section">
          <h2 id="h-seguir">Seguir viendo</h2>
          <div className="row-scroll">
            {continuing.map((p) => (
              <VideoCard key={p.id} id={p.id} title={p.title} channel={p.channel} channelId={p.channelId} progress={p.pos / p.dur} />
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="h-nov" className="section">
        <div className="section-head">
          <h2 id="h-nov">Novedades de tus canales</h2>
          <div className="chips" role="group" aria-label="Filtros">
            {([['todo', 'Todo'], ['sin-ver', 'Sin ver'], ['hoy', 'Hoy']] as const).map(([k, l]) => (
              <button key={k} type="button" className={`chip${filter === k ? ' on' : ''}`} aria-pressed={filter === k} onClick={() => setFilter(k)}>{l}</button>
            ))}
            {channels.length > 1 && (
              <select className="chip select" value={channel} onChange={(e) => setChannel(e.target.value)} aria-label="Filtrar por canal">
                <option value="">Todos los canales</option>
                {channels.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            )}
          </div>
        </div>

        {feed.loading && !feed.data && <SkeletonGrid />}
        {feed.error && <ErrorBox message={`No se pudieron cargar las novedades (${feed.error}).`} onRetry={feed.reload} />}
        {feed.data && feed.data.length === 0 && (
          <Empty title="Aún no hay vídeos">
            <p>Sigue algún canal y sus vídeos nuevos aparecerán aquí en cuanto se publiquen.</p>
            <Link className="btn primary" to="/suscripciones">Añadir canales</Link>
          </Empty>
        )}
        {feed.data && feed.data.length > 0 && items.length === 0 && (
          <Empty title="Nada con estos filtros"><button type="button" className="btn" onClick={() => { setFilter('todo'); setChannel(''); }}>Quitar filtros</button></Empty>
        )}
        <div className="grid">
          {items.map((v) => (
            <VideoCard key={v.id} id={v.id} title={v.title ?? v.id} channel={v.channel} channelId={v.channelId}
              publishedAt={v.publishedAt} isNew={v.source !== 'baseline' && !watched[v.id]} />
          ))}
        </div>
      </section>
    </div>
  );
}
