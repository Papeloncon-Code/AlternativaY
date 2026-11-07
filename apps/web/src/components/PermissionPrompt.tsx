import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon';
import { actions, getState, useStore } from '../store';
import { currentSubscription, enablePush, pushSupported } from '../push';
import { whenBridge } from '../bridge';
import { toast } from '../toast';

const AGAIN = 14 * 86_400_000; // si dices “Ahora no”, no volvemos a preguntar en 14 días

type Ask = 'push' | 'bridge' | null;

// Peticiones de permiso al llegar, como hacen las apps de vídeo con los avisos: primero una tarjeta propia que explica
// para qué es, y solo si aceptas aparece el diálogo del navegador. Una petición cada vez.
export default function PermissionPrompt() {
  const [ask, setAsk] = useState<Ask>(null);
  const [busy, setBusy] = useState(false);
  const dismissed = useStore((s) => s.promptDismissed);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      const recent = (k: 'push' | 'bridge') => Date.now() - (getState().promptDismissed[k] ?? 0) < AGAIN;
      if (pushSupported() && Notification.permission === 'default' && !recent('push') && !(await currentSubscription())) { if (alive) setAsk('push'); return; }
      // Las extensiones solo existen en navegadores de escritorio (Chrome, Edge, Brave, Firefox).
      const desktop = matchMedia('(pointer: fine)').matches;
      if (desktop && !recent('bridge') && !(await whenBridge(2500))) { if (alive) setAsk('bridge'); }
    }, 2500);
    return () => { alive = false; clearTimeout(t); };
  }, [dismissed]);

  if (!ask) return null;
  const later = () => { actions.dismissPrompt(ask); setAsk(null); };
  async function accept() {
    if (ask === 'bridge') { setAsk(null); actions.dismissPrompt('bridge'); navigate('/puente'); return; }
    const key = getState().ownerKey;
    if (!key) { toast('Para activar los avisos, pon primero tu clave de propietario en Ajustes'); navigate('/ajustes'); later(); return; }
    setBusy(true);
    try { await enablePush(key); toast('Listo: te avisaremos en cuanto tus canales publiquen'); setAsk(null); }
    catch (e) { toast(e instanceof Error ? e.message : 'No se pudieron activar los avisos'); later(); }
    finally { setBusy(false); }
  }
  const push = ask === 'push';
  return (
    <div className="perm" role="dialog" aria-labelledby="perm-t" aria-describedby="perm-d">
      <span className="perm-ic" aria-hidden="true"><Icon name={push ? 'bell' : 'play'} size={24} /></span>
      <div>
        <b id="perm-t">{push ? '¿Te avisamos cuando tus canales publiquen?' : 'Ve los vídeos sin anuncios'}</b>
        <p id="perm-d">{push
          ? 'Recibe un aviso al momento de cada vídeo nuevo, aunque tengas TodoTube cerrado. Puedes elegir qué canales en la campanita.'
          : 'Con TodoTube Puente los vídeos se ven en nuestro reproductor, sin anuncios, y puedes buscar en todo y ver las fotos de los canales.'}</p>
        <div className="perm-actions">
          <button type="button" className="btn" onClick={later}>Ahora no</button>
          <button type="button" className="btn primary" onClick={() => void accept()} disabled={busy}>{push ? 'Permitir avisos' : 'Instalar'}</button>
        </div>
      </div>
    </div>
  );
}
