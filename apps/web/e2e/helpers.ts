import { expect, type Page } from '@playwright/test';
/** Falla la prueba si la página lanza errores de JavaScript. */
export function trackErrors(page: Page) {
  const errs: string[] = [];
  page.on('pageerror', (e) => errs.push(e.message));
  return () => expect(errs, 'errores de JavaScript').toEqual([]);
}
/** Evita las tarjetas de permiso (se prueban aparte) para que no tapen nada. */
export async function noPrompts(page: Page) {
  await page.addInitScript(() => {
    const k = 'todotube:v1'; const s = JSON.parse(localStorage.getItem(k) || '{}');
    s.promptDismissed = { push: Date.now(), bridge: Date.now() }; localStorage.setItem(k, JSON.stringify(s));
  });
}
