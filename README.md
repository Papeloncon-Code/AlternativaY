# TodoTube

> Estado de código: 9 de noviembre de 2026. PR #37 y PR #39–#43 están integradas en `main`; PR #44–#47 siguen abiertas y sin fusionar. El smoke real del 2026-11-09 no decodificó metadata (`readyState=0`, dimensiones 0, duración nula) y recibió respuestas HTTP 400 distintas. Playback sigue **pendiente de validación real E4**.

TodoTube es una aplicación web para descubrir vídeos y canales, organizar una biblioteca personal y reproducir vídeos dentro de un reproductor propio con controles y continuidad propios.

## Estado del producto

- Inicio con feed, filtros, tarjetas y carga progresiva.
- Búsqueda, páginas de canal, feed de Suscripciones, gestión de canales, fichas de vídeos/Shorts, historial, Ver más tarde, Me gusta y listas.
- Avisos WebSub/RSS, campanita por canal y Web Push.
- Preferencias locales, tema, Modo Foco, DeArrow y filtros por palabras.
- Biblioteca local del navegador; no hay cuentas ni sincronización multidispositivo.

## Reproducción propia

La dirección del producto es un solo reproductor TodoTube, no un iframe oficial ni un fallback externo. El PlayerHost utiliza un broker que prioriza una copia propia/licenciada en R2 cuando existe y, en ausencia de ella o cuando falla, usa el runtime web client-side de YouTube.

El runtime integra Shaka Player, youtubei.js, googlevideo/SABR y una cadena de perfiles InnerTube alternativos. Para el perfil WEB intenta Onesie primero y conserva InnerTube estándar como respaldo. De cada respuesta prueba transportes SABR/UMP, DASH, HLS y progresivo cuando estén disponibles. El Bridge MV3 de TodoTube habilita las peticiones necesarias desde el navegador y está limitado a TodoTube/localhost y a una lista de hosts permitidos.

El cambio automático de fuente conserva posición, play/pause, volumen y velocidad. La redundancia de clientes/modos dentro de YouTube aumenta tolerancia a fallos del proveedor, pero no equivale a una CDN independiente; la redundancia de dominio se logra con copias propias/licenciadas o un origin autorizado del creador.

**Requisito del navegador:** la reproducción SABR web requiere instalar y habilitar TodoTube Bridge en Chrome o Edge (Manifest V3). Sin la extensión, la web muestra un error recuperable y no inserta un iframe. La web por sí sola todavía no ofrece playback universal en una instalación limpia; Firefox, Safari y navegadores móviles no están validados.

**Estado de implementación:** PR #37 integra PlayerHost, Playback Broker, Shaka/SABR/Onesie, transportes y clientes alternativos y Bridge MV3. La rama compila y pasa 86 pruebas Playwright y CodeQL, pero aún no está fusionada ni desplegada. CI valida contratos/UI con fixtures, no demuestra reproducción audiovisual desde YouTube.

### Diagnóstico y recuperación SABR

La ruta SABR utiliza ahora la attestation oficial de YouTube.js en la misma sesión WEB/MWEB antes de adjuntar el adaptador. El adaptador comunica `StreamProtectionStatus`; si informa estado `3`, el runtime actualiza attestation y renueva el WebPO con el `BotguardService` local, con deduplicación/cooldown. Onesie no envía `sendVideoPlaybackConfig=false`. Estos cambios están en PR #47 y siguen pendientes de prueba E4 real. No añaden proxy, egress alternativo ni servidor externo de tokens.

### Criterio definitivo de aceptación

La reproducción solo se considera terminada cuando un vídeo real reproduce imagen y sonido dentro del player TodoTube, avanza, permite seek hacia delante y atrás, responde a los controles propios y demuestra recuperación segura en el navegador/despliegue objetivo. Build, TypeScript, Playwright con fixtures, health checks, metadatos, manifests o URLs son pruebas intermedias, no éxito final. La matriz y el procedimiento obligatorios están en [la puerta de aceptación E4](docs/testing/real-playback-release-gate.md).

### Investigación de alternativas aplicada

- **Materialious:** además del watchdog ya adaptado en PR #47, su hallazgo más útil es el fallback de Invidious a `youtubei.js` local cuando el entorno lo permite. Su código y documentación aclaran que la SPA web estática no equivale a Android/Desktop o al full web backend. No desplegaremos un backend ni moveremos solicitudes a otra IP para superar un bloqueo anti-bot.
- **ChruPipe:** su HLS → progresivo y conservación de posición sirven como referencia; su NewPipeExtractor 0.26.4 no es un extractor independiente del NewPipeExtractor 0.27.0 ya probado por TodoTube.
- **Invidious:** su API de formatos es un resolver distinto, pero continúa obteniendo el medio de YouTube; ni su API ni su proxy constituyen una CDN independiente.
- La siguiente investigación técnica es un spike controlado de compatibilidad de `youtubei.js`/Shaka y una prueba E4 real. No se modifican dependencias ni infraestructura de producción hasta que CI y la prueba real confirmen una mejora.

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

No declares terminada una función solo porque compile o pase tests automatizados: playback exige evidencia E4 en el navegador y despliegue objetivo, con imagen, sonido audible, avance, seek, controles propios y recuperación segura. El Gateway requiere, por separado, prueba de producción con un archivo propio/licenciado; no sustituye la prueba de YouTube.
