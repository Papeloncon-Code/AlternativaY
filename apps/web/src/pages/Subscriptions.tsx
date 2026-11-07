import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { addChannel, fetchChannels, removeChannel, type Channel } from '../api';
import { useAsync } from '../useAsync';
import { useStore } from '../store';
import { hue, initials } from '../format';
import { Empty, ErrorBox } from '../components/States';
import Icon from '../components/Icon';
import BellMenu, { type Bell } from '../components/BellMenu';
import PushToggle from '../components/PushToggle';
import { setChannelBell } from '../push';

const STATUS: Record<Channel['status'], { label: string; cls: string; help: string }> = {
  verified: { label: 'Avisos activos', cls: 'ok', help: 'Te avisamos al momento cuando publica.' },
  requested: { label: 'Activando…', cls: 'wait', help: 'Activando los avisos de este canal.' },
  pending: { label: 'Pendiente', cls: 'wait', help: 'Se procesará en los próximos minutos.' },
  invalid: { label: 'Sin confirmar', cls: 'bad', help: 'No se pudo confirmar el canal.' },
};

export default function Subscriptions() {
  const list = useAsync(fetchChannels);
  const ownerKey = useStore((s) => s.ownerKey);
  const [input, setInput] = useState('');
  const [label, setLabel] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function unfollow(c: Channel) {
    if (!ownerKey) { setMsg({ ok: false, text: 'Pon tu clave de propietario en Ajustes para dejar de seguir canales.' }); return; }
    if (!confirm(`¿Dejar de seguir ${c.name}?`)) return;
    try { await removeChannel(c.id, ownerKey); setMsg({ ok: true, text: `Has dejado de seguir ${c.name}.` }); list.reload(); }
    catch (err) { setMsg({ ok: false, text: err instanceof Error ? err.message : String(err) }); }
  }

  async function bell(c: Channel, v: Bell) {
    if (!ownerKey) { setMsg({ ok: false, text: 'Pon tu clave de propietario en Ajustes para cambiar los avisos.' }); return; }
    try { await setChannelBell(c.id, v, ownerKey); list.reload(); }
    catch (err) { setMsg({ ok: false, text: err instanceof Error ? err.message : String(err) }); }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const r = await addChannel(input, label, ownerKey);
      setMsg({ ok: true, text: r.created ? 'Canal añadido. Sus avisos se activan en unos minutos.' : 'Ya seguías este canal.' });
      setInput(''); setLabel(''); list.reload();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : String(err) });
    } finally { setBusy(false); }
  }

  const order = { verified: 0, requested: 1, pending: 2, invalid: 3 } as const;
  const items = [...(list.data ?? [])].sort((a, b) => (order[a.status] ?? 2) - (order[b.status] ?? 2));
  const active = items.filter((c) => c.status === 'verified').length;

  return (
    <div className="page">
      <header className="page-head">
        <h1>Suscripciones</h1>
        {items.length > 0 && <p className="sub">{items.length} canales · {active} con avisos al momento</p>}
      </header>

      <PushToggle compact />
      <form className="panel add-form" onSubmit={submit}>
        <h2><Icon name="plus" size={18} /> Seguir un canal</h2>
        <label>
          Enlace o ID del canal
          <input value={input} onChange={(e) => setInput(e.target.value)} required placeholder="Pega aquí el enlace del canal" inputMode="url" autoComplete="off" />
        </label>
        <label>
          Nombre (opcional)
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Se completa solo si lo dejas vacío" maxLength={80} />
        </label>
        {!ownerKey && <p className="note">Para añadir canales en esta versión, pon tu clave de propietario en <Link to="/ajustes">Ajustes</Link>.</p>}
        <button className="btn primary" disabled={busy || !ownerKey}>{busy ? 'Añadiendo…' : 'Seguir'}</button>
        {msg && <p className={msg.ok ? 'ok-text' : 'bad-text'} role="status">{msg.text}</p>}
        <p className="note">Próximamente: importar todas tus suscripciones automáticamente desde la app de Android (ADR-007).</p>
      </form>

      {list.error && <ErrorBox message={`No se pudo cargar la lista (${list.error}).`} onRetry={list.reload} />}
      {list.data && items.length === 0 && <Empty title="Todavía no sigues ningún canal"><p>Añade el primero con el formulario de arriba.</p></Empty>}
      <ul className="channel-list">
        {items.map((c) => {
          const st = STATUS[c.status] ?? STATUS.pending;
          return (
            <li key={c.id} className="channel">
              <span className="avatar" style={{ background: `hsl(${hue(c.id)} 55% 42%)` }} aria-hidden="true">{initials(c.name)}</span>
              <div className="channel-main">
                <span className="channel-name">{c.name}</span>
                <span className="card-meta">{c.videos === 1 ? '1 vídeo reciente' : `${c.videos} vídeos recientes`}</span>
              </div>
              <span className={`status ${st.cls}`} title={st.help}><Icon name="bell" size={14} /> {st.label}</span>
              <BellMenu name={c.name} value={c.notify ?? 'all'} onChange={(v) => bell(c, v)} onUnfollow={() => unfollow(c)} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
