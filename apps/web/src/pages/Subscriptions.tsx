import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTitle } from '../title';
import { useFeed, useChannels, feedMore, loadMoreFeed } from '../data';
import { isBlocked } from '../filters';
import { useStore } from '../store';
import VideoCard from '../components/VideoCard';
import ShortCard from '../components/ShortCard';
import Chips from '../components/Chips';
import Sentinel from '../components/Sentinel';
import Icon from '../components/Icon';
import { Empty, ErrorBox, SkeletonGrid } from '../components/States';

export default function Subscriptions() {
  const feed = useFeed();
  const channels = useChannels();
  const [params, setParams] = useSearchParams();
  const activeFilter = params.get('f') || 'todos';
  const hidden = useStore((s) => s.hidden);
  const words = useStore((s) => s.blockWords);
  const groups = useStore((s) => s.groups);

  const followed = useMemo(() => (channels.data ?? []).filter((c) => c.status !== 'invalid'), [channels.data]);
  const followedIds = useMemo(() => new Set(followed.map((c) => c.id)), [followed]);
  const followedVideos = useMemo(
    () => (feed.data ?? []).filter((v) => followedIds.has(v.channelId) && !hidden[v.id] && !isBlocked(v.title, words)),
    [feed.data, followedIds, hidden, words]
  );
  const availableGroups = groups.filter((g) => g.channels.some((id) => followedIds.has(id)));
  const filters = [
    { key: 'todos', label: 'Todos' },
    { key: 'videos', label: 'Vídeos' },
    { key: 'shorts', label: 'Shorts' },
    ...availableGroups.map((g) => ({ key: 'g:' + g.id, label: g.name })),
    ...followed.map((c) => ({ key: 'c:' + c.id, label: c.name }))
  ];
  const validFilter = filters.some((f) => f.key === activeFilter) ? activeFilter : 'todos';

  const filtered = useMemo(() => {
    if (validFilter === 'videos') return followedVideos.filter((v) => v.kind !== 'short');
    if (validFilter === 'shorts') return followedVideos.filter((v) => v.kind === 'short');
    if (validFilter.startsWith('c:')) return followedVideos.filter((v) => v.channelId === validFilter.slice(2) && v.kind !== 'short');
    if (validFilter.startsWith('g:')) {
      const group = availableGroups.find((g) => g.id === validFilter.slice(2));
      return followedVideos.filter((v) => v.kind !== 'short' && group?.channels.includes(v.channelId));
    }
    return followedVideos.filter((v) => v.kind !== 'short');
  }, [followedVideos, validFilter, availableGroups]);

  const shorts = useMemo(() => {
    if (validFilter === 'videos') return [];
    if (validFilter === 'shorts') return followedVideos.filter((v) => v.kind === 'short');
    if (validFilter.startsWith('c:')) return followedVideos.filter((v) => v.kind === 'short' && v.channelId === validFilter.slice(2));
    if (validFilter.startsWith('g:')) {
      const group = availableGroups.find((g) => g.id === validFilter.slice(2));
      return followedVideos.filter((v) => v.kind === 'short' && group?.channels.includes(v.channelId));
    }
    return followedVideos.filter((v) => v.kind === 'short').slice(0, 20);
  }, [followedVideos, validFilter, availableGroups]);

  useTitle('Suscripciones');
  const label = filters.find((f) => f.key === validFilter)?.label ?? 'Todos';
  const hasMore = !feedMore().done;

  if (feed.loading || channels.loading) return <div className="page subscription-feed"><SkeletonGrid n={8} /></div>;

  if (feed.error || channels.error) {
    const message = feed.error ? `No se pudieron cargar las novedades (${feed.error}).` : `No se pudieron cargar tus canales (${channels.error}).`;
    return <div className="page subscription-feed"><FeedHeader count={followed.length} /><ErrorBox message={message} onRetry={feed.error ? feed.reload : channels.reload} /></div>;
  }

  if (followed.length === 0) {
    return <div className="page subscription-feed">
      <FeedHeader count={0} />
      <Empty title="Tus suscripciones aparecerán aquí">
        <p>Sigue canales para ver sus publicaciones recientes en un solo feed.</p>
        <Link className="btn primary" to="/suscripciones/gestionar">Buscar y seguir canales</Link>
      </Empty>
    </div>;
  }

  if (followedVideos.length === 0) {
    return <div className="page subscription-feed" data-total="0">
      <FeedHeader count={followed.length} />
      <Empty title="Todavía no hay novedades de tus canales">
        <p>Cuando publiquen vídeos, aparecerán en este feed.</p>
        <Link className="btn" to="/suscripciones/gestionar">Gestionar suscripciones</Link>
      </Empty>
    </div>;
  }

  return (
    <div className="page subscription-feed" data-total={filtered.length}>
      <FeedHeader count={followed.length} total={followedVideos.length} />
      <Chips items={filters} value={validFilter} onChange={(next) => setParams(next === 'todos' ? {} : { f: next }, { replace: true })} />
      {validFilter === 'shorts' ? (
        <section className="subscription-feed-section">
          <div className="subscription-feed-section-head"><h2>Shorts</h2><span>{filtered.length} publicaciones</span></div>
          <div className="shorts-row subscription-shorts-grid">
            {filtered.map((v) => <ShortCard key={v.id} id={v.id} title={v.title ?? v.id} channel={v.channel} publishedAt={v.publishedAt} views={v.views} />)}
          </div>
        </section>
      ) : (
        <section className="subscription-feed-section">
          <div className="subscription-feed-section-head">
            <h2>{validFilter === 'todos' ? 'Vídeos recientes' : label}</h2>
            <span>{filtered.length} {filtered.length === 1 ? 'vídeo' : 'vídeos'}</span>
          </div>
          {filtered.length > 0
            ? <div className="vgrid">{filtered.map((v) => <VideoCard key={v.id} {...v} title={v.title ?? v.id} isNew={v.source !== 'baseline'} />)}</div>
            : <Empty title="No hay vídeos en este filtro"><p>Prueba otra categoría o vuelve a Todos.</p></Empty>}
          {shorts.length > 0 && (
            <section className="shelf subscription-shorts" aria-labelledby="sub-shorts-title">
              <div className="page-head-row">
                <h2 id="sub-shorts-title"><Icon name="shorts" size={22} /> Shorts</h2>
                <button type="button" className="link-btn" onClick={() => setParams({ f: 'shorts' }, { replace: true })}>Ver todos</button>
              </div>
              <div className="shorts-row">
                {shorts.slice(0, 20).map((v) => <ShortCard key={v.id} id={v.id} title={v.title ?? v.id} channel={v.channel} publishedAt={v.publishedAt} views={v.views} />)}
              </div>
            </section>
          )}
        </section>
      )}
      <Sentinel onVisible={() => { if (hasMore) void loadMoreFeed(); }} />
      {hasMore && <SkeletonGrid n={4} />}
      {!hasMore && <p className="list-end">Has llegado al final de las publicaciones cargadas.</p>}
    </div>
  );
}

function FeedHeader({ count, total }: { count: number; total?: number }) {
  return <div className="subscription-feed-head">
    <div><h1>Suscripciones</h1><p className="sub">{count} canales seguidos{total == null ? '' : ` · ${total} publicaciones disponibles`}</p></div>
    <Link className="btn subscription-manage-link" to="/suscripciones/gestionar"><Icon name="settings" size={18} /> Gestionar suscripciones</Link>
  </div>;
}
