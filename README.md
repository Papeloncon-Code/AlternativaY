# TodoTube

> Estado de código: 10 de noviembre de 2026. La rama `fix/web-playback-without-bridge-final-2026-11-10` prueba un transporte de control same-origin en el Worker para retirar la extensión del flujo web. El resultado E4 sigue **pendiente**: no se afirma que la reproducción funcione hasta comprobar imagen, audio, avance y seek en la preview y después en producción.

TodoTube es una aplicación web para descubrir vídeos y canales, organizar una biblioteca personal y reproducir vídeos dentro de un reproductor propio con controles y continuidad propios.

## Estado del producto

- Inicio con feed, filtros, tarjetas y carga progresiva.
- Búsqueda, páginas de canal, feed de Suscripciones, gestión de canales, fichas de vídeos/Shorts, historial, Ver más tarde, Me gusta y listas.
- Avisos WebSub/RSS, campanita por canal y Web Push.
- Preferencias locales, tema, Modo Foco, DeArrow y filtros por palabras.
- Biblioteca local del navegador; no hay cuentas ni sincronización multidispositivo.

## Reproducción propia

La dirección del producto es un solo reproductor TodoTube, no un iframe oficial ni un fallback externo. El PlayerHost utiliza un broker que prioriza una copia propia/licenciada en R2 cuando existe y, en ausencia de ella o cuando falla, usa el runtime web client-side de YouTube.

El runtime integra Shaka Player, youtubei.js, googlevideo/SABR y una cadena de perfiles InnerTube alternativos. Para el perfil WEB intenta Onesie primero y conserva InnerTube estándar como respaldo. De cada respuesta prueba transportes SABR/UMP, DASH, HLS y progresivo cuando estén disponibles. Las solicitudes de control (InnerTube/BotGuard/configuración) se enrutan por `/api/youtube/control` del Worker de TodoTube, con host, ruta, método y cabeceras permitidos explícitamente.

El cambio automático de fuente conserva posición, play/pause, volumen y velocidad. La redundancia de clientes/modos dentro de YouTube aumenta tolerancia a fallos del proveedor, pero no equivale a una CDN independiente; la redundancia de dominio se logra con copias propias/licenciadas o un origin autorizado del creador.

**Requisito del navegador:** la nueva ruta web no requiere instalar TodoTube Bridge. El Worker solo atiende solicitudes de control autorizadas; los manifiestos y segmentos de Google Video siguen descargándose directamente en el navegador y no se retransmiten por TodoTube. La preview debe demostrar que esta separación funciona antes de considerar retirado Bridge de la release.

**Estado de implementación:** el cambio sin extensión está aislado en una rama y añade pruebas del allowlist del Worker y una prueba E4 con Chromium limpio. CI y la preview siguen siendo puertas intermedias; todavía no se ha confirmado reproducción audiovisual real.

### Diagnóstico y recuperación SABR

La ruta SABR utiliza ahora la attestation oficial de YouTube.js en la misma sesión WEB/MWEB antes de adjuntar el adaptador. El adaptador comunica `StreamProtectionStatus`; si informa estado `3`, el runtime actualiza attestation y renueva el WebPO con el `BotguardService` local, con deduplicación/cooldown. Onesie no envía `sendVideoPlaybackConfig=false`. Estos cambios están en PR #47 y siguen pendientes de prueba E4 real. No añaden proxy, egress alternativo ni servidor externo de tokens.

### Criterio definitivo de aceptación

La reproducción solo se considera terminada cuando un vídeo real reproduce imagen y sonido dentro del player TodoTube, avanza, permite seek hacia delante y atrás, responde a los controles propios y demuestra recuperación segura en el navegador/despliegue objetivo. Build, TypeScript, Playwright con fixtures, health checks, metadatos, manifests o URLs son pruebas intermedias, no éxito final. La matriz y el procedimiento obligatorios están en [la puerta de aceptación E4](docs/testing/real-playback-release-gate.md).

### Investigación de alternativas aplicada

- **Materialious:** además del watchdog ya adaptado en PR #47, su hallazgo más útil es el fallback de Invidious a `youtubei.js` local cuando el entorno lo permite. Su código y documentación aclaran que la SPA web estática no equivale a Android/Desktop o al full web backend. No desplegaremos un backend ni moveremos solicitudes a otra IP para superar un bloqueo anti-bot.
- **ChruPipe:** su HLS → progresivo y conservación de posición sirven como referencia; su NewPipeExtractor 0.26.4 no es un extractor independiente del NewPipeExtractor 0.27.0 ya probado por TodoTube.
- **Invidious:** su API de formatos es un resolver distinto, pero continúa obteniendo el medio de YouTube; ni su API ni su proxy constituyen una CDN independiente.
- La siguiente verificación es el despliegue aislado `todotube-no-bridge-preview` y su prueba E4 sin extensión. Si YouTube deniega la solicitud desde el Worker, se registrará como resultado y no se cambiará de IP/egress ni se añadirá un proxy externo.

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

Gateway:
    cd apps/media-gateway
    npm ci
    npm test

Avisos:
    cd spikes/websub
    npm ci
    npm test

CI/CD publica primero una preview aislada para la rama de reproducción sin extensión; la versión principal no se reemplaza hasta revisar el resultado de esa prueba.

No declares terminada una función solo porque compile o pase tests automatizados: playback exige evidencia E4 en el navegador y despliegue objetivo, con imagen, sonido audible, avance, seek, controles propios y recuperación segura. El Gateway requiere, por separado, prueba de producción con un archivo propio/licenciado; no sustituye la prueba de YouTube.
