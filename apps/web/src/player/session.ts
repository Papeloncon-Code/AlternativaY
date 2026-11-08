// Sesión de reproducción única para toda la app (W8 · mini reproductor). El reproductor vive en PlayerHost (Layout)
// y la página del vídeo solo le reserva el hueco; así, al salir del vídeo, sigue sonando en pequeño sin recargarse.
import { useSyncExternalStore } from 'react';
import type { Meta } from '../store';
import type { PlayerHandle, VideoDetails } from './handle';

export type Session = { id: string; meta: Meta; startAt: number; vertical: boolean; list?: string; details: VideoDetails | null };
let session: Session | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Mando del reproductor actual (atajos, SponsorBlock, mini reproductor). */
export const handleRef: { current: PlayerHandle | null } = { current: null };
/** Lo que la página del vídeo quiere saber del reproductor (fin del vídeo para el siguiente automático). */
export const pageCallbacks: { onEnded?: () => void } = {};

export function play(s: Omit<Session, 'details'>) {
  if (session?.id === s.id) { session = { ...session, meta: s.meta, list: s.list, vertical: s.vertical }; emit(); return; }
  handleRef.current = null;
  session = { ...s, details: null }; emit();
}
export function stop() { handleRef.current = null; session = null; emit(); }
export function patch(p: Partial<Session>) { if (session) { session = { ...session, ...p }; emit(); } }
export function useSession(): Session | null {
  return useSyncExternalStore((l) => (listeners.add(l), () => listeners.delete(l)), () => session);
}
