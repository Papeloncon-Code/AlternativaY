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
