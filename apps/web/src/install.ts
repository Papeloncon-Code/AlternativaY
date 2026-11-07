// Instalación del Puente lo más cerca posible de “un clic” (docs/research/09).
// Firefox: un enlace al .xpi firmado abre el diálogo nativo «¿Añadir TodoTube Puente?» sin salir de la página.
import { toast } from './toast';
import { whenBridge } from './bridge';

export const isFirefox = () => /Firefox\//.test(navigator.userAgent) && !/Android/.test(navigator.userAgent);
export const oneClickAvailable = () => __XPI__ && isFirefox();

/** Llamar desde un clic. Devuelve false si en este navegador hay que seguir la guía de /puente. */
export function installOneClick(): boolean {
  if (!oneClickAvailable()) return false;
  window.location.href = '/todotube-puente.xpi'; // Firefox muestra su propio diálogo de instalación
  // Al terminar, el Puente se anuncia solo; si Firefox no lo activa en esta pestaña, se ofrece recargar.
  void whenBridge(60_000).then((ok) => {
    if (ok) toast('TodoTube Puente activado');
    else toast('Si ya lo has instalado, recarga la página para activarlo', { label: 'Recargar', run: () => location.reload() });
  });
  return true;
}
