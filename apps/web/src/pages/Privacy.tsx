import { Link } from 'react-router-dom';
import { useTitle } from '../title';

// Qué datos hay y dónde (constitución: nada de recogida de datos más allá de los canales que sigues).
// Mantener al día con cada cambio del servidor: spikes/websub/schema.sql y apps/web/worker.js.
export default function Privacy() {
  useTitle('Privacidad');
  return (
    <div className="page narrow privacy">
      <header className="page-head"><h1>Privacidad</h1></header>
      <p className="lead">TodoTube no recoge datos sobre ti. No hay cuentas, ni analítica, ni cookies de seguimiento, ni registros de visitas.</p>

      <section className="panel">
        <h2>Lo que guarda nuestro servidor</h2>
        <table className="ptable">
          <thead><tr><th>Dato</th><th>Para qué</th><th>Hasta cuándo</th></tr></thead>
          <tbody>
            <tr><td>Los canales que sigues (su ID, nombre y foto pública)</td><td>Saber de quién avisarte</td><td>Hasta que dejas de seguirlo</td></tr>
            <tr><td>Los vídeos públicos de esos canales (título, fecha, visitas, me gusta, descripción)</td><td>Mostrar las novedades</td><td>Mientras sigas el canal</td></tr>
            <tr><td>La dirección de avisos de tu navegador, <b>solo si activas los avisos</b></td><td>Enviarte el aviso de un vídeo nuevo</td><td>Hasta que los desactivas o tu navegador la anula</td></tr>
            <tr><td>Registro técnico de avisos recibidos de YouTube (vídeos públicos, sin datos de personas)</td><td>Detectar fallos del servicio</td><td>7 días</td></tr>
          </tbody>
        </table>
        <p className="note">Nada más: ni tu dirección IP, ni lo que ves, ni lo que buscas. Los registros del servidor están desactivados.</p>
      </section>

      <section className="panel">
        <h2>Lo que se queda solo en tu navegador</h2>
        <p className="note">Historial, Me gusta, Ver más tarde, listas, grupos, palabras ocultas, búsquedas recientes y ajustes. Nunca salen de tu navegador; puedes llevártelos con <Link to="/ajustes#datos">Exportar copia</Link> o borrarlos borrando los datos del sitio.</p>
      </section>

      <section className="panel">
        <h2>Lo que tu navegador pide a otros servicios</h2>
        <p className="note">Para ver vídeos, tu navegador habla directamente con estos servicios, como lo haría en sus propias webs. TodoTube no les envía nada sobre ti.</p>
        <table className="ptable">
          <thead><tr><th>Servicio</th><th>Para qué</th><th>Se puede apagar</th></tr></thead>
          <tbody>
            <tr><td>YouTube</td><td>Miniaturas, el reproductor y el título de vídeos abiertos por enlace</td><td>No (es de donde vienen los vídeos)</td></tr>
            <tr><td>SponsorBlock</td><td>Saltar patrocinios. Solo se envían 4 caracteres de una huella del vídeo, no cuál es</td><td>Sí, en <Link to="/ajustes">Ajustes</Link></td></tr>
            <tr><td>DeArrow</td><td>Títulos sin clickbait (apagado por defecto), con el mismo método de huella</td><td>Sí, en <Link to="/ajustes">Ajustes</Link></td></tr>
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h2>TodoTube Puente</h2>
        <p className="note">La extensión no recoge ni envía datos: solo hace, desde tu navegador, las peticiones que pide la web a los servidores de vídeo. Su código está publicado.</p>
      </section>
    </div>
  );
}
