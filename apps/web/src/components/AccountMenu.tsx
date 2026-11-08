import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';
import { actions, useStore } from '../store';

const THEMES = [
  { value: 'system', label: 'Según el dispositivo' },
  { value: 'dark', label: 'Oscuro' },
  { value: 'light', label: 'Claro' },
] as const;

const SHORTCUTS: [string, string][] = [
  ['/', 'Ir al buscador'],
  ['K o espacio', 'Reproducir / pausar'],
  ['J / L', 'Retroceder / avanzar 10 s'],
  ['← / →', 'Retroceder / avanzar 5 s'],
  ['M', 'Silenciar'],
  ['F', 'Pantalla completa'],
  ['T', 'Modo cine'],
  ['< / >', 'Bajar / subir velocidad'],
  ['0–9', 'Saltar al 0 %–90 % del vídeo'],
  ['Mayús + N', 'Siguiente vídeo'],
  ['↑ / ↓ (Shorts)', 'Short anterior / siguiente'],
];

// Menú de cuenta (P10). Sin cuenta: tus datos viven en este navegador.
export default function AccountMenu() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'main' | 'theme'>('main');
  const [keys, setKeys] = useState(false);
  const theme = useStore((s) => s.theme);
  const focus = useStore((s) => s.focus);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [open]);

  useEffect(() => {
    if (!keys) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setKeys(false); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [keys]);

  const done = () => setOpen(false);
  return (
    <div className="account" ref={ref}>
      <button type="button" className="me" aria-label="Menú de cuenta" aria-haspopup="menu" aria-expanded={open}
        onClick={() => { setOpen((o) => !o); setView('main'); }}>
        <Icon name="user" size={18} />
      </button>
      {open && view === 'main' && (
        <div className="menu account-menu" role="menu">
          <div className="account-head">
            <span className="me big" aria-hidden="true"><Icon name="user" size={22} /></span>
            <span><b>Tú</b><small>Sin cuenta: tus datos se guardan en este navegador</small></span>
          </div>
          <hr />
          <Link role="menuitem" to="/tu" onClick={done}><Icon name="user" size={20} />Tu biblioteca</Link>
          <Link role="menuitem" to="/historial" onClick={done}><Icon name="hist" size={20} />Historial</Link>
          <hr />
          <button type="button" role="menuitem" aria-haspopup="menu" onClick={() => setView('theme')}>
            <Icon name="moon" size={20} />Aspecto: {THEMES.find((t) => t.value === theme)?.label}<Icon name="next" size={16} />
          </button>
          <button type="button" role="menuitemcheckbox" aria-checked={focus} onClick={() => { actions.toggleFocus(); done(); }}>
            <Icon name="focusmode" size={20} />Modo Foco<span className={`switch${focus ? ' on' : ''}`} aria-hidden="true" />
          </button>
          <button type="button" role="menuitem" onClick={() => { setKeys(true); done(); }}><Icon name="keyboard" size={20} />Combinaciones de teclas</button>
          <hr />
          <Link role="menuitem" to="/ajustes" onClick={done}><Icon name="settings" size={20} />Ajustes</Link>
          <Link role="menuitem" to="/ajustes#datos" onClick={done}><Icon name="download" size={20} />Exportar e importar datos</Link>
          <Link role="menuitem" to="/puente" onClick={done}><Icon name="play" size={20} />TodoTube Puente</Link>
          <Link role="menuitem" to="/privacidad" onClick={done}><Icon name="shield" size={20} />Privacidad</Link>
        </div>
      )}
      {open && view === 'theme' && (
        <div className="menu account-menu" role="menu">
          <button type="button" className="menu-back" onClick={() => setView('main')}><Icon name="back" size={20} />Aspecto</button>
          <hr />
          <p className="menu-note">La configuración solo se aplica a este navegador.</p>
          {THEMES.map((t) => (
            <button key={t.value} type="button" role="menuitemradio" aria-checked={theme === t.value} onClick={() => { actions.setTheme(t.value); done(); }}>
              <span className="tick">{theme === t.value && <Icon name="check" size={20} />}</span>{t.label}
            </button>
          ))}
        </div>
      )}
      {keys && (
        <div className="modal-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) setKeys(false); }}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="keys-title">
            <div className="modal-head"><h2 id="keys-title">Combinaciones de teclas</h2>
              <button type="button" className="icon-btn" aria-label="Cerrar" autoFocus onClick={() => setKeys(false)}><Icon name="close" size={20} /></button></div>
            <dl className="keys">{SHORTCUTS.map(([k, d]) => <div key={k}><dt><kbd>{k}</kbd></dt><dd>{d}</dd></div>)}</dl>
          </div>
        </div>
      )}
    </div>
  );
}
