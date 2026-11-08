import { useTitle } from '../title';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { actions, useStore } from '../store';
import { thumb } from '../api';
import Icon from '../components/Icon';
import { Empty } from '../components/States';
import { toast } from '../toast';

// Página de una lista propia (L7): reproducir todo, reordenar, quitar, renombrar y borrar.
export default function Playlist() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const p = useStore((s) => s.playlists.find((x) => x.id === id));
  useTitle(p?.name ?? 'Lista');
  if (!p) return <div className="page"><Empty title="Esta lista no existe"><Link className="btn" to="/tu">Ir a Tú</Link></Empty></div>;
  const first = p.items[0];
  return (
    <div className="page narrow-list">
      <header className="pl-head">
        <div className="pl-cover">{first ? <img src={thumb(first.id)} alt="" /> : <Icon name="library" size={40} />}</div>
        <div>
          <h1>{p.name}</h1>
          <p className="sub">{p.items.length === 1 ? '1 vídeo' : `${p.items.length} vídeos`} · Lista privada (en este navegador)</p>
          <p className="note">Los vídeos de YouTube se abren en su origen. El resto de elementos de la lista aparecen en «A continuación» para que puedas elegir el siguiente.</p>
          <div className="row-btns">
            {first && <Link className="btn primary" to={`/ver/${first.id}?lista=${p.id}`}><Icon name="play" size={18} /> Abrir primer vídeo</Link>}
            <button type="button" className="btn" onClick={() => { const n = prompt('Nuevo nombre de la lista', p.name); if (n) actions.renamePlaylist(p.id, n); }}>Cambiar nombre</button>
            <button type="button" className="btn" onClick={() => { if (confirm(`¿Borrar la lista «${p.name}»?`)) { actions.removePlaylist(p.id); toast('Lista borrada'); navigate('/tu'); } }}>Borrar lista</button>
          </div>
        </div>
      </header>
      {p.items.length === 0 && <Empty title="Lista vacía"><p>Guarda vídeos con el menú ⋮ → “Guardar en una lista”.</p></Empty>}
      <ol className="pl-items">
        {p.items.map((v, i) => (
          <li key={v.id} className="pl-item">
            <span className="pl-n">{i + 1}</span>
            <Link to={`/ver/${v.id}?lista=${p.id}`} className="pl-th"><img src={thumb(v.id)} alt="" loading="lazy" /></Link>
            <div className="pl-text"><Link to={`/ver/${v.id}?lista=${p.id}`} className="vtitle">{v.title}</Link><span className="vmeta">{v.channel}</span></div>
            <div className="pl-act">
              <button type="button" className="icon-btn" aria-label="Subir" disabled={i === 0} onClick={() => actions.movePlaylistItem(p.id, i, i - 1)}><Icon name="up" size={18} /></button>
              <button type="button" className="icon-btn" aria-label="Bajar" disabled={i === p.items.length - 1} onClick={() => actions.movePlaylistItem(p.id, i, i + 1)}><Icon name="chevron" size={18} /></button>
              <button type="button" className="icon-btn" aria-label="Quitar de la lista" onClick={() => actions.togglePlaylistItem(p.id, v)}><Icon name="close" size={18} /></button>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
