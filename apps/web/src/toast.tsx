// Avisos breves en pantalla (“Enlace copiado”, “Guardado en Ver más tarde”…).
import { useEffect, useState } from 'react';
type T = { id: number; text: string };
const listeners = new Set<(t: T) => void>();
let n = 0;
export function toast(text: string) { const t = { id: ++n, text }; listeners.forEach((l) => l(t)); }
export function Toaster() {
  const [items, setItems] = useState<T[]>([]);
  useEffect(() => {
    const l = (t: T) => { setItems((s) => [...s, t]); setTimeout(() => setItems((s) => s.filter((x) => x.id !== t.id)), 3000); };
    listeners.add(l); return () => { listeners.delete(l); };
  }, []);
  return <div className="toasts" role="status" aria-live="polite">{items.map((t) => <div key={t.id} className="toast">{t.text}</div>)}</div>;
}
export async function shareVideo(id: string, title: string) {
  const url = `${location.origin}/ver/${id}`;
  try {
    if (navigator.share && matchMedia('(pointer: coarse)').matches) { await navigator.share({ title, url }); return; }
    await navigator.clipboard.writeText(url);
    toast('Enlace copiado');
  } catch { toast(url); }
}
