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
  autoplay: boolean;
  hidden: Record<string, number>;
  notifHidden: Record<string, number>;
  searches: string[];
  focus: boolean;
  progress: Record<string, Progress>;
  history: HistoryEntry[];
  watched: Record<string, number>;
  ownerKey: string;
  theme: 'dark' | 'light' | 'system';
  sponsorblock: boolean;
  promptDismissed: { push?: number; bridge?: number };
  visitAt: number;
  visitPrev: number;
  dearrow: boolean;
};

const KEY = 'todotube:v1';
const empty: State = { favorites: {}, watchLater: {}, sidebar: 'full', notifSeenAt: 0, theater: false, autoplay: true, hidden: {}, notifHidden: {}, searches: [], focus: false, progress: {}, history: [], watched: {}, ownerKey: '', theme: 'system', sponsorblock: true, dearrow: false, promptDismissed: {}, visitAt: 0, visitPrev: 0 };

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...empty, ...JSON.parse(raw) } : empty;
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
  toggleAutoplay() { set((s) => ({ ...s, autoplay: !s.autoplay })); },
  dismissPrompt(k: 'push' | 'bridge') { set((s) => ({ ...s, promptDismissed: { ...s.promptDismissed, [k]: Date.now() } })); },
  toggleSponsorBlock() { set((s) => ({ ...s, sponsorblock: !s.sponsorblock })); },
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
