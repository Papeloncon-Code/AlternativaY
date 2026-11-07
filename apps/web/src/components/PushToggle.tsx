import { useEffect, useState } from 'react';
import { currentSubscription, disablePush, enablePush, pushSupported } from '../push';
import { useStore } from '../store';
import Icon from './Icon';

// Activa o desactiva los avisos push en este navegador.
export default function PushToggle({ compact = false }: { compact?: boolean }) {
  const ownerKey = useStore((s) => s.ownerKey);
  const [on, setOn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  useEffect(() => { currentSubscription().then((s) => setOn(!!s)).catch(() => setOn(false)); }, []);

  if (!pushSupported()) return compact ? null : <p className="note">Este navegador no admite avisos push. En iPhone hay que añadir TodoTube a la pantalla de inicio primero.</p>;
  if (on === null || (compact && on)) return null;

  async function toggle() {
    setBusy(true); setMsg('');
    try {
      if (!ownerKey) throw new Error('Pon tu clave de propietario en Ajustes primero.');
      if (on) { await disablePush(ownerKey); setOn(false); } else { await enablePush(ownerKey); setOn(true); setMsg('Listo: te avisaremos al momento.'); }
    } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  return (
    <div className={compact ? 'push-banner' : ''}>
      {compact && <span><Icon name="bell" size={18} /> Activa los avisos para enterarte en cuanto tus canales publiquen.</span>}
      <button type="button" className={`btn${on ? '' : ' primary'}`} disabled={busy} onClick={toggle}>
        {busy ? 'Un momento…' : on ? 'Desactivar avisos en este navegador' : 'Activar avisos en este navegador'}
      </button>
      {msg && <p className="note" role="status">{msg}</p>}
    </div>
  );
}
