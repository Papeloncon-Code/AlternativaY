// Datos locales (v0.1: localStorage; se migrará a SQLite-WASM + sincronización, ver specs/004-web-v0 §3).
import { useSyncExternalStore } from 'react';

export type Meta = { id: string; title: string; channel: string; channelId: string };
export type Progress = Meta & { pos: number; dur: number; updatedAt: number };
export type HistoryEntry = Meta & { at: number };

type State = {
  favorites: Record<string, Meta & { at: number }>;
  progress: Record<string, Progress>;
  history: HistoryEntry[];
  watched: Record<string, number>;
  ownerKey: string;
  theme: 'dark' | 'light';
};

const KEY = 'todotube:v1';
const empty: State = { favorites: {}, progress: {}, history: [], watched: {}, ownerKey: '', theme: 'dark' };

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...empty, ...JSON.parse(raw) } : empty;
  } catch {
    return empty;
  }
}

let state = load();
const listeners = new Set<() => void>();

function set(updater: (s: State) => State) {
  state = updater(state);
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* almacenamiento no disponible: la app sigue funcionando en memoria */
  }
  listeners.forEach((l) => l());
}

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => selector(state),
  );
}

export const actions = {
  toggleFavorite(m: Meta) {
    set((s) => {
      const favorites = { ...s.favorites };
      if (favorites[m.id]) delete favorites[m.id];
      else favorites[m.id] = { ...m, at: Date.now() };
      return { ...s, favorites };
    });
  },
  saveProgress(m: Meta, pos: number, dur: number) {
    if (!dur) return;
    set((s) => {
      const watched = { ...s.watched };
      const progress = { ...s.progress };
      if (pos / dur >= 0.95 || dur - pos < 30) {
        watched[m.id] = Date.now();
        delete progress[m.id];
      } else {
        progress[m.id] = { ...m, pos, dur, updatedAt: Date.now() };
      }
      return { ...s, progress, watched };
    });
  },
  addHistory(m: Meta) {
    set((s) => ({ ...s, history: [{ ...m, at: Date.now() }, ...s.history.filter((h) => h.id !== m.id)].slice(0, 500) }));
  },
  clearHistory() {
    set((s) => ({ ...s, history: [] }));
  },
  toggleWatched(id: string) {
    set((s) => {
      const watched = { ...s.watched };
      if (watched[id]) delete watched[id];
      else watched[id] = Date.now();
      const progress = { ...s.progress };
      delete progress[id];
      return { ...s, watched, progress };
    });
  },
  setOwnerKey(ownerKey: string) {
    set((s) => ({ ...s, ownerKey }));
  },
  setTheme(theme: 'dark' | 'light') {
    set((s) => ({ ...s, theme }));
  },
};
