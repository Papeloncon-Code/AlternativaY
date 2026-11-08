import { useEffect } from 'react';
import { actions, getState, useStore } from '../store';
import { currentSubscription, enablePush, pushSupported } from '../push';
import { toast } from '../toast';
const AGAIN = 14 * 86_400_000;
export default function PermissionPrompt() {
  const dismissedAt = useStore((s) => s.promptDismissed.push ?? 0);
  useEffect(() => {
    if (!pushSupported() || Notification.permission !== 'default') return;
    let alive = true; let cleanup = () => {};
    const recent = Date.now() - dismissedAt < AGAIN;
    async function askNative() {
      const perm = await Notification.requestPermission();
      if (!alive) return;
      if (perm !== 'granted') { actions.dismissPrompt('push'); return; }
      const key = getState().ownerKey;
      if (!key) { toast('Avisos permitidos. Guarda tu clave de propietario en Ajustes para activarlos.'); return; }
      try { await enablePush(key); toast('Avisos activados'); }
      catch (e) { toast(e instanceof Error ? e.message : 'No se pudieron activar los avisos'); }
    }
    const timer = window.setTimeout(async () => {
      if (!alive || recent || await currentSubscription()) return;
      if (/Firefox\//.test(navigator.userAgent)) {
        const once = () => { cleanup(); void askNative(); };
        cleanup = () => { window.removeEventListener('pointerdown', once, true); window.removeEventListener('keydown', once, true); };
        window.addEventListener('pointerdown', once, true); window.addEventListener('keydown', once, true);
      } else void askNative();
    }, 2500);
    return () => { alive = false; clearTimeout(timer); cleanup(); };
  }, [dismissedAt]);
  return null;
}
