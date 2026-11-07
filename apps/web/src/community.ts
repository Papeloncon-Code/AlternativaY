// Datos de la comunidad que aportan las alternativas (spec 007 · A1 y A2):
// - SponsorBlock: tramos de patrocinio, autopromoción y "suscríbete" para saltarlos.
// - DeArrow: títulos y miniaturas sin clickbait votados por la comunidad.
// Privacidad: se consulta por los 4 primeros caracteres del SHA-256 del ID (k-anonimato), así el
// servicio no sabe qué vídeo concreto estás viendo. Verificado 2026-11-07: CORS `*` en ambas API.
// Licencia de los datos: CC BY-NC-SA 4.0 (https://github.com/ajayyy/SponsorBlock/wiki/Database-and-API-License).
import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { PlayerHandle } from './player/handle';
import { toast } from './toast';
import { dueSkip, mergeSegments } from './skip';

const API = 'https://sponsor.ajay.app/api';
const THUMBS = 'https://dearrow-thumb.ajay.app/api/v1/getThumbnail';

async function prefixOf(id: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(id));
  return [...new Uint8Array(buf)].slice(0, 2).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ---------- SponsorBlock ----------
export type Segment = { start: number; end: number; category: string };
export const SKIP_CATEGORIES = ['sponsor', 'selfpromo', 'interaction'] as const;
const CAT_LABEL: Record<string, string> = { sponsor: 'Patrocinio', selfpromo: 'Autopromoción', interaction: 'Petición de suscripción' };

const segCache = new Map<string, Promise<Segment[]>>();
export function getSegments(id: string): Promise<Segment[]> {
  let p = segCache.get(id);
  if (!p) {
    p = (async () => {
      const cats = encodeURIComponent(JSON.stringify(SKIP_CATEGORIES));
      const r = await fetch(`${API}/skipSegments/${await prefixOf(id)}?categories=${cats}&actionTypes=${encodeURIComponent('["skip"]')}`);
      if (r.status === 404) return []; // ningún vídeo con ese prefijo tiene tramos
      if (!r.ok) throw new Error(`SponsorBlock ${r.status}`);
      const list = (await r.json()) as { videoID: string; segments: { segment: [number, number]; category: string }[] }[];
      const mine = list.find((v) => v.videoID === id)?.segments ?? [];
      return mergeSegments(mine.map((s) => ({ start: s.segment[0], end: s.segment[1], category: s.category }))
        .filter((s) => s.end - s.start >= 1));
    })();
    p.catch(() => segCache.delete(id));
    segCache.set(id, p);
  }
  return p;
}

/** Salta automáticamente los tramos votados, con aviso y "Deshacer" (vuelve al inicio del tramo una vez). */
export function useSponsorSkip(id: string, handle: MutableRefObject<PlayerHandle | null>, enabled: boolean) {
  const [segments, setSegments] = useState<Segment[]>([]);
  const skipped = useRef(new Set<number>());
  useEffect(() => {
    setSegments([]); skipped.current.clear();
    if (!enabled || !id) return;
    let alive = true;
    getSegments(id).then((s) => { if (alive) setSegments(s); }).catch(() => {});
    return () => { alive = false; };
  }, [id, enabled]);
  useEffect(() => {
    if (!enabled || !segments.length) return;
    const t = setInterval(() => {
      const h = handle.current;
      if (!h) return;
      const i = dueSkip(segments, h.getTime(), skipped.current);
      if (i < 0) return;
      const s = segments[i];
      skipped.current.add(i); // al deshacer no se vuelve a saltar ese tramo
      h.seekTo(s.end);
      toast(`${CAT_LABEL[s.category] ?? 'Tramo'} saltado`, { label: 'Deshacer', run: () => handle.current?.seekTo(s.start) });
    }, 250);
    return () => clearInterval(t);
  }, [segments, enabled, handle]);
  return segments;
}

// ---------- DeArrow ----------
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
  const th = b.thumbnails[0];
  if (th && !th.original && th.timestamp != null && (th.locked || th.votes >= 0)) {
    out.thumb = `${THUMBS}?videoID=${encodeURIComponent(id)}&time=${th.timestamp}`;
  }
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
