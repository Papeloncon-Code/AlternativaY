import { Fragment, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFeed } from '../data';
import { useStore } from '../store';
import VideoCard from '../components/VideoCard';
import ShortCard from '../components/ShortCard';
import Chips from '../components/Chips';
import Icon from '../components/Icon';
import { Empty, ErrorBox, SkeletonGrid } from '../components/States';

const DAY = 86_400_000;

export default function Home() {
  const feed = useFeed();
  const watched = useStore((s) => s.watched);
  const [chip, setChip] = useState('todos');

  const channels = useMemo(() => {
    const m = new Map<string, string>();
    (feed.data ?? []).forEach((v) => m.set(v.channelId, v.channel));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [feed.data]);
  const chips = [
    { key: 'todos', label: 'Todos' }, { key: 'sinver', label: 'Sin ver' }, { key: 'hoy', label: 'Hoy' }, { key: 'nuevos', label: 'Subidos recientemente' },
    ...channels.map(([id, name]) => ({ key: `c:${id}`, label: name })),
  ];
  const videos = useMemo(() => {
    const now = Date.now();
    return (feed.data ?? []).filter((v) => v.kind !== 'short').filter((v) => {
      if (chip === 'sinver') return !watched[v.id];
      if (chip === 'hoy') return (v.publishedAt ?? 0) > now - DAY;
      if (chip === 'nuevos') return v.source !== 'baseline';
      if (chip.startsWith('c:')) return v.channelId === chip.slice(2);
      return true;
    });
  }, [feed.data, chip, watched]);
  const shorts = useMemo(() => (feed.data ?? []).filter((v) => v.kind === 'short' && (!chip.startsWith('c:') || v.channelId === chip.slice(2))).slice(0, 12), [feed.data, chip]);
  const firstRows = 8; // la fila de Shorts va después de las primeras filas, como en las apps de vídeo

  const shelf = shorts.length > 0 && (
    <section className="shelf" aria-labelledby="h-shorts">
      <h2 id="h-shorts"><Icon name="shorts" size={24} /> Shorts</h2>
      <div className="shorts-row">
        {shorts.map((v) => <ShortCard key={v.id} id={v.id} title={v.title ?? v.id} channel={v.channel} publishedAt={v.publishedAt} />)}
      </div>
    </section>
  );

  return (
    <div className="page">
      <Chips items={chips} value={chip} onChange={setChip} />
      {feed.loading && <SkeletonGrid n={8} />}
      {feed.error && <ErrorBox message={`No se pudieron cargar las novedades (${feed.error}).`} onRetry={feed.reload} />}
      {feed.data && feed.data.length === 0 && (
        <Empty title="Aún no hay vídeos"><p>Sigue algún canal y sus vídeos aparecerán aquí en cuanto se publiquen.</p><Link className="btn primary" to="/suscripciones">Añadir canales</Link></Empty>
      )}
      {feed.data && feed.data.length > 0 && videos.length === 0 && (
        <Empty title="Nada con este filtro"><button type="button" className="btn" onClick={() => setChip('todos')}>Ver todos</button></Empty>
      )}
      {videos.length > 0 && (
        <>
          <div className="vgrid">{videos.slice(0, firstRows).map((v) => <VideoCard key={v.id} {...v} title={v.title ?? v.id} isNew={v.source !== 'baseline'} />)}</div>
          {shelf}
          <div className="vgrid">{videos.slice(firstRows).map((v) => <VideoCard key={v.id} {...v} title={v.title ?? v.id} isNew={v.source !== 'baseline'} />)}</div>
        </>
      )}
      {videos.length === 0 && <Fragment>{shelf}</Fragment>}
    </div>
  );
}
