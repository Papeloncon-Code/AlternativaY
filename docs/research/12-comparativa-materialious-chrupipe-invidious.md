# Comparativa enfocada: Materialious, ChruPipe e Invidious

- **Fecha de inspección:** 2026-11-09.
- **Alcance confirmado por el propietario:** exclusivamente estos tres repositorios como alternativas a evaluar: [Materialious](https://github.com/Materialious/Materialious), [ChruPipe](https://github.com/chukjosh/ChruPipe) e [Invidious](https://github.com/iv-org/invidious).
- **Objetivo de TodoTube:** conservar título, creador, miniatura, duración y metadatos de cada vídeo, pero presentar toda la experiencia mediante marca, interfaz y controles propios. No usar el iframe ni mostrar logotipos, controles, enlaces o llamadas a la marca de YouTube en la interfaz de reproducción.
- **Criterio:** distinguir extracción/metadatos, resolución y transporte de medios, presentación, recuperación y precarga real. Un extractor diferente no equivale a un origen/CDN independiente.

## Resumen ejecutivo

| Proyecto | Extracción / metadatos | Entrega de medios | Player propio | Recuperación observada | Segunda fuente precargada |
|---|---|---|---|---|---|
| Materialious | Invidious y/o `youtubei.js`, configurables; fallback a YT.js | Shaka, DASH/HLS y SABR/UMP; proxy de peticiones cross-origin donde hace falta | Sí; un `<video>` ocultando controles nativos y controles Materialious | Reintentos de Shaka, reconstrucción de sesión SABR y fallback entre Invidious/YT.js según configuración | No se encontró una segunda fuente independiente con segmentos listos para conmutar |
| ChruPipe | NewPipeExtractor 0.26.4 en Kotlin/Ktor | URLs muxed, audio/video separados, HLS y proxy Ktor con Range | Sí como interfaz de aplicación, pero el vídeo usa los controles nativos de `<video controls>` | Un reintento de red HLS, uno de recuperación de media y fallback a progresivo; opción de probar URL directa si falla el proxy | No se encontró warm-standby de otro extractor ni buffer de respaldo |
| Invidious | Extractor propio en Crystal basado en respuestas de YouTube/InnerTube | JSON con `formatStreams`, `adaptiveFormats`, `hlsUrl`, `dashUrl`; proxy `/videoplayback` y manifiestos locales opcionales | Sí; Video.js sobre un elemento `<video>`, no iframe | Alterna fuente proxificada/directa y recarga conservando tiempo, velocidad y pausa; DASH dispone de recarga en error | No se encontró una segunda extracción externa con segmentos precargados |

**Conclusión:** Materialious es el referente más cercano a la arquitectura web que ya tiene TodoTube. Invidious aporta un backend alternativo real para resolver metadatos y formatos. ChruPipe muestra cómo separar metadatos y streams y cómo hacer proxy con Range, pero no aporta una extracción independiente de NewPipeExtractor ni un buffer de respaldo.

## 1. Materialious

### Cómo separa los datos y la reproducción

El frontend puede obtener la ficha del vídeo desde Invidious y mantener una ruta distinta para la reproducción. En `materialious/src/lib/api/index.ts`, `getVideo()`/ `getVideoPage()` eligen entre Invidious y YT.js; en `materialious/src/lib/api/invidious/video.ts`, si la petición Invidious falla y el fallback está habilitado en la plataforma, se recurre a `getVideoYTjs()`.

La carga de reproducción continúa por separado: `getWatchPlayer()` llama a `continueVideoPlayer()`. El player propio utiliza Shaka y el adaptador SABR de `googlevideo`, con BotGuard/PoToken y recarga de la respuesta `/player` cuando el servidor SABR la solicita. El componente `Player.svelte` monta un elemento HTML `<video>` con `controls={false}` y dibuja controles de Materialious. No requiere un iframe de YouTube como superficie visual.

### Qué conviene adoptar

- Mantener separado el modelo de metadatos del descriptor de reproducción.
- Permitir que un proveedor de metadatos y un proveedor de streams sean distintos.
- Conservar una única instancia de reproductor y una única UI de TodoTube.
- Tratar Invidious y YT.js como resolutores alternativos, no como reproductores diferentes.
- Estudiar la evolución de dependencias: Materialious declara `youtubei.js ^18.3.0`, `googlevideo ^5.0.1` y `shaka-player ~5.2.16`. TodoTube declara versiones anteriores (`16.0.0`, `4.0.4` y `4.16.4`), respectivamente. Esto justifica un spike de compatibilidad medido; no demuestra que actualizar por sí solo arregle el HTTP 400 actual.

### Qué no resuelve automáticamente

El player implementa reintentos y renovación de la sesión SABR activa. No se encontró en las rutas revisadas un segundo proveedor con su propio buffer de audio/vídeo ya preparado para tomar el control instantáneamente.

**Licencia:** AGPL-3.0. Reutilizar patrones y contratos es distinto de copiar o enlazar código; cualquier incorporación de código debe pasar revisión de compatibilidad de licencia.

Fuentes de código:
- [API y selección de backend](https://github.com/Materialious/Materialious/blob/main/materialious/src/lib/api/index.ts)
- [Fallback de Invidious a YT.js](https://github.com/Materialious/Materialious/blob/main/materialious/src/lib/api/invidious/video.ts)
- [Resolución YT.js y formatos](https://github.com/Materialious/Materialious/blob/main/materialious/src/lib/api/youtubejs/video.ts)
- [Player Shaka/SABR](https://github.com/Materialious/Materialious/blob/main/materialious/src/lib/player/sabr/index.ts)
- [Interfaz del player](https://github.com/Materialious/Materialious/blob/main/materialious/src/lib/components/player/Player.svelte)
- [Proxy de peticiones](https://github.com/Materialious/Materialious/blob/main/materialious/src/lib/fetchProxy.ts)
- [Dependencias](https://github.com/Materialious/Materialious/blob/main/materialious/package.json)
- [Licencia](https://github.com/Materialious/Materialious/blob/main/LICENSE)

## 2. ChruPipe

### Cómo extrae y entrega

El backend usa Kotlin/Ktor y declara `com.github.TeamNewPipe:NewPipeExtractor:v0.26.4`. `YouTubeService.getVideo()` devuelve título, creador, duración, visualizaciones, miniatura y descripción. `getStreams()` obtiene de `StreamInfo` listas separadas de vídeo muxed, vídeo-only, audio, subtítulos y una posible URL HLS.

La ruta `GET /stream/{id}` o `GET /stream?url=...` devuelve esos datos al frontend. La página `Watch.tsx` selecciona HLS cuando hay manifest de YouTube; si la ruta HLS agota su recuperación, usa un stream progresivo. El reproductor es un elemento `<video controls>` con HLS.js cuando hace falta. El cambio de HLS a progresivo conserva la posición observada para reanudar.

ChruPipe también implementa `GET /proxy?url=...` en Ktor. Reenvía `Range` y devuelve `Content-Range`/ `Accept-Ranges`, lo que permite seek a través del backend. Su comprobación actual rechaza localhost y direcciones locales, pero acepta hosts HTTP(S) públicos en general; no es una allowlist cerrada de dominios de medios. No se debe copiar ese proxy tal cual a TodoTube sin una revisión de SSRF, redirecciones, DNS, límites de uso y dominios permitidos.

### Qué conviene adoptar

- Contrato explícito de metadatos y contrato separado de streams.
- Distinguir fuentes muxed de pares vídeo-only + audio.
- La recuperación HLS → progresivo, con posición preservada, como fallback de transporte.
- Soporte Range correctamente propagado cuando un servidor autorizado retransmite medios.

### Qué no conviene adoptar como primer camino

La dependencia NewPipeExtractor de ChruPipe (0.26.4) es anterior a la utilizada por el intento de TodoTube PR #35 (0.27.0), cuyo smoke de vídeo público devolvió `LOGIN_REQUIRED` / `SignInConfirmNotBotException`. Por tanto, el repositorio revisado no demuestra que ChruPipe resuelva mejor ese mismo bloqueo. Tampoco ofrece por sí solo una ruta alternativa a NewPipeExtractor: su extractor principal es precisamente esa biblioteca.

No se encontró un mecanismo de precarga de una segunda extracción. El proxy hace streaming bajo demanda y Range; HLS.js recupera el flujo actual y luego se cambia a progresivo.

**Licencia:** GPL-3.0 (y el propio README identifica NewPipeExtractor como GPL-3.0). No copiar el código dentro de TodoTube sin una decisión formal sobre compatibilidad de licencia.

Fuentes de código:
- [README: arquitectura y versiones](https://github.com/chukjosh/ChruPipe/blob/dev/README.md)
- [Dependencias del backend](https://github.com/chukjosh/ChruPipe/blob/dev/backend/build.gradle.kts)
- [Extractor YouTube](https://github.com/chukjosh/ChruPipe/blob/dev/backend/src/main/kotlin/com/chrupipe/services/YouTubeService.kt)
- [Modelo de streams](https://github.com/chukjosh/ChruPipe/blob/dev/backend/src/main/kotlin/com/chrupipe/models/Models.kt)
- [Proxy Ktor y Range](https://github.com/chukjosh/ChruPipe/blob/dev/backend/src/main/kotlin/com/chrupipe/routes/StreamProxyRoutes.kt)
- [Watch y fallback HLS/progresivo](https://github.com/chukjosh/ChruPipe/blob/dev/frontend/src/pages/Watch.tsx)
- [Selección de formatos y fuentes](https://github.com/chukjosh/ChruPipe/blob/dev/frontend/src/utils/playback.ts)
- [Licencia](https://github.com/chukjosh/ChruPipe/blob/dev/LICENSE)

## 3. Invidious

### Cómo extrae y entrega

Invidious no depende de NewPipeExtractor en las rutas revisadas. Su backend Crystal procesa respuestas de YouTube/InnerTube y expone `GET /api/v1/videos/:id`. La respuesta JSON ya contiene los campos que necesita un cliente independiente de la marca: `title`, `videoId`, `videoThumbnails`, `author`, `authorId`, `authorThumbnails`, `lengthSeconds`, descripciones, subtítulos y recomendaciones.

La misma respuesta expone `formatStreams`, `adaptiveFormats`, `hlsUrl` y `dashUrl`. Con `local=true`, Invidious construye URLs de entrega a través de su propio `/videoplayback` y adapta las URLs del manifiesto DASH/HLS para el proxy de esa instancia. Sin `local=true`, puede devolver URLs originales para que el cliente las reproduzca directamente.

El endpoint de playback no es un proxy abierto genérico: valida que el host esté bajo dominios de medios previstos, procesa Range, redirecciones y respuestas parciales. El player Video.js usa un elemento HTML `<video>`; no incrusta el iframe oficial. Su JS puede cambiar entre URLs directas y URLs proxificadas y, si hace falta, volver a cargar el recurso preservando currentTime, playbackRate y paused. Para DASH configura `reloadSourceOnError`.

### Qué conviene adoptar

- Invidious es la alternativa más útil como **API externa configurable** para metadatos y candidatos de reproducción.
- Su respuesta JSON permite convertir formatos a nuestro contrato `PlaybackCandidate` sin importar su frontend.
- `local=true` puede solucionar CORS y centralizar Range, siempre que la instancia permita esa función y se acepte la dependencia de su disponibilidad/ancho de banda.
- Su proxy de medios y su proxy de manifiestos son rutas de entrega del mismo vídeo alojado por YouTube, no una CDN independiente.

### Qué no resuelve automáticamente

El fallback de Invidious descrito en el player cambia entre entrega directa/proxy o vuelve a consultar el mismo backend. No mantiene, en el código revisado, un segundo extractor independiente con segmentos sincronizados listos para entrar. Además, depender de una instancia pública concreta implica disponibilidad, límites y confianza operativa que TodoTube no debe asumir silenciosamente.

**Licencia:** AGPL-3.0. Conviene consumir su API desde un adaptador de red y no copiar código del servidor sin revisión de licencia.

Fuentes de código:
- [Endpoint JSON de vídeo](https://github.com/iv-org/invidious/blob/master/src/invidious/routes/api/v1/videos.cr)
- [Serialización de metadatos y formatos](https://github.com/iv-org/invidious/blob/master/src/invidious/jsonify/api_v1/video_json.cr)
- [Extracción y parseo de respuestas](https://github.com/iv-org/invidious/blob/master/src/invidious/yt_backend/extractors.cr)
- [Proxy de playback y Range](https://github.com/iv-org/invidious/blob/master/src/invidious/routes/video_playback.cr)
- [Generación de manifiestos DASH/HLS](https://github.com/iv-org/invidious/blob/master/src/invidious/routes/api/manifest.cr)
- [Player Video.js y recuperación](https://github.com/iv-org/invidious/blob/master/assets/js/player.js)
- [Licencia](https://github.com/iv-org/invidious/blob/master/LICENSE)

## Decisión técnica para TodoTube

1. **Mantener un solo PlayerHost/Shaka de TodoTube.** La marca y los controles nunca dependen de qué proveedor resuelva el stream.
2. **Separar metadatos de candidatos de reproducción.** El título, creador, miniatura y duración se normalizan a nuestro modelo y se conservan aunque cambie el proveedor de streams.
3. **Tomar Materialious como patrón principal de integración web.** TodoTube ya utiliza Shaka, SABR y `youtubei.js`; la diferencia de versiones merece un spike aislado con build, TypeScript, Playwright y smoke real, no un salto de dependencias a ciegas.
4. **Diseñar Invidious como provider opcional/configurable.** No fijar una instancia pública ni darla por disponible; el adaptador solo se marca sano después de obtener metadatos, manifiesto/segmentos y probar seek.
5. **No priorizar ChruPipe/NewPipeExtractor como fallback principal hoy.** La versión de NewPipeExtractor es anterior a la de PR #35 y el intento de esa PR no pasó la prueba de extracción. Su contrato y recuperación HLS/progresivo sirven como referencia, no como prueba de que el extractor es más fiable.
6. **Implementar la precarga de respaldo en TodoTube, no copiar una función que los tres no demuestran.** La primera fase debe resolver en paralelo un segundo candidato del mismo `videoId`; la fase de warm-standby debe descargar solo un buffer corto de segmentos de audio y vídeo, verificar timeline/codec/identidad y mantenerlos en un ring buffer limitado. No descargar el vídeo completo ni asumir que dos URLs tienen segmentos intercambiables.
7. **Conmutación transaccional.** Capturar timestamp, estado play/pause, volumen y velocidad; validar que el proveedor alternativo representa el mismo vídeo/timeline; cambiar dentro del mismo player y reanudar. Si no se valida, mantener la fuente actual o mostrar un error de TodoTube.
8. **No mostrar la marca ni enlaces externos de la plataforma en la UI del player.** Mantener los metadatos identificativos del vídeo; retirar botones de “abrir vídeo original” y superficies equivalentes. Los nombres de proveedores se quedan en diagnósticos internos, no en controles visibles.
9. **Separar la redundancia de extracción de la independencia de origen.** Estos tres proyectos, igual que TodoTube, siguen obteniendo el medio final de YouTube. Dos extractores no crean por sí solos una CDN independiente.


## Evidencia nueva de producción: 2026-11-09

El smoke real de GitHub Actions (run [42560039714](https://github.com/Papeloncon-Code/AlternativaY/actions/runs/42560039714), artefacto [de reproducción](https://github.com/Papeloncon-Code/AlternativaY/actions/runs/42560039714/artifacts/13649460430)) probó el vídeo público de control y no llegó a decodificar sus metadatos: `readyState=0`, ancho/alto cero y duración nula. El paso que espera metadatos de vídeo falló antes de poder verificar reproducción, seek o continuidad.

El log capturó dos respuestas en `/youtubei/v1/player`:
- HTTP 400 con HTML de Google que dice que la red o el equipo podrían estar generando consultas automatizadas. Es un rechazo a nivel de Google; el texto no permite atribuirlo con certeza a un campo mal formado.
- HTTP 400 con JSON `FAILED_PRECONDITION` y mensaje `Precondition check failed.`. Es una respuesta diferente y no revela qué precondición falló.

**Límite de la evidencia:** PR #43 guardaba método, bytes, nombres de cabeceras y un fragmento de respuesta, pero no los valores de `context.client.clientName` y `clientVersion`. Por eso no se debe asignar todavía cada respuesta a MWEB, WEB o Android ni afirmar que una actualización de dependencia resolverá el problema.

TodoTube fija `youtubei.js@16.0.0`, mientras Materialious declara `youtubei.js ^18.3.0`, `googlevideo ^5.0.1` y Shaka 5.2.x. La diferencia justifica un spike controlado de compatibilidad, pero no demuestra que el salto de versiones corrija este rechazo. PR #46 añade un resumen seguro de la petición fallida —perfil y versión del cliente, presencia del video ID, llaves de playback context y Content-Type— sin almacenar valores de tokens, cookies, visitor IDs, URL firmada ni cuerpo de solicitud. Se necesita aprobar y desplegar esa instrumentación para obtener un nuevo diagnóstico de producción.

## Estado y límites de la investigación

La inspección fue de las rutas de extracción, endpoints, player y proxy citadas arriba; no es una auditoría formal de todos los archivos, pruebas, instancias desplegadas ni condiciones de servicio. Una ruta que compila o aparece en el README no demuestra que YouTube entregue actualmente streams para todos los vídeos. El smoke real de TodoTube sigue pendiente de resolver el HTTP 400 de `/youtubei/v1/player` documentado en PR #43.
