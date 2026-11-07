import { hasBridge } from '../bridge';
// Puente ligero (en el paquete principal) hacia la carga rápida del reproductor propio. No importa nada pesado.
type Mod = typeof import('./TodoTubePlayer');
let mod: Promise<Mod> | null = null;
const load = () => (mod ??= import('./TodoTubePlayer'));
const seen = new Set<string>();
let last = 0;

export function prewarmPlayer() {
  if (!hasBridge()) return;
  load().then((m) => m.prewarm()).catch(() => { mod = null; });
}

export function prefetchVideo(id: string) {
  if (!hasBridge() || seen.has(id)) return;
  const now = Date.now();
  if (now - last < 250) return; // no más de 4 por segundo al recorrer la cuadrícula
  last = now; seen.add(id);
  setTimeout(() => seen.delete(id), 4 * 60_000);
  load().then((m) => m.prefetch(id)).catch(() => {});
}
