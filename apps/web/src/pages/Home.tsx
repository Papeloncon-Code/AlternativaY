import { useTitle } from '../title';
import { Fragment, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { feedMore, loadMoreFeed, useFeed } from '../data';
import { isBlocked } from '../filters';
import Sentinel from '../components/Sentinel';
import type { Video } from '../api';
import { useStore } from '../store';
import VideoCard from '../components/VideoCard';
import ShortCard from '../components/ShortCard';
import Chips from '../components/Chips';
import Icon from '../components/Icon';
import { Empty, ErrorBox, SkeletonGrid } from '../components/States';


export default function Home() {
  const feed = useFeed();
  useTitle(null);
  const watched = useStore((s) => s.watched);
  const hidden = useStore((s) => s.hidden);
  const focus = useStore((s) => s.focus);
  // El filtro vive en la URL (?f=…): «Atrás» lo recupera, como en las apps de vídeo (#21).
  const [params, setParams] = useSearchParams();
  const chip = params.get('f') || 'todos';
  const setChip = (k: string) => setParams(k === 'todos' ? {} : { f: k }, { replace: true });
  const loc = useLocation();
  const keyShown = `todotube:shown:${loc.key}`;
  const words = useStore((s) => s.blockWords);
  const groups = useStore((s) => s.groups);
  const [shown, setShownRaw] = useState(() => { try { return Number(sessionStorage.getItem(keyShown)) || 24; } catch { return 24; } });
  const setShown = (f: number | ((n: number) => number)) => setShownRaw((n) => { const v = typeof f === 'function' ? f(n) : f; try { sessionStorage.setItem(keyShown, String(v)); } catch { /* */ } return v; });
  // Columnas reales de la cuadrícula: la fila de Shorts va tras dos filas completas, sin huecos (#10).
  const gridRef = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(4);
  useLayoutEffect(() => {
    const el = gridRef.current; if (!el) return;
    const read = () => setCols(Math.max(1, getComputedStyle(el).gridTemplateColumns.split(' ').length));
    read(); const ro = new ResizeObserver(read); ro.observe(el); return () => ro.disconnect();
  });

  const channels = useMemo(() => {
    const m = new Map<string, string>();
    (feed.data ?? []).forEach((v) => m.set(v.channelId, v.channel));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [feed.data]);
  const visitPrev = useStore((s) => s.visitPrev);
  const progress = useStore((s) => s.progress);
  // Cada filtro solo aparece si cambia algo respecto a “Todos” (si da lo mismo, parece que el botón no funciona).
  const base = useMemo(() => (feed.data ?? []).filter((v) => v.kind !== 'short' && !hidden[v.id] && !isBlocked(v.title, words)), [feed.data, hidden, words]);
  const filters = useMemo(() => {
    const seen = (id: string) => Boolean(watched[id] || progress[id]);
    return [
      { key: 'novedades', label: 'Novedades para ti', f: (v: Video) => visitPrev > 0 && v.source !== 'baseline' && v.seenAt > visitPrev },
      { key: 'sinver', label: 'Sin ver', f: (v: Video) => !seen(v.id) },
      { key: 'vistos', label: 'Vistos', f: (v: Video) => seen(v.id) },
    ].map((x) => ({ ...x, n: base.filter(x.f).length })).filter((x) => x.n > 0 && x.n < base.length);
  }, [base, visitPrev, watched, progress]);
  const chips = [
    { key: 'todos', label: 'Todos' },
    ...filters.map((x) => ({ key: x.key, label: x.label })),
    ...groups.filter((g) => g.channels.length).map((g) => ({ key: `g:${g.id}`, label: g.name })),
    ...channels.map(([id, name]) => ({ key: `c:${id}`, label: name })),
  ];
  const valid = chips.some((c) => c.key === chip) ? chip : 'todos';
  const eff = focus ? 'todos' : valid; // en modo Foco: todo lo nuevo, sin filtros
  const videos = useMemo(() => {
    if (eff.startsWith('c:')) return base.filter((v) => v.channelId === eff.slice(2));
    if (eff.startsWith('g:')) { const g = groups.find((x) => x.id === eff.slice(2)); return base.filter((v) => g?.channels.includes(v.channelId)); }
    const f = filters.find((x) => x.key === eff);
    return f ? base.filter(f.f) : base;
  }, [base, eff, filters, groups]);
  const shorts = useMemo(() => (feed.data ?? []).filter((v) => v.kind === 'short' && !hidden[v.id] && !isBlocked(v.title, words) && (!eff.startsWith('c:') || v.channelId === eff.slice(2))).slice(0, 12), [feed.data, eff, hidden, words]);
  const firstRows = cols * 2; // la fila de Shorts va después de dos filas completas

  const shelf = !focus && shorts.length > 0 && (
    <section className="shelf" aria-labelledby="h-shorts">
      <h2 id="h-shorts"><Icon name="shorts" size={24} /> Shorts</h2>
      <div className="shorts-row">
        {shorts.map((v) => <ShortCard key={v.id} id={v.id} title={v.title ?? v.id} channel={v.channel} publishedAt={v.publishedAt} views={v.views} />)}
      </div>
    </section>
  );

  return (
    <div className="page" data-total={base.length}>
      {focus ? <h1 className="focus-title">Lo nuevo de tus canales</h1> : <Chips items={chips} value={valid} onChange={(k) => { setChip(k); setShown(24); window.scrollTo({ top: 0 }); }} />}
      {!focus && valid !== 'todos' && videos.length > 0 && (
        <p className="filter-count" role="status">{videos.length === 1 ? '1 vídeo' : `${videos.length} vídeos`} · {chips.find((c) => c.key === valid)?.label}
          <button type="button" className="link-btn" onClick={() => { setChip('todos'); setShown(24); }}>Quitar filtro</button></p>
      )}
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
          <div className="vgrid" ref={gridRef}>{videos.slice(0, firstRows).map((v) => <VideoCard key={v.id} {...v} title={v.title ?? v.id} isNew={v.source !== 'baseline'} />)}</div>
          {shelf}
          <div className="vgrid">{videos.slice(firstRows, shown).map((v) => <VideoCard key={v.id} {...v} title={v.title ?? v.id} isNew={v.source !== 'baseline'} />)}</div>
          <Sentinel onVisible={() => { if (shown < videos.length) setShown((n) => n + 24); else void loadMoreFeed(); }} />
          {feedMore().loading && <SkeletonGrid n={4} />}
          {feedMore().done && shown >= videos.length && <p className="list-end">No hay más vídeos de tus canales.</p>}
        </>
      )}
      {videos.length === 0 && <Fragment>{shelf}</Fragment>}
    </div>
  );
}
