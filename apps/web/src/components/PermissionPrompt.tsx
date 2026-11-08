import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon';
import { actions, getState, useStore } from '../store';
import { currentSubscription, enablePush, pushSupported } from '../push';
import { whenBridge } from '../bridge';
import { toast } from '../toast';
import { installOneClick } from '../install';

const AGAIN = 14 * 86_400_000; // si dices “Ahora no”, no volvemos a preguntar en 14 días

type Ask = 'bridge' | null; // los avisos usan el diálogo nativo del navegador

// Peticiones de permiso al llegar, como hacen las apps de vídeo con los avisos: primero una tarjeta propia que explica
// para qué es, y solo si aceptas aparece el diálogo del navegador. Una petición cada vez.
export default function PermissionPrompt() {
  const [ask, setAsk] = useState<Ask>(null);
  const dismissed = useStore((s) => s.promptDismissed);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    const cleanups: (() => void)[] = [];
    const recent = (k: 'push' | 'bridge') => Date.now() - (getState().promptDismissed[k] ?? 0) < AGAIN;

    // Avisos con el diálogo NATIVO del navegador (como “www.youtube.com quiere: Mostrar notificaciones”).
    async function askNative() {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { actions.dismissPrompt('push'); return; } // Bloquear o cerrar: no se insiste en 14 días
      const key = getState().ownerKey;
      if (!key) { toast('Avisos permitidos. Para recibirlos, guarda tu clave de propietario en Ajustes.'); return; }
      try { await enablePush(key); toast('Listo: te avisaremos en cuanto tus canales publiquen'); }
      catch (e) { toast(e instanceof Error ? e.message : 'No se pudieron activar los avisos'); }
    }

    const t = setTimeout(async () => {
      if (pushSupported() && Notification.permission === 'default' && !recent('push') && !(await currentSubscription())) {
        if (!alive) return;
        if (/Firefox\//.test(navigator.userAgent)) {
          // Firefox solo muestra el diálogo si responde a una interacción: se pide en el primer clic o tecla.
          const once = () => { off(); void askNative(); };
          const off = () => { window.removeEventListener('pointerdown', once, true); window.removeEventListener('keydown', once, true); };
          window.addEventListener('pointerdown', once, true); window.addEventListener('keydown', once, true);
          cleanups.push(off);
        } else {
          void askNative();
        }
        return; // una petición por visita
      }
      // Las extensiones solo existen en navegadores de escritorio (Chrome, Edge, Brave, Firefox).
      const desktop = matchMedia('(pointer: fine)').matches;
      if (desktop && !recent('bridge') && !(await whenBridge(2500))) { if (alive) setAsk('bridge'); }
    }, 2500);
    return () => { alive = false; clearTimeout(t); cleanups.forEach((f) => f()); };
  }, [dismissed]);

  if (!ask) return null;
  const later = () => { actions.dismissPrompt(ask); setAsk(null); };
  function accept() { setAsk(null); actions.dismissPrompt('bridge'); if (!installOneClick()) navigate('/puente'); }
  const push = false;
  return (
    <div className="perm" role="dialog" aria-labelledby="perm-t" aria-describedby="perm-d">
      <span className="perm-ic" aria-hidden="true"><Icon name={push ? 'bell' : 'play'} size={24} /></span>
      <div>
        <b id="perm-t">{push ? '¿Te avisamos cuando tus canales publiquen?' : 'Ve los vídeos sin anuncios'}</b>
        <p id="perm-d">{push
          ? 'Recibe un aviso al momento de cada vídeo nuevo, aunque tengas TodoTube cerrado. Puedes elegir qué canales en la campanita.'
          : 'Con TodoTube Puente los vídeos se ven en nuestro reproductor, sin anuncios.'}</p>
        <div className="perm-actions">
          <button type="button" className="btn" onClick={later}>Ahora no</button>
          <button type="button" className="btn primary" onClick={accept}>{push ? 'Permitir avisos' : 'Instalar'}</button>
        </div>
      </div>
    </div>
  );
}
