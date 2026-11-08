import { useSyncExternalStore } from 'react';
import type { Channel } from './api';
const KEY = 'todotube:avatars';
type Entry = { url: string; at: number };
let map: Record<string, Entry> = (() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } })();
const listeners = new Set<() => void>();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(map)); } catch { /* sin almacenamiento */ } listeners.forEach((l) => l()); };
export function setAvatar(id: string, url: string, at = Date.now()) { if (!id || !url || map[id]?.url === url) return; map = { ...map, [id]: { url, at } }; save(); }
export function useAvatar(id: string): string | undefined { return useSyncExternalStore((l) => (listeners.add(l), () => listeners.delete(l)), () => map[id]?.url); }
export async function syncAvatars(channels: Channel[]) { channels.forEach((c) => { if (c.avatar && (!map[c.id] || map[c.id].at === 0)) setAvatar(c.id, c.avatar, 0); }); }
