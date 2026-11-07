import { useEffect, useState } from 'react';
import Icon from './Icon';
import { actions, useStore, type Meta } from '../store';
import { toast } from '../toast';

// “Guardar en…” (L7): Ver más tarde y tus listas, con casillas, como en las apps de vídeo.
const listeners = new Set<(m: Meta) => void>();
export function openSave(m: Meta) { listeners.forEach((l) => l(m)); }

export function SaveDialogHost() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [name, setName] = useState('');
  const playlists = useStore((s) => s.playlists);
  const later = useStore((s) => (meta ? Boolean(s.watchLater[meta.id]) : false));
  useEffect(() => { const l = (m: Meta) => { setMeta(m); setName(''); }; listeners.add(l); return () => { listeners.delete(l); }; }, []);
  useEffect(() => {
    if (!meta) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMeta(null); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [meta]);
  if (!meta) return null;
  const create = () => {
    if (!name.trim()) return;
    const id = actions.addPlaylist(name);
    actions.togglePlaylistItem(id, meta);
    toast(`Guardado en «${name.trim()}»`);
    setName('');
  };
  return (
    <div className="modal-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) setMeta(null); }}>
      <div className="modal save-dialog" role="dialog" aria-modal="true" aria-labelledby="save-t">
        <div className="modal-head"><h2 id="save-t">Guardar en…</h2>
          <button type="button" className="icon-btn" aria-label="Cerrar" autoFocus onClick={() => setMeta(null)}><Icon name="close" size={20} /></button></div>
        <label className="save-row"><input type="checkbox" checked={later} onChange={() => actions.toggleWatchLater(meta)} /><span>Ver más tarde</span><Icon name="clock" size={18} /></label>
        {playlists.map((p) => {
          const on = p.items.some((i) => i.id === meta.id);
          return <label key={p.id} className="save-row"><input type="checkbox" checked={on} onChange={() => { actions.togglePlaylistItem(p.id, meta); toast(on ? `Quitado de «${p.name}»` : `Guardado en «${p.name}»`); }} /><span>{p.name}</span><small>{p.items.length}</small></label>;
        })}
        <form className="save-new" onSubmit={(e) => { e.preventDefault(); create(); }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre de la lista nueva" maxLength={60} aria-label="Nombre de la lista nueva" />
          <button className="btn primary" disabled={!name.trim()}><Icon name="plus" size={18} /> Crear</button>
        </form>
      </div>
    </div>
  );
}
