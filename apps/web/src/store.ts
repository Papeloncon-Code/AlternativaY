// Datos locales (v0.1: localStorage; se migrará a SQLite-WASM + sincronización, ver specs/004-web-v0 §3).
import { useSyncExternalStore } from 'react';

export type Meta = { id: string; title: string; channel: string; channelId: string };
export type Progress = Meta & { pos: number; dur: number; updatedAt: number };
export type HistoryEntry = Meta & { at: number };

type State = {
  favorites: Record<string, Meta & { at: number }>;
  watchLater: Record<string, Meta & { at: number }>;
  sidebar: 'full' | 'mini';
  notifSeenAt: number;
  theater: boolean;
  hidden: Record<string, number>;
  notifHidden: Record<string, number>;
  searches: string[];
  focus: boolean;
  progress: Record<string, Progress>;
  history: HistoryEntry[];
  watched: Record<string, number>;
  ownerKey: string;
  theme: 'dark' | 'light' | 'system';
  promptDismissed: { push?: number };
  visitAt: number;
  blockWords: string[];
  groups: { id: string; name: string; channels: string[] }[];
  playlists: { id: string; name: string; items: (Meta & { at: number })[] }[];
  visitPrev: number;
  dearrow: boolean;
};

const KEY = 'todotube:v1';
const empty: State = { favorites: {}, watchLater: {}, sidebar: 'full', notifSeenAt: 0, theater: false, hidden: {}, notifHidden: {}, searches: [], focus: false, progress: {}, history: [], watched: {}, ownerKey: '', theme: 'system', dearrow: false, promptDismissed: {}, visitAt: 0, visitPrev: 0, blockWords: [], groups: [], playlists: [] };

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty;
    const saved = JSON.parse(raw) as Partial<State> & { sponsorblock?: boolean; autoplay?: boolean };
    delete saved.sponsorblock;
    delete saved.autoplay;
    return { ...empty, ...saved };
  } catch {
    return empty;
  }
}

let state = load();
if (Date.now() - (state.visitAt || 0) > 30 * 60_000) state = { ...state, visitPrev: state.visitAt || 0, visitAt: Date.now() };
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

export const getState = () => state;

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
  toggleWatchLater(m: Meta) {
    set((s) => {
      const watchLater = { ...s.watchLater };
      if (watchLater[m.id]) delete watchLater[m.id];
      else watchLater[m.id] = { ...m, at: Date.now() };
      return { ...s, watchLater };
    });
  },
  toggleTheater() { set((s) => ({ ...s, theater: !s.theater })); },
  addBlockWord(w: string) { const v = w.trim().toLowerCase(); if (v) set((s) => ({ ...s, blockWords: [...new Set([...s.blockWords, v])] })); },
  removeBlockWord(w: string) { set((s) => ({ ...s, blockWords: s.blockWords.filter((x) => x !== w) })); },
  addGroup(name: string) { const id = Math.random().toString(36).slice(2, 9); set((s) => ({ ...s, groups: [...s.groups, { id, name: name.trim(), channels: [] }] })); return id; },
  removeGroup(id: string) { set((s) => ({ ...s, groups: s.groups.filter((g) => g.id !== id) })); },
  toggleGroupChannel(id: string, ch: string) { set((s) => ({ ...s, groups: s.groups.map((g) => g.id !== id ? g : { ...g, channels: g.channels.includes(ch) ? g.channels.filter((c) => c !== ch) : [...g.channels, ch] }) })); },
  addPlaylist(name: string) { const id = Math.random().toString(36).slice(2, 9); set((s) => ({ ...s, playlists: [...s.playlists, { id, name: name.trim(), items: [] }] })); return id; },
  removePlaylist(id: string) { set((s) => ({ ...s, playlists: s.playlists.filter((p) => p.id !== id) })); },
  renamePlaylist(id: string, name: string) { set((s) => ({ ...s, playlists: s.playlists.map((p) => p.id === id ? { ...p, name: name.trim() || p.name } : p) })); },
  togglePlaylistItem(id: string, m: Meta) { set((s) => ({ ...s, playlists: s.playlists.map((p) => p.id !== id ? p : { ...p, items: p.items.some((i) => i.id === m.id) ? p.items.filter((i) => i.id !== m.id) : [...p.items, { ...m, at: Date.now() }] }) })); },
  movePlaylistItem(id: string, from: number, to: number) { set((s) => ({ ...s, playlists: s.playlists.map((p) => { if (p.id !== id) return p; const items = [...p.items]; const [x] = items.splice(from, 1); items.splice(to, 0, x); return { ...p, items }; }) })); },
  dismissPrompt(k: 'push') { set((s) => ({ ...s, promptDismissed: { ...s.promptDismissed, [k]: Date.now() } })); },
  toggleDeArrow() { set((s) => ({ ...s, dearrow: !s.dearrow })); },
  toggleFocus() { set((s) => ({ ...s, focus: !s.focus })); },
  hideVideo(id: string) { set((s) => ({ ...s, hidden: { ...s.hidden, [id]: Date.now() } })); },
  hideNotification(id: string) { set((s) => ({ ...s, notifHidden: { ...s.notifHidden, [id]: Date.now() } })); },
  unhideNotification(id: string) { set((s) => { const notifHidden = { ...s.notifHidden }; delete notifHidden[id]; return { ...s, notifHidden }; }); },
  clearSearches() { set((s) => ({ ...s, searches: [] })); },
  unhideVideo(id: string) { set((s) => { const hidden = { ...s.hidden }; delete hidden[id]; return { ...s, hidden }; }); },
  addSearch(q: string) { set((s) => ({ ...s, searches: [q, ...s.searches.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 12) })); },
  removeSearch(q: string) { set((s) => ({ ...s, searches: s.searches.filter((x) => x !== q) })); },
  importAll(data: Partial<State>) { set((s) => ({ ...s, ...data })); },
  markNotificationsSeen() {
    set((s) => ({ ...s, notifSeenAt: Date.now() }));
  },
  toggleSidebar() {
    set((s) => ({ ...s, sidebar: s.sidebar === 'full' ? 'mini' : 'full' }));
  },
  setTheme(theme: 'dark' | 'light' | 'system') {
    set((s) => ({ ...s, theme }));
  },
};
