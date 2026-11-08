import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';

// Estante horizontal (pestaña Inicio del canal): fila que se desplaza con flechas, como en la referencia.
export default function Shelf({ title, to, icon, children }: { title: string; to?: string; icon?: ReactNode; children: ReactNode }) {
  const row = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ left: false, right: false });
  useEffect(() => {
    const el = row.current; if (!el) return;
    const upd = () => setEdge({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
    upd();
    el.addEventListener('scroll', upd, { passive: true });
    const ro = new ResizeObserver(upd); ro.observe(el);
    return () => { el.removeEventListener('scroll', upd); ro.disconnect(); };
  }, [children]);
  const go = (dir: number) => { const el = row.current; if (el) el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: 'smooth' }); };
  return (
    <section className="ch-shelf" aria-label={title}>
      <h2>{icon}{to ? <Link to={to}>{title}</Link> : title}</h2>
      <div className="ch-shelf-wrap">
        {edge.left && <button type="button" className="shelf-arrow left" aria-label="Anterior" onClick={() => go(-1)}><Icon name="prev" size={22} /></button>}
        <div className="ch-shelf-row" ref={row}>{children}</div>
        {edge.right && <button type="button" className="shelf-arrow right" aria-label="Siguiente" onClick={() => go(1)}><Icon name="next" size={22} /></button>}
      </div>
    </section>
  );
}
