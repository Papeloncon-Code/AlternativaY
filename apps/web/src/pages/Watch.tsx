import { useOEmbed } from '../oembed';
import Linkify from '../components/Linkify';
import { useTitle } from '../title';
import { openSave } from '../components/SaveDialog';
import { isBlocked } from '../filters';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useChannels, useFeed } from '../data';
import Avatar from '../components/Avatar';
import { actions, useStore, type Meta } from '../store';
import { ago, clock, fmtCount, fmtViews } from '../format';
import VideoCard from '../components/VideoCard';
import Icon from '../components/Icon';
import { ErrorBox } from '../components/States';
import { handleRef, pageCallbacks, play, useSession } from '../player/session';
import { hostEl } from '../components/PlayerHost';
import BellMenu, { type Bell } from '../components/BellMenu';
import { setChannelBell } from '../push';
import { fetchVideo, removeChannel, type VideoData } from '../api';
import { shareVideo, toast } from '../toast';
import { useBranding, useSegments } from '../community';

const ID_RE = /^[A-Za-z0-9_-]{11}$/;
const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

export default function Watch() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const feed = useFeed();
  const channels = useChannels();
  const saved = useStore((s) => s.progress[id]);
  const fav = useStore((s) => Boolean(s.favorites[id]));
  const listId = params.get('lista');
  const plist = useStore((s) => (listId ? s.playlists.find((p) => p.id === listId) : undefined));
  const later = useStore((s) => Boolean(s.watchLater[id]) || s.playlists.some((p) => p.items.some((i) => i.id === id)));
  const q = listId ? `?lista=${listId}` : '';
  const hidden = useStore((s) => s.hidden);
  const words = useStore((s) => s.blockWords);
  const theater = useStore((s) => s.theater);
  const focus = useStore((s) => s.focus);
  const autoplay = useStore((s) => s.autoplay) && !focus; // en Foco no se encadenan vídeos
  const ownerKey = useStore((s) => s.ownerKey);
  const session = useSession();
  const details = session?.id === id ? session.details : null;
  // Sin Puente: descripción, visitas y me gusta del RSS público, guardados por nuestro servidor (ADR-006, enmienda 3).
  const [pub, setPub] = useState<VideoData | null>(null);
  useEffect(() => { setPub(null); let ok = true; fetchVideo(id).then((d) => { if (ok) setPub(d); }).catch(() => {}); return () => { ok = false; }; }, [id]);
  const views = details?.views ?? pub?.views ?? null;
  const description = details?.description || pub?.description || '';
  const [descOpen, setDescOpen] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const handle = handleRef;
  const sbOn = useStore((s) => s.sponsorblock);
  const daOn = useStore((s) => s.dearrow);
  const segments = useSegments(id, sbOn); // el salto lo hace el reproductor único (PlayerHost)
  const brand = useBranding(id, daOn);
  const video = feed.data?.find((v) => v.id === id);
  const navMeta = (useLocation().state as { meta?: Meta } | null)?.meta; // vídeo abierto desde la búsqueda global
  const listIdx = plist ? plist.items.findIndex((i) => i.id === id) : -1;
  const listMeta = listIdx >= 0 ? plist!.items[listIdx] : undefined;
  const isShort = params.get('short') === '1' || video?.kind === 'short';
  // Vídeo abierto por enlace, fuera de tus canales: título y canal por oEmbed (sin Puente) (#24).
  const oe = useOEmbed(id, !!feed.data && !video && !saved && !navMeta && !listMeta);
  const meta: Meta = useMemo(() => ({
    id, title: video?.title ?? saved?.title ?? navMeta?.title ?? listMeta?.title ?? oe?.title ?? 'Vídeo', channel: video?.channel ?? saved?.channel ?? navMeta?.channel ?? listMeta?.channel ?? oe?.author ?? '', channelId: video?.channelId ?? saved?.channelId ?? navMeta?.channelId ?? listMeta?.channelId ?? '',
  }), [id, video, saved, navMeta, listMeta, oe]);
  const startAt = useMemo(() => (saved ? Math.max(0, saved.pos - 3) : 0), [id]); // eslint-disable-line react-hooks/exhaustive-deps
  const validId = ID_RE.test(id);
  const channel = channels.data?.find((c) => c.id === meta.channelId);
  useTitle(meta.title !== 'Vídeo' ? meta.title : null);

  const all = (feed.data ?? []).filter((v) => v.id !== id && v.kind !== 'short' && !hidden[v.id] && !isBlocked(v.title, words));
  const next = plist
    ? plist.items.slice(listIdx + 1)
    : [...all.filter((v) => v.channelId === meta.channelId), ...all.filter((v) => v.channelId !== meta.channelId)].slice(0, 20);
  const upNext = next[0];

  useEffect(() => { setDescOpen(false); setCountdown(null); }, [id]);
  // Pide al reproductor único que ponga este vídeo (si ya sonaba en el mini reproductor, sigue sin cortarse).
  useEffect(() => { if (validId) play({ id, meta, startAt, vertical: isShort, list: listId ?? undefined }); }, [id, validId, meta, startAt, isShort, listId]);

  // Siguiente automático con cuenta atrás cancelable (W5).
  const onEnded = useCallback(() => { if (autoplay && upNext && !isShort) setCountdown(8); }, [autoplay, upNext, isShort]);
  useEffect(() => { pageCallbacks.onEnded = onEnded; return () => { pageCallbacks.onEnded = undefined; }; }, [onEnded]);
  useEffect(() => {
    if (countdown == null) return;
    if (countdown <= 0) { navigate(`/ver/${upNext.id}${q}`); return; }
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
      if (k === 'f') { const el = hostEl.current; if (document.fullscreenElement) document.exitFullscreen(); else el?.requestFullscreen?.(); return; }
      if (k === 'N' && e.shiftKey && upNext) { navigate(`/ver/${upNext.id}${q}`); return; }
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

  return (
    <div className={`watch-layout${theater ? ' theater' : ''}`}>
      <div className="watch-player">
        {/* Hueco del reproductor: el reproductor único (PlayerHost) se coloca encima. */}
        <div id="player-slot" className={`player-frame${isShort ? ' vertical' : ''}`}>
          {!validId && <ErrorBox message="Enlace de vídeo no válido." />}
          {countdown != null && upNext && (
            <div className="upnext" role="dialog" aria-label="Siguiente vídeo">
              <p>Siguiente en {countdown}</p>
              <div className="upnext-card"><img src={thumb(upNext.id)} alt="" /><div><b>{upNext.title}</b><span>{upNext.channel}</span></div></div>
              <div className="upnext-actions">
                <button type="button" className="btn" onClick={() => setCountdown(null)}>Cancelar</button>
                <button type="button" className="btn primary" onClick={() => navigate(`/ver/${upNext.id}${q}`)}>Reproducir ahora</button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="watch-main">
        <h1 className="watch-title" title={brand.title ? `Título original: ${meta.title}` : undefined}>{brand.title ?? meta.title}</h1>
        {sbOn && segments.length > 0 && <p className="sb-note">Se saltarán {segments.length} {segments.length === 1 ? 'tramo' : 'tramos'} de patrocinio o autopromoción (<a href="https://sponsor.ajay.app/" target="_blank" rel="noreferrer">SponsorBlock</a>)</p>}
        <div className="watch-row">
          <div className="watch-channel">
            <Link to={`/canal/${meta.channelId}`}><Avatar name={meta.channel || 'Canal'} id={meta.channelId || id} size={40} /></Link>
            <span><Link to={`/canal/${meta.channelId}`}><b>{meta.channel}</b></Link><span className="vmeta">{channel?.status === 'verified' ? 'Avisos al momento' : ''}</span></span>
            {channel && <BellMenu name={channel.name} value={channel.notify ?? 'all'}
              onChange={(v: Bell) => bell(() => setChannelBell(channel.id, v, ownerKey), 'Avisos actualizados')}
              onUnfollow={() => bell(() => removeChannel(channel.id, ownerKey), `Has dejado de seguir ${channel.name}`)} />}
          </div>
          <div className="watch-actions">
            <button type="button" className={`btn${fav ? ' on' : ''}`} aria-pressed={fav} aria-label={fav ? 'Quitar de Me gusta' : 'Me gusta'} onClick={() => { actions.toggleFavorite(meta); toast(fav ? 'Quitado de Me gusta' : 'Añadido a Me gusta'); }}>
              <Icon name="like" size={18} /> {pub?.likes != null ? fmtCount(pub.likes + (fav ? 1 : 0)) : fav ? 'Te gusta' : 'Me gusta'}
            </button>
            <button type="button" className="btn" onClick={() => shareVideo(id, meta.title)}><Icon name="share" size={18} /> Compartir</button>
            <button type="button" className={`btn${later ? ' on' : ''}`} aria-pressed={later} onClick={() => openSave(meta)}>
              <Icon name="clock" size={18} /> {later ? 'Guardado' : 'Guardar'}
            </button>
            <button type="button" className="btn icon-only" aria-pressed={theater} title="Modo cine (t)" aria-label="Modo cine" onClick={() => actions.toggleTheater()}><Icon name="theater" size={18} /></button>
          </div>
        </div>
        <div className={`desc${descOpen ? ' open' : ''}`} onClick={() => setDescOpen(true)}>
          <p className="desc-meta">
            {[fmtViews(views), video?.publishedAt ? ago(video.publishedAt) : '', details?.lengthSeconds ? clock(details.lengthSeconds) : '', startAt >= 5 ? `continúa en ${clock(startAt)}` : ''].filter(Boolean).join(' · ')}
          </p>
          {description
            ? <p className="desc-text"><Linkify text={description} /></p>
            : <p className="desc-text muted">{video || pub ? 'La descripción de este vídeo aún no está disponible.' : 'Este vídeo no está en tus novedades.'}</p>}
          {description && <button type="button" className="desc-toggle" onClick={(e) => { e.stopPropagation(); setDescOpen((o) => !o); }}>{descOpen ? 'Mostrar menos' : '…más'}</button>}
        </div>
        {!video && !feed.loading && !saved && !navMeta && !listMeta && !oe && <p className="note">Este vídeo no está en tus novedades. <Link to="/">Ir a Principal</Link></p>}
      </div>
      {validId && <aside className="watch-side" aria-label="A continuación">
        <div className="side-head">
          <b>{plist ? `${plist.name} · ${listIdx + 1}/${plist.items.length}` : 'A continuación'}</b>
          <label className="switch"><input id="autoplay" type="checkbox" checked={autoplay} onChange={() => actions.toggleAutoplay()} /><span>Reproducción automática</span></label>
        </div>
        {next.map((v) => <VideoCard key={v.id} {...v} title={v.title ?? v.id} compact list={listId ?? undefined} />)}
      </aside>}
    </div>
  );
}
