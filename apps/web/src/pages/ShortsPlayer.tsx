import { stop } from '../player/session';
import { isBlocked } from '../filters';
import { hasBridge } from '../bridge';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useFeed } from '../data';
import { actions, useStore, type Meta } from '../store';
import OfficialPlayer from '../components/OfficialPlayer';
import OwnPlayer from '../components/OwnPlayer';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import { shareVideo, toast } from '../toast';
import { ago } from '../format';
import { Empty } from '../components/States';
import type { PlayerHandle } from '../player/handle';


// Reproductor de Shorts: vertical, en bucle, y se pasa al siguiente deslizando, con la rueda o con ↑/↓ (S1–S4).
export default function ShortsPlayer() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const feed = useFeed();
  const [fallback, setFallback] = useState('');
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const handle = useRef<PlayerHandle | null>(null);
  const hidden = useStore((st) => st.hidden);
  const words = useStore((st) => st.blockWords);
  const list = useMemo(() => (feed.data ?? []).filter((v) => v.kind === 'short' && ((!hidden[v.id] && !isBlocked(v.title, words)) || v.id === id)), [feed.data, hidden, words, id]);
  const idx = list.findIndex((v) => v.id === id);
  const cur = list[idx];
  const fav = useStore((s) => Boolean(s.favorites[id]));
  const meta: Meta = { id, title: cur?.title ?? 'Short', channel: cur?.channel ?? '', channelId: cur?.channelId ?? '' };
  const go = (d: number) => {
    const n = list[idx + d];
    if (n) navigate(`/shorts/${n.id}`, { replace: true });
  };
  const goRef = useRef(go);
  goRef.current = go;
  useEffect(() => { setFallback(''); setPaused(false); handle.current = null; }, [id]);
  useEffect(() => { stop(); }, []); // un Short no suena a la vez que el mini reproductor

  useEffect(() => {
    let lock = 0;
    const step = (d: number) => { const now = Date.now(); if (now - lock < 600) return; lock = now; goRef.current(d); };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); step(1); }
      if (e.key === 'ArrowUp') { e.preventDefault(); step(-1); }
      if (e.key === 'k' || e.key === ' ') { e.preventDefault(); handle.current?.togglePlay(); setPaused((p) => !p); }
      if (e.key === 'm') { handle.current?.toggleMute(); setMuted((m) => !m); }
    };
    const onWheel = (e: WheelEvent) => { if (Math.abs(e.deltaY) > 30) step(e.deltaY > 0 ? 1 : -1); };
    let y0: number | null = null;
    const onTs = (e: TouchEvent) => { y0 = e.touches[0].clientY; };
    const onTe = (e: TouchEvent) => { if (y0 == null) return; const dy = y0 - e.changedTouches[0].clientY; if (Math.abs(dy) > 60) step(dy > 0 ? 1 : -1); y0 = null; };
    // La capa de gestos está encima del vídeo: el iframe del reproductor se traga la rueda y los toques si no.
    const el = document.querySelector('.shorts-stage');
    window.addEventListener('keydown', onKey);
    window.addEventListener('wheel', onWheel, { passive: true });
    el?.addEventListener('touchstart', onTs as EventListener, { passive: true });
    el?.addEventListener('touchend', onTe as EventListener, { passive: true });
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('wheel', onWheel);
      el?.removeEventListener('touchstart', onTs as EventListener);
      el?.removeEventListener('touchend', onTe as EventListener);
    };
  }, [list.length]);

  if (feed.data && !cur) return <div className="page"><Empty title="Este Short no está entre los de tus canales"><Link className="btn" to="/shorts">Ver Shorts</Link></Empty></div>;
  const props = { id, meta, startAt: 0, loop: true, onReady: (h: PlayerHandle) => { handle.current = h; } };
  return (
    <div className="shorts-stage">
      <div className="short-wrap">
        <div className="short-player">
          {cur && (hasBridge() && !fallback
            ? <OwnPlayer key={id} {...props} onFail={setFallback} />
            : <OfficialPlayer key={id} {...props} />)}
          <button type="button" className="short-gesture" aria-label={paused ? 'Reproducir' : 'Pausar'} onClick={() => { handle.current?.togglePlay(); setPaused((p) => !p); }}>
            {paused && <span className="short-state"><Icon name="play" size={40} /></span>}
          </button>
          <button type="button" className="short-mute" aria-label={muted ? 'Activar sonido' : 'Silenciar'} onClick={() => { handle.current?.toggleMute(); setMuted((m) => !m); }}>
            <Icon name={muted ? 'muted' : 'volume'} size={22} />
          </button>
          <div className="short-caption">
            <Link to={`/canal/${meta.channelId}`} className="short-chan"><Avatar name={meta.channel || 'Canal'} id={meta.channelId || id} size={32} /><b>{meta.channel}</b></Link>
            <p>{meta.title}</p>
            <small>{cur?.publishedAt ? ago(cur.publishedAt) : ''}</small>
          </div>
        </div>
        <div className="short-actions">
          <button type="button" className={`round${fav ? ' on' : ''}`} aria-pressed={fav} aria-label="Me gusta" onClick={() => { actions.toggleFavorite(meta); toast(fav ? 'Quitado de Me gusta' : 'Añadido a Me gusta'); }}><Icon name="like" size={24} /></button>
          <span>Me gusta</span>
          <button type="button" className="round" aria-label="Compartir" onClick={() => shareVideo(id, meta.title)}><Icon name="share" size={24} /></button>
          <span>Compartir</span>
          <Link to={`/canal/${meta.channelId}`} className="round avatar-link" aria-label={`Canal ${meta.channel}`}><Avatar name={meta.channel || 'Canal'} id={meta.channelId || id} size={40} /></Link>
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
