import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTitle } from '../title';
import { useAllVideos, useChannels } from '../data';
import Avatar from '../components/Avatar';
import VideoCard from '../components/VideoCard';
import ShortCard from '../components/ShortCard';
import Shelf from '../components/Shelf';
import Icon from '../components/Icon';
import BellMenu, { type Bell } from '../components/BellMenu';
import { setChannelBell } from '../push';
import { fetchVideo, removeChannel, thumb, type ChannelHeader, type Video } from '../api';
import { useStore } from '../store';
import { Empty } from '../components/States';
import { ago, fmtViews } from '../format';
import { toast } from '../toast';
import Linkify from '../components/Linkify';

// Página de canal con la estructura y medidas de la referencia (spec 007 §14): banner, foto de 160 px, nombre con
// verificado, «@usuario · suscriptores · vídeos», descripción con «…más», enlace, botón; pestañas Inicio / Vídeos /
// Shorts con buscador; Inicio con vídeo destacado y estantes; orden «Más recientes / Populares / Más antiguos».
type Tab = 'inicio' | 'videos' | 'shorts' | 'buscar';
type Order = 'recientes' | 'populares' | 'antiguos';
const ORDERS: { id: Order; label: string }[] = [
  { id: 'recientes', label: 'Más recientes' }, { id: 'populares', label: 'Populares' }, { id: 'antiguos', label: 'Más antiguos' },
];

function sortBy(list: Video[], o: Order) {
  const t = (v: Video) => v.publishedAt ?? 0;
  if (o === 'populares') return [...list].sort((a, b) => (b.views ?? -1) - (a.views ?? -1) || t(b) - t(a));
  if (o === 'antiguos') return [...list].sort((a, b) => t(a) - t(b));
  return [...list].sort((a, b) => t(b) - t(a));
}

export function VerifiedBadge({ size = 14 }: { size?: number }) {
  return (
    <svg className="verified" width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Verificado">
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <path d="M7.5 12.3l3 3 6-6.3" fill="none" stroke="var(--bg)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AboutDialog({ name, id, h, onClose }: { name: string; id: string; h: ChannelHeader; onClose: () => void }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);
  const share = async () => {
    const url = `${location.origin}/canal/${id}`;
    try { if (navigator.share) await navigator.share({ title: name, url }); else { await navigator.clipboard.writeText(url); toast('Enlace copiado'); } } catch { /* cancelado */ }
  };
  return (
    <div className="modal-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal about-dialog" role="dialog" aria-modal="true" aria-labelledby="about-t">
        <div className="modal-head"><h2 id="about-t">{name}</h2>
          <button type="button" className="icon-btn" aria-label="Cerrar" autoFocus onClick={onClose}><Icon name="close" size={22} /></button></div>
        {h.about && <><h3>Descripción</h3><p className="about-desc">{h.about}</p></>}
        {h.link && (
          <>
            <h3>Enlaces</h3>
            <a className="about-link" href={h.link.url} target="_blank" rel="noopener noreferrer nofollow">
              <span className="about-ico"><Icon name="link" size={20} /></span>
              <span><strong>{h.link.text}</strong><small>{h.link.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</small></span>
            </a>
            {h.link.more && <p className="note">{h.link.more.replace(/^y /, 'Hay ')}: se ven en YouTube o con TodoTube Puente.</p>}
          </>
        )}
        <h3>Más información</h3>
        <ul className="about-list">
          {h.handle && <li><Icon name="play" size={20} />www.youtube.com/{h.handle}</li>}
          {h.subs && <li><Icon name="user" size={20} />{h.subs}</li>}
          {h.videos && <li><Icon name="library" size={20} />{h.videos}</li>}
        </ul>
        <button type="button" className="btn about-share" onClick={share}><Icon name="share" size={20} />Compartir canal</button>
      </div>
    </div>
  );
}

export default function Channel() {
  const { id = '', tab: tabParam } = useParams();
  const [sp, setSp] = useSearchParams();
  const nav = useNavigate();
  const channels = useChannels();
  const all = useAllVideos();
  const ownerKey = useStore((s) => s.ownerKey);
  const [msg, setMsg] = useState('');
  const [about, setAbout] = useState(false);
  const [searching, setSearching] = useState(tabParam === 'buscar');
  const [q, setQ] = useState(sp.get('q') ?? '');
  const searchRef = useRef<HTMLInputElement>(null);
  const tab: Tab = tabParam === 'videos' || tabParam === 'shorts' || tabParam === 'buscar' ? tabParam : 'inicio';
  const order = (ORDERS.find((o) => o.id === sp.get('orden'))?.id ?? 'recientes') as Order;
  const c = channels.data?.find((x) => x.id === id);
  const h = c?.header ?? null;
  const vids = useMemo(() => (all.data ?? []).filter((v) => v.channelId === id), [all.data, id]);
  const longs = useMemo(() => vids.filter((v) => v.kind !== 'short'), [vids]);
  const shorts = useMemo(() => vids.filter((v) => v.kind === 'short'), [vids]);
  // Nombre real del canal (cabecera pública); si aún no se ha leído, el que diste al seguirlo.
  const name = h?.title ?? c?.name ?? vids[0]?.channel ?? 'Canal';
  useTitle(name);
  useEffect(() => { if (searching) searchRef.current?.focus(); }, [searching]);
  const act = async (fn: () => Promise<unknown>) => { try { if (!ownerKey) throw new Error('Pon tu clave de propietario en Ajustes.'); await fn(); channels.reload(); } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); } };
  const base = `/canal/${id}`;
  const card = (v: Video) => <VideoCard key={v.id} {...v} title={v.title ?? v.id} noChannel />;
  const shelfCard = (v: Video) => <VideoCard key={v.id} {...v} title={v.title ?? v.id} noChannel dense />;
  const short = (v: Video) => <ShortCard key={v.id} id={v.id} title={v.title ?? v.id} channel={v.channel} publishedAt={v.publishedAt} views={v.views} />;
  const orderChips = (
    <div className="ch-orders" role="group" aria-label="Ordenar">
      {ORDERS.map((o) => (
        <button key={o.id} type="button" className={`chip${order === o.id ? ' on' : ''}`} aria-pressed={order === o.id}
          onClick={() => setSp((p) => { const n = new URLSearchParams(p); if (o.id === 'recientes') n.delete('orden'); else n.set('orden', o.id); return n; }, { replace: true })}>{o.label}</button>
      ))}
    </div>
  );
  // Vídeo destacado: el que el canal elige (si el servidor lo leyó); si no, el más reciente.
  const feat = h?.featured ?? null;
  const featLocal = feat ? vids.find((v) => v.id === feat.id) : longs[0];
  const featId = feat?.id ?? featLocal?.id;
  const [featDesc, setFeatDesc] = useState<string | null>(null);
  useEffect(() => {
    setFeatDesc(null);
    if (!feat?.about && featId) void fetchVideo(featId).then((d) => setFeatDesc(d?.description ?? null)).catch(() => {});
  }, [featId, feat?.about]);
  const hits = q.trim() ? vids.filter((v) => (v.title ?? '').toLowerCase().includes(q.trim().toLowerCase())) : [];

  return (
    <div className="page channel-page">
      {h?.banner && <div className="ch-banner"><img src={h.banner} alt="" /></div>}
      <header className="ch-head">
        <Avatar name={name} id={id} size={160} />
        <div className="ch-info">
          <h1>{name}{h?.verified && <VerifiedBadge size={24} />}</h1>
          <p className="ch-meta">
            {[h?.handle && <strong key="h">{h.handle}</strong>, h?.subs, h?.videos ?? (vids.length ? `${vids.length} vídeos recientes` : null)]
              .filter(Boolean).map((x, i) => <span key={i}>{x}</span>)}
          </p>
          {h?.about && (
            <button type="button" className="ch-desc" onClick={() => setAbout(true)} aria-label="Más información sobre el canal">
              <span className="ch-desc-text">{h.about.split('\n')[0]}</span><span className="ch-more">…más</span>
            </button>
          )}
          {h?.link && (
            <p className="ch-links">
              <a href={h.link.url} target="_blank" rel="noopener noreferrer nofollow"><Icon name="link" size={14} />{h.link.text}</a>
              {h.link.more && <button type="button" onClick={() => setAbout(true)}>{h.link.more}</button>}
            </p>
          )}
          <div className="ch-actions">
            {c && <BellMenu name={name} value={c.notify ?? 'all'} onChange={(v: Bell) => act(() => setChannelBell(id, v, ownerKey))} onUnfollow={() => act(() => removeChannel(id, ownerKey))} />}
          </div>
          {msg && <p className="bad-text">{msg}</p>}
        </div>
      </header>
      {about && h && <AboutDialog name={name} id={id} h={h} onClose={() => setAbout(false)} />}

      <div className="ch-tabs" role="tablist" aria-label="Contenido del canal">
        {([['inicio', 'Inicio', base], ['videos', 'Vídeos', `${base}/videos`], ['shorts', 'Shorts', `${base}/shorts`]] as const).map(([t, label, to]) => (
          <Link key={t} to={to} replace role="tab" aria-selected={tab === t} className={`ch-tab${tab === t ? ' on' : ''}`}>{label}</Link>
        ))}
        <form className={`ch-search${searching ? ' open' : ''}`} role="search" onSubmit={(e) => { e.preventDefault(); if (q.trim()) nav(`${base}/buscar?q=${encodeURIComponent(q.trim())}`, { replace: true }); }}>
          <button type="button" className="icon-btn" aria-label="Buscar en el canal" onClick={() => setSearching((s) => !s || !!q)}><Icon name="search2" size={22} /></button>
          {searching && <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar" aria-label="Buscar en este canal" onBlur={() => { if (!q) setSearching(false); }} />}
        </form>
      </div>

      {all.loading && <p className="sub ch-loading">Cargando…</p>}

      {tab === 'inicio' && !all.loading && (
        <>
          {featId && (
            <section className="ch-featured">
              <Link to={`/ver/${featId}`} className="vthumb"><img src={thumb(featId)} alt="" width={480} height={270} /></Link>
              <div>
                <Link to={`/ver/${featId}`} className="ch-feat-title">{feat?.title ?? featLocal?.title}</Link>
                <p className="ch-feat-meta">{feat ? [feat.views, feat.ago].filter(Boolean).join(' • ') : [fmtViews(featLocal?.views), featLocal?.publishedAt ? ago(featLocal.publishedAt) : ''].filter(Boolean).join(' • ')}</p>
                {(feat?.about ?? featDesc) && <p className="ch-feat-desc"><Linkify text={(feat?.about ?? featDesc)!} /></p>}
              </div>
            </section>
          )}
          {longs.length > 0 && <Shelf title="Vídeos" to={`${base}/videos`}>{sortBy(longs, 'recientes').slice(0, 12).map(shelfCard)}</Shelf>}
          {longs.some((v) => v.views != null) && longs.length > 1 && <Shelf title="Vídeos populares" to={`${base}/videos?orden=populares`}>{sortBy(longs, 'populares').slice(0, 12).map(shelfCard)}</Shelf>}
          {shorts.length > 0 && <Shelf title="Shorts" to={`${base}/shorts`} icon={<Icon name="shorts" size={24} />}>{sortBy(shorts, 'recientes').slice(0, 12).map(short)}</Shelf>}
          {!vids.length && <Empty title="Este canal no tiene vídeos recientes" />}
        </>
      )}

      {tab === 'videos' && !all.loading && (longs.length
        ? <>{orderChips}<div className="vgrid ch-grid">{sortBy(longs, order).map(card)}</div></>
        : <Empty title="Sin vídeos recientes" />)}

      {tab === 'shorts' && !all.loading && (shorts.length
        ? <>{orderChips}<div className="shorts-grid ch-grid">{sortBy(shorts, order).map(short)}</div></>
        : <Empty title="Sin Shorts recientes" />)}

      {tab === 'buscar' && !all.loading && (hits.length
        ? <div className="ch-results">{hits.map((v) => <VideoCard key={v.id} {...v} title={v.title ?? v.id} compact noChannel short={v.kind === 'short'} />)}</div>
        : <Empty title={q.trim() ? `No hay vídeos de este canal con «${q.trim()}»` : 'Escribe qué buscar en este canal'} />)}

      <p className="note ch-scope">Se muestran los vídeos que TodoTube ha guardado de este canal ({vids.length}).</p>
    </div>
  );
}
