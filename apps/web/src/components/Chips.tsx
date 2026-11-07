import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';

// Fila de filtros desplazable con flechas, como la conoce la gente.
export default function Chips({ items, value, onChange }: { items: { key: string; label: string }[]; value: string; onChange: (k: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  const update = () => {
    const el = ref.current; if (!el) return;
    setEdges({ start: el.scrollLeft < 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  };
  useEffect(() => { update(); const el = ref.current; el?.addEventListener('scroll', update, { passive: true }); window.addEventListener('resize', update); return () => { el?.removeEventListener('scroll', update); window.removeEventListener('resize', update); }; }, [items.length]);
  const by = (d: number) => ref.current?.scrollBy({ left: d * (ref.current.clientWidth * 0.7), behavior: 'smooth' });
  return (
    <div className="chips-bar">
      {!edges.start && <button type="button" className="chip-arrow left" aria-label="Anteriores" onClick={() => by(-1)}><Icon name="prev" size={20} /></button>}
      <div className="chips-scroll" ref={ref} role="group" aria-label="Filtros">
        {items.map((i) => (
          <button key={i.key} type="button" className={`chip${value === i.key ? ' on' : ''}`} aria-pressed={value === i.key} onClick={() => onChange(i.key)}>{i.label}</button>
        ))}
      </div>
      {!edges.end && <button type="button" className="chip-arrow right" aria-label="Siguientes" onClick={() => by(1)}><Icon name="next" size={20} /></button>}
    </div>
  );
}
