
# Puerta de aceptación final: reproducción real en TodoTube

**Estado:** obligatoria para declarar terminado playback; todavía pendiente de evidencia real.
**Aplica a:** reproductor web TodoTube, PlayerHost, Playback Broker, runtime YouTube, endpoint de control Worker y cualquier provider que se incorpore.
**Decisión rectora:** ADR-013 e incidencia #27.

## Regla de cierre

La aceptación definitiva ocurre únicamente cuando un vídeo real se reproduce dentro de TodoTube, en el navegador y despliegue objetivo, con imagen y sonido reales, controles propios, seek funcional y recuperación demostrada. No basta con que el repositorio compile, pasen las pruebas automatizadas, el extractor devuelva metadatos/una URL, Shaka acepte un manifest o un endpoint responda 200.

Las pruebas de build, TypeScript, contratos, fixtures, Playwright simulado y health checks son necesarias, pero son **pruebas intermedias**. Ninguna equivale a reproducción real y ninguna permite marcar la función como completada.

## Niveles de evidencia

| Nivel | Evidencia | Qué permite afirmar |
|---|---|---|
| E0 | Build, TypeScript, lint y paquetes correctos | El código compila |
| E1 | Tests unitarios/Playwright con fixtures | Los contratos y estados simulados se comportan como se espera |
| E2 | Metadatos, respuesta del extractor, manifest o URL obtenidos | Se resolvió información/candidato, no que el medio reproduzca |
| E3 | Navegador real carga metadata, dimensiones, primer frame y avanza el tiempo | Hay reproducción de vídeo; el audio todavía debe verificarse |
| E4 | E3 + sonido audible/sincronizado + seek ida/vuelta + controles propios + recuperación transitoria real con el mismo asset/timeline | **Playback aceptado** |

Solo E4 cierra el objetivo de reproducción. E4 exige que el vídeo sí se reproduzca y se escuche en TodoTube; mostrar correctamente un error por contenido restringido es una prueba separada de seguridad y nunca sustituye una reproducción exitosa. El estado E0–E3 debe describirse con su nivel, sin llamarlo éxito total.

## Procedimiento E4

Ejecutar desde el dominio desplegado de TodoTube y el navegador objetivo, no solo desde localhost ni desde un runner de GitHub Actions.

1. Abrir la preview o producción en un perfil de navegador limpio, sin extensiones de TodoTube. Registrar `Bridge: no instalado`; el reproductor debe iniciar su ruta de control same-origin sin mostrar una solicitud de instalación.
2. Abrir un vídeo público de prueba que esté disponible para esa sesión y no esté sujeto a DRM, pago, edad, login, región u otra restricción. Registrar el identificador de prueba de forma controlada.
3. Confirmar que el título, canal y duración se corresponden con el vídeo abierto. El reproductor debe seguir siendo el de TodoTube, sin iframe, controles nativos visibles ni enlaces externos de reproducción.
4. Esperar a `loadedmetadata` y `loadeddata`/primer frame. Confirmar `readyState >= 2`, `videoWidth > 0`, `videoHeight > 0` y duración válida. Un `play()` resuelto sin frames no basta.
5. Mantener la reproducción y confirmar que `currentTime` avanza de forma sostenida. Verificar manualmente que el sonido se oye y corresponde al vídeo; la presencia de una pista de audio en el manifest no prueba sonido audible.
6. Buscar hacia delante y hacia atrás en dos posiciones separadas del vídeo. Confirmar que el tiempo salta a la posición solicitada, que la imagen continúa y que el audio permanece sincronizado.
7. Verificar pausa, reanudación, volumen, velocidad y pantalla completa mediante controles de TodoTube.
8. En staging, simular un fallo transitorio/estancamiento de la fuente activa. Verificar recuperación dentro del presupuesto, sin reiniciar la línea temporal ni montar un segundo reproductor. Solo aceptar el cambio si la siguiente fuente demuestra el mismo asset y una timeline compatible; si no existe, TodoTube debe presentar un error real.
9. Como prueba de seguridad independiente (no cuenta como éxito E4), simular una denegación/restricción de acceso. Confirmar que no se cambia de identidad, extractor o ruta para intentar eludirla y que TodoTube muestra un estado explicativo.
10. Repetir en Chrome y Edge cuando ambos estén declarados como objetivos de release. Registrar versión del navegador y confirmar que no se instaló ninguna extensión.

## Identidad y continuidad durante el failover

Un cambio de proveedor se considera válido solo si representa el mismo vídeo/asset, no una coincidencia por título o miniatura. Antes de conmutar se debe validar el identificador estable, fingerprint cuando exista, duración y compatibilidad de timeline. Para HLS/DASH se debe validar alineación temporal y pareja de audio/vídeo; para archivos se debe contrastar mediaVersion/ETag, tamaño y checksum.

Guardar y restaurar `currentTime`, play/pause, volumen y velocidad. Un segundo extractor, perfil InnerTube, formato HLS/DASH o URL de `googlevideo.com` no es por sí solo un segundo origen/CDN. No declarar warm standby si no hay segmentos del mismo asset descargados, verificados y sincronizados.

## Diagnóstico seguro

Guardar únicamente los datos que permitan reproducir y clasificar el fallo: fecha, entorno (producción/staging/local), navegador/versión, Bridge/versión, proveedor y protocolo, `clientName`/`clientVersion` cuando proceda, fase de fallo, estado HTTP/clasificación, `readyState`, dimensiones, duración, avance, resultado de audio, resultado de seek y recuperación.

No guardar cookies, API keys, credenciales, visitor IDs, tokens de integridad, PoTokens, cuerpos completos de solicitud, URLs firmadas ni direcciones IP del usuario. El cuerpo de respuesta solo se puede conservar si ha pasado una política de redacción y límite explícita.

Un rechazo observado desde la red compartida de GitHub Actions no demuestra que la red doméstica del usuario reciba la misma respuesta. La prueba E4 debe proceder del entorno real objetivo y distinguir esas redes.

## Límites de las tres alternativas inspeccionadas

- **Materialious:** su fallback de Invidious a YouTube.js es condicional a plataforma/backend. La documentación distingue web estática, web con backend, Desktop y Android; el comportamiento nativo/full-backend no se debe atribuir al navegador web estático. Su issue #869 registra un caso en que Invidious estaba bloqueado por Google y el mantenedor recomendó el fallback local en Android/Desktop. No demuestra que ese camino funcione en un navegador web común ni autoriza copiar técnicas de evasión.
- **ChruPipe:** separa formatos y recupera HLS hacia progresivo, pero usa NewPipeExtractor 0.26.4. TodoTube ya probó esa misma familia con 0.27.0 y recibió `LOGIN_REQUIRED`; no es una segunda extracción independiente probada.
- **Invidious:** la API aporta formatos y el servidor puede entregar/proxyar medios con Range, pero el proxy sigue obteniendo el mismo medio del origen YouTube y no crea un CDN independiente. La ruta `local=true` no se incorporará como proxy de TodoTube ni se usará para superar bloqueos.

## Infraestructura y despliegue

- El Worker solo habilita solicitudes de control previstas a hosts/rutas/métodos declarados; no retransmite medios ni acepta URLs arbitrarias.
- Cloudflare Worker/R2 sigue sirviendo exclusivamente assets propios/licenciados. No recibe ni retransmite segmentos de YouTube.
- Un provider Invidious, si se llega a evaluar, debe ser experimental, configurable y desactivado por defecto hasta pasar revisión de seguridad, operación, licencia/condiciones aplicables y E4. No fijar instancias públicas de terceros.
- No desplegar un backend, VM, proxy, bucket o CDN adicional por intuición. Cada recurso debe corresponder a una ruta técnicamente validada y autorizada.
- La prueba del Gateway con un archivo propio/licenciado valida el Gateway; no cierra el objetivo de ver vídeos de YouTube.

## Registro de resultado

La evidencia de E4 debe añadirse a un registro versionado con fecha, commit desplegado, estado de extensión (ninguna), navegador, proveedor/ruta y resultado de cada paso. Redactar datos sensibles. Hasta que ese registro exista y todas las verificaciones requeridas pasen, el estado global permanece **PLAYBACK PENDIENTE DE VALIDACIÓN REAL**.

### Verificación de la ruta SABR

Cuando la fuente activa es SABR, el registro de staging debe mostrar que la misma sesión WEB/MWEB completó `ENGAGEMENT_TYPE_UNBOUND`, que UMP entregó progreso/segmentos y que la búsqueda temporal funciona. Ante `StreamProtectionStatus=3`, comprobar que se ejecuta como máximo una renovación simultánea de attestation y WebPO mediante el minter local, con cooldown, sin cambiar de cliente/IP ni usar un proxy. La presencia del callback o una respuesta HTTP satisfactoria no sustituye la evidencia E4 de imagen y sonido.
### Registro de fallo E4 del 2026-11-09

Primer smoke desplegado: se abrió `/ver/dQw4w9WgXcQ` en Chromium con Bridge, pero terminó sin metadata (`readyState=0`, `videoWidth=0`, `videoHeight=0`, `duration=null`). `/youtubei/v1/player` del perfil ANDROID devolvió HTTP 400 `FAILED_PRECONDITION`; la app mostró error propio y no creó iframe. Resultado: **E4 FALLIDO**, no aceptación.

La siguiente iteración usa el `/player` WEB normal para construir SABR, no una respuesta Onesie parcial, y amplía el registro de warnings runtime redactados. El nuevo smoke debe producir una captura de éxito con `currentTime` avanzando y seek, o una captura de fallo con la causa. La denegación explícita sigue siendo una prueba de seguridad separada.
### Comportamiento ante manifiesto SABR malformado

Un fallo local de `VideoInfo.toDash({ is_sabr: true })` por URL/format inválido debe descartar solo el candidato SABR; el broker aún debe probar DASH/HLS/directos que estén presentes en la misma respuesta y cliente. Registrar ese fallo como error de construcción de candidato, distinto de HTTP 401/403/407/429 o anti-bot explícito. No se permite cambiar IP/egress ni ocultar una denegación de acceso.
