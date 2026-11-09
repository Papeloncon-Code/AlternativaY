# Especificación 009 · Media Source Provider Broker

- **Estado:** Implementación inicial en PR #37; ampliar con adaptadores nativos y pruebas de reproducción real.
- **Decisión rectora:** ADR-013.
- **Objetivo:** separar descubrimiento, resolución de medios, selección de fuente y presentación. Mantener una sola UI de TodoTube con varios proveedores y conmutación automática.

## Tipos de proveedor

1. `youtube-browser`: runtime client-side con perfiles InnerTube alternativos y transportes SABR/DASH/HLS/progresivo.
2. `todotube-r2`: archivo propio/licenciado con Range; admite réplica idéntica del mismo objeto.
3. `creator-origin`: URL firmada o manifiesto emitido por el titular del medio.
4. `native-youtube`: proveedores nativos Android/Desktop que implementan el mismo contrato de reproducción sin compartir la UI web.
5. Futuros conectores adicionales que puedan entregar el mismo medio con timeline verificable.

## Requisitos funcionales

- RF-01: discovery/metadatos separado de media delivery.
- RF-02: cada fuente declara providerId, assetId/videoId, protocolo, MIME, expiración y detalles mínimos para reanudación.
- RF-03: cada provider tiene prioridad, soporte, timeout, salud, cooldown y razón de fallo.
- RF-04: el broker reúne candidatos, deduplica, respeta abortos y descarta candidatos inválidos.
- RF-05: seleccionar primero la fuente preferida; si falla la resolución, se prueba la siguiente fuente.
- RF-06: si falla durante playback, preservar tiempo, play/pause, volumen, velocidad y volver a cargar el siguiente candidato.
- RF-07: renovar URLs vencidas/datos de sesión una vez antes de abandonar el proveedor, cuando el protocolo lo permita.
- RF-08: health/circuit breaker evita bombardear un proveedor que acaba de fallar; recupera mediante ventana half-open.
- RF-09: nunca cambiar a un vídeo diferente por coincidencia de título/canal.
- RF-10: medios R2 deben coincidir en mediaVersion/ETag, tamaño y checksum antes de considerarse réplicas intercambiables.
- RF-11: logs sin tokens, cookies, claves, cuerpos cifrados ni URLs firmadas completas.
- RF-12: el player y sus controles permanecen independientes de proveedores.
- RF-13: providers web y nativos comparten contrato, no implementación acoplada.
- RF-14: las copias en R2 requieren derecho documentado para almacenamiento/distribución; no crear copias YouTube automáticamente.
- RF-15: el runtime web de YouTube no usa Cloudflare Worker/R2 como proxy de medios.
- RF-16: el runtime distingue fallos transitorios de denegaciones de acceso. Timeouts, errores de red y 5xx son recuperables; 400 detiene la rotación de perfiles y 401/403/407/429 o restricciones explícitas detienen el failover a otras rutas de YouTube.
- RF-17: el runtime detecta estancamiento por falta de avance/buffer, con timeout y presupuesto finito; no confunde pausa, seek, vídeo terminado, pestaña oculta o navegador offline con un fallo de proveedor.

## Orden inicial de reproducción

1. R2 propio/licenciado del mismo ID cuando exista.
2. runtime de YouTube client-side.
   - Onesie como player request principal de WEB cuando esté disponible.
   - InnerTube estándar como fallback del mismo perfil WEB solo para errores transitorios/no relacionados con acceso.
   - cadena implementada con `youtubei.js@16.0.0`: MWEB, WEB, TV, TV_EMBEDDED, WEB_EMBEDDED, ANDROID_CREATOR y ANDROID.
   - VISIONOS (incorporado en youtubei.js 18) y ANDROID_VR (17) están diferidos; no forman parte del build fijado actual.
   - candidatos de transporte: SABR/UMP, DASH, HLS, progresivo.
   - un 400 detiene la rotación de perfiles; 401/403/407/429 y restricciones explícitas detienen las rutas YouTube. No se usan otros perfiles para eludir una denegación.
3. Revalidar R2 si el runtime web agota sus rutas; únicamente cuando exista una copia autorizada del mismo asset.

La salud del proveedor, la frescura de la sesión, la duración de la resolución y los éxitos recientes pueden ajustar el orden sin eliminar los fallbacks.

## Pruebas de aceptación

- Todas las rutas fallan -> error explícito, nunca spinner infinito ni iframe inesperado.
- Onesie falla -> InnerTube standard se intenta en el mismo cliente.
- Cliente falla por timeout, red o 5xx -> se puede intentar el próximo perfil dentro del presupuesto total.
- Respuesta HTTP 400 -> no se rota a otra identidad de cliente.
- Respuesta 401/403/407/429 o restricción explícita -> se detienen las rutas YouTube; R2 autorizado del mismo asset puede evaluarse aparte.
- SABR falla -> probar DASH/HLS/directo cuando existan candidatos reales.
- URL/manifest no entrega datos -> contar como fallo y conmutar.
- Interrupción midstream -> renovar enlace; después conmutar y mantener timestamp.
- R2 falla y runtime funciona -> el vídeo continúa en el mismo player.
- Runtime falla y R2 vuelve -> revalidar y reanudar desde la posición actual.
- Un candidato con fingerprint/timeline diferente no puede reemplazar al activo sin validación.
- Usuario pulsa pausa durante conmutación -> el nuevo origen permanece pausado.
- No se duplica audio ni se montan dos reproductores.
- El usuario puede consultar diagnóstico de proveedor sin revelar tokens ni URLs firmadas.
- Watchdog de estancamiento: intervalo 1 s, umbral 2 s (criterio de issue #27), buffer útil máximo 0,25 s, máximo tres intentos; no se activa por pausa, seek, ended, pestaña oculta u offline.
- Denegaciones de acceso no se contabilizan como fallos transitorios y no provocan cambio de identidad.

## Puerta de aceptación final E4

El broker puede marcar una ruta como candidata o recuperable, pero nunca declarar playback completado por recibir metadatos, URL o manifest. Solo se cierra con la prueba E4 en `docs/testing/real-playback-release-gate.md`: vídeo real en el despliegue objetivo, primer frame/dimensiones, tiempo avanzando, audio audible y sincronizado, seek de ida/vuelta, controles TodoTube y recuperación de un fallo transitorio demostrada en staging.

Las denegaciones explícitas (login, edad, región, consentimiento, anti-bot, PoToken/BotGuard, `FAILED_PRECONDITION` con semántica de restricción o tráfico automatizado) detienen la cadena de proveedores basados en YouTube. Invidious sigue dependiendo del mismo origen y no se puede utilizar como ruta para eludir esa denegación. Un backend propio tampoco se usa para cambiar de IP/red y superar el bloqueo.

Las pruebas E0–E3 (build, fixtures, contratos, metadatos, manifest y primer frame sin audio verificado) son intermedias y se reportan por separado. La aceptación final requiere E4 y un registro versionado del commit, navegador, Bridge y ruta probada.