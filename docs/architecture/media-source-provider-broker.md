# Source Provider Broker · arquitectura de reproducción

**Estado:** implementación inicial fusionada en `main` mediante PR #37; las correcciones de transporte/diagnóstico de PR #39–#43 también están integradas. La última prueba smoke aún recibe HTTP 400 en `/youtubei/v1/player`; falta validar reproducción audiovisual real.

## Objetivo

Un solo reproductor TodoTube y varios proveedores/rutas detrás de un contrato común. La UI no conoce detalles de InnerTube, Onesie, SABR, R2, HLS o DASH. El broker resuelve candidatos, observa salud y cambia de fuente preservando el estado.

## Capas

1. **Discovery:** título, canal, miniatura, duración y metadatos.
2. **Source providers:** candidatos que entregan medios al player (YouTube browser runtime, R2 propio/licenciado, creator-origin, futuros providers nativos).
3. **Playback broker:** prioridades, timeouts, cooldown y failover.
4. **PlayerHost:** un solo reproductor visual y estado de sesión.
5. **Transport adapters:** Shaka y adaptadores por protocolo; el player permanece constante al cambiar la fuente.

## Providers iniciales

| Provider | Función | Estado |
|---|---|---|
| YouTube browser runtime | Resuelve mediante InnerTube/Onesie y reproduce por SABR/DASH/HLS/progresivo | Integrado en `main`; smoke actual con HTTP 400 pendiente de resolver y matriz real pendiente |
| TodoTube R2 | Copia propia/licenciada del mismo asset, Range y réplica | Worker implementado; operación real por verificar |
| Creator-origin | HLS/DASH/URL firmada entregada por el titular | Siguiente adaptador a implementar |
| Native Android/Desktop | Runtime nativo detrás del mismo contrato | Fase posterior |

## Cadena de redundancia YouTube

- Onesie player request como primera ruta para WEB.
- InnerTube estándar como respaldo en el mismo perfil.
- Perfiles incluidos en el código actual (`youtubei.js@16.0.0`): MWEB, WEB, TV, TV_EMBEDDED, WEB_EMBEDDED, ANDROID_CREATOR y ANDROID. VISIONOS y ANDROID_VR no están actualmente en el tipo, mapa ni orden de fallback; no se deben contar como rutas disponibles.
- Para cada respuesta, construir candidatos SABR, DASH, HLS y progresivos válidos.
- Si el flujo falla, renovar player response/URLs una vez y avanzar al siguiente candidato y perfil.
- El broker registra éxito/fallo y aplica cooldown.
- El runtime solo cuenta una fuente como funcional cuando Shaka carga y empieza a entregar datos.

## Failover entre providers

R2 es preferido cuando hay copia del mismo asset. Si R2 deja de entregar bytes, el player captura tiempo, play/pause, volumen y velocidad y pasa al runtime YouTube en el mismo host. Si el runtime agota candidatos, vuelve a comprobar R2. Un backup de creator-origin podrá añadirse detrás del mismo contrato.

Los providers alternativos solo cuentan como copia independiente cuando el asset y la timeline coinciden. No cambiar silenciosamente a otro vídeo ni reanudar en una edición diferente.

## Independencia de dominios de fallo

Varios perfiles InnerTube y modos SABR/DASH/HLS son redundancia de rutas de extracción/entrega dentro del proveedor YouTube; no son CDN independientes. R2 primary + R2 replica mejora disponibilidad dentro de Cloudflare, pero no sobrevive a una caída global de Cloudflare. Para una segunda infraestructura real se debe incorporar un storage/origin externo (por ejemplo, Backblaze B2 o CDN del creador) para copias cuyo titular autorice almacenamiento y distribución.

El pipeline de backup no debe descargar arbitrariamente medios de YouTube; recibe archivos del propietario o assets con licencia de almacenamiento/distribución. Para vídeos grandes el Gateway requiere upload multipart/resumable, checksum y reconciliación de réplicas.

## Contrato mínimo

Cada candidato declara providerId, videoId/assetId, modo/protocolo, URI, MIME y expiración. Los providers pueden devolver varias opciones. El broker descarta candidatos malformados, aplica timeout, respeta AbortSignal, ordena por prioridad/salud y marca circuit breaker.

El runtime recibe resumeAt y wasPlaying. El player conserva posición, volumen, velocidad, subtítulos, fullscreen e identidad del vídeo.

## Seguridad y operación

- Los streams de YouTube no pasan por Cloudflare Workers ni R2.
- Bridge se limita al origen TodoTube y a hosts HTTPS permitidos.
- No hay proxy abierto ni URLs arbitrarias en el Gateway.
- No DRM/Widevine ni acceso a contenido de pago sin autorización.
- No almacenar vídeos de terceros en R2 sin derechos de almacenamiento/distribución.
- No registrar cookies, tokens de integridad, secretos o URLs firmadas completas.

## Pruebas necesarias

- Onesie falla -> InnerTube normal.
- Perfil falla -> siguiente perfil.
- SABR falla -> DASH/HLS/directo si la respuesta provee candidatos válidos.
- URL vencida -> renovación y después failover.
- R2 falla a mitad de vídeo -> runtime web, posición y estado preservados.
- Runtime se agota y R2 está disponible -> volver a R2, sin audio duplicado.
- Rechazar fingerprint/timeline incompatible.
- Confirmar audio y vídeo completos, seek, buffering y fullscreen en navegadores objetivo.
- Medir TTFF, tasa de buffer y tiempo de failover.

El código de PR #37 ya está integrado en `main`; PR #39–#43 añadieron correcciones posteriores. El smoke real del 2026-11-09 recibió una respuesta HTML de Google con aviso de consultas automatizadas y otra respuesta JSON `400 FAILED_PRECONDITION`; no llegó a decodificar metadatos de vídeo. El navegador Chromium de esa prueba se ejecutó en un runner Ubuntu de GitHub Actions; las peticiones a Google salieron desde la red/IP del runner, no desde el dispositivo ni la conexión doméstica del usuario. Por ello, el aviso de consultas automatizadas puede describir la reputación o el límite de esa red de CI y no demuestra que todos los usuarios reciban el mismo rechazo. El log de ese intento no identifica el perfil de cliente responsable. PR #46 añade telemetría segura de `clientName` y `clientVersion` para una próxima ejecución, sin modificar payload ni comportamiento de reproducción. No se certifica playback completo mientras el endpoint siga rechazando las peticiones y no exista evidencia real de audio/vídeo, seek y failover.
