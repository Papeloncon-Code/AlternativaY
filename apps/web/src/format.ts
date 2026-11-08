const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'always' });
export function ago(ms: number | null | undefined): string {
  if (!ms) return '';
  const s = Math.round((ms - Date.now()) / 1000);
  const abs = Math.abs(s);
  if (abs < 60) return 'ahora';
  if (abs < 3600) return rtf.format(Math.round(s / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(s / 3600), 'hour');
  if (abs < 604800) return rtf.format(Math.round(s / 86400), 'day');
  if (abs < 2592000) return rtf.format(Math.round(s / 604800), 'week');
  if (abs < 31536000) return rtf.format(Math.round(s / 2592000), 'month');
  return rtf.format(Math.round(s / 31536000), 'year');
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
/** Número abreviado como en las apps de vídeo en español: 1234 → «1,2 mil», 84 900 → «84 mil», 12,5 M → «12 M». Trunca, no redondea. */
export function shortNumber(n: number): string {
  const units: [number, string][] = [[1e9, ' mil M'], [1e6, ' M'], [1e3, ' mil']];
  for (const [u, label] of units) {
    if (n >= u) {
      const v = n / u;
      const t = v < 10 ? Math.floor(v * 10) / 10 : Math.floor(v);
      return `${String(t).replace('.', ',')}${label}`;
    }
  }
  return String(n);
}
/** «1,8 M visualizaciones». 0 no se muestra (suelen ser estrenos o directos programados). */
export function fmtViews(n?: number | null): string {
  if (n == null || n === 0) return '';
  return `${shortNumber(n)} ${n === 1 ? 'visualización' : 'visualizaciones'}`;
}
/** «64 mil» para el contador de Me gusta. */
export const fmtCount = (n?: number | null) => (n == null ? '' : shortNumber(n));
