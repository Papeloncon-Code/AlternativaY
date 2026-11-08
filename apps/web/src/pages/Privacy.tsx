import { Link } from 'react-router-dom';
import { useTitle } from '../title';

// La información de esta página se contrasta con el código de los Workers y del cliente.
// Actualizarla cada vez que cambien D1, WebSub, Web Push, DeArrow o el Media Gateway.
export default function Privacy() {
  useTitle('Privacidad');
  return (
    <div className="page narrow privacy">
      <header className="page-head"><h1>Privacidad</h1></header>
      <p className="lead">TodoTube no tiene inicio de sesión ni perfiles de usuario. Eso no significa que no procese datos: guarda las suscripciones a canales y sus metadatos públicos en su servidor, mientras que tu historial y preferencias se guardan en este navegador. Aquí explicamos qué sale de cada lugar y con qué servicios se comunica.</p>

      <section className="panel">
        <h2>Lo que guarda el servidor de TodoTube</h2>
        <table className="ptable">
          <thead><tr><th>Dato</th><th>Para qué</th><th>Retención</th></tr></thead>
          <tbody>
            <tr><td>Identificadores de canales que sigues, nombre elegido, estado y preferencia de avisos</td><td>Mantener la lista de suscripciones y procesar novedades</td><td>Mientras el canal siga activo; al dejar de seguirlo, el servicio lo marca para retirar en su siguiente ciclo</td></tr>
            <tr><td>Metadatos públicos de vídeos: ID, título, canal, fecha, tipo, visitas, me gusta, descripción y duración cuando están disponibles</td><td>Construir el feed, los resultados y las fichas</td><td>Se conservan en D1 mientras el canal permanezca activo; el código actual no fija una caducidad individual para cada vídeo</td></tr>
            <tr><td>Foto, banner y otros metadatos públicos del canal</td><td>Mostrar cabeceras y avatares</td><td>Mientras el canal permanezca en la base; los valores se actualizan cuando el servicio vuelve a leer el canal</td></tr>
            <tr><td>Suscripciones Web Push: endpoint del proveedor, claves p256dh/auth, fecha y contador de fallos</td><td>Enviar avisos al navegador que los activó</td><td>Hasta que se desactiva la suscripción o el proveedor informa que el endpoint ya no existe o expiró</td></tr>
            <tr><td>Eventos de WebSub/RSS y ejecuciones del servicio de avisos</td><td>Detectar novedades y diagnosticar fallos operativos</td><td>El proceso elimina eventos y ejecuciones con más de 7 días</td></tr>
          </tbody>
        </table>
        <ul className="plain">
          <li><b>Clave de propietario:</b> no es una cuenta ni una contraseña de inicio de sesión. Se guarda en el almacenamiento local de tu navegador y se envía en la cabecera `X-Owner-Key` cuando realizas operaciones protegidas, como seguir un canal o administrar avisos. No se incluye al exportar tus datos. Quien tenga esa clave puede realizar esas operaciones.</li>
          <li><b>Búsquedas y canales públicos:</b> cuando buscas en todo el catálogo o abres un canal que no sigues, el Worker de TodoTube consulta páginas públicas de YouTube. La consulta se mantiene en caché en memoria durante un tiempo limitado; el código no la inserta en D1 como historial de búsquedas.</li>
          <li><b>Proveedor de alojamiento:</b> el sitio y sus Workers funcionan en Cloudflare. Como proveedor de red y alojamiento, Cloudflare procesa la dirección IP y los datos técnicos necesarios para atender las solicitudes. La retención y disponibilidad de registros de plataforma dependen de la configuración de la cuenta y de las condiciones del servicio; no afirmamos que todos los registros de Cloudflare estén desactivados.</li>
        </ul>
      </section>

      <section className="panel">
        <h2>Lo que se queda en este navegador</h2>
        <p className="note">Historial, progreso, Me gusta, Ver más tarde, listas, grupos, vídeos ocultos, filtros por palabras, búsquedas recientes, tema, preferencias de interfaz y la clave de propietario se guardan localmente en el navegador. No hay sincronización entre dispositivos ni un perfil de usuario en la nube. Puedes exportar una copia de parte de estos datos desde <Link to="/ajustes#datos">Ajustes → Tus datos</Link>; por seguridad, la clave de propietario no se incluye en esa copia. Borrar los datos del sitio elimina la copia local de ese navegador.</p>
      </section>

      <section className="panel">
        <h2>Servicios externos que consulta la aplicación</h2>
        <table className="ptable">
          <thead><tr><th>Servicio</th><th>Cuándo y para qué</th><th>Información que puede recibir</th></tr></thead>
          <tbody>
            <tr><td>YouTube RSS y páginas públicas</td><td>El Worker consulta feeds RSS, páginas públicas de canales y páginas públicas de resultados de búsqueda para construir el catálogo y las fichas</td><td>YouTube recibe las solicitudes desde la infraestructura de Cloudflare, no desde una petición de reproducción enviada por tu navegador</td></tr>
            <tr><td>i.ytimg.com, yt3.ggpht.com y yt3.googleusercontent.com</td><td>Tu navegador carga directamente miniaturas y fotos públicas de canales</td><td>El proveedor de imágenes puede recibir tu IP y la URL de la imagen solicitada</td></tr>
            <tr><td>www.youtube.com/oembed</td><td>Tu navegador solicita título y autor cuando abres mediante un enlace un vídeo que no estaba en tus canales</td><td>YouTube puede conocer la IP y el ID del vídeo consultado</td></tr>
            <tr><td>Google PubSubHubbub</td><td>El servicio registra suscripciones a feeds públicos para recibir avisos de nuevos vídeos</td><td>Recibe la dirección del feed/canal que el servicio de TodoTube solicita vigilar</td></tr>
            <tr><td>DeArrow — sponsor.ajay.app</td><td>Solo cuando activas “Títulos alternativos” y se necesita consultar un título comunitario</td><td>La aplicación calcula un hash del ID del vídeo y envía un prefijo de 4 caracteres hexadecimales. Ese prefijo reduce la identificación directa, pero no debe considerarse anónimo: el servicio puede compararlo con IDs candidatos</td></tr>
            <tr><td>Proveedor de notificaciones push del navegador</td><td>Solo si activas Web Push</td><td>Recibe el endpoint y entrega los avisos al navegador. El proveedor depende del navegador que uses</td></tr>
            <tr><td>Cloudflare R2 y Media Gateway</td><td>Cuando consultas la biblioteca o reproduces un archivo publicado en Medios propios</td><td>Cloudflare recibe la solicitud del catálogo o del archivo. El Gateway está diseñado para archivos propios o licenciados; no obtiene ni retransmite segmentos de YouTube</td></tr>
          </tbody>
        </table>
        <p className="note">TodoTube muestra vídeos de YouTube como metadatos, miniaturas y enlaces al origen. No inserta el reproductor oficial, no carga `youtube-nocookie.com` y no retransmite segmentos de `googlevideo.com`. Al pulsar “Abrir origen”, pasas a YouTube y se aplican sus propias cookies, políticas y controles de privacidad.</p>
      </section>

      <section className="panel">
        <h2>Contenido en Medios propios</h2>
        <p className="note">El Media Gateway está reservado para archivos que el titular puede distribuir, ya sean propios o licenciados expresamente. Los archivos se guardan en R2 y no en la base D1 del feed. El hecho de que un archivo se marque como “licenciado” no sustituye la obligación de comprobar que la licencia realmente permite su distribución. La biblioteca no está disponible hasta que se complete el despliegue operativo del bucket y del Worker.</p>
      </section>
    </div>
  );
}
