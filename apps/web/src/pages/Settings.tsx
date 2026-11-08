import { useTitle } from '../title';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { toast } from '../toast';
import { actions, getState, useStore } from '../store';
import Icon from '../components/Icon';
import PushToggle from '../components/PushToggle';

export default function Settings() {
  const theme = useStore((s) => s.theme);
  const ownerKey = useStore((s) => s.ownerKey);
  const [key, setKey] = useState(ownerKey);
  const [saved, setSaved] = useState(false);
  useTitle('Ajustes');
  const da = useStore((s) => s.dearrow);
  const focus = useStore((s) => s.focus);
  const words = useStore((s) => s.blockWords);
  const [word, setWord] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const { hash } = useLocation();
  useEffect(() => { if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' }); }, [hash]);

  function exportData() {
    const { ownerKey: _secret, ...data } = getState(); // la clave de propietario no sale del navegador
    const blob = new Blob([JSON.stringify({ app: 'todotube', version: 1, exportedAt: new Date().toISOString(), data }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `todotube-datos-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('Datos exportados');
  }
  async function importData(f: File) {
    try {
      let j; try { j = JSON.parse(await f.text()); } catch { throw new Error('Este archivo no es una copia de TodoTube.'); }
      if (j?.app !== 'todotube' || typeof j.data !== 'object' || !j.data) throw new Error('Este archivo no es una copia de TodoTube.');
      const allowed = ['favorites', 'watchLater', 'history', 'progress', 'watched', 'hidden', 'notifHidden', 'searches', 'theme', 'autoplay', 'theater', 'sidebar', 'focus', 'dearrow', 'blockWords', 'groups', 'playlists'];
      const data = Object.fromEntries(Object.entries(j.data).filter(([k]) => allowed.includes(k)));
      if (!confirm(`Se sustituirán tus datos de este navegador (historial, Me gusta, Ver más tarde…) por los de la copia del ${String(j.exportedAt ?? '').slice(0, 10) || 'archivo'}. ¿Continuar?`)) return;
      actions.importAll(data);
      toast('Datos importados');
    } catch (e) { toast(e instanceof Error ? e.message : 'No se pudo leer el archivo'); }
  }
  return (
    <div className="page narrow">
      <header className="page-head"><h1>Ajustes</h1></header>
      <section className="panel">
        <h2>Apariencia</h2>
        <div className="chips" role="group" aria-label="Tema">
          <button type="button" className={`chip${theme === 'system' ? ' on' : ''}`} aria-pressed={theme === 'system'} onClick={() => actions.setTheme('system')}>Como el sistema</button>
          <button type="button" className={`chip${theme === 'dark' ? ' on' : ''}`} aria-pressed={theme === 'dark'} onClick={() => actions.setTheme('dark')}><Icon name="moon" size={16} /> Oscuro</button>
          <button type="button" className={`chip${theme === 'light' ? ' on' : ''}`} aria-pressed={theme === 'light'} onClick={() => actions.setTheme('light')}><Icon name="sun" size={16} /> Claro</button>
        </div>
      </section>
      <section className="panel">
        <h2>Avisos</h2>
        <p className="note">Cuando un canal que sigues publica, te llega un aviso aunque tengas TodoTube cerrado. Elige qué avisos quieres por canal con la campanita, en Suscripciones.</p>
        <PushToggle />
      </section>
      <section className="panel">
        <h2>Personalización del feed</h2>
        <label className="setting-row"><span><b>Títulos alternativos</b><small>Cuando existe una propuesta válida de la comunidad, muestra ese título en lugar del original. Pasa el ratón por el título para ver el original. Usa datos de <a href="https://dearrow.ajay.app/" target="_blank" rel="noreferrer">DeArrow</a>.</small></span>
          <input type="checkbox" role="switch" checked={da} onChange={() => actions.toggleDeArrow()} /></label>
        <label className="setting-row"><span><b>Modo Foco</b><small>Una sola columna con lo nuevo de tus canales, sin menú, filtros, Shorts ni recomendaciones.</small></span>
          <input type="checkbox" role="switch" checked={focus} onChange={() => actions.toggleFocus()} /></label>
      </section>
      <section className="panel" id="filtros">
        <h2>Ocultar por palabras</h2>
        <p className="note">Los vídeos cuyo título contenga alguna de estas palabras no aparecerán en Principal, Shorts ni “A continuación”.</p>
        <form className="row-btns" onSubmit={(e) => { e.preventDefault(); actions.addBlockWord(word); setWord(''); }}>
          <input value={word} onChange={(e) => setWord(e.target.value)} placeholder="Palabra o frase" maxLength={40} aria-label="Palabra o frase a ocultar" />
          <button className="btn primary" disabled={!word.trim()}>Añadir</button>
        </form>
        {words.length > 0 && <div className="chips word-chips">{words.map((w) => (
          <button key={w} type="button" className="chip on" onClick={() => actions.removeBlockWord(w)} aria-label={`Quitar «${w}»`}>{w} <Icon name="close" size={14} /></button>
        ))}</div>}
      </section>
      <section className="panel" id="datos">
        <h2>Tus datos</h2>
        <p className="note">Tu historial, Me gusta, Ver más tarde y preferencias viven solo en este navegador. Haz una copia para pasarlos a otro navegador o no perderlos.</p>
        <div className="row-btns">
          <button type="button" className="btn" onClick={exportData}><Icon name="download" size={18} /> Exportar copia</button>
          <button type="button" className="btn" onClick={() => file.current?.click()}><Icon name="upload" size={18} /> Importar copia</button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void importData(f); e.target.value = ''; }} />
        </div>
      </section>
      <section className="panel">
        <h2>Clave de propietario</h2>
        <p className="note">Todavía no hay cuentas: esta clave permite seguir canales y cambiar sus avisos. Se guarda solo en este navegador.</p>
        <form onSubmit={(e) => { e.preventDefault(); actions.setOwnerKey(key.trim()); setSaved(true); }}>
          <label>Clave<input type="password" value={key} onChange={(e) => { setKey(e.target.value); setSaved(false); }} autoComplete="off" /></label>
          <button className="btn primary">Guardar</button>
          {saved && <span className="ok-text" role="status"> Guardada</span>}
        </form>
      </section>
      <section className="panel">
        <h2>Acerca de</h2>
        <p className="note"><Link to="/privacidad">Privacidad: qué datos hay y dónde</Link></p>
        <p className="note">TodoTube. Los avisos dependen de la entrega de WebSub/RSS y de los permisos de notificación del navegador. Favoritos e historial se guardan en este navegador.</p>
      </section>
    </div>
  );
}
