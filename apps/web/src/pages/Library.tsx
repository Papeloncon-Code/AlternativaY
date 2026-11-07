import { useState } from 'react';
import { actions, useStore } from '../store';
import VideoCard from '../components/VideoCard';
import { Empty } from '../components/States';
import { ago } from '../format';

export default function Library() {
  const [tab, setTab] = useState<'favoritos' | 'historial'>('favoritos');
  const favorites = useStore((s) => s.favorites);
  const history = useStore((s) => s.history);
  const favs = Object.values(favorites).sort((a, b) => b.at - a.at);

  return (
    <div className="page">
      <header className="page-head"><h1>Biblioteca</h1></header>
      <div className="tabs" role="tablist" aria-label="Biblioteca">
        {(['favoritos', 'historial'] as const).map((t) => (
          <button key={t} role="tab" type="button" aria-selected={tab === t} className={`tabbtn${tab === t ? ' on' : ''}`} onClick={() => setTab(t)}>
            {t === 'favoritos' ? `Favoritos (${favs.length})` : `Historial (${history.length})`}
          </button>
        ))}
      </div>
      {tab === 'favoritos' && (favs.length === 0
        ? <Empty title="Sin favoritos todavía"><p>Pulsa el corazón en cualquier vídeo para guardarlo aquí.</p></Empty>
        : <div className="grid">{favs.map((f) => <VideoCard key={f.id} {...f} />)}</div>)}
      {tab === 'historial' && (history.length === 0
        ? <Empty title="Tu historial está vacío"><p>Los vídeos que reproduzcas aparecerán aquí. Se guarda solo en este navegador.</p></Empty>
        : (<>
          <div className="section-head"><span className="sub">Guardado solo en este navegador</span>
            <button type="button" className="btn ghost" onClick={() => { if (confirm('¿Borrar todo el historial?')) actions.clearHistory(); }}>Borrar historial</button></div>
          <div className="grid">{history.map((h) => (
            <div key={h.id + h.at}><VideoCard {...h} /><p className="card-meta when">Visto {ago(h.at)}</p></div>
          ))}</div>
        </>))}
    </div>
  );
}
