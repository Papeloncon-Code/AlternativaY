# Source Provider Broker · arquitectura de reproducción

**Estado:** implementación inicial en PR #37; dirección rectora ADR-013.

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
| YouTube browser runtime | Resuelve mediante InnerTube/Onesie y reproduce por SABR/DASH/HLS/progresivo | Primera integración en PR #37; falta matriz manual |
| TodoTube R2 | Copia propia/licenciada del mismo asset, Range y réplica | Worker implementado; operación real por verificar |
| Creator-origin | HLS/DASH/URL firmada entregada por el titular | Siguiente adaptador a implementar |
| Native Android/Desktop | Runtime nativo detrás del mismo contrato | Fase posterior |

## Cadena de redundancia YouTube

- Onesie player request como primera ruta para WEB.
- InnerTube estándar como respaldo en el mismo perfil.
- Perfiles actualmente incluidos con `youtubei.js@16.0.0`: MWEB, WEB, TV, TV_EMBEDDED, WEB_EMBEDDED, ANDROID_CREATOR y ANDROID. VISIONOS y ANDROID_VR no están en el tipo ni en la cadena de fallback del build actual.
- Para cada respuesta, construir candidatos SABR, DASH, HLS y progresivos válidos.
- Si el flujo falla por timeout, red, 5xx o estancamiento, renovar una vez cuando proceda y avanzar al siguiente candidato/perfil.
- Una respuesta HTTP 400 detiene la rotación a otro perfil. Si `FAILED_PRECONDITION` aparece solo como mensaje genérico en Onesie, se permite únicamente probar InnerTube normal con el mismo perfil WEB; si el 400 se repite, la cadena termina. Una denegación explícita (login, edad, geo, consentimiento, anti-bot/tráfico automatizado) o 401/403/407/429 detiene todas las rutas YouTube. Nunca se cambia identidad ni backend para eludir la denegación.
- El watchdog detecta más de 2 s sin avance y sin buffer útil (0,25 s), muestrea cada segundo, ignora pausa/seek/ended/oculto/offline y limita la recuperación a tres intentos. El umbral sigue el criterio de la incidencia #27; Materialious usa 12 s para su watchdog general, pero TodoTube conserva su aceptación más estricta.
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
- Timeout/red/5xx en perfil -> siguiente perfil.
- HTTP 400 -> no cambiar de perfil.
- `FAILED_PRECONDITION` genérico en Onesie -> probar una sola vez InnerTube estándar con el mismo perfil WEB; si falla, terminar la cadena.
- 401/403/407/429/restricción explícita -> detener rutas YouTube.
- SABR falla -> DASH/HLS/directo si la respuesta provee candidatos válidos.
- URL vencida -> renovación y después failover.
- R2 falla a mitad de vídeo -> runtime web, posición y estado preservados.
- Runtime se agota y R2 está disponible -> volver a R2, sin audio duplicado.
- Rechazar fingerprint/timeline incompatible.
- Confirmar audio y vídeo completos, seek, buffering y fullscreen en navegadores objetivo.
- Medir TTFF, tasa de buffer y tiempo de failover.
- Verificar que el watchdog respeta el presupuesto y evita reintentos repetidos después del agotamiento.

La investigación comparativa y las decisiones de adaptación se detallan en `docs/research/12-comparativa-materialious-chrupipe-invidious.md` y `docs/research/13-adaptacion-materialious-chrupipe-invidious-a-todotube.md`. La recuperación nueva deriva del patrón de watchdog de Materialious; ChruPipe aporta recuperación HLS/progresivo y el modelo de formatos; Invidious aporta un contrato alternativo de extracción/formatos que queda como provider futuro, no activado. No se encontró un warm standby independiente en esos proyectos.

El código presente en PR #37 es una primera integración. La recuperación segura está en la rama/PR de adaptación y requiere CI más pruebas de navegador real. No se certifica playback completo hasta ejecutar pruebas reales de navegador y medios.

## Hallazgo Materialious: fallback local y alcance por plataforma

La fuente `materialious/src/lib/api/index.ts` elige `getVideoYTjs()` en vez de `getVideoInvidious()` si el backend YouTube está activo, si `useEngineFallback('Video')` lo ordena o si se fuerza YT.js en un entorno no restringido. `docs/DEV.md` define cuatro configuraciones distintas: SPA web estática, full web con Node backend, Desktop/Electron y Android. `isUnrestrictedPlatform()` es verdadero con full backend o app nativa; no se debe atribuir ese fallback a la SPA estática por defecto.

En Materialious issue #869 el mantenedor dijo que Invidious estaba siendo bloqueado por Google y recomendó el fallback local en Android/Desktop. Es evidencia de una recuperación concreta en esos entornos, no de que cualquier web client o un Invidious remoto vaya a reproducir. TodoTube es hoy una SPA servida por Cloudflare Worker con runtime de navegador y Bridge MV3; no tiene el Node local de Android ni el full backend de Materialious.

La adaptación razonable es separar la selección de motor del PlayerHost y hacer una prueba de compatibilidad del runtime local ya existente (`youtubei.js`) antes de elegir un backend adicional. Un backend remoto/Invidious no se activa como respuesta a un rechazo anti-bot, PoToken/BotGuard, IP/región o acceso. Cambiar la red de salida para superar esa respuesta no cuenta como failover permitido.

Fuentes: [selector de Materialious](https://raw.githubusercontent.com/Materialious/Materialious/main/materialious/src/lib/api/index.ts), [DEV.md: tipos de build y plataformas](https://github.com/Materialious/Materialious/blob/main/docs/DEV.md), [issue #869](https://github.com/Materialious/Materialious/issues/869).

## Puerta de aceptación final E4

La aceptación de playback exige que un vídeo sí se reproduzca en una sesión E4 real del TodoTube desplegado: metadata, primer frame, dimensiones válidas, imagen en movimiento, audio audible y sincronizado, `currentTime` avanzando, seek en ambos sentidos, controles propios y recuperación de una interrupción transitoria en staging con el mismo asset/timeline. Las denegaciones deben detener la cadena y mostrar un error real como prueba de seguridad separada; no cuentan como éxito de reproducción. Una prueba con fixtures o un HTTP 200 no cierra la incidencia. Ver `docs/testing/real-playback-release-gate.md`.