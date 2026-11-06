# 03 · Comparativa funcional, código y problemas recurrentes

Consulta: 2026-11-06.

## 1. Matriz de evidencia en código (Android)

Número de ficheros `.kt`/`.java`/`.xml` (sin `values-*`) que contienen palabras clave de cada funcionalidad [V-código].
- **0** = no hay evidencia en el código de la app.
- **Número alto** no significa que funcione mejor.
- En Grayjay muchas funciones viven en plugins JS externos, no en esta cuenta.

| Funcionalidad | NewPipe | PipePipe | LibreTube | Grayjay | SkyTube | YTDLnis | SmartTube | Flow | Tubular |
|---|---|---|---|---|---|---|---|---|---|
| PiP nativo | 0 | 0 | 3 | 2 | 0 | 0 | 1 | 1 | 0 |
| Cast (Chromecast/DLNA/FCast) | 0 | 0 | 0 | 10* | 1 | 0 | 4 | 18 | 0 |
| SponsorBlock | 0 | 35 | 34 | 0 (plugin) | 21 | 16 | 12 | 81 | 26 |
| DeArrow | 0 | 25 | 20 | 0 | 0 | 0 | 12 | 26 | 0 |
| RYD | 0 | 0 | 1 | 0 | 2 | 0 | 0 | 7 | 9 |
| Descargas | 16 | 22 | 10 | 12 | 15 | 3** | 14 | 37 | 16 |
| Cola (`PlayQueue`) | 60 | 81 | 0 | 0 | 0 | 0 | 0 | 0 | 60 |
| Capítulos | 4 | 2 | 25 | 22 | 0 | 28 | 18 | 56 | 2 |
| Velocidad | 12 | 21 | 9 | 6 | 4 | 1 | 40 | 57 | 13 |
| Temporizador de apagado | 0 | 12 | 9 | 0 | 0 | 0 | 8 | 44 | 0 |
| Ecualizador | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 53 | 0 |
| Normalización/volumen | 7 | 20 | 6 | 9 | 1 | 3 | 14 | 168 | 5 |
| Importar/exportar | 18 | 14 | 8 | 6 | 6 | 0 | 0 | 17 | 16 |
| Sincronización | 0 | 2 | 18 | 5 | 0 | 0 | 0 | 42 | 0 |
| PeerTube | 18 | 9 | 0 | 13 | 0 | 0 | 0 | 0 | 15 |
| SoundCloud | 18 | 11 | 0 | 2 | 0 | 5 | 0 | 1 | 16 |
| BiliBili / NicoNico | 0/0 | 29/20 | 0/0 | 2/0 | 0 | 2/0 | 0 | 0 | 0 |
| Android TV (leanback) | 2 | 2 | 1 | 0 | 2 | 0 | 440 | 4 | 2 |
| PoToken/BotGuard | 6 | 14 | 6 | 6 | — | 18 | 9 | 51 | 6 |
| SABR | 0 | 47 | 12 | 29 | 0 | 0 | 84 | 65 | 0 |

\* Grayjay: búsqueda específica `fcast|airplay|chromecast`. ** YTDLnis descarga mediante yt-dlp, no con un `DownloadManager` propio.

## 2. Matriz funcional consolidada (código + documentación)

✅ verificado · 🟡 parcial o limitado · ❌ ausente · ? no verificado

| Funcionalidad | NewPipe | PipePipe | LibreTube | Grayjay | FreeTube | Invidious | SkyTube | SmartTube | Flow | ReVanced |
|---|---|---|---|---|---|---|---|---|---|---|
| Sin anuncios | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Segundo plano | ✅ | ✅ | ✅ | ✅ | n/a | 🟡 | ? | n/a | ✅ | ✅ |
| PiP nativo | ❌ (popup propio) | ❌ (popup) | ✅ | ✅ | ✅ (mini player) | n/a | ❌ | n/a | ✅ | ✅ |
| Descargas | ✅ | ✅ | ✅ | ✅ | ? | 🟡 | ✅ | ? | ✅ | ❌ |
| 4K+/HDR | ? | ✅ AV1/VP9 | ? | ? | ? | ? | ? | ✅ 8K/HDR | 🟡 (doc: hasta 1080p) | ✅ |
| Subtítulos personalizables | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | ✅ | ✅ |
| SponsorBlock | ❌ | ✅ | ✅ | ? (plugin) | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Cast | ❌ | ❌ | ❌ | ✅ (3 protocolos) | ❌ | ❌ | 🟡 (build extra) | n/a | ✅ | ✅ |
| Cuentas/login | ❌ | 🟡 | 🟡 (Piped) | 🟡 (por plugin) | ❌ | 🟡 (instancia) | ❌ | ✅ (Google) | ? | ✅ (Google) |
| Sincronización entre dispositivos | ❌ | ❌ | 🟡 (Piped) | 🟡 (inestable) | ❌ | 🟡 (servidor) | ❌ | 🟡 (Google) | ? | ✅ (Google) |
| Grupos/perfiles de suscripciones | 🟡 | 🟡 | ✅ | ? | ✅ | ❌ | ❌ | ❌ | ? | ❌ |
| Filtros y bloqueo de contenido | ❌ | ✅ | 🟡 | ? | ✅ (sin distracciones) | ❌ | ✅ (avanzado) | ? | ? | 🟡 |
| Recomendaciones | ❌ | ❌ | ❌ | 🟡 | ❌ | ❌ | ❌ | ✅ (YouTube) | ✅ (local, FlowNeuro) | ✅ (YouTube) |
| Multiplataforma de contenido | 🟡 (5 servicios) | ✅ (+BiliBili, Nico) | ❌ | ✅ (10+ plugins) | ❌ | ❌ | ❌ | ❌ | 🟡 (+YT Music) | ❌ |
| Medios locales | ❌ | ❌ | ❌ | ? | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Podcasts/RSS | ❌ | ❌ | ❌ | ? | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| IA (resúmenes, transcripción) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Web + Android | ❌ | ❌ | ❌ | 🟡 (escritorio, no web) | ❌ | 🟡 (solo web) | ❌ | ❌ | 🟡 (escritorio beta) | ❌ |

## 3. Análisis de código y arquitectura: patrones observados

| Patrón | Quién lo usa | Ventaja | Desventaja |
|---|---|---|---|
| **Extractor embebido** (librería en la app) | NewPipe, PipePipe, Flow, SkyTube, Tubular, LibreTube (modo local) | Sin servidor y con privacidad | Hay que publicar una versión de la app por cada cambio de YouTube |
| **Frontend + backend de instancia** | Piped, Invidious, LibreTube (modo Piped) | Feed precalculado, cuentas | Las IP de servidor se bloquean; coste y mantenimiento de instancias |
| **Servicio companion aislado** | Invidious-companion | Aísla la pieza volátil | Sigue siendo un servidor que YouTube puede bloquear |
| **Plugins JS en sandbox con permisos** | Grayjay | Actualización de fuentes sin publicar la app; multiplataforma; permisos por dominio; firma | Coste de V8 y superficie de seguridad |
| **Parches sobre la app oficial** | ReVanced, Morphe | Interfaz y recomendaciones oficiales | Depende de Google; riesgo legal alto |
| **Web multiplataforma (Capacitor)** | Materialious | Una base de código para web, escritorio y Android | Rendimiento y PiP/BG limitados frente a lo nativo [I] |

Stacks Android en 2026 [V-código]:
- Lo **moderno** (Flow, Metrolist, LibreTube) es **Compose + Media3 + Room + Hilt/Dagger + corrutinas + kotlinx-serialization**.
- Lo **heredado** (NewPipe, PipePipe, SkyTube, Tubular) es **Views + ExoPlayer 2 + RxJava**.

## 4. Síntesis

### 4.1 Las mejores funcionalidades del ecosistema
1. **Plugins de fuentes actualizables, en sandbox y firmados** (Grayjay).
2. **Recomendación local sin servidor** (Flow, FlowNeuro).
3. **Cola de reproducción y reproductor flotante** (NewPipe).
4. **Filtros de contenido avanzados** (SkyTube, PipePipe) y **modo sin distracciones** (FreeTube).
5. **Perfiles y grupos de suscripciones** (FreeTube, LibreTube).
6. **Observación de fuentes con descarga automática y post-procesado** (YTDLnis).
7. **Cast con varios protocolos**, incluido uno abierto (Grayjay: FCast, Chromecast, AirPlay).
8. **Calidad de TV** (SmartTube: HDR/8K).

### 4.2 Funcionalidades que se repiten (ya son lo mínimo exigible)
Sin anuncios, segundo plano, descargas, SponsorBlock, DeArrow, RYD, importación de suscripciones, velocidad, capítulos e historial local.

### 4.3 Lo que nadie ha implementado bien
1. **Sincronización fiable entre dispositivos sin cuenta de Google.**
   - Ausente en NewPipe, PipePipe, SkyTube y FreeTube.
   - En LibreTube depende de Piped; en Grayjay hay incidencias.
2. **Producto web + Android coherente con los mismos datos.** Nadie lo ofrece completo.
3. **Biblioteca universal real** (vídeo de plataformas + podcasts + RSS + servidores personales + medios locales). Grayjay se acerca, pero no cubre podcasts ni Jellyfin [NV en plugins].
4. **Funciones de IA** (búsqueda por lo hablado, resúmenes, transcripción): **ninguna**.
5. **Accesibilidad**: no hay evidencia de trabajo sistemático en ningún proyecto [I].
6. **Resiliencia ante cambios de la plataforma**: todos se rompen; solo varía la velocidad de recuperación.

### 4.4 Problemas que se repiten
| Problema | Proyectos afectados | Evidencia |
|---|---|---|
| “Sign in to confirm you’re not a bot” y errores 403 | NewPipe, LibreTube, Grayjay, FreeTube, Invidious | [S]: issues #1231 (Grayjay) y #6116 (LibreTube), foros |
| Carrera contra PoToken y SABR | Todos los clientes de YouTube | [V-código] |
| Fragilidad de las instancias | Piped, Invidious | [V-repo]; issue Piped #4270 |
| Proyectos de una sola persona | PipePipe, ViMusic (abandonado), Flow | [V-repo] |
| Distribución fuera de Google Play | Todos los clientes de YouTube | Política *Device and Network Abuse* (doc 05) |
| Fragmentación de forks | NewPipe → Tubular, PipePipe, BravePipe; InnerTune → muchos | [V-repo] / [S] |
| Conflictos de licencia o gobernanza | Grayjay (licencia), ReVanced/Morphe (DMCA) | [V-repo] / [S] |

### 4.5 Oportunidades para diferenciarnos (antes de aplicar el filtro legal)
1. Sincronización local-first, cifrada y sin cuenta de Google, entre Android y web.
2. Biblioteca universal de fuentes **abiertas y legítimas**, con plugins en sandbox.
3. Una capa de **IA sobre contenido con acceso legítimo**: podcasts, PeerTube, medios locales y servidores personales.
4. Modos de experiencia (sin distracciones, productividad, cine) y control parental de verdad.
5. Accesibilidad de primera clase.

> El documento 05 (legal) decide cuáles de estas oportunidades son sostenibles. **Spoiler:** cambia la estrategia respecto a YouTube.
