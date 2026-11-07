import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';
import { useStore } from '../store';

export type Bell = 'all' | 'noshorts' | 'none';
const OPTIONS: { value: Bell; label: string; help: string }[] = [
  { value: 'all', label: 'Todas', help: 'Vídeos y Shorts' },
  { value: 'noshorts', label: 'Sin Shorts', help: 'Solo vídeos' },
  { value: 'none', label: 'Ninguna', help: 'Sin avisos de este canal' },
];

// Botón “Suscrito + campanita” con menú: Todas / Sin Shorts / Ninguna / Dejar de seguir.
export default function BellMenu({ name, value, onChange, onUnfollow }: {
  name: string; value: Bell; onChange: (v: Bell) => void; onUnfollow: () => void;
}) {
  const [open, setOpen] = useState(false);
  const locked = !useStore((s) => s.ownerKey); // sin clave no se puede cambiar nada: se explica aquí mismo (#6)
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

  return (
    <div className="bell" ref={ref}>
      <button type="button" className={`bell-btn${value === 'none' ? ' muted' : ''}`} aria-haspopup="menu" aria-expanded={open}
        aria-label={`Avisos de ${name}: ${OPTIONS.find((o) => o.value === value)?.label}`} onClick={() => setOpen((o) => !o)}>
        <Icon name={value === 'none' ? 'bellOff' : 'bell'} size={18} filled={value === 'all'} />
        <span>Suscrito</span>
        <Icon name="chevron" size={16} />
      </button>
      {open && (
        <div className="bell-menu" role="menu">
          {locked && <p className="bell-lock">Para cambiar los avisos o dejar de seguir canales, guarda tu clave de propietario en <Link to="/ajustes" onClick={() => setOpen(false)}>Ajustes</Link>.</p>}
          {OPTIONS.map((o) => (
            <button key={o.value} type="button" role="menuitemradio" aria-checked={value === o.value} disabled={locked} className="bell-item"
              onClick={() => { onChange(o.value); setOpen(false); }}>
              <Icon name={o.value === 'none' ? 'bellOff' : 'bell'} size={18} filled={o.value === 'all'} />
              <span><b>{o.label}</b><small>{o.help}</small></span>
              {value === o.value && <Icon name="check" size={16} />}
            </button>
          ))}
          <hr />
          <button type="button" role="menuitem" className="bell-item danger" disabled={locked} onClick={() => { setOpen(false); onUnfollow(); }}>
            <Icon name="unfollow" size={18} /><span><b>Dejar de seguir</b></span>
          </button>
        </div>
      )}
    </div>
  );
}
