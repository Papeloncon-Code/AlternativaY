// Filtro por palabras (A4): oculta en Principal, Shorts y “A continuación” los vídeos cuyo título contiene una palabra bloqueada.
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export function isBlocked(title: string | null | undefined, words: string[]): boolean {
  if (!title || !words.length) return false;
  const t = norm(title);
  return words.some((w) => w && t.includes(norm(w)));
}
