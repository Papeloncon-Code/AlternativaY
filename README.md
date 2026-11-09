# TodoTube

> Estado de código: 9 de noviembre de 2026. PR #37 está fusionada en `main` y las correcciones de transporte/diagnóstico de PR #39–#43 también están integradas. La última prueba smoke de producción aún recibe HTTP 400 en `/youtubei/v1/player`; la reproducción audiovisual real sigue sin quedar demostrada. CI y Playwright con fixtures no sustituyen esa prueba.

TodoTube es una aplicación web para descubrir vídeos y canales, organizar una biblioteca personal y reproducir vídeos dentro de un reproductor propio con controles y continuidad propios.

## Estado del producto

- Inicio con feed, filtros, tarjetas y carga progresiva.
- Búsqueda, páginas de canal, feed de Suscripciones, gestión de canales, fichas de vídeos/Shorts, historial, Ver más tarde, Me gusta y listas.
- Avisos WebSub/RSS, campanita por canal y Web Push.
- Preferencias locales, tema, Modo Foco, DeArrow y filtros por palabras.
- Biblioteca local del navegador; no hay cuentas ni sincronización multidispositivo.

## Reproducción propia

La dirección del producto es un solo reproductor TodoTube, no un iframe oficial ni un fallback externo. El PlayerHost utiliza un broker que prioriza una copia propia/licenciada en R2 cuando existe y, en ausencia de ella o cuando falla, usa el runtime web client-side de YouTube.

El runtime integra Shaka Player, youtubei.js, googlevideo/SABR y una cadena de perfiles InnerTube alternativos (MWEB, WEB, TV, TV_EMBEDDED, WEB_EMBEDDED, ANDROID_CREATOR y ANDROID en la versión fijada actual). Para el perfil WEB intenta Onesie primero y conserva InnerTube estándar como respaldo. De cada respuesta prueba transportes SABR/UMP, DASH, HLS y progresivo cuando estén disponibles. El Bridge MV3 de TodoTube habilita las peticiones necesarias desde el navegador y está limitado a TodoTube/localhost y a una lista de hosts permitidos.

El cambio automático de fuente conserva posición, play/pause, volumen y velocidad. La redundancia de clientes/modos dentro de YouTube aumenta tolerancia a fallos del proveedor, pero no equivale a una CDN independiente; la redundancia de dominio se logra con copias propias/licenciadas o un origin autorizado del creador.

**Requisito del navegador:** la reproducción SABR web requiere instalar y habilitar TodoTube Bridge en Chrome o Edge (Manifest V3). Sin la extensión, la web muestra un error recuperable y no inserta un iframe. La web por sí sola todavía no ofrece playback universal en una instalación limpia; Firefox, Safari y navegadores móviles no están validados.

**Estado de implementación:** PR #37 integró PlayerHost, Playback Broker, Shaka/SABR/Onesie, transportes, clientes alternativos y Bridge MV3 en `main`. PR #39–#43 corrigieron el transporte del Bridge, solicitudes BotGuard y el diagnóstico del rechazo de `/youtubei/v1/player`. La prueba real de producción del 2026-11-09 registró dos rechazos distintos en `/youtubei/v1/player`: una página HTML de Google que informa de consultas automatizadas y un JSON `400 FAILED_PRECONDITION` (`Precondition check failed`). El smoke no alcanzó metadatos de vídeo decodificados. El navegador Chromium de esa prueba se ejecutó en un runner Ubuntu de GitHub Actions; las peticiones a Google salieron desde la red/IP del runner, no desde el dispositivo ni la conexión doméstica del usuario. Por ello, el aviso de consultas automatizadas puede describir la reputación o el límite de esa red de CI y no demuestra que todos los usuarios reciban el mismo rechazo. El log original no registró `clientName`/`clientVersion`, por lo que aún no identifica qué perfil produjo cada respuesta. PR #46 añade telemetría acotada de esos campos sin registrar tokens ni cuerpos de solicitud; requiere aprobación, despliegue y un nuevo smoke para aportar evidencia. No se debe declarar reproducción real completada hasta confirmar audio, vídeo, seek y continuidad en navegador.

## Media Gateway R2

Worker todotube-media-gateway en apps/media-gateway:
- R2 primario y réplica opcional.
- GET /health y /v1/catalog.
- GET/HEAD de /v1/media/:id con Range, 206 y 416.
- Lecturas y cargas replicadas, detección de estado degradado.
- Carga/borrado autenticados y metadatos owned/licensed.
- Límite actual de carga: 90 MiB por objeto.
- No acepta URLs arbitrarias. No retransmite streams YouTube.

**Pendiente de operación:** verificar buckets R2, secret MEDIA_UPLOAD_TOKEN, despliegue y prueba real de seek/failover. La redundancia efectiva requiere que ambos buckets estén provisionados y enlazados.

## Arquitectura y autoridad documental

- Dirección única de reproducción: docs/adr/ADR-013-reproduccion-propia-redundante.md.
- Constitución: specs/000-constitucion/constitucion.md (v4).
- Broker: specs/009-media-source-provider-broker/spec.md.
- Playback YouTube: specs/010-youtube-completo/spec.md.
- Gateway y almacenamiento autorizado: ADR-011 y specs/008-gateway-multimedia/.

ADR-011 y ADR-010 se conservan como historial; sus restricciones antiguas sobre la reproducción de YouTube han sido sustituidas por ADR-013.

## Desarrollo y pruebas

Node.js 22 y npm.

Web:
    cd apps/web
    npm ci
    npm run build
    npx playwright test --trace off

Browser Bridge:
    cd apps/browser-bridge
    npm ci
    npm run type-check
    npm run build

Gateway:
    cd apps/media-gateway
    npm ci
    npm test

Avisos:
    cd spikes/websub
    npm ci
    npm test

CI/CD construye y empaqueta el Bridge. El artefacto de la extensión se publica en el workflow asociado a la PR.

No declares terminada una función solo porque exista una pantalla o pase un test unitario: la aceptación de playback exige audio/vídeo real, seek, recuperación y verificación de producción cuando aplique.
