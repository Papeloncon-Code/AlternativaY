import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFeed, useChannels } from '../data';
import VideoCard from '../components/VideoCard';
import Avatar from '../components/Avatar';
import { Link } from 'react-router-dom';
import { Empty } from '../components/States';

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// v0.2: busca en las novedades y canales que sigues (la búsqueda global llegará con el puente o Android).
export default function Search() {
  const [params] = useSearchParams();
  const q = params.get('q') ?? '';
  const feed = useFeed();
  const channels = useChannels();
  const terms = norm(q).split(/\s+/).filter(Boolean);
  const match = (s: string) => terms.every((t) => norm(s).includes(t));
  const vids = useMemo(() => (feed.data ?? []).filter((v) => match(`${v.title} ${v.channel}`)), [feed.data, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const chans = useMemo(() => (channels.data ?? []).filter((c) => match(c.name)), [channels.data, q]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="page narrow-list">
      <p className="sub">Resultados para «{q}» en tus canales</p>
      {chans.map((c) => (
        <Link key={c.id} to={`/canal/${c.id}`} className="search-channel"><Avatar name={c.name} id={c.id} size={88} /><span><b>{c.name}</b><small>{c.videos} vídeos recientes</small></span></Link>
      ))}
      {vids.length === 0 && chans.length === 0 && <Empty title="Sin resultados"><p>Prueba con otras palabras. Por ahora se busca en lo que publican los canales que sigues.</p></Empty>}
      <div className="vgrid">{vids.map((v) => <VideoCard key={v.id} {...v} title={v.title ?? v.id} short={v.kind === 'short'} />)}</div>
    </div>
  );
}
