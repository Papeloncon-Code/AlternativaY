// Decide qué tramo hay que saltar ahora (sin dependencias, para poder probarlo aparte: test/skip.test.mjs).
export type Seg = { start: number; end: number };
/** Índice del tramo en el que está `now` y que aún no se ha saltado; -1 si no hay que saltar. */
export function dueSkip(segments: Seg[], now: number, skipped: Set<number>): number {
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    if (skipped.has(i)) continue;
    if (now >= s.start && now < s.end - 0.3) return i;
  }
  return -1;
}
/** Une tramos que se solapan o se tocan (p. ej. patrocinio 838–881 y 879–949) para saltar de una vez. */
export function mergeSegments<T extends Seg>(segments: T[]): T[] {
  const out: T[] = [];
  for (const s of [...segments].sort((a, b) => a.start - b.start)) {
    const last = out[out.length - 1];
    if (last && s.start <= last.end + 1) last.end = Math.max(last.end, s.end);
    else out.push({ ...s });
  }
  return out;
}
