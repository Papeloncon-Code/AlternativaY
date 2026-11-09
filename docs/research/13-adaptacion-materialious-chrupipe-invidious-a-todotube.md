# Adaptación de Materialious, ChruPipe e Invidious a los fallos actuales de TodoTube

**Fecha:** 2026-11-09  
**Alcance:** exclusivamente Materialious, ChruPipe e Invidious.  
**Objetivo:** convertir la comparación de código en cambios concretos para el reproductor de TodoTube, sin copiar código con licencias incompatibles, introducir un iframe ni sortear restricciones de acceso.

## Resumen ejecutivo

La comparación deja tres conclusiones diferentes:

1. **Materialious aporta el patrón de resiliencia más útil para el runtime actual:** watchdog de estancamiento, recuperación limitada, renovación de sesión cuando el protocolo lo admite y reconstrucción del flujo conservando el tiempo.
2. **ChruPipe aporta un buen patrón de selección HLS/progresivo y de separación entre streams muxed, vídeo-only y audio-only.** Sin embargo, usa NewPipeExtractor 0.26.4; TodoTube ya probó NewPipeExtractor 0.27.0 en PR #35 y la extracción del vídeo de prueba falló con `LOGIN_REQUIRED`. No es un extractor alternativo independiente.
3. **Invidious sí tiene una implementación de extracción distinta, escrita en Crystal, y un contrato JSON de vídeo/formats.** Es útil como posible provider configurable; no constituye una CDN distinta y no garantiza que una instancia responda cuando YouTube rechaza las peticiones.

No se encontró en ninguno de los tres un segundo origen independiente con segmentos de audio y vídeo precargados, sincronizados y listos para tomar el control. No debemos llamar *warm standby* a tener varias URLs, perfiles o manifiestos del mismo proveedor.

## Problemas de TodoTube y lo que hace cada proyecto

### 1. Rechazo de la petición de resolución de vídeo (HTTP 400)

**TodoTube hoy:** el smoke de producción del 2026-11-09 vio dos respuestas diferentes en `/youtubei/v1/player`: una página HTML de Google con aviso de consultas automatizadas y un JSON `400 FAILED_PRECONDITION`. La ejecución se hizo desde la red/IP del runner de GitHub Actions; no demuestra que todas las conexiones de usuario reciban el mismo rechazo. La causa del `FAILED_PRECONDITION` aún no está identificada por campo.

**Materialious:** separa su engine Invidious de su engine youtubei.js. La selección puede ser explícita y el fallback Invidious → YT.js está sujeto a configuración y a la comprobación `isUnrestrictedPlatform()`. Esto evita asumir que todo entorno puede usar todas las rutas. Esa separación es reutilizable; no demuestra que YT.js resuelva un bloqueo general de Google.

**ChruPipe:** resuelve mediante `TeamNewPipe:NewPipeExtractor 0.26.4`. No trae otro extractor independiente. En TodoTube, PR #35 usó NewPipeExtractor 0.27.0 y el smoke real devolvió `SignInConfirmNotBotException / LOGIN_REQUIRED`. Añadir ChruPipe no sustituye esa dependencia ni aporta evidencia de que el mismo vídeo vaya a resolver.

**Invidious:** su servidor Crystal construye `/api/v1/videos/:id` y serializa metadatos, `formatStreams`, `adaptiveFormats`, `hlsUrl` y `dashUrl`. Es una segunda implementación de extracción, pero las respuestas y medios siguen dependiendo de YouTube/InnerTube. Su API puede devolver errores; no crea una fuente de vídeo independiente.

**Adaptación aplicada:** TodoTube clasifica errores de resolución antes de decidir si continúa por la cadena de clientes. Los fallos transitorios (timeout, red y 5xx) siguen siendo recuperables. Un HTTP 400 detiene la rotación a otra identidad de cliente. Si `FAILED_PRECONDITION` aparece solo como texto genérico en la respuesta Onesie, se permite un único fallback al endpoint InnerTube estándar del mismo perfil WEB; si también devuelve 400, termina la cadena. Un 401/403/407/429 o una razón explícita de login, edad, región, consentimiento, anti-bot o tráfico automatizado detiene todas las rutas YouTube. La instrumentación conserva el estado HTTP para clasificar el rechazo sin inventar su causa.

**Lo que no se adapta:** no se añade una rotación de IP, un extractor/proxy para esquivar un bloqueo ni un bypass de BotGuard/PoToken. La política del broker exige tratar 401/403 como denegación, no como una invitación a probar otra identidad. Un `FAILED_PRECONDITION` sin explicación sigue siendo indeterminado: solo permite probar el endpoint estándar con la misma identidad, no cambiar de cliente ni salir por otro backend.

### 2. Reproducción que se congela o deja de recibir segmentos

**Materialious:** su player inspeccionado mantiene un watchdog cada segundo, detecta cuándo `currentTime` deja de avanzar, ignora pausas, seeks, pestañas ocultas y desconexión, y usa un umbral de 12 segundos para un estancamiento normal. Limita los intentos de recuperación. Su ruta SABR tiene además una recuperación especializada de attestation/PoToken cuando el estado de protección del stream lo solicita.

**ChruPipe:** su Watch usa HLS.js con una recuperación de red y una recuperación de errores de media. Si HLS agota esas recuperaciones, pasa a un stream progresivo y conserva el `currentTime` al cambiar de fuente.

**Invidious:** el player Video.js puede cambiar de URL directa a URL local/proxificada. Ante errores de red o de formato, puede recargar el recurso después de una espera y restaurar `currentTime`, `playbackRate` y estado de pausa. Para DASH configura `reloadSourceOnError`.

**TodoTube hoy:** el runtime reacciona al evento de error de Shaka y tiene candidatos de transporte/fallback, pero no tenía un watchdog propio que detectara un vídeo congelado sin error explícito.

**Adaptación aplicada:** watchdog de 1 segundo con umbral de 2 segundos sin avance y sin buffer cercano, porque el criterio de la incidencia #27 de TodoTube es más estricto que los 12 segundos del watchdog general de Materialious. No dispara recuperación si el usuario pausó, está buscando, el vídeo terminó, la pestaña no está visible o el navegador está offline. Cuando dispara, llama al failover que ya existe, captura el timestamp actual y mantiene play/pause. No crea un segundo reproductor ni reproduce audio duplicado.

**Límite deliberado:** el watchdog no re-minta tokens ni cambia de perfil para responder a una denegación de acceso. La recuperación SABR específica de attestation requiere revisión separada de protocolo/política y no se debe copiar automáticamente por ser usada por otro reproductor.

### 3. Formatos y sincronización de audio/vídeo

**ChruPipe:** expresa por separado streams muxed, vídeo-only y audio-only. Para fallback progresivo selecciona preferentemente un vídeo que también contenga audio; si selecciona vídeo-only, empareja un stream de audio disponible. Evita tratar un vídeo-only como archivo completo.

**Invidious:** expone formatos muxed y adaptativos en el JSON. Los formatos adaptativos incluyen metadatos como MIME, itag, codecs, resolución, bitrate, rangos de inicialización/índice y datos de audio.

**Materialious:** utiliza Shaka y su integración SABR para representar audio/vídeo adaptativos, en lugar de reducir todas las respuestas a una URL MP4.

**Adaptación a TodoTube:** el runtime ya construye DASH desde los formatos adaptativos, y usa URLs progresivas muxed como último recurso. Se conserva ese orden. No se debe añadir un fallback que seleccione vídeo-only sin audio o mezcle dos timelines. La siguiente ampliación debe normalizar codecs, identidad de representación y alineación de segmentos antes de emparejar fuentes.

### 4. Proxy, CORS y Range

**ChruPipe:** su proxy Ktor reenvía `Range` y `Content-Range`; permite seek, pero acepta hosts públicos HTTP(S) en general y exige una revisión seria de SSRF, redirecciones y DNS antes de copiarlo.

**Invidious:** su ruta `local=true` entrega streams a través de la propia instancia, restringe el host de medios a dominios conocidos, procesa redirecciones y Range, y puede fragmentar lecturas grandes. Es una ruta de proxy del medio que sigue alojado en YouTube; no una CDN independiente.

**Materialious:** implementa una capa proxy de peticiones de control/cross-origin, mientras Shaka consume los segmentos de medios.

**Adaptación a TodoTube:** mantener Bridge para las peticiones de control que lo necesitan. Mantener el Media Gateway/R2 con Range únicamente para archivos propios/licenciados. No introducir un proxy abierto en el Worker ni convertir R2 en retransmisor de streams de YouTube.

### 5. Metadatos y marca del reproductor

Materialious separa la ficha del vídeo de la resolución que alimenta el player; Invidious ofrece un JSON con título, autor, duración, miniaturas, descripciones y formatos. ChruPipe también devuelve un modelo de metadatos separado de las listas de streams.

TodoTube ya conserva metadatos fuera del runtime y utiliza una única superficie visual. PR #45 adapta Watch, mini-player y Shorts a controles TodoTube sin iframe ni enlaces externos; esa dirección debe mantenerse. El player de ChruPipe usa `<video controls>` nativo y no es un patrón que convenga copiar para la experiencia de marca propia.

### 6. Precarga de una segunda fuente (warm standby)

Ninguno de los tres proyectos revisados demuestra tener un segundo proveedor independiente con segmentos sincronizados ya descargados y listos para conmutar. Los cambios entre HLS/progresivo, directo/proxy, perfiles o extractores no equivalen a una segunda CDN.

La arquitectura adecuada para TodoTube es:

1. Resolver por adelantado un segundo candidato, solo cuando sea un provider autorizado y distinto.
2. Comprobar que es el mismo asset y timeline; el título/miniatura no bastan.
3. Solo entonces evaluar un ring buffer limitado de segmentos de audio y vídeo, con alineación temporal, codecs compatibles y vencimiento de URLs controlado.
4. Conmutar dentro del mismo player y conservar posición/estado.
5. Si no se puede demostrar identidad/alineación o permiso, no precargar ni conmutar.

Como el propietario no tiene un catálogo propio/licenciado que sirva actualmente como segunda copia de los vídeos de YouTube, no hay un warm standby universal disponible hoy. No se debe inventar un fallback a un vídeo parecido ni descargar el vídeo completo.

## Matriz de decisión

| Patrón observado | ¿Adaptar? | Decisión de TodoTube |
|---|---|---|
| Materialious: watchdog de estancamiento | Sí | Patrón adaptado: 2 s sin progreso (exigencia de TodoTube), control de visibilidad/red, recuperación por el broker |
| Materialious: selección/fallback entre motores | Parcial | Contrato de provider separado; no activar un motor alternativo para sortear una denegación |
| Materialious: refresh de attestation/PoToken | No automáticamente | Requiere revisión separada; el cambio actual no genera tokens adicionales |
| ChruPipe: HLS con recuperación y fallback progresivo | Ya cubierto parcialmente | Conservar candidatos HLS/directo, posición y reintentos internos de Shaka |
| ChruPipe: modelo muxed/audio-only/video-only | Sí | Adoptar como regla de validación para cualquier futuro adaptador; no seleccionar vídeo-only sin audio |
| ChruPipe: proxy Range genérico | No | Riesgo de SSRF; Gateway solo para medios autorizados |
| Invidious: JSON de vídeo/formats | Sí, como contrato futuro | Definir adaptador configurable solo con instancia aprobada; no fijar instancias públicas |
| Invidious: proxy `local=true` | No para YouTube en TodoTube ahora | No retransmitir medios de YouTube por Worker/R2; Range existente se reserva para assets autorizados |
| Cualquier alternativa: segundo buffer independiente listo | No encontrado | Diseñar en TodoTube cuando exista un segundo origen autorizado y verificable |

## Secuencia de implementación recomendada

### Fase A — recuperación segura (esta rama)

- Preservar status y cuerpo acotado de errores HTTP del endpoint player.
- No saltar a otro perfil ante una denegación/rechazo explícito.
- Añadir watchdog para detectar congelamientos sin evento de error.
- Reutilizar `switchToNextSource()` y el mismo Shaka/video element; mantener tiempo y estado.
- Añadir pruebas de política de errores y watchdog.

### Fase B — provider configurable Invidious (no activado)

Solo después de aprobación explícita de una instancia administrada/permitida y de revisar su modelo de acceso, disponibilidad, licencia y términos. El adaptador debe:
- estar desactivado por defecto;
- recibir una base URL de configuración, no una lista fija de instancias públicas;
- normalizar metadatos y formatos al contrato de TodoTube;
- validar MIME/codecs y distinguir muxed de audio/video separados;
- respetar 401/403/429 y errores de restricción sin intentar otra identidad;
- declarar que es otro resolver del mismo origen YouTube, no una CDN independiente.

### Fase C — warm standby real

No iniciar hasta que haya un segundo origen del mismo asset autorizado. Requiere fingerprint/timeline, alineación de segmentos, límites de RAM/buffer, expiración de URLs y medición de tiempo de conmutación.

## Correspondencia con las incidencias abiertas de TodoTube

| Incidencia | Problema real | Qué aporta la comparación | Decisión |
|---|---|---|---|
| [#35](https://github.com/Papeloncon-Code/AlternativaY/issues/35) | NewPipeExtractor devolvió `LOGIN_REQUIRED` en el smoke real | ChruPipe también usa NewPipeExtractor (0.26.4, incluso anterior al 0.27.0 probado por TodoTube); Materialious usa youtubei.js/Invidious; Invidious tiene su extractor Crystal propio | No añadir ChruPipe como extractor alternativo. Invidious es un resolver genuinamente distinto que puede estudiarse detrás de un provider configurable, pero no se activa hasta elegir una instancia/operación aprobada y probarla |
| [#27](https://github.com/Papeloncon-Code/AlternativaY/issues/27) | Failover del mismo asset, misma timeline y posición; evitar una fuente diferente | Los tres proyectos cambian transporte/URL o extractor, pero ninguno demuestra un segundo origen independiente con segmentos ya sincronizados en buffer | Aplicar recuperación de ruta y posición ahora; mantener warm standby como fase posterior, solo con segunda fuente autorizada del mismo asset |
| [#36](https://github.com/Papeloncon-Code/AlternativaY/issues/36) | La biblioteca debe mostrar el número real de orígenes R2 configurados y saludables | Los tres son reproductores/extractores/proxies de YouTube; no administran la replicación R2 del Gateway de TodoTube | No adaptar código de ellos. Resolverlo en el contrato/health del Media Gateway y su UI, sin confundir extractor con réplica |
| [#38](https://github.com/Papeloncon-Code/AlternativaY/issues/38) | El E2E debe esperar a que el secreto de prueba del Worker esté activo antes de hacer setup | Ninguno de los tres aborda la propagación de secretos de Cloudflare/GitHub Actions | No es un problema de reproducción. Mantener el readiness probe autenticado del workflow |
| [#9](https://github.com/Papeloncon-Code/AlternativaY/issues/9) | Paridad funcional/visual sin controles falsos ni iframe | Materialious e Invidious montan sus propios controles; ChruPipe deja controles nativos del elemento de vídeo | Conservar PlayerHost/Shaka y controles TodoTube; usar los otros proyectos como referencia de recuperación/modelos, no copiar su superficie visual ni mostrar controles nativos |
| [#3](https://github.com/Papeloncon-Code/AlternativaY/issues/3) | Gateway para contenido propio/licenciado, con Range/seek y seguridad | Invidious y ChruPipe hacen proxy de streams del origen YouTube en sus propios servicios | No convertir el Gateway de TodoTube en proxy de YouTube. Mantenerlo cerrado a archivos propios/licenciados, con Range y health independientes |

Esta separación evita que una mejora de extracción se contabilice como redundancia de almacenamiento, que un proxy de terceros se trate como autorización de distribución, o que un problema de CI se intente corregir desde el reproductor.

## Licencias y reutilización

- Materialious: AGPL-3.0.
- ChruPipe: GPL-3.0; su README identifica NewPipeExtractor como GPL-3.0.
- Invidious: AGPL-3.0.

Esta adaptación toma patrones de arquitectura y comportamiento, no copia código fuente de esos proyectos. Cualquier reutilización literal o enlace de bibliotecas debe pasar revisión de licencias.

## Validación

La aceptación de esta fase exige:
- Build y TypeScript.
- Playwright: la política permite recuperación en timeout/5xx, pero no cambia de perfil ante 400/401/403/429 o restricciones explícitas.
- Playwright: watchdog recupera únicamente tras 2 segundos sin progreso y sin buffer; no se dispara por pausa, seek, pestaña oculta, offline o buffer suficiente.
- En navegador real, comprobar que una interrupción transitoria conserva posición y que una denegación no produce intentos con otros perfiles.
- Mantener como pendiente separado la reproducción real en producción: el smoke de GitHub Actions no prueba el comportamiento desde la red doméstica del usuario.

## Hallazgo adicional: el fallback local de Materialious sí aborda un caso de bloqueo, pero depende de la plataforma

La lectura del selector real de Materialious precisa la pista inicial:

- `getVideo()` puede elegir `getVideoYTjs()` en lugar de `getVideoInvidious()` cuando el backend YouTube está seleccionado, cuando `useEngineFallback('Video')` está activo o cuando la preferencia fuerza YT.js en una plataforma no restringida.
- Materialious define `isUnrestrictedPlatform()` como full web backend propio o plataforma nativa. Su `docs/DEV.md` separa SPA estática, web con Node backend, Desktop/Electron y Android. La SPA web estática común no recibe automáticamente el mismo fallback local.
- En [Materialious #869](https://github.com/Materialious/Materialious/issues/869), un usuario no podía reproducir desde el cliente web. El mantenedor respondió que Google estaba bloqueando Invidious y recomendó utilizar el fallback local en Android/Desktop. Es evidencia de que el segundo motor solucionó ese caso en esos entornos nativos; no demuestra éxito en una SPA estática.
- TodoTube ya realiza extracción desde el navegador mediante `youtubei.js`; por tanto, incorporar otro botón o alias `youtubei.js` no crea un segundo motor. La diferencia a investigar es el entorno local de ejecución y la compatibilidad de versiones, no una segunda URL de YouTube.
- Un full backend propio tendría un contexto de red distinto. No se desplegará para mover solicitudes a otra IP ni para superar BotGuard/PoToken, anti-bot, geo/IP o restricciones de acceso. Solo podría estudiarse si el fallo se identifica como incompatibilidad técnica no restrictiva y supera revisión separada y E4.

### Consecuencia para la arquitectura de TodoTube

1. Mantener el PlayerHost/Shaka y el contrato de candidatos; el motor alternativo nunca crea otro reproductor visible.
2. Probar primero la actualización controlada de la biblioteca de extracción sobre el runtime de navegador ya existente, comparando el mismo vídeo y entorno con el baseline. El snapshot consultado de `materialious/package.json` declara `youtubei.js ^17.0.1`, `googlevideo ^4.0.4` y `shaka-player ^4.16.14`; TodoTube usa `youtubei.js ^16.0.0`, `googlevideo ^4.0.4` y `shaka-player ^4.16.4`. Esto identifica una diferencia verificable, no una causa demostrada del HTTP 400.
3. No actualizar dependencias ni infraestructura sin regenerar lockfile, build/TypeScript, Playwright, Bridge y E4 real. Las versiones de otra app son un baseline de compatibilidad, no una garantía.
4. Mantener Invidious como provider experimental solo para contenido/rutas que no hayan sido denegados por políticas de acceso. Ante texto anti-bot, `FAILED_PRECONDITION` restrictivo, PoToken/BotGuard, región o IP, no cambiar a Invidious para obtener el mismo medio.
5. No declarar independencia de origen: Invidious y el runtime local siguen resolviendo el contenido desde el origen YouTube.

Fuentes adicionales: [selector `getVideo()` de Materialious](https://raw.githubusercontent.com/Materialious/Materialious/main/materialious/src/lib/api/index.ts), [DEV.md — configuraciones de app y runtime](https://github.com/Materialious/Materialious/blob/main/docs/DEV.md), [Materialious issue #869](https://github.com/Materialious/Materialious/issues/869).

## Criterio final de cierre

La comparación queda como investigación, no como prueba de éxito. Solo E4 —imagen real, sonido audible y sincronizado, avance, seek de ida/vuelta, controles TodoTube y recuperación segura dentro del despliegue objetivo— permite cerrar playback. Build, Playwright con fixtures, metadatos, manifests o URLs se reportan como niveles intermedios. La ejecución y el formato de evidencia están definidos en `docs/testing/real-playback-release-gate.md`.
## Hallazgo SABR más importante: Materialious usa player WEB normal y prepara attestation

La inspección del código actual de Materialious (`materialious/src/lib/player/sabr/index.ts`, `materialious/src/lib/player/sabr/ShakaPlayerAdapter.ts` y `materialious/src/lib/api/youtubejs/video.ts`) encontró un conjunto de pasos ausentes o incompletos en TodoTube:

1. **Resolución para SABR:** Materialious obtiene la respuesta mediante el endpoint WEB normal `/player` (`watchEndpoint.call(innertube.actions)` / `YT.VideoInfo`) antes de construir el manifiesto SABR. No da por hecho que cualquier respuesta Onesie que exponga una cadena `video_playback_ustreamer_config` ya tenga los contextos SABR correctos.
2. **Preparación de attestation:** antes de montar `SabrStreamingAdapter`, Materialious invoca `innertube.getAttestationChallenge('ENGAGEMENT_TYPE_UNBOUND')` en la misma sesión de YouTube.js. Su comentario advierte que, sin ese paso, el servidor puede dejar de enviar partes de medios y la reproducción solo avanzar tras un seek.
3. **Protección del stream:** escucha `StreamProtectionStatus`; cuando el estado es `3`, vuelve a preparar attestation y obtiene un WebPO token nuevo con el minter local existente, con deduplicación y cooldown. TodoTube ya tenía el parser UMP y el callback para pedir tokens, pero no conectaba el estado 3 con una renovación de sesión.
4. **Renovación de player response:** el callback SABR de Materialious utiliza `/player` normal con `reloadPlaybackContext` para actualizar URL y configuración UStreamer, en vez de depender exclusivamente de Onesie.
5. **Compatibilidad de Onesie:** Invidious PR #5814, todavía draft, también documenta que un `ustreamerConfig` devuelto por Onesie puede no habilitar los contextos SABR/context-update que el servidor necesita; su autor prueba usar el player WEB normal para obtener la configuración completa. Este PR no se copia ni se considera producción-ready.

### Adaptación aplicada a TodoTube en esta rama

- Se añadió `sabrAttestation.ts`: llama al API público `getAttestationChallenge('ENGAGEMENT_TYPE_UNBOUND')` de la versión fijada de YouTube.js (confirmado también en el tag `v16.0.0`), con 3 intentos limitados y sin cambiar de identidad; un rechazo HTTP explícito no se reintenta.
- `ShakaPlayerAdapter` ahora propaga el estado UMP `StreamProtectionStatus` a un callback asíncrono del runtime.
- `YouTubeSabrRuntime` prepara attestation antes de conectar SABR y, ante estado 3, vuelve a preparar attestation y renueva el WebPO mediante el `BotguardService` local ya existente. El refresh se deduplica y tiene cooldown de 15 segundos.
- La renovación del minter conserva la sesión y cliente WEB/MWEB actuales. No se añade un helper externo, jsdom con origen falso, proxy, cambio de IP, cliente alternativo ni mecanismo para evitar BotGuard/PoToken.
- Se quitó `ustreamerFlags.sendVideoPlaybackConfig = false` del request Onesie. El descriptor público de `googlevideo` lo define como bandera opcional para enviar la configuración de playback; mantenerla en `false` podía suprimir información útil para SABR. Se deja sin especificar para que se aplique el comportamiento por defecto. Es una hipótesis que se debe comprobar en navegador real, no una causa probada.
- Se añadieron pruebas para comprobar que el desafío de attestation se repite solo ante fallos transitorios, que una denegación HTTP explícita no se reintenta, que el estado 3 solicita refresh y que Onesie no codifica la bandera de configuración en `false`.

### Lo que todavía no está demostrado

- No se ha obtenido una sesión SABR real desde la red del usuario que confirme que el servidor devuelve `SABR_CONTEXT_UPDATE`, segmentos continuos y seek correcto.
- La prueba de GitHub Actions que recibió HTTP 400 salió desde la IP/red del runner; no identifica la causa del rechazo en el entorno del propietario.
- El HTTP 400 de `/youtubei/v1/player` sigue pendiente de diagnóstico y no debe confundirse con este cambio de protocolo SABR.
- La única aceptación final sigue siendo E4: vídeo real con imagen y sonido audible/sincronizado, avance, seek de ida/vuelta, controles TodoTube y recuperación del mismo asset/timeline en el despliegue objetivo.

Fuentes de código: [Materialious SABR initializer](https://github.com/Materialious/Materialious/blob/main/materialious/src/lib/player/sabr/index.ts), [Materialious Shaka adapter](https://github.com/Materialious/Materialious/blob/main/materialious/src/lib/player/sabr/ShakaPlayerAdapter.ts), [Materialious WEB player request](https://github.com/Materialious/Materialious/blob/main/materialious/src/lib/api/youtubejs/video.ts), [YouTube.js `getAttestationChallenge`](https://github.com/LuanRT/YouTube.js/blob/v16.0.0/src/Innertube.ts), [googlevideo UstreamerFlags](https://github.com/LuanRT/googlevideo/blob/main/docs/api/exports/protos/interfaces/UstreamerFlags.md), [Invidious SABR PR #5814](https://github.com/iv-org/invidious/pull/5814).
## Seguimiento tras el primer despliegue E4 (2026-11-09)

El primer smoke de Chromium contra `https://todotube.papelon.workers.dev/ver/dQw4w9WgXcQ`, tras fusionar PR #47, abrió la página TodoTube y el Bridge quedó disponible, pero no obtuvo metadata decodificada: `readyState=0`, dimensiones 0 y duración nula. La solicitud `/youtubei/v1/player` del cliente `ANDROID` respondió HTTP 400 `FAILED_PRECONDITION: Precondition check failed`; la interfaz mostró el error propio de TodoTube y no creó iframe. Por tanto, no hubo reproducción E4.

La respuesta HTTP 400 observada corresponde al intento Android final; por sí sola no demuestra bloqueo de la IP del usuario ni explica por qué los perfiles previos no generaron candidatos. El smoke anterior solo imprimía `console.error`, por lo que el siguiente intento ampliará las advertencias runtime de forma redactada para ver la secuencia de cada cliente/transporte.

### Nueva hipótesis corregida: usar el player WEB normal para SABR

Materialious obtiene el `VideoInfo` WEB normal antes de montar `SabrStreamingAdapter`. El draft SABR de Invidious explica que una respuesta Onesie puede contener un `ustreamerConfig` que no habilita los contextos que el servidor envía después mediante `SABR_CONTEXT_UPDATE`; la ruta WEB normal devuelve la configuración completa. TodoTube había usado Onesie como respuesta primaria de WEB y solo caía a `/player` normal cuando Onesie fallaba en red, no cuando devolvía HTTP 200 pero configuración SABR incompleta.

La rama `fix/youtube-web-playerresponse-sabr-2026-11-09` elimina Onesie como fuente de `playerResponse` para el runtime SABR y utiliza el endpoint `/player` de YouTube.js en la misma sesión WEB/MWEB a través del Browser Bridge. No cambia IP, identidad de cliente ni proxy y no intenta superar una denegación explícita. Esta hipótesis necesita CI y otro smoke E4 real; no se considera solución hasta que el vídeo reproduzca imagen/sonido y seek.