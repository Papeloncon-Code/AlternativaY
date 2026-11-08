import { useTitle } from '../title';
import Avatar from '../components/Avatar';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { addChannel, fetchChannels, removeChannel, type Channel } from '../api';
import { useAsync } from '../useAsync';
import { actions, useStore } from '../store';
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
  const [addOpen, setAddOpen] = useState(false);

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
      setInput(''); setLabel(''); list.reload(); setAddOpen(false);
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : String(err) });
    } finally { setBusy(false); }
  }

  const order = { verified: 0, requested: 1, pending: 2, invalid: 3 } as const;
  const items = [...(list.data ?? [])].sort((a, b) => (order[a.status] ?? 2) - (order[b.status] ?? 2));
  const active = items.filter((c) => c.status === 'verified').length;
  useTitle('Suscripciones');

  return (
    <div className="page">
      <header className="page-head page-head-row subscriptions-head">
        <div>
          <h1>Suscripciones</h1>
          {items.length > 0 && <p className="sub">{items.length} canales · {active} con avisos al momento</p>}
        </div>
        <button type="button" className="btn primary" aria-expanded={addOpen} aria-controls="add-channel-panel"
          onClick={() => { setAddOpen((open) => !open); setMsg(null); }}>
          <Icon name={addOpen ? 'close' : 'plus'} size={18} /> {addOpen ? 'Cerrar' : 'Seguir canal'}
        </button>
      </header>

      <PushToggle compact />
      {msg && <p className={msg.ok ? 'ok-text' : 'bad-text'} role="status">{msg.text}</p>}
      {addOpen && <form id="add-channel-panel" className="panel add-form" onSubmit={submit}>
        <h2><Icon name="plus" size={18} /> Seguir un canal</h2>
        <label>
          Enlace o ID del canal
          <input value={input} onChange={(e) => setInput(e.target.value)} required placeholder="Pega aquí el enlace o ID del canal" inputMode="url" autoComplete="off" />
        </label>
        <label>
          Nombre (opcional)
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Nombre para identificarlo" maxLength={80} />
        </label>
        {!ownerKey && <p className="note">Para seguir canales, configura primero tu clave de propietario en <Link to="/ajustes">Ajustes</Link>.</p>}
        <div className="row-btns">
          <button className="btn primary" disabled={busy || !ownerKey}>{busy ? 'Añadiendo…' : 'Seguir'}</button>
          <button type="button" className="btn" disabled={busy} onClick={() => { setAddOpen(false); setMsg(null); }}>Cancelar</button>
        </div>
      </form>}

      {list.error && <ErrorBox message={`No se pudo cargar la lista (${list.error}).`} onRetry={list.reload} />}
      {list.data && items.length === 0 && <Empty title="Todavía no sigues ningún canal">
        <p>Añade el primero con el botón «Seguir canal».</p>
        <button type="button" className="btn primary" onClick={() => setAddOpen(true)}>Seguir el primer canal</button>
      </Empty>}
      <ul className="channel-list">
        {items.map((c) => {
          const st = STATUS[c.status] ?? STATUS.pending;
          return (
            <li key={c.id} className="channel">
              <Link to={`/canal/${c.id}`} className="channel-av" aria-label={`Canal ${c.name}`}><Avatar name={c.name} id={c.id} size={40} /></Link>
              <div className="channel-main">
                <Link to={`/canal/${c.id}`} className="channel-name">{c.name}</Link>
                <span className="card-meta">{c.videos === 1 ? '1 vídeo reciente' : `${c.videos} vídeos recientes`}</span>
              </div>
              <span className={`status ${st.cls}`} title={st.help}><Icon name="bell" size={14} /> {st.label}</span>
              <BellMenu name={c.name} value={c.notify ?? 'all'} onChange={(v) => bell(c, v)} onUnfollow={() => unfollow(c)} />
            </li>
          );
        })}
      </ul>

      {items.length > 0 && <Groups channels={items.filter((c) => c.status !== 'invalid').map((c) => ({ id: c.id, name: c.name }))} />}
    </div>
  );
}

// Grupos de suscripciones (A3, como los perfiles de FreeTube): cada grupo aparece como filtro en Principal.
function Groups({ channels }: { channels: { id: string; name: string }[] }) {
  const groups = useStore((s) => s.groups);
  const [name, setName] = useState('');
  return (
    <section className="panel groups" aria-labelledby="h-groups">
      <h2 id="h-groups"><Icon name="subs" size={18} /> Grupos</h2>
      <p className="note">Agrupa canales (por ejemplo, “Noticias” o “Tecnología”) y fíltralos con un toque en Principal.</p>
      <form className="row-btns" onSubmit={(e) => { e.preventDefault(); if (name.trim()) { actions.addGroup(name); setName(''); } }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del grupo nuevo" maxLength={40} aria-label="Nombre del grupo nuevo" />
        <button className="btn primary" disabled={!name.trim()}>Crear grupo</button>
      </form>
      {groups.map((g) => (
        <div key={g.id} className="group">
          <div className="group-head"><b>{g.name}</b><span className="card-meta">{g.channels.length} canales</span>
            <button type="button" className="btn small" onClick={() => { if (confirm(`¿Borrar el grupo «${g.name}»? Los canales siguen en tus suscripciones.`)) actions.removeGroup(g.id); }}>Borrar</button></div>
          <div className="chips" role="group" aria-label={`Canales del grupo ${g.name}`}>
            {channels.map((c) => (
              <button key={c.id} type="button" className={`chip${g.channels.includes(c.id) ? ' on' : ''}`} aria-pressed={g.channels.includes(c.id)} onClick={() => actions.toggleGroupChannel(g.id, c.id)}>{c.name}</button>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
