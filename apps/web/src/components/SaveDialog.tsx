import { useEffect, useState, useSyncExternalStore } from 'react';
import Icon from './Icon';
import { actions, useStore, type Meta } from '../store';
import { toast } from '../toast';

// Diálogo «Guardar en…» disponible en toda la app mediante un estado externo observable.
let requestedMeta: Meta | null = null;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getSnapshot = () => requestedMeta;
function publish() { listeners.forEach((listener) => listener()); }

export function openSave(meta: Meta) {
  requestedMeta = meta;
  publish();
}
function closeSave() {
  requestedMeta = null;
  publish();
}

export function SaveDialogHost() {
  const meta = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const [name, setName] = useState('');
  const playlists = useStore((s) => s.playlists);
  const later = useStore((s) => (meta ? Boolean(s.watchLater[meta.id]) : false));

  useEffect(() => {
    if (!meta) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') closeSave(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [meta]);

  useEffect(() => { setName(''); }, [meta?.id]);

  if (!meta) return null;
  const create = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = actions.addPlaylist(trimmed);
    actions.togglePlaylistItem(id, meta);
    toast(`Guardado en «${trimmed}»`);
    setName('');
  };

  return (
    <div className="modal-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) closeSave(); }}>
      <div className="modal save-dialog" role="dialog" aria-modal="true" aria-labelledby="save-t">
        <div className="modal-head"><h2 id="save-t">Guardar en…</h2>
          <button type="button" className="icon-btn" aria-label="Cerrar" autoFocus onClick={closeSave}><Icon name="close" size={20} /></button></div>
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
