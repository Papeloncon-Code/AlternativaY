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

**Adaptación aplicada:** TodoTube clasifica errores de resolución antes de decidir si continúa por la cadena de clientes. Los fallos transitorios (timeout, red y 5xx) siguen siendo recuperables. Un 400/401/403/429, `FAILED_PRECONDITION` o una respuesta explícita de login, edad, región o verificación deja de provocar un cambio automático a otra identidad de cliente. La instrumentación conserva el estado HTTP para que un rechazo no se convierta en un error genérico.

**Lo que no se adapta:** no se añade una rotación de IP, un extractor/proxy para esquivar un bloqueo ni un bypass de BotGuard/PoToken. La política del broker del repositorio exige tratar 401/403 como denegación, no como una invitación a probar otra identidad.

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
