import { Link } from 'react-router-dom';
import { actions, useStore } from '../store';
import VideoCard from '../components/VideoCard';
import Icon from '../components/Icon';
import { Empty } from '../components/States';

type Kind = 'historial' | 'ver-mas-tarde' | 'me-gusta';
const TITLES: Record<Kind, string> = { historial: 'Historial', 'ver-mas-tarde': 'Ver más tarde', 'me-gusta': 'Vídeos que me gustan' };

function useList(kind: Kind) {
  const history = useStore((s) => s.history);
  const later = useStore((s) => s.watchLater);
  const likes = useStore((s) => s.favorites);
  if (kind === 'historial') return history;
  return Object.values(kind === 'ver-mas-tarde' ? later : likes).sort((a, b) => b.at - a.at);
}

export function YouList({ kind }: { kind: Kind }) {
  const items = useList(kind);
  return (
    <div className="page">
      <div className="page-head-row">
        <h1 className="page-title">{TITLES[kind]}</h1>
        {kind === 'historial' && items.length > 0 && <button type="button" className="btn" onClick={() => actions.clearHistory()}>Borrar todo el historial</button>}
      </div>
      {items.length === 0 && <Empty title={`${TITLES[kind]} está vacío`}><p>{kind === 'historial' ? 'Los vídeos que veas aparecerán aquí. Se guarda solo en este navegador.' : 'Usa el menú ⋮ de cualquier vídeo para añadirlo.'}</p></Empty>}
      <div className="vgrid">{items.map((v) => <VideoCard key={v.id + ('at' in v ? v.at : '')} {...v} />)}</div>
    </div>
  );
}

function Shelf({ kind, icon }: { kind: Kind; icon: string }) {
  const items = useList(kind).slice(0, 4);
  return (
    <section className="shelf">
      <div className="page-head-row"><h2><Icon name={icon} size={22} /> {TITLES[kind]}</h2><Link className="btn" to={`/${kind}`}>Ver todo</Link></div>
      {items.length === 0 ? <p className="sub">Todavía no hay nada aquí.</p> : <div className="vgrid">{items.map((v) => <VideoCard key={v.id} {...v} />)}</div>}
    </section>
  );
}

export default function You() {
  return (
    <div className="page">
      <h1 className="page-title">Tú</h1>
      <Shelf kind="historial" icon="hist" />
      <Shelf kind="ver-mas-tarde" icon="clock" />
      <Shelf kind="me-gusta" icon="like" />
    </div>
  );
}
