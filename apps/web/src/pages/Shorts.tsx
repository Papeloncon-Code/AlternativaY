import { useFeed } from '../data';
import ShortCard from '../components/ShortCard';
import { Empty, SkeletonGrid } from '../components/States';

export default function Shorts() {
  const feed = useFeed();
  const shorts = (feed.data ?? []).filter((v) => v.kind === 'short');
  return (
    <div className="page">
      <h1 className="page-title">Shorts de tus canales</h1>
      {feed.loading && <SkeletonGrid n={6} />}
      {feed.data && shorts.length === 0 && <Empty title="No hay Shorts nuevos"><p>Cuando tus canales publiquen Shorts, aparecerán aquí, separados de los vídeos.</p></Empty>}
      <div className="shorts-grid">{shorts.map((v) => <ShortCard key={v.id} id={v.id} title={v.title ?? v.id} channel={v.channel} publishedAt={v.publishedAt} />)}</div>
    </div>
  );
}
