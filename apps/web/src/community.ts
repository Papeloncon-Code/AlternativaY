// Metadatos comunitarios DeArrow. No reproduce, modifica ni retransmite medios.
import { useEffect, useState } from 'react';

const API = 'https://sponsor.ajay.app/api';

async function prefixOf(id: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(id));
  return [...new Uint8Array(buf)].slice(0, 2).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export type Branding = { title?: string; thumb?: string };
type RawBranding = Record<string, {
  titles: { title: string; original: boolean; votes: number; locked: boolean }[];
  thumbnails: { timestamp: number | null; original: boolean; votes: number; locked: boolean }[];
}>;
const prefixCache = new Map<string, Promise<RawBranding>>();

/** Misma regla que la extensión DeArrow (src/dataFetching.ts): el primero, si está bloqueado o con votos ≥ 0. */
export async function getBranding(id: string): Promise<Branding> {
  const prefix = await prefixOf(id);
  let p = prefixCache.get(prefix);
  if (!p) {
    p = fetch(`${API}/branding/${prefix}`).then((r) => (r.ok ? r.json() : {})) as Promise<RawBranding>;
    p.catch(() => prefixCache.delete(prefix));
    prefixCache.set(prefix, p);
  }
  const b = (await p)[id];
  if (!b) return {};
  const out: Branding = {};
  const t = b.titles[0];
  // ">" marca palabras que no deben reformatearse (src/titles/titleFormatter.ts); no se muestra.
  if (t && !t.original && (t.locked || t.votes >= 0)) out.title = t.title.replace(/(^|\s)>(\S)/g, '$1$2').trim();
  // Las miniaturas alternativas no se usan: su servicio recibe el ID completo del vídeo (revisión independiente, M2).
  return out;
}

export function useBranding(id: string, enabled: boolean): Branding {
  const [b, setB] = useState<Branding>({});
  useEffect(() => {
    setB({});
    if (!enabled) return;
    let alive = true;
    getBranding(id).then((x) => { if (alive) setB(x); }).catch(() => {});
    return () => { alive = false; };
  }, [id, enabled]);
  return b;
}
