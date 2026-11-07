import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useChannels, useFeed } from '../data';
import Avatar from '../components/Avatar';
import { actions, useStore, type Meta } from '../store';
import { ago, clock } from '../format';
import VideoCard from '../components/VideoCard';
import Icon from '../components/Icon';
import { ErrorBox } from '../components/States';
import OfficialPlayer from '../components/OfficialPlayer';
import OwnPlayer from '../components/OwnPlayer';
import BellMenu, { type Bell } from '../components/BellMenu';
import { setChannelBell } from '../push';
import { removeChannel, thumb } from '../api';
import { shareVideo, toast } from '../toast';
import type { PlayerHandle, VideoDetails } from '../player/handle';

const hasBridge = () => !!(window as unknown as { todotubeBridge?: { installed?: boolean } }).todotubeBridge?.installed;
const ID_RE = /^[A-Za-z0-9_-]{11}$/;
const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
const fmtViews = (n?: number) => (n == null ? '' : `${new Intl.NumberFormat('es', { notation: 'compact' }).format(n)} visualizaciones`);

export default function Watch() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const feed = useFeed();
  const channels = useChannels();
  const saved = useStore((s) => s.progress[id]);
  const fav = useStore((s) => Boolean(s.favorites[id]));
  const later = useStore((s) => Boolean(s.watchLater[id]));
  const theater = useStore((s) => s.theater);
  const autoplay = useStore((s) => s.autoplay);
  const ownerKey = useStore((s) => s.ownerKey);
  const [fallback, setFallback] = useState('');
  const [details, setDetails] = useState<VideoDetails | null>(null);
  const [descOpen, setDescOpen] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const handle = useRef<PlayerHandle | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const own = hasBridge() && !fallback;
  const video = feed.data?.find((v) => v.id === id);
  const isShort = params.get('short') === '1' || video?.kind === 'short';
  const meta: Meta = useMemo(() => ({
    id, title: video?.title ?? saved?.title ?? 'Vídeo', channel: video?.channel ?? saved?.channel ?? '', channelId: video?.channelId ?? saved?.channelId ?? '',
  }), [id, video, saved]);
  const startAt = useRef(saved ? Math.max(0, saved.pos - 3) : 0);
  const validId = ID_RE.test(id);
  const channel = channels.data?.find((c) => c.id === meta.channelId);

  const all = (feed.data ?? []).filter((v) => v.id !== id && v.kind !== 'short');
  const next = [...all.filter((v) => v.channelId === meta.channelId), ...all.filter((v) => v.channelId !== meta.channelId)].slice(0, 20);
  const upNext = next[0];

  useEffect(() => { setDetails(null); setDescOpen(false); setCountdown(null); handle.current = null; setFallback(''); }, [id]);

  // Siguiente automático con cuenta atrás cancelable (W5).
  const onEnded = useCallback(() => { if (autoplay && upNext && !isShort) setCountdown(8); }, [autoplay, upNext, isShort]);
  useEffect(() => {
    if (countdown == null) return;
    if (countdown <= 0) { navigate(`/ver/${upNext.id}`); return; }
    const t = setTimeout(() => setCountdown((c) => (c == null ? c : c - 1)), 1000);
    return () => clearTimeout(t);
  }, [countdown, upNext, navigate]);

  // Atajos de teclado (W6), como los que ya conoce la gente.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (typing(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      const h = handle.current;
      const k = e.key;
      if (k === 't') { actions.toggleTheater(); return; }
      if (k === 'f') { const el = frameRef.current; if (document.fullscreenElement) document.exitFullscreen(); else el?.requestFullscreen?.(); return; }
      if (k === 'N' && e.shiftKey && upNext) { navigate(`/ver/${upNext.id}`); return; }
      if (!h) return;
      if (k === 'k' || k === ' ') { e.preventDefault(); h.togglePlay(); }
      else if (k === 'j') h.seekBy(-10);
      else if (k === 'l') h.seekBy(10);
      else if (k === 'ArrowLeft') { e.preventDefault(); h.seekBy(-5); }
      else if (k === 'ArrowRight') { e.preventDefault(); h.seekBy(5); }
      else if (k === 'm') h.toggleMute();
      else if (k === '>' ) toast(`Velocidad ${h.changeRate(0.25)}×`);
      else if (k === '<') toast(`Velocidad ${h.changeRate(-0.25)}×`);
      else if (/^[0-9]$/.test(k)) h.seekToFraction(Number(k) / 10);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [upNext, navigate]);

  const bell = async (fn: () => Promise<unknown>, ok: string) => {
    try { if (!ownerKey) throw new Error('Pon tu clave de propietario en Ajustes.'); await fn(); channels.reload(); toast(ok); }
    catch (e) { toast(e instanceof Error ? e.message : String(e)); }
  };

  const playerProps = { id, meta, startAt: startAt.current, onEnded, onReady: (h: PlayerHandle) => { handle.current = h; } };
  return (
    <div className={`watch-layout${theater ? ' theater' : ''}`}>
      <div className="watch-player" ref={frameRef}>
        <div className={`player-frame${isShort ? ' vertical' : ''}`}>
          {!validId ? <ErrorBox message="Enlace de vídeo no válido." />
            : own ? <OwnPlayer key={id} {...playerProps} onFail={setFallback} onDetails={setDetails} />
            : <OfficialPlayer key={id} {...playerProps} />}
          {countdown != null && upNext && (
            <div className="upnext" role="dialog" aria-label="Siguiente vídeo">
              <p>Siguiente en {countdown}</p>
              <div className="upnext-card"><img src={thumb(upNext.id)} alt="" /><div><b>{upNext.title}</b><span>{upNext.channel}</span></div></div>
              <div className="upnext-actions">
                <button type="button" className="btn" onClick={() => setCountdown(null)}>Cancelar</button>
                <button type="button" className="btn primary" onClick={() => navigate(`/ver/${upNext.id}`)}>Reproducir ahora</button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="watch-main">
        <h1 className="watch-title">{meta.title}</h1>
        <div className="watch-row">
          <div className="watch-channel">
            <Link to={`/canal/${meta.channelId}`}><Avatar name={meta.channel || 'Canal'} id={meta.channelId || id} size={40} /></Link>
            <span><Link to={`/canal/${meta.channelId}`}><b>{meta.channel}</b></Link><span className="vmeta">{channel?.status === 'verified' ? 'Avisos al momento' : ''}</span></span>
            {channel && <BellMenu name={channel.name} value={channel.notify ?? 'all'}
              onChange={(v: Bell) => bell(() => setChannelBell(channel.id, v, ownerKey), 'Avisos actualizados')}
              onUnfollow={() => bell(() => removeChannel(channel.id, ownerKey), `Has dejado de seguir ${channel.name}`)} />}
          </div>
          <div className="watch-actions">
            <button type="button" className={`btn${fav ? ' on' : ''}`} aria-pressed={fav} onClick={() => { actions.toggleFavorite(meta); toast(fav ? 'Quitado de Me gusta' : 'Añadido a Me gusta'); }}>
              <Icon name="like" size={18} /> {fav ? 'Te gusta' : 'Me gusta'}
            </button>
            <button type="button" className="btn" onClick={() => shareVideo(id, meta.title)}><Icon name="share" size={18} /> Compartir</button>
            <button type="button" className={`btn${later ? ' on' : ''}`} aria-pressed={later} onClick={() => { actions.toggleWatchLater(meta); toast(later ? 'Quitado de Ver más tarde' : 'Guardado en Ver más tarde'); }}>
              <Icon name="clock" size={18} /> {later ? 'Guardado' : 'Guardar'}
            </button>
            <button type="button" className="btn icon-only" aria-pressed={theater} title="Modo cine (t)" aria-label="Modo cine" onClick={() => actions.toggleTheater()}><Icon name="theater" size={18} /></button>
          </div>
        </div>
        <div className={`desc${descOpen ? ' open' : ''}`} onClick={() => setDescOpen(true)}>
          <p className="desc-meta">
            {[fmtViews(details?.views), video?.publishedAt ? ago(video.publishedAt) : '', details?.lengthSeconds ? clock(details.lengthSeconds) : '', startAt.current >= 5 ? `continúa en ${clock(startAt.current)}` : ''].filter(Boolean).join(' · ')}
          </p>
          {details?.description
            ? <p className="desc-text">{details.description}</p>
            : <p className="desc-text muted">{hasBridge() ? 'Cargando la descripción…' : <>La descripción, las visitas y la duración se muestran con <Link to="/puente">TodoTube Puente</Link>.</>}</p>}
          {details?.description && <button type="button" className="desc-toggle" onClick={(e) => { e.stopPropagation(); setDescOpen((o) => !o); }}>{descOpen ? 'Mostrar menos' : '…más'}</button>}
        </div>
        {fallback && <p className="bridge-hint">El reproductor TodoTube no pudo cargar este vídeo ({fallback}); se usa el reproductor de reserva.</p>}
        {!video && !feed.loading && !saved && <p className="note">Este vídeo no está en tus novedades. <Link to="/">Ir a Principal</Link></p>}
      </div>
      <aside className="watch-side" aria-label="A continuación">
        <div className="side-head">
          <b>A continuación</b>
          <label className="switch"><input id="autoplay" type="checkbox" checked={autoplay} onChange={() => actions.toggleAutoplay()} /><span>Reproducción automática</span></label>
        </div>
        {next.map((v) => <VideoCard key={v.id} {...v} title={v.title ?? v.id} compact />)}
      </aside>
    </div>
  );
}
