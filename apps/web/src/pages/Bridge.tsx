import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const detect = () => !!(window as unknown as { todotubeBridge?: { installed?: boolean } }).todotubeBridge?.installed;

export default function Bridge() {
  const [installed, setInstalled] = useState(detect());
  useEffect(() => {
    const on = () => setInstalled(true);
    window.addEventListener('todotube-bridge-ready', on);
    return () => window.removeEventListener('todotube-bridge-ready', on);
  }, []);

  return (
    <div className="page narrow">
      <header className="page-head">
        <h1>TodoTube Puente</h1>
        <p className="sub">Reproduce con el reproductor de TodoTube: sin anuncios, sin marcas de otras plataformas y sin servidores intermedios.</p>
      </header>

      <section className="panel" aria-live="polite">
        {installed
          ? <p className="ok-text"><b>✓ El puente está instalado y activo.</b> Abre cualquier vídeo y se reproducirá con el reproductor TodoTube.</p>
          : <p>Estado: <b>no instalado</b> en este navegador.</p>}
      </section>

      <section className="panel">
        <h2>Qué hace (y qué no)</h2>
        <ul className="plain">
          <li>Solo se activa en la web de TodoTube. No lee ni modifica ninguna otra página.</li>
          <li>Solo habla con los servidores de vídeo necesarios, desde tu propio navegador y tu conexión.</li>
          <li>No usa tus cuentas ni tus cookies, y no envía nada a TodoTube.</li>
          <li>Es de código abierto: puedes revisar cada línea en el repositorio.</li>
        </ul>
      </section>

      <section className="panel">
        <h2>Instalar en Chrome, Edge o Brave (versión de prueba)</h2>
        <ol className="steps">
          <li><a className="btn primary" href="/todotube-puente.zip" download>Descargar TodoTube Puente</a> y descomprime el archivo en una carpeta.</li>
          <li>Abre <code>chrome://extensions</code> (en Edge, <code>edge://extensions</code>).</li>
          <li>Activa <b>Modo de desarrollador</b> (arriba a la derecha).</li>
          <li>Pulsa <b>Cargar descomprimida</b> y elige la carpeta.</li>
          <li>Vuelve aquí y recarga la página.</li>
        </ol>
        <p className="note">Mientras está en pruebas se instala en modo desarrollador. Para el lanzamiento se publicará en las tiendas de extensiones que lo permitan.</p>
      </section>

      <section className="panel">
        <h2>Instalar en Firefox (versión de prueba)</h2>
        <ol className="steps">
          <li>Descarga el archivo de arriba.</li>
          <li>Abre <code>about:debugging#/runtime/this-firefox</code>.</li>
          <li>Pulsa <b>Cargar complemento temporal…</b> y elige el archivo <code>.zip</code>.</li>
        </ol>
        <p className="note">En Firefox, la carga temporal dura hasta que cierras el navegador.</p>
      </section>

      <p><Link to="/">Volver al inicio</Link></p>
    </div>
  );
}
