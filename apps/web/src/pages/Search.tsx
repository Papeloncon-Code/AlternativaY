import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import ShortCard from '../components/ShortCard';
import { thumb, type Video } from '../api';
import { ago } from '../format';
import { useFeed, useChannels, refreshAll } from '../data';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import { Empty, SkeletonGrid } from '../components/States';
import { addChannel, searchServer } from '../api';
import { useTitle } from '../title';
import { getState } from '../store';
import { setAvatar } from '../avatars';
import { toast } from '../toast';
import type { RemoteChannel, RemoteVideo } from '../api';

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Búsqueda pública a través del servicio propio; no hay extracción en navegador ni extensión.
export default function Search() {
  const [params] = useSearchParams();
  const q = params.get('q') ?? '';
  const feed = useFeed();
  const channels = useChannels();
  const [remote, setRemote] = useState<{ q: string; videos: RemoteVideo[]; channels: RemoteChannel[] } | null>(null);
  const [error, setError] = useState('');
  const terms = norm(q).split(/\s+/).filter(Boolean);
  const match = (s: string) => { const w = norm(s).split(/[^\p{L}\p{N}]+/u); return terms.every((t) => w.some((x) => x.startsWith(t))); };
  const vids = useMemo(() => (feed.data ?? []).filter((v) => match(`${v.title} ${v.channel}`)), [feed.data, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const chans = useMemo(() => (channels.data ?? []).filter((c) => match(c.name)), [channels.data, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const followed = new Set((channels.data ?? []).map((c) => c.id));
  useTitle(q ? `${q} - Buscar` : 'Buscar');

  // La búsqueda remota depende del servicio propio. Si no responde, se muestran los canales locales.
  useEffect(() => {
    if (!q.trim()) return;
    let alive = true;
    setError('');
    searchServer(q)
      .then((r) => {
        if (!alive) return;
        r.channels.forEach((c) => c.avatar && setAvatar(c.id, c.avatar));
        setRemote({ q, ...r });
      })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : String(e)); });
    return () => { alive = false; };
  }, [q]);

  async function follow(c: RemoteChannel) {
    const key = getState().ownerKey;
    if (!key) { toast('Para seguir canales, pon tu clave de propietario en Ajustes'); return; }
    try { await addChannel(c.id, c.name, key); refreshAll(); toast(`Ahora sigues a ${c.name}. Sus vídeos nuevos te llegarán al momento.`); }
    catch (e) { toast(e instanceof Error ? e.message : 'No se pudo seguir el canal'); }
  }

  if (!q.trim()) return <Navigate to="/" replace />;
  if (!error) {
    const r = remote?.q === q ? remote : null;
    return (
      <div className="page narrow-list">
        {!r && <SkeletonGrid n={4} />}
        {r && r.channels.map((c) => (
          <div key={c.id} className="search-channel">
            <Link to={`/canal/${c.id}`} aria-label={`Canal ${c.name}`}><Avatar name={c.name} id={c.id} src={c.avatar} size={136} /></Link>
            <span className="sc-info"><Link to={`/canal/${c.id}`}><b>{c.name}</b></Link><small>{[c.handle, c.subs, c.videos].filter(Boolean).join(' • ')}</small>{c.about && <small className="sc-about">{c.about}</small>}</span>
            {followed.has(c.id)
              ? <Link className="btn" to={`/canal/${c.id}`}><Icon name="check" size={18} /> Suscrito</Link>
              : <button type="button" className="btn primary" onClick={() => void follow(c)}>Suscribirse</button>}
          </div>
        ))}
        {r && r.videos.some((v) => v.short) && (
          <section className="shelf" aria-label="Shorts"><h2><Icon name="shorts" size={22} /> Shorts</h2>
            <div className="shorts-row">{r.videos.filter((v) => v.short).map((v) => <ShortCard key={v.id} id={v.id} title={v.title} channel={v.channel} publishedAt={null} />)}</div>
          </section>
        )}
        {r && r.videos.filter((v) => !v.short).map((v) => (
          <article key={v.id} className="sresult">
            <Link to={`/ver/${v.id}`} state={{ meta: { id: v.id, title: v.title, channel: v.channel, channelId: v.channelId } }} className="vthumb">
              <img src={`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`} alt="" loading="lazy" width={480} height={270} />
              {v.live ? <span className="vdur live">EN VIVO</span> : v.duration && <span className="vdur">{v.duration}</span>}
            </Link>
            <div className="sr-text">
              <Link to={`/ver/${v.id}`} state={{ meta: { id: v.id, title: v.title, channel: v.channel, channelId: v.channelId } }} className="vtitle">{v.title}</Link>
              <span className="vmeta">{[v.views, v.published].filter(Boolean).join(' · ')}</span>
              <Link to={`/canal/${v.channelId}`} className="sr-chan"><Avatar name={v.channel} id={v.channelId} src={v.channelAvatar} size={24} /> {v.channel}</Link>
              {v.snippet && <span className="sr-snippet">{v.snippet}</span>}
            </div>
          </article>
        ))}
        {r && !r.videos.length && !r.channels.length && <Empty title="Sin resultados"><p>Prueba con otras palabras.</p></Empty>}
      </div>
    );
  }

  const localVideos = vids.filter((v) => v.kind !== 'short');
  const localShorts = vids.filter((v) => v.kind === 'short');
  return (
    <div className="page narrow-list">
      <p className="search-q">Resultados de «{q}»</p>
      <div className="search-scope">
        <Icon name="search2" size={20} />
        <p>La búsqueda en todo no responde ahora mismo ({error}). Mientras tanto, se busca en lo que publican los <b>{(channels.data ?? []).length} canales que sigues</b>.</p>
      </div>
      {chans.map((c) => (
        <Link key={c.id} to={`/canal/${c.id}`} className="search-channel"><Avatar name={c.name} id={c.id} size={88} /><span className="sc-info"><b>{c.name}</b><small>{c.videos} vídeos recientes</small></span></Link>
      ))}
      {vids.length === 0 && chans.length === 0 && <Empty title={`Ninguno de tus canales ha publicado nada sobre «${q}»`}><p>Vuelve a intentarlo en un momento.</p></Empty>}
      {localShorts.length > 0 && (
        <section className="shelf" aria-label="Shorts"><h2><Icon name="shorts" size={22} /> Shorts</h2>
          <div className="shorts-row">{localShorts.map((v) => <ShortCard key={v.id} id={v.id} title={v.title ?? v.id} channel={v.channel} publishedAt={v.publishedAt} views={v.views} />)}</div>
        </section>
      )}
      {localVideos.map((v) => <LocalRow key={v.id} v={v} />)}
    </div>
  );
}

// Resultado en fila, como en los buscadores de vídeo: miniatura grande a la izquierda y los datos a la derecha.
function LocalRow({ v }: { v: Video }) {
  return (
    <article className="sresult">
      <Link to={`/ver/${v.id}`} className="vthumb"><img src={thumb(v.id)} alt="" loading="lazy" width={480} height={270} /></Link>
      <div className="sr-text">
        <Link to={`/ver/${v.id}`} className="vtitle">{v.title ?? v.id}</Link>
        <span className="vmeta">{v.publishedAt ? ago(v.publishedAt) : ''}</span>
        <Link to={`/canal/${v.channelId}`} className="sr-chan"><Avatar name={v.channel} id={v.channelId} size={24} /> {v.channel}</Link>
      </div>
    </article>
  );
}
