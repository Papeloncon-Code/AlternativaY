import { useTitle } from '../title';
import { Link } from 'react-router-dom';
import { actions, useStore } from '../store';
import VideoCard from '../components/VideoCard';
import Icon from '../components/Icon';
import { thumb } from '../api';
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
  useTitle(TITLES[kind]);
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
  useTitle('Tú');
  return (
    <div className="page">
      <h1 className="page-title">Tú</h1>
      <section className="shelf" aria-labelledby="h-media">
        <div className="page-head-row">
          <h2 id="h-media"><Icon name="library" size={22} /> Medios propios</h2>
          <Link className="btn" to="/medios">Ver biblioteca</Link>
        </div>
        <p className="sub">Archivos propios o licenciados disponibles en el Media Gateway de TodoTube.</p>
      </section>
      <Shelf kind="historial" icon="hist" />
      <Shelf kind="ver-mas-tarde" icon="clock" />
      <Shelf kind="me-gusta" icon="like" />
      <Playlists />
    </div>
  );
}

function Playlists() {
  const lists = useStore((s) => s.playlists);
  return (
    <section className="shelf">
      <div className="page-head-row"><h2><Icon name="library" size={22} /> Listas</h2>
        <button type="button" className="btn" onClick={() => { const n = prompt('Nombre de la lista nueva'); if (n?.trim()) actions.addPlaylist(n); }}><Icon name="plus" size={18} /> Nueva lista</button></div>
      {lists.length === 0 ? <p className="note">Crea listas para guardar vídeos y verlos en orden. Desde cualquier vídeo: ⋮ → “Guardar en una lista”.</p> : (
        <div className="vgrid">{lists.map((p) => (
          <Link key={p.id} to={`/lista/${p.id}`} className="pl-card">
            <span className="pl-cover">{p.items[0] ? <img src={thumb(p.items[0].id)} alt="" loading="lazy" /> : <Icon name="library" size={32} />}<span className="pl-count">{p.items.length} vídeos</span></span>
            <b>{p.name}</b><span className="vmeta">Ver lista completa</span>
          </Link>
        ))}</div>
      )}
    </section>
  );
}
