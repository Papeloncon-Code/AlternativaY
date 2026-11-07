import { useState } from 'react';
import { actions, useStore } from '../store';
import Icon from '../components/Icon';

export default function Settings() {
  const theme = useStore((s) => s.theme);
  const ownerKey = useStore((s) => s.ownerKey);
  const [key, setKey] = useState(ownerKey);
  const [saved, setSaved] = useState(false);
  return (
    <div className="page narrow">
      <header className="page-head"><h1>Ajustes</h1></header>
      <section className="panel">
        <h2>Apariencia</h2>
        <div className="chips" role="group" aria-label="Tema">
          <button type="button" className={`chip${theme === 'dark' ? ' on' : ''}`} aria-pressed={theme === 'dark'} onClick={() => actions.setTheme('dark')}><Icon name="moon" size={16} /> Oscuro</button>
          <button type="button" className={`chip${theme === 'light' ? ' on' : ''}`} aria-pressed={theme === 'light'} onClick={() => actions.setTheme('light')}><Icon name="sun" size={16} /> Claro</button>
        </div>
      </section>
      <section className="panel">
        <h2>Clave de propietario</h2>
        <p className="note">En la v0.1 no hay cuentas: esta clave permite añadir canales. Se guarda solo en este navegador.</p>
        <form onSubmit={(e) => { e.preventDefault(); actions.setOwnerKey(key.trim()); setSaved(true); }}>
          <label>Clave<input type="password" value={key} onChange={(e) => { setKey(e.target.value); setSaved(false); }} autoComplete="off" /></label>
          <button className="btn primary">Guardar</button>
          {saved && <span className="ok-text" role="status"> Guardada</span>}
        </form>
      </section>
      <section className="panel">
        <h2>Acerca de</h2>
        <p className="note">TodoTube Web v0.1. Las novedades llegan por los avisos oficiales de YouTube (WebSub) y su RSS público. Tus favoritos e historial se quedan en este navegador.</p>
      </section>
    </div>
  );
}
