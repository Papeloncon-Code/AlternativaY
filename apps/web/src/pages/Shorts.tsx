import { Navigate } from 'react-router-dom';
import { useFeed } from '../data';
import { Empty, SkeletonGrid } from '../components/States';

// “Shorts” abre directamente el reproductor vertical en el Short más reciente de tus canales.
export default function Shorts() {
  const feed = useFeed();
  const first = (feed.data ?? []).find((v) => v.kind === 'short');
  if (feed.loading) return <div className="page"><SkeletonGrid n={4} /></div>;
  if (first) return <Navigate to={`/shorts/${first.id}`} replace />;
  return <div className="page"><Empty title="No hay Shorts nuevos"><p>Cuando tus canales publiquen Shorts, aparecerán aquí, separados de los vídeos.</p></Empty></div>;
}
