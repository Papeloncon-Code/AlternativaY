import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchGatewayCatalog, type GatewayMedia } from '../api';
import GatewayPlayer from '../components/GatewayPlayer';
import { useTitle } from '../title';
import { Empty } from '../components/States';
export default function MediaWatch() {
  const { id = '' } = useParams();
  const [items, setItems] = useState<GatewayMedia[]>([]);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let live = true;
    fetchGatewayCatalog().then((data) => { if (live) setItems(data); })
      .catch((e) => { if (live) setError(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (live) setLoaded(true); });
    return () => { live = false; };
  }, []);
  const media = useMemo(() => items.find((x) => x.id === id), [items, id]);
  useTitle(media?.title ?? 'Reproducir medio');
  const meta = media ? { id: media.id, title: media.title, channel: media.creator, channelId: 'gateway' } : null;
  return <div className="page media-watch">
    <p className="media-back"><Link to="/medios">← Medios propios</Link></p>
    {media && meta ? <>
      <div className="media-player-frame"><GatewayPlayer id={media.id} meta={meta} /></div>
      <h1 className="watch-title">{media.title}</h1>
      <p className="sub">{media.creator} · {media.license === 'owned' ? 'Contenido propio' : 'Contenido licenciado'}</p>
    </> : loaded ? <Empty title={error || 'Medio no encontrado'}><Link className="btn" to="/medios">Volver a la biblioteca</Link></Empty> : <p className="note">Cargando medio…</p>}
  </div>;
}
