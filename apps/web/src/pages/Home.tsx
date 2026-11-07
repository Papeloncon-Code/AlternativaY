import { Fragment, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFeed } from '../data';
import type { Video } from '../api';
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
  const hidden = useStore((s) => s.hidden);
  const focus = useStore((s) => s.focus);
  const [chip, setChip] = useState('todos');

  const channels = useMemo(() => {
    const m = new Map<string, string>();
    (feed.data ?? []).forEach((v) => m.set(v.channelId, v.channel));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [feed.data]);
  const visitPrev = useStore((s) => s.visitPrev);
  const progress = useStore((s) => s.progress);
  // Cada filtro solo aparece si cambia algo respecto a “Todos” (si da lo mismo, parece que el botón no funciona).
  const base = useMemo(() => (feed.data ?? []).filter((v) => v.kind !== 'short' && !hidden[v.id]), [feed.data, hidden]);
  const filters = useMemo(() => {
    const now = Date.now();
    const seen = (id: string) => Boolean(watched[id] || progress[id]);
    return [
      { key: 'novedades', label: 'Novedades para ti', f: (v: Video) => visitPrev > 0 && v.source !== 'baseline' && v.seenAt > visitPrev },
      { key: 'hoy', label: 'Hoy', f: (v: Video) => (v.publishedAt ?? 0) > now - DAY },
      { key: 'semana', label: 'Esta semana', f: (v: Video) => (v.publishedAt ?? 0) > now - 7 * DAY },
      { key: 'sinver', label: 'Sin ver', f: (v: Video) => !seen(v.id) },
      { key: 'vistos', label: 'Vistos', f: (v: Video) => seen(v.id) },
    ].map((x) => ({ ...x, n: base.filter(x.f).length })).filter((x) => x.n > 0 && x.n < base.length);
  }, [base, visitPrev, watched, progress]);
  const chips = [
    { key: 'todos', label: 'Todos' },
    ...filters.map((x) => ({ key: x.key, label: x.label })),
    ...channels.map(([id, name]) => ({ key: `c:${id}`, label: name })),
  ];
  const valid = chips.some((c) => c.key === chip) ? chip : 'todos';
  const eff = focus ? 'todos' : valid; // en modo Foco: todo lo nuevo, sin filtros
  const videos = useMemo(() => {
    if (eff.startsWith('c:')) return base.filter((v) => v.channelId === eff.slice(2));
    const f = filters.find((x) => x.key === eff);
    return f ? base.filter(f.f) : base;
  }, [base, eff, filters]);
  const shorts = useMemo(() => (feed.data ?? []).filter((v) => v.kind === 'short' && !hidden[v.id] && (!eff.startsWith('c:') || v.channelId === eff.slice(2))).slice(0, 12), [feed.data, eff, hidden]);
  const firstRows = 8; // la fila de Shorts va después de las primeras filas, como en las apps de vídeo

  const shelf = !focus && shorts.length > 0 && (
    <section className="shelf" aria-labelledby="h-shorts">
      <h2 id="h-shorts"><Icon name="shorts" size={24} /> Shorts</h2>
      <div className="shorts-row">
        {shorts.map((v) => <ShortCard key={v.id} id={v.id} title={v.title ?? v.id} channel={v.channel} publishedAt={v.publishedAt} />)}
      </div>
    </section>
  );

  return (
    <div className="page">
      {focus ? <h1 className="focus-title">Lo nuevo de tus canales</h1> : <Chips items={chips} value={valid} onChange={(k) => { setChip(k); window.scrollTo({ top: 0 }); }} />}
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
