import { useOEmbed } from '../oembed';
import Linkify from '../components/Linkify';
import { useTitle } from '../title';
import { openSave } from '../components/SaveDialog';
import { isBlocked } from '../filters';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useChannels, useFeed } from '../data';
import Avatar from '../components/Avatar';
import { actions, useStore, type Meta } from '../store';
import { ago, clock, fmtViews } from '../format';
import VideoCard from '../components/VideoCard';
import Icon from '../components/Icon';
import { ErrorBox } from '../components/States';
import { play } from '../player/session';
import { hostEl } from '../components/PlayerHost';
import BellMenu, { type Bell } from '../components/BellMenu';
import { setChannelBell } from '../push';
import { fetchVideo, removeChannel, type VideoData } from '../api';
import { shareVideo, toast } from '../toast';
import { useBranding } from '../community';

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
  const ownerKey = useStore((s) => s.ownerKey);
  // Los datos del vídeo proceden del feed público; los segmentos de vídeo no se retransmiten.
  const [pub, setPub] = useState<VideoData | null>(null);
  useEffect(() => { setPub(null); let ok = true; fetchVideo(id).then((d) => { if (ok) setPub(d); }).catch(() => {}); return () => { ok = false; }; }, [id]);
  const views = pub?.views ?? null;
  const description = pub?.description ?? '';
  const [descOpen, setDescOpen] = useState(false);
  const daOn = useStore((s) => s.dearrow);
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

  useEffect(() => { setDescOpen(false); }, [id]);
  // Pide al reproductor único que ponga este vídeo (si ya sonaba en el mini reproductor, sigue sin cortarse).
  useEffect(() => { if (validId) play({ id, meta, startAt, vertical: isShort, list: listId ?? undefined }); }, [id, validId, meta, startAt, isShort, listId]);

  // Atajos disponibles en la ficha. No se anuncian acciones de reproducción para un stream que no se carga.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (typing(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 't') { actions.toggleTheater(); return; }
      if (e.key === 'f') {
        const el = hostEl.current;
        if (document.fullscreenElement) void document.exitFullscreen();
        else void el?.requestFullscreen?.();
        return;
      }
      if (e.key === 'N' && e.shiftKey && upNext) navigate('/ver/' + upNext.id + q);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [upNext, navigate, q]);

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
        </div>
      </div>
      <div className="watch-main">
        <h1 className="watch-title" title={brand.title ? `Título original: ${meta.title}` : undefined}>{brand.title ?? meta.title}</h1>
        <div className="watch-row">
          <div className="watch-channel">
            <Link to={`/canal/${meta.channelId}`}><Avatar name={meta.channel || 'Canal'} id={meta.channelId || id} size={40} /></Link>
            <span><Link to={`/canal/${meta.channelId}`}><b>{meta.channel}</b></Link><span className="vmeta">{channel?.status === 'verified' ? 'Avisos al momento' : ''}</span></span>
            {channel && <BellMenu name={channel.name} value={channel.notify ?? 'all'}
              onChange={(v: Bell) => bell(() => setChannelBell(channel.id, v, ownerKey), 'Avisos actualizados')}
              onUnfollow={() => bell(() => removeChannel(channel.id, ownerKey), `Has dejado de seguir ${channel.name}`)} />}
          </div>
          <div className="watch-actions">
            <button type="button" className={`btn${fav ? ' on' : ''}`} aria-pressed={fav} aria-label={fav ? 'Quitar de Mis Me gusta' : 'Guardar en Mis Me gusta'} title="Guarda este vídeo en la biblioteca local de TodoTube" onClick={() => { actions.toggleFavorite(meta); toast(fav ? 'Quitado de Mis Me gusta' : 'Guardado en Mis Me gusta'); }}>
              <Icon name="like" size={18} /> {fav ? 'En Mis Me gusta' : 'Me gusta'}
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
            {[fmtViews(views), video?.publishedAt ? ago(video.publishedAt) : '', startAt >= 5 ? `continúa en ${clock(startAt)}` : ''].filter(Boolean).join(' · ')}
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
        </div>
        {next.map((v) => <VideoCard key={v.id} {...v} title={v.title ?? v.id} compact list={listId ?? undefined} />)}
      </aside>}
    </div>
  );
}
