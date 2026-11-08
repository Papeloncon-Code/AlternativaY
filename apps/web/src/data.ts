// Caché compartida de novedades y canales para toda la app (evita pedir lo mismo en cada pantalla).
import { useEffect, useState } from 'react';
import { fetchChannels, fetchFeed, type Channel, type Video } from './api';

type Cache<T> = { data?: T; error?: string; promise?: Promise<T>; at: number };
const feedCache: Cache<Video[]> = { at: 0 };
const chCache: Cache<Channel[]> = { at: 0 };
const listeners = new Set<() => void>();
const TTL = 60_000;

function load<T>(c: Cache<T>, fn: () => Promise<T>, force = false) {
  if (!force && (c.promise || (c.data && Date.now() - c.at < TTL))) return;
  c.promise = fn().then((d) => { c.data = d; c.error = undefined; c.at = Date.now(); return d; })
    .catch((e) => { c.error = e instanceof Error ? e.message : String(e); throw e; })
    .finally(() => { c.promise = undefined; listeners.forEach((l) => l()); });
  c.promise.catch(() => {});
}

// Carga continua (H10): pide los siguientes vídeos más antiguos cuando llegas al final.
const PAGE = 200;
let moreState = { loading: false, done: false };
export async function loadMoreFeed() {
  const list = feedCache.data;
  if (!list?.length || moreState.loading || moreState.done) return;
  moreState = { ...moreState, loading: true }; listeners.forEach((l) => l());
  try {
    const last = Math.min(...list.map((v) => v.publishedAt ?? Infinity));
    const next = await fetchFeed(PAGE, Number.isFinite(last) ? last : undefined);
    const seen = new Set(list.map((v) => v.id));
    feedCache.data = [...list, ...next.filter((v) => !seen.has(v.id))];
    moreState = { loading: false, done: next.length < PAGE };
  } catch { moreState = { ...moreState, loading: false }; }
  listeners.forEach((l) => l());
}
export const feedMore = () => moreState;

export function refreshAll() { load(feedCache, () => fetchFeed(200), true); load(chCache, fetchChannels, true); }

export function useFeed() {
  const [, tick] = useState(0);
  useEffect(() => { const l = () => tick((n) => n + 1); listeners.add(l); load(feedCache, () => fetchFeed(200)); return () => { listeners.delete(l); }; }, []);
  return { data: feedCache.data, error: feedCache.error, loading: !feedCache.data && !feedCache.error, reload: () => load(feedCache, () => fetchFeed(200), true) };
}

export function useChannels() {
  const [, tick] = useState(0);
  useEffect(() => { const l = () => tick((n) => n + 1); listeners.add(l); load(chCache, fetchChannels); return () => { listeners.delete(l); }; }, []);
  return { data: chCache.data, error: chCache.error, loading: !chCache.data && !chCache.error, reload: () => load(chCache, fetchChannels, true) };
}

// Todos los vídeos guardados (página de canal). Se piden todos a la vez, igual para cualquier canal:
// el servidor no sabe qué canal estás mirando.
const allCache: Cache<Video[]> = { at: 0 };
export function useAllVideos() {
  const [, tick] = useState(0);
  useEffect(() => { const l = () => tick((n) => n + 1); listeners.add(l); load(allCache, () => fetchFeed(1000)); return () => { listeners.delete(l); }; }, []);
  return { data: allCache.data, error: allCache.error, loading: !allCache.data && !allCache.error };
}
