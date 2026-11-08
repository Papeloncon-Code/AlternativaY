import { useTitle } from '../title';
import { stop } from '../player/session';
import { useOEmbed } from '../oembed';
import { isBlocked } from '../filters';
import { useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useFeed } from '../data';
import { actions, useStore, type Meta } from '../store';
import OwnPlayer from '../components/OwnPlayer';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import { shareVideo, toast } from '../toast';
import { ago } from '../format';
import { Empty } from '../components/States';


// Reproductor de Shorts: vertical, en bucle, y se pasa al siguiente deslizando, con la rueda o con ↑/↓ (S1–S4).
export default function ShortsPlayer() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const feed = useFeed();
  const hidden = useStore((st) => st.hidden);
  const words = useStore((st) => st.blockWords);
  const fromFeed = useMemo(() => (feed.data ?? []).filter((v) => v.kind === 'short' && ((!hidden[v.id] && !isBlocked(v.title, words)) || v.id === id)), [feed.data, hidden, words, id]);
  // Un Short que no es de tus canales (un enlace compartido) también se puede ver: va primero y luego siguen los tuyos (#4).
  const outside = !!feed.data && !fromFeed.some((v) => v.id === id) && /^[A-Za-z0-9_-]{11}$/.test(id);
  const oe = useOEmbed(id, outside);
  const list = useMemo(() => (outside
    ? [{ id, title: oe?.title ?? 'Short', channel: oe?.author ?? '', channelId: '', publishedAt: null, kind: 'short' as const }, ...fromFeed] as typeof fromFeed
    : fromFeed), [outside, fromFeed, id, oe]);
  const idx = list.findIndex((v) => v.id === id);
  const cur = list[idx];
  const fav = useStore((s) => Boolean(s.favorites[id]));
  const meta: Meta = { id, title: cur?.title ?? 'Short', channel: cur?.channel ?? '', channelId: cur?.channelId ?? '' };
  useTitle(cur?.title ? `${cur.title} (Short)` : 'Shorts');
  const go = (d: number) => {
    const n = list[idx + d];
    if (n) navigate(`/shorts/${n.id}`); // entrada en el historial: «Atrás» vuelve al Short anterior (#20)
  };
  const goRef = useRef(go);
  goRef.current = go;
  useEffect(() => { stop(); }, []); // un Short no suena a la vez que el mini reproductor

  useEffect(() => {
    const stage = () => document.querySelector('.shorts-stage');
    const inStage = (t: EventTarget | null) => t instanceof Node && !!stage()?.contains(t);
    const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    let keyLock = 0;
    const onKey = (e: KeyboardEvent) => {
      // Solo si nadie más usa la tecla (p. ej. ↓ en las sugerencias del buscador) (#19)
      if (e.defaultPrevented || typing(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      const now = Date.now();
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (now - keyLock < 300) return; keyLock = now; goRef.current(e.key === 'ArrowDown' ? 1 : -1); }
    };
    // Un gesto de rueda o de panel táctil = un Short: se espera a que el gesto termine (250 ms sin eventos) (#18).
    let wheelBusy = false; let wheelTimer = 0;
    const onWheel = (e: WheelEvent) => {
      if (!inStage(e.target) || Math.abs(e.deltaY) < 4) return; // la rueda sobre el menú o los avisos no cambia de Short (#19)
      clearTimeout(wheelTimer);
      wheelTimer = window.setTimeout(() => { wheelBusy = false; }, 250);
      if (wheelBusy) return;
      wheelBusy = true;
      goRef.current(e.deltaY > 0 ? 1 : -1);
    };
    let y0: number | null = null;
    const onTs = (e: TouchEvent) => { y0 = e.touches[0].clientY; };
    const onTe = (e: TouchEvent) => { if (y0 == null) return; const dy = y0 - e.changedTouches[0].clientY; if (Math.abs(dy) > 60) goRef.current(dy > 0 ? 1 : -1); y0 = null; };
    // Los gestos se escuchan en el escenario propio de Shorts, sin depender de eventos dentro de un iframe.
    const el = stage();
    window.addEventListener('keydown', onKey);
    window.addEventListener('wheel', onWheel, { passive: true });
    el?.addEventListener('touchstart', onTs as EventListener, { passive: true });
    el?.addEventListener('touchend', onTe as EventListener, { passive: true });
    return () => {
      clearTimeout(wheelTimer);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('wheel', onWheel);
      el?.removeEventListener('touchstart', onTs as EventListener);
      el?.removeEventListener('touchend', onTe as EventListener);
    };
  }, [list.length]);

  if (feed.data && !cur) return <div className="page"><Empty title="Enlace de Short no válido"><Link className="btn" to="/shorts">Ver Shorts</Link></Empty></div>;
  return (
    <div className="shorts-stage">
      <div className="short-wrap">
        <div className="short-player">
          {cur && <OwnPlayer key={id} id={id} kind="short" />}
          <div className="short-caption">
            {meta.channelId ? <Link to={`/canal/${meta.channelId}`} className="short-chan"><Avatar name={meta.channel || 'Canal'} id={meta.channelId} size={32} /><b>{meta.channel}</b></Link> : <span className="short-chan"><Avatar name={meta.channel || 'Canal'} id={id} size={32} /><b>{meta.channel || 'Canal externo'}</b></span>}
            <p>{meta.title}</p>
            <small>{cur?.publishedAt ? ago(cur.publishedAt) : ''}</small>
          </div>
        </div>
        <div className="short-actions">
          <button type="button" className={`round${fav ? ' on' : ''}`} aria-pressed={fav} aria-label={fav ? 'Quitar de Mis Me gusta' : 'Guardar en Mis Me gusta'} title="Guarda este Short en la biblioteca local de TodoTube" onClick={() => { actions.toggleFavorite(meta); toast(fav ? 'Quitado de Mis Me gusta' : 'Guardado en Mis Me gusta'); }}><Icon name="like" size={24} /></button>
          <span>{fav ? 'Guardado' : 'Me gusta'}</span>
          <button type="button" className="round" aria-label="Compartir" onClick={() => shareVideo(id, meta.title)}><Icon name="share" size={24} /></button>
          <span>Compartir</span>
          {meta.channelId ? <Link to={`/canal/${meta.channelId}`} className="round avatar-link" aria-label={`Canal ${meta.channel}`}><Avatar name={meta.channel || 'Canal'} id={meta.channelId} size={40} /></Link> : <span className="round avatar-link" aria-label="Canal externo"><Avatar name="Canal" id={id} size={40} /></span>}
        </div>
      </div>
      <div className="short-nav">
        <button type="button" className="round" aria-label="Short anterior" disabled={idx <= 0} onClick={() => go(-1)}><Icon name="up" size={24} /></button>
        <button type="button" className="round" aria-label="Short siguiente" disabled={idx >= list.length - 1} onClick={() => go(1)}><Icon name="chevron" size={24} /></button>
        <small>{idx + 1} / {list.length}</small>
      </div>
    </div>
  );
}
