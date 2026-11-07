const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
export function ago(ms: number | null | undefined): string {
  if (!ms) return '';
  const s = Math.round((ms - Date.now()) / 1000);
  const abs = Math.abs(s);
  if (abs < 60) return 'ahora';
  if (abs < 3600) return rtf.format(Math.round(s / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(s / 3600), 'hour');
  if (abs < 2592000) return rtf.format(Math.round(s / 86400), 'day');
  return new Date(ms).toLocaleDateString('es');
}
export function clock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
}
export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?';
}
export function hue(id: string): number {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}
const compact = new Intl.NumberFormat('es', { notation: 'compact', maximumFractionDigits: 1 });
/** «1,8 M visualizaciones», como en las apps de vídeo. */
export function fmtViews(n?: number | null): string {
  return n == null ? '' : `${compact.format(n)} ${n === 1 ? 'visualización' : 'visualizaciones'}`;
}
/** «64 mil» para el contador de Me gusta. */
export const fmtCount = (n?: number | null) => (n == null ? '' : compact.format(n));
