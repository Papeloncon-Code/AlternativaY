import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useFeed, useChannels, refreshAll } from '../data';
import VideoCard from '../components/VideoCard';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import { Empty, SkeletonGrid } from '../components/States';
import { useBridge } from '../bridge';
import { addChannel } from '../api';
import { getState } from '../store';
import { setAvatar } from '../avatars';
import { toast } from '../toast';
import type { RemoteChannel, RemoteVideo } from '../remote';

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Búsqueda: con TodoTube Puente busca en todo (como el buscador de las apps de vídeo); sin él, en lo que publican tus canales.
export default function Search() {
  const [params] = useSearchParams();
  const q = params.get('q') ?? '';
  const feed = useFeed();
  const channels = useChannels();
  const bridge = useBridge();
  const [remote, setRemote] = useState<{ q: string; videos: RemoteVideo[]; channels: RemoteChannel[] } | null>(null);
  const [error, setError] = useState('');
  const terms = norm(q).split(/\s+/).filter(Boolean);
  const match = (s: string) => { const w = norm(s).split(/[^\p{L}\p{N}]+/u); return terms.every((t) => w.some((x) => x.startsWith(t))); };
  const vids = useMemo(() => (feed.data ?? []).filter((v) => match(`${v.title} ${v.channel}`)), [feed.data, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const chans = useMemo(() => (channels.data ?? []).filter((c) => match(c.name)), [channels.data, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const followed = new Set((channels.data ?? []).map((c) => c.id));

  useEffect(() => {
    if (!bridge || !q.trim()) return;
    let alive = true;
    setError('');
    import('../remote').then((m) => m.searchAll(q)).then((r) => {
      if (!alive) return;
      r.channels.forEach((c) => c.avatar && setAvatar(c.id, c.avatar));
      setRemote({ q, ...r });
    }).catch((e) => { if (alive) setError(e instanceof Error ? e.message : String(e)); });
    return () => { alive = false; };
  }, [q, bridge]);

  async function follow(c: RemoteChannel) {
    const key = getState().ownerKey;
    if (!key) { toast('Para seguir canales, pon tu clave de propietario en Ajustes'); return; }
    try { await addChannel(c.id, c.name, key); refreshAll(); toast(`Ahora sigues a ${c.name}. Sus vídeos nuevos te llegarán al momento.`); }
    catch (e) { toast(e instanceof Error ? e.message : 'No se pudo seguir el canal'); }
  }

  if (bridge) {
    const r = remote?.q === q ? remote : null;
    return (
      <div className="page narrow-list">
        {error && <Empty title="No se pudo buscar"><p>{error}</p></Empty>}
        {!r && !error && <SkeletonGrid n={4} />}
        {r && r.channels.map((c) => (
          <div key={c.id} className="search-channel">
            <Avatar name={c.name} id={c.id} src={c.avatar} size={136} />
            <span className="sc-info"><b>{c.name}</b><small>{[c.subs, c.videos].filter(Boolean).join(' · ')}</small></span>
            {followed.has(c.id)
              ? <Link className="btn" to={`/canal/${c.id}`}><Icon name="check" size={18} /> Siguiendo</Link>
              : <button type="button" className="btn primary" onClick={() => void follow(c)}>Seguir</button>}
          </div>
        ))}
        {r && r.videos.map((v) => (
          <article key={v.id} className="sresult">
            <Link to={`/ver/${v.id}`} state={{ meta: { id: v.id, title: v.title, channel: v.channel, channelId: v.channelId } }} className="vthumb">
              <img src={`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`} alt="" loading="lazy" width={480} height={270} />
              {v.live ? <span className="vdur live">EN VIVO</span> : v.duration && <span className="vdur">{v.duration}</span>}
            </Link>
            <div className="sr-text">
              <Link to={`/ver/${v.id}`} state={{ meta: { id: v.id, title: v.title, channel: v.channel, channelId: v.channelId } }} className="vtitle">{v.title}</Link>
              <span className="vmeta">{[v.views, v.published].filter(Boolean).join(' · ')}</span>
              <span className="sr-chan"><Avatar name={v.channel} id={v.channelId} src={v.channelAvatar} size={24} /> {v.channel}</span>
            </div>
          </article>
        ))}
        {r && !r.videos.length && !r.channels.length && <Empty title="Sin resultados"><p>Prueba con otras palabras.</p></Empty>}
      </div>
    );
  }

  return (
    <div className="page narrow-list">
      <div className="search-scope">
        <Icon name="search2" size={20} />
        <p>Ahora se busca solo en lo que publican los <b>{(channels.data ?? []).length} canales que sigues</b>. Para buscar en todo, como en cualquier app de vídeo, instala <b>TodoTube Puente</b>.</p>
        <Link className="btn primary" to="/puente">Instalar</Link>
      </div>
      {chans.map((c) => (
        <Link key={c.id} to={`/canal/${c.id}`} className="search-channel"><Avatar name={c.name} id={c.id} size={88} /><span className="sc-info"><b>{c.name}</b><small>{c.videos} vídeos recientes</small></span></Link>
      ))}
      {vids.length === 0 && chans.length === 0 && <Empty title={`Ninguno de tus canales ha publicado nada sobre «${q}»`}><p>Con TodoTube Puente podrás buscar en todo y seguir canales nuevos desde aquí.</p></Empty>}
      <div className="vgrid">{vids.map((v) => <VideoCard key={v.id} {...v} title={v.title ?? v.id} short={v.kind === 'short'} />)}</div>
    </div>
  );
}
