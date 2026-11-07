// Título y canal de cualquier vídeo mediante oEmbed, el método público y documentado para incrustar
// (https://oembed.com). Permite el origen de TodoTube (verificado 2026-11-07), así que funciona sin el Puente.
import { useEffect, useState } from 'react';

export type OEmbed = { title: string; author: string; authorUrl: string };
const cache = new Map<string, Promise<OEmbed | null>>();

export function getOEmbed(id: string): Promise<OEmbed | null> {
  let p = cache.get(id);
  if (!p) {
    p = fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => (j ? { title: String(j.title ?? ''), author: String(j.author_name ?? ''), authorUrl: String(j.author_url ?? '') } : null))
      .catch(() => null);
    cache.set(id, p);
  }
  return p;
}

export function useOEmbed(id: string, enabled: boolean): OEmbed | null {
  const [d, setD] = useState<OEmbed | null>(null);
  useEffect(() => {
    setD(null);
    if (!enabled || !/^[A-Za-z0-9_-]{11}$/.test(id)) return;
    let alive = true;
    getOEmbed(id).then((x) => { if (alive) setD(x); });
    return () => { alive = false; };
  }, [id, enabled]);
  return d;
}
