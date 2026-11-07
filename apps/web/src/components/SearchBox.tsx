import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from './Icon';
import Avatar from './Avatar';
import { actions, useStore } from '../store';
import { useChannels, useFeed } from '../data';

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

type Sug =
  | { kind: 'recent'; text: string }
  | { kind: 'query'; text: string }
  | { kind: 'channel'; text: string; id: string }
  | { kind: 'video'; text: string; to: string };

// Buscador de la barra superior (P3–P5): búsquedas recientes al enfocar, sugerencias mientras escribes,
// navegación con ↑/↓, Enter y Esc, y borrar recientes una a una.
export default function SearchBox({ mobile, onClose }: { mobile: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const recent = useStore((s) => s.searches);
  const feed = useFeed();
  const channels = useChannels();
  const [q, setQ] = useState(new URLSearchParams(location.search).get('q') ?? '');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (location.pathname === '/buscar') setQ(new URLSearchParams(location.search).get('q') ?? '');
    setOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const sugs = useMemo<Sug[]>(() => {
    const t = norm(q.trim());
    if (!t) return recent.slice(0, 8).map((text) => ({ kind: 'recent', text }));
    const terms = t.split(/\s+/);
    // Como en los buscadores de vídeo: cada palabra escrita debe ser el comienzo de una palabra del texto.
    const hit = (s: string) => { const words = norm(s).split(/[^\p{L}\p{N}]+/u); return terms.every((x) => words.some((w) => w.startsWith(x))); };
    const out: Sug[] = [];
    recent.filter((r) => hit(r) && norm(r) !== t).slice(0, 3).forEach((text) => out.push({ kind: 'recent', text }));
    (channels.data ?? []).filter((c) => c.status !== 'invalid' && hit(c.name)).slice(0, 3)
      .forEach((c) => out.push({ kind: 'channel', text: c.name, id: c.id }));
    const seen = new Set<string>();
    (feed.data ?? []).filter((v) => v.title && hit(v.title)).forEach((v) => {
      if (out.length >= 10 || seen.has(v.id)) return;
      seen.add(v.id);
      out.push({ kind: 'video', text: v.title!, to: v.kind === 'short' ? `/shorts/${v.id}` : `/ver/${v.id}` });
    });
    if (!out.length) out.push({ kind: 'query', text: q.trim() });
    return out;
  }, [q, recent, feed.data, channels.data]);

  useEffect(() => setActive(-1), [q]);
  const show = open && sugs.length > 0;

  function runSearch(text: string) {
    const v = text.trim();
    if (!v) return;
    actions.addSearch(v);
    setQ(v);
    setOpen(false);
    (document.getElementById('q') as HTMLInputElement | null)?.blur();
    navigate(`/buscar?q=${encodeURIComponent(v)}`);
    onClose();
  }

  function pick(s: Sug) {
    if (s.kind === 'channel') { setOpen(false); onClose(); navigate(`/canal/${s.id}`); return; }
    if (s.kind === 'video') { setOpen(false); onClose(); navigate(s.to); return; }
    runSearch(s.text);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (active >= 0 && sugs[active]) pick(sugs[active]);
    else runSearch(q);
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.preventDefault(); // el navegador borraría el texto y volvería a abrir las sugerencias
      if (show) setOpen(false); else { (e.target as HTMLInputElement).blur(); onClose(); }
      return;
    }
    if (!sugs.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => (a + 1) % sugs.length); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (a <= 0 ? sugs.length - 1 : a - 1)); }
  }

  return (
    <form className="search" role="search" onSubmit={onSubmit} ref={box}>
      {mobile && <button type="button" className="icon-btn" aria-label="Cerrar búsqueda" onClick={onClose}><Icon name="back" size={20} /></button>}
      <div className="search-field">
        <input id="q" type="search" placeholder="Buscar" value={q} autoComplete="off"
          aria-label="Buscar vídeos y canales" role="combobox" aria-expanded={show} aria-controls="q-list" aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `q-opt-${active}` : undefined}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={onKey} />
        {show && (
          <ul id="q-list" className="suggest" role="listbox" aria-label="Sugerencias">
            {sugs.map((s, i) => (
              <li key={`${s.kind}-${s.text}-${i}`} id={`q-opt-${i}`} role="option" aria-selected={i === active}
                className={i === active ? 'on' : ''} onMouseDown={(e) => { e.preventDefault(); pick(s); }} onMouseEnter={() => setActive(i)}>
                {s.kind === 'recent' && <Icon name="hist" size={20} />}
                {s.kind === 'query' && <Icon name="search2" size={20} />}
                {s.kind === 'channel' && <Avatar name={s.text} id={s.id} size={24} />}
                {s.kind === 'video' && <Icon name="play" size={20} />}
                <span className="ellipsis">{s.text}</span>
                <small>{s.kind === 'channel' ? 'Canal' : s.kind === 'video' ? 'Vídeo' : ''}</small>
                {s.kind === 'recent' && (
                  <button type="button" className="suggest-x" aria-label={`Quitar «${s.text}» de recientes`}
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); actions.removeSearch(s.text); }}>Quitar</button>
                )}
              </li>
            ))}
            {!q.trim() && recent.length > 0 && (
              <li className="suggest-foot" role="presentation">
                <button type="button" onMouseDown={(e) => { e.preventDefault(); actions.clearSearches(); }}>Borrar todas las búsquedas recientes</button>
              </li>
            )}
          </ul>
        )}
      </div>
      <button type="submit" className="search-btn" aria-label="Buscar"><Icon name="search2" size={20} /></button>
    </form>
  );
}
