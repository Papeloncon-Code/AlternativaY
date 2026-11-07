// Fotos reales de los canales. Origen: el servidor (si algún dispositivo tuyo ya la obtuvo) o este navegador con el Puente.
// Sin Puente ni foto guardada se muestran las iniciales.
import { useSyncExternalStore } from 'react';
import type { Channel } from './api';
import { getState } from './store';
import { hasBridge } from './bridge';

const KEY = 'todotube:avatars';
const WEEK = 7 * 86_400_000;
type Entry = { url: string; at: number };
let map: Record<string, Entry> = (() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } })();
const listeners = new Set<() => void>();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(map)); } catch { /* sin almacenamiento */ } listeners.forEach((l) => l()); };

export function setAvatar(id: string, url: string, at = Date.now()) {
  if (!id || !url || map[id]?.url === url) return;
  map = { ...map, [id]: { url, at } }; save();
}
export function useAvatar(id: string): string | undefined {
  return useSyncExternalStore((l) => (listeners.add(l), () => listeners.delete(l)), () => map[id]?.url);
}

/** Toma las fotos que ya tiene el servidor y, con el Puente, busca las que faltan (una a una, sin prisa). */
let running = false;
export async function syncAvatars(channels: Channel[]) {
  channels.forEach((c) => { if (c.avatar && !map[c.id]) setAvatar(c.id, c.avatar, 0); });
  if (running || !hasBridge()) return;
  running = true;
  try {
    const { fetchChannelAvatar } = await import('./remote');
    for (const c of channels) {
      const e = map[c.id];
      if (c.status === 'invalid' || (e && e.at && Date.now() - e.at < WEEK)) continue;
      try {
        const url = await fetchChannelAvatar(c.id);
        if (!url) continue;
        setAvatar(c.id, url);
        const key = getState().ownerKey;
        if (key && url !== c.avatar) {
          void fetch(`/api/channels/${c.id}/avatar`, { method: 'PUT', headers: { 'content-type': 'application/json', 'x-owner-key': key }, body: JSON.stringify({ url }) }).catch(() => {});
        }
      } catch { /* canal sin foto o fallo puntual: se reintenta otro día */ }
      await new Promise((r) => setTimeout(r, 400));
    }
  } finally { running = false; }
}
