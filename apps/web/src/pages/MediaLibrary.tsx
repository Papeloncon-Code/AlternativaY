import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchGatewayCatalog, type GatewayMedia } from '../api';
import { Empty } from '../components/States';
import Icon from '../components/Icon';
import { useTitle } from '../title';
function sizeLabel(bytes: number) {
  if (bytes >= 1024 ** 3) return (bytes / 1024 ** 3).toFixed(1) + ' GB';
  if (bytes >= 1024 ** 2) return (bytes / 1024 ** 2).toFixed(1) + ' MB';
  return Math.max(1, Math.round(bytes / 1024)) + ' KB';
}
export default function MediaLibrary() {
  const [items, setItems] = useState<GatewayMedia[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useTitle('Medios propios');
  useEffect(() => {
    let live = true;
    fetchGatewayCatalog().then((data) => { if (live) setItems(data); })
      .catch((e) => { if (live) setError(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);
  return <div className="page media-library">
    <div className="page-head-row"><h1 className="page-title"><Icon name="library" size={24} /> Medios propios</h1></div>
    <p className="sub">Vídeos alojados en el Gateway de TodoTube. Solo se publican archivos propios o con licencia expresa para su distribución.</p>
    {loading && <p className="note">Conectando con el Gateway multimedia…</p>}
    {error && <div className="media-state" role="status"><b>Gateway no disponible</b><p>{error}</p><p>La biblioteca se habilitará cuando exista el bucket R2 y el Worker de medios esté desplegado.</p></div>}
    {!loading && !error && items.length === 0 && <Empty title="Todavía no hay medios publicados"><p>La biblioteca aparecerá aquí cuando se carguen archivos propios o con licencia.</p></Empty>}
    {items.length > 0 && <div className="media-list">{items.map((m) => <Link className="media-row" key={m.id} to={'/medios/' + encodeURIComponent(m.id)}>
      <span className="media-icon"><Icon name="play" size={28} /></span>
      <span className="media-info"><b>{m.title}</b><span>{m.creator} · {m.license === 'owned' ? 'Contenido propio' : 'Contenido licenciado'}</span></span>
      <span className="media-size">{sizeLabel(m.size)}</span>
    </Link>)}</div>}
  </div>;
}
