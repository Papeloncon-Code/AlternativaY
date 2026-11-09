# TodoTube

> Estado de código: 9 de noviembre de 2026. `main` ya integra PR #37, #39–#43, #46, #47, #49, #50 y #51. El smoke real con Bridge del 2026-11-09 no decodificó metadata (`readyState=0`, dimensiones 0, duración nula). La rama `fix/web-playback-without-bridge-2026-11-09` implementa un relay same-origin y una nueva prueba sin extensión; está pendiente de CI y del smoke de producción E4. Playback sigue **sin aceptación real**.

TodoTube es una aplicación web para descubrir vídeos y canales, organizar una biblioteca personal y reproducir vídeos dentro de un reproductor propio con controles y continuidad propios.

## Estado del producto

- Inicio con feed, filtros, tarjetas y carga progresiva.
- Búsqueda, páginas de canal, feed de Suscripciones, gestión de canales, fichas de vídeos/Shorts, historial, Ver más tarde, Me gusta y listas.
- Avisos WebSub/RSS, campanita por canal y Web Push.
- Preferencias locales, tema, Modo Foco, DeArrow y filtros por palabras.
- Biblioteca local del navegador; no hay cuentas ni sincronización multidispositivo.

## Reproducción propia

La dirección del producto es un solo reproductor TodoTube, no un iframe oficial ni un fallback externo. El PlayerHost utiliza un broker que prioriza una copia propia/licenciada en R2 cuando existe y, en ausencia de ella o cuando falla, usa el runtime web client-side de YouTube.

El runtime integra Shaka Player, youtubei.js, googlevideo/SABR y una cadena de perfiles InnerTube alternativos. Para WEB usa el endpoint `/player` normal y prueba SABR/UMP, DASH, HLS y progresivo cuando existan. La rama experimental elimina la extensión y envía las peticiones de control y segmentos por `/api/youtube/proxy`, un relay same-origin con allowlist HTTPS, redirecciones validadas, límite de cuerpo/frecuencia, streaming y soporte Range.

El cambio automático de fuente conserva posición, play/pause, volumen y velocidad. La redundancia de clientes/modos dentro de YouTube aumenta tolerancia a fallos del proveedor, pero no equivale a una CDN independiente; la redundancia de dominio se logra con copias propias/licenciadas o un origin autorizado del creador.

**Requisito del navegador en la variante nueva:** no se necesita instalar una extensión. La extracción, el parseo de scripts y BotGuard siguen en el navegador; el Worker actúa únicamente como transporte HTTP same-origin. La compatibilidad de Chrome/Edge y otros navegadores y la reproducción real siguen pendientes de E4. Mientras la rama no se integre y despliegue, el sitio publicado aún conserva la versión de `main` que exige Bridge.

**Estado de implementación:** PlayerHost, Playback Broker, Shaka/SABR y clientes alternativos ya están en `main`; PR #51 actualizó el stack de youtubei.js/BotGuard. La rama sin extensión añade el relay same-origin, seguridad/streaming tests y un smoke E4 que exige que no haya `ytcBridge`. Todavía no hay resultado CI ni producción para esa variante. Los tests con fixtures no prueban por sí solos reproducción audiovisual.

### Diagnóstico y recuperación SABR

La ruta SABR utiliza la attestation oficial de YouTube.js en la misma sesión WEB/MWEB. El adaptador comunica `StreamProtectionStatus`; para estado `3`, el runtime actualiza attestation y renueva WebPO con el `BotguardService` local. PR #47 y PR #51 están integradas. La rama nueva añade un relay same-origin como transporte principal para resolver CORS; no lo usa como segundo intento tras una denegación y no rota IP, identidad ni tokens mediante un tercero.

### Criterio definitivo de aceptación

La reproducción solo se considera terminada cuando un vídeo real reproduce imagen y sonido dentro del player TodoTube, avanza, permite seek hacia delante y atrás, responde a los controles propios y demuestra recuperación segura en el navegador/despliegue objetivo. Build, TypeScript, Playwright con fixtures, health checks, metadatos, manifests o URLs son pruebas intermedias, no éxito final. La matriz y el procedimiento obligatorios están en [la puerta de aceptación E4](docs/testing/real-playback-release-gate.md).

### Investigación de alternativas aplicada

- **Materialious:** además del watchdog ya adaptado en PR #47, su hallazgo más útil es el fallback de Invidious a `youtubei.js` local cuando el entorno lo permite. Su código y documentación aclaran que la SPA web estática no equivale a Android/Desktop o al full web backend. No usaremos Invidious ni otro backend como fallback después de un bloqueo ni moveremos solicitudes a otra IP para superarlo. El Worker Relay de la rama experimental solo cambia el transporte principal para resolver CORS; una denegación del upstream detiene la cadena.
- **ChruPipe:** su HLS → progresivo y conservación de posición sirven como referencia; su NewPipeExtractor 0.26.4 no es un extractor independiente del NewPipeExtractor 0.27.0 ya probado por TodoTube.
- **Invidious:** su API de formatos es un resolver distinto, pero continúa obteniendo el medio de YouTube; ni su API ni su proxy constituyen una CDN independiente.
- La siguiente puerta es CI y el smoke E4 real del Worker Relay. No se declarará una mejora hasta que la web publicada reproduzca y complete seek sin cargar una extensión.

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

CI/CD ya no construye ni publica una extensión para la variante sin Bridge; el smoke de producción arranca Chromium limpio y falla si detecta `window.ytcBridge` o `window.proxyFetch`.

No declares terminada una función solo porque compile o pase tests automatizados: playback exige evidencia E4 en el navegador y despliegue objetivo, con imagen, sonido audible, avance, seek, controles propios y recuperación segura. El Gateway requiere, por separado, prueba de producción con un archivo propio/licenciado; no sustituye la prueba de YouTube.
