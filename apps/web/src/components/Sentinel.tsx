import { useEffect, useRef } from 'react';
// Marca invisible al final de una lista: cuando se acerca a la pantalla, pide más (carga continua).
export default function Sentinel({ onVisible }: { onVisible: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef(onVisible); cb.current = onVisible;
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver((e) => { if (e.some((x) => x.isIntersecting)) cb.current(); }, { rootMargin: '800px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className="sentinel" aria-hidden="true" />;
}
