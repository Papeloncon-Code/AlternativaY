import { Link } from 'react-router-dom';
import { useTitle } from '../title';

// Qué datos hay y dónde. Revisado tras la revisión independiente del bloque 7 (2026-11-08): lista completa de servicios.
// Mantener al día con cada cambio: spikes/websub/schema.sql, apps/web/worker.js, src/community.ts y el reproductor.
export default function Privacy() {
  useTitle('Privacidad');
  return (
    <div className="page narrow privacy">
      <header className="page-head"><h1>Privacidad</h1></header>
      <p className="lead">TodoTube no recoge datos sobre ti: no hay cuentas, ni analítica, ni cookies, ni registros de visitas. Aquí está, sin letra pequeña, todo lo que se guarda y con quién habla cada parte.</p>

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
        <ul className="plain">
          <li><b>Lo que no recibe:</b> qué vídeo abres ni qué buscas. Las descripciones se descargan todas juntas y la búsqueda ocurre en tu navegador. Tu navegador solo le dice el nombre de la web, nunca la página en la que estás.</li>
          <li><b>Alojamiento:</b> el servidor funciona en Cloudflare, que, como cualquier alojamiento, ve tu dirección IP al conectarte. Los registros de peticiones están desactivados.</li>
          <li><b>Lo que el servidor pide por su cuenta</b> (nunca con datos tuyos): a YouTube, el feed público y la vista previa de cada canal seguido (una vez al día); a Google (pubsubhubbub.appspot.com), los avisos de vídeos nuevos. Así Google sabe qué canales sigue TodoTube, no quién.</li>
        </ul>
      </section>

      <section className="panel">
        <h2>Lo que se queda solo en tu navegador</h2>
        <p className="note">Historial, Me gusta, Ver más tarde, listas, grupos, palabras ocultas, búsquedas recientes y ajustes. Nunca salen de tu navegador. Puedes llevártelos con <Link to="/ajustes#datos">Exportar copia</Link> o borrarlos borrando los datos del sitio.</p>
      </section>

      <section className="panel">
        <h2>Los servicios con los que habla tu navegador</h2>
        <p className="note">Para ver vídeos, tu navegador habla directamente con estos servicios. TodoTube no les envía nada sobre ti y no se guardan cookies de YouTube mientras navegas.</p>
        <table className="ptable">
          <thead><tr><th>Servicio</th><th>Cuándo y para qué</th><th>Qué sabe</th></tr></thead>
          <tbody>
            <tr><td>i.ytimg.com, yt3.googleusercontent.com, yt3.ggpht.com (YouTube)</td><td>Siempre: miniaturas y fotos de canal</td><td>Qué imágenes se cargan</td></tr>
            <tr><td>www.youtube-nocookie.com y lo que el reproductor carga (googlevideo.com, gstatic.com, google.com)</td><td>Solo al abrir un vídeo, con el reproductor de reserva (modo de privacidad mejorada de YouTube)</td><td>Qué vídeo ves; YouTube puede guardar cookies cuando lo reproduces</td></tr>
            <tr><td>www.youtube.com/oembed</td><td>Solo al abrir por enlace un vídeo que no es de tus canales: su título</td><td>Qué vídeo abres (sin cookies)</td></tr>
            <tr><td>Con TodoTube Puente: youtubei.googleapis.com, googlevideo.com, jnn-pa.googleapis.com</td><td>Reproductor propio, búsqueda y datos del canal</td><td>Qué ves y buscas (sin cookies ni cuentas)</td></tr>
            <tr><td>sponsor.ajay.app (SponsorBlock)</td><td>Al abrir un vídeo: tramos de patrocinio. Se puede apagar en <Link to="/ajustes">Ajustes</Link></td><td>Solo 4 caracteres de una huella del vídeo, no cuál es</td></tr>
            <tr><td>sponsor.ajay.app (DeArrow)</td><td>Solo si lo activas: títulos sin clickbait</td><td>Igual: 4 caracteres de una huella</td></tr>
            <tr><td>El servicio de avisos de tu navegador (Google para Chrome y Edge, Mozilla para Firefox)</td><td>Solo si activas los avisos: los entrega</td><td>Que tienes avisos de TodoTube</td></tr>
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h2>TodoTube Puente</h2>
        <p className="note">La extensión no recoge ni envía datos: solo hace, desde tu navegador, las peticiones que pide la web a los servidores de vídeo, sin tus cookies. Su código está publicado.</p>
      </section>
    </div>
  );
}
