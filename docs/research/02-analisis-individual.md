# 02 · Análisis individual de proyectos

Consulta: 2026-11-06. Etiquetas de evidencia según `docs/00-metodologia-y-registro.md`.

**Advertencia sobre las puntuaciones (sección F):** son **provisionales y documentales**. No se instaló ni midió ninguna app. Se puntúa con estos criterios:
- **Funcionalidades:** amplitud verificada en código o documentación.
- **Rendimiento / UX / estabilidad:** stack, informes de usuarios y madurez.
- **Privacidad:** dependencia de servidores, telemetría y cuentas.
- **Mantenimiento:** cadencia de commits y releases.
- **Potencial:** arquitectura y licencia.

Cualquier puntuación puede moverse ±2 cuando se hagan las pruebas en dispositivo.

Abreviaturas de funcionalidades:
- **BG**: reproducción en segundo plano.
- **PiP**: Picture-in-Picture nativo de Android.
- **SB**: SponsorBlock.
- **RYD**: Return YouTube Dislike.
- **DA**: DeArrow.

---

## 1. NewPipe

**A. Identificación**

| Campo | Dato |
|---|---|
| Equipo | TeamNewPipe |
| Repositorio | [TeamNewPipe/NewPipe](https://github.com/TeamNewPipe/NewPipe) · extractor [NewPipeExtractor](https://github.com/TeamNewPipe/NewPipeExtractor) |
| Web | newpipe.net |
| Licencia | GPL-3.0 [V-repo] |
| Lenguajes | Java y Kotlin [V-código] |
| UI | Views clásicas; dependencia de **Compose** ya presente en el build [V-código], lo que indica una migración en curso [I] |
| Plataformas | Android (F-Droid y repo propio). No está en Google Play. |
| Creación | 2015 [S] |
| Última actualización | commit 2026-11-06; tag v0.29.1 [V-repo] |
| Estado | Activo |

**B. Arquitectura**
- La app se separa de la extracción. **NewPipeExtractor** es una librería Java independiente que convierte las páginas y la API interna InnerTube de cada servicio en modelos (`StreamInfo`, `ChannelInfo`…).
- **Servicios soportados:** YouTube, SoundCloud, PeerTube, Bandcamp y media.ccc [V-código: menciones a peertube y soundcloud].
- **Red:** OkHttp. **Asincronía:** RxJava 3 + corrutinas. **Inyección de dependencias:** Koin. **Persistencia:** Room. **Tareas:** WorkManager. **JSON:** nanojson [V-código].
- **Reproductor:** ExoPlayer 2, *no* Media3, con DASH, HLS, SmoothStreaming y MediaSession [V-código]. Es deuda técnica: ExoPlayer 2 está obsoleto en favor de Media3 [I].
- **Anti-bots:** paquete `util/potoken/`, que genera PoTokens ejecutando BotGuard en una WebView oculta [V-código].
- **Sesiones:** sin cuenta de YouTube. Suscripciones y listas solo locales.
- **Reutilizable legalmente:**
  - El patrón *extractor desacoplado* (la idea, no el código).
  - El soporte de PeerTube y Bandcamp del extractor, respetando la GPL-3.0.

**C. Funcionalidades** (código + documentación)

| Funcionalidad | Estado | Evidencia |
|---|---|---|
| BG | Sí | [V-doc] |
| Reproductor flotante (popup) | Sí, ventana propia con permiso `SYSTEM_ALERT_WINDOW` | [V-código: manifest] |
| PiP nativo | **No** (0 referencias a `PictureInPictureParams`) | [V-código] |
| Descargas | Sí (vídeo, audio, subtítulos) | [V-código: 16 ficheros] |
| Cola de reproducción | Sí, muy completa (`PlayQueue`, 60 ficheros) | [V-código] |
| Importar/exportar | Sí (YouTube Takeout, SoundCloud, base de datos propia) | [V-código] |
| SB / RYD / DA | **No** (0 referencias) | [V-código] |
| Chromecast | **No**; issue [#668](https://github.com/TeamNewPipe/NewPipe/issues/668) abierta desde 2017 | [V-código] + [S] |
| Comentarios | Lectura sí; publicar no | [V-código] + [S] |
| Sincronización | **No** (0 referencias) | [V-código] |
| Ecualizador, temporizador de apagado | No | [V-código] |
| Login / cuentas | No | — |

**D. UX** [S]: utilitaria, densa y funcional; se considera el estándar de facto. Interfaz anticuada frente a Material 3 [I].

**E. Problemas**
- Roturas periódicas cuando YouTube cambia (errores 403, “Sign in to confirm you’re not a bot”) [S: [foro GrapheneOS](https://discuss.grapheneos.org/d/14346-issues-with-newpipe-due-to-changes-from-youtube/15)].
- Política de no integrar servicios de terceros como SB; de ahí los forks Tubular y PipePipe [S].
- Sin Chromecast ni sincronización.

**F. Puntuación provisional**

| Criterio | Nota | Justificación |
|---|---|---|
| Funcionalidades | 7 | Muy completa en lo básico; le faltan SB, cast, sync y PiP nativo. |
| Rendimiento | 7 | Ligera; ExoPlayer 2 antiguo. |
| Interfaz | 5 | Densa y anticuada. |
| Reproducción | 7 | Cola y popup excelentes; sin PiP nativo. |
| Personalización | 6 | — |
| Privacidad | 9 | Sin cuentas ni servidores intermedios. |
| Estabilidad | 6 | Roturas por cambios de YouTube. |
| Mantenimiento | 9 | Commit diario, equipo amplio. |
| Potencial | 7 | Base sólida, migración lenta. |

---

## 2. PipePipe

**A. Identificación**

| Campo | Dato |
|---|---|
| Desarrollador | InfinityLoop1308 (también “NullPointerException” en Codeberg) |
| Repositorio | [InfinityLoop1308/PipePipe](https://github.com/InfinityLoop1308/PipePipe) (repo principal con submódulos), [PipePipeClient](https://github.com/InfinityLoop1308/PipePipeClient), [PipePipeExtractor](https://codeberg.org/NullPointerException/PipePipeExtractor), espejo [Codeberg](https://codeberg.org/NullPointerException/PipePipe) |
| Licencia | GPL-3.0 |
| Lenguaje | Java/Kotlin |
| Plataformas | Android; F-Droid (`InfinityLoop1309.NewPipeEnhanced`) e IzzyOnDroid [V-doc] |
| Última actualización | cliente 2026-11-06, tag v5.0.0; Codeberg v3.5.1 [V-repo]. La numeración no coincide entre repositorios. |
| Estado | Activo |

**B. Arquitectura**
- Fork de NewPipe con **extractor propio** (PipePipeExtractor) [V-código].
- ExoPlayer 2, Room, RxJava, WorkManager y FFmpeg [V-código].
- Implementación de SABR muy extensa (47 ficheros en el cliente, 28 en el extractor) [V-código]. Es el fork que más ha invertido en seguir los cambios de YouTube.

**C. Funcionalidades**
Según el README [V-doc] y confirmadas por palabras clave en el código [V-código]:
- SB (YouTube y **BiliBili**), RYD, títulos originales.
- **Login para contenido restringido o premium.**
- Danmaku (chat en vivo superpuesto), AV1/VP9, modo música.
- Filtros avanzados: palabras clave, canales, bloqueo de Shorts y de vídeos de pago.
- Servicios adicionales: **BiliBili y NicoNico** (29 y 20 ficheros).
- Temporizador de apagado.
- Sin PiP nativo, sin cast, sincronización mínima (2 referencias).

**D. UX**: hereda la de NewPipe con más ajustes. Se percibe como “NewPipe con más funciones” [S: AlternativeTo].

**E. Problemas**
- Proyecto de un solo mantenedor (*bus factor* 1) [I].
- Repositorios repartidos entre GitHub y Codeberg con numeraciones distintas, lo que confunde a usuarios y empaquetadores [V-repo].
- El login con cuenta de YouTube eleva el riesgo de que Google bloquee esa cuenta [I].

**F. Puntuación provisional**

| Criterio | Nota |
|---|---|
| Funcionalidades | 9 |
| Rendimiento | 7 |
| Interfaz | 6 |
| Reproducción | 8 |
| Personalización | 8 |
| Privacidad | 8 (baja si se usa login) |
| Estabilidad | 7 |
| Mantenimiento | 7 (un solo mantenedor) |
| Potencial | 6 (fork, deuda heredada) |

---

## 3. LibreTube

**A. Identificación**

| Campo | Dato |
|---|---|
| Equipo | libre-tube (comunidad) |
| Repositorio | [libre-tube/LibreTube](https://github.com/libre-tube/LibreTube) |
| Licencia | GPL-3.0 |
| Lenguaje | Kotlin |
| Plataformas | Android (F-Droid, IzzyOnDroid) |
| Última actualización | 2026-11-02, v32.1 [V-repo] |
| Estado | Activo |

**B. Arquitectura**
- **Dos modos** [V-código]:
  - a) cliente de una instancia **Piped** (API REST);
  - b) **extracción local** con NewPipeExtractor (preferencias `local_stream_extraction`, `local_feed_extraction` y `full_local_mode`).
- **Media3** (exoplayer, session, transformer), Room, Retrofit, kotlinx-serialization, WorkManager y protobuf [V-código].
- Generación de PoToken en `api/poToken/PoTokenWebView.kt` [V-código].
- Cuentas y sincronización **a través de Piped** [V-doc].

**C. Funcionalidades** [V-doc + V-código]
- Suscripciones con **grupos**, listas, marcadores de listas e historial.
- Descargas, BG y **PiP nativo** (3 referencias).
- SB, RYD y DA.
- Capítulos (25 ficheros) y temporizador de apagado.
- Sin cast (0 referencias).

**D. UX** [S]: Material You. Se suele recomendar como “la de interfaz más moderna”.

**E. Problemas**
- La dependencia de Piped es su talón de Aquiles. El backend de Piped está **lento** (último commit 2026-05-30) [V-repo] y hay issues como [#4270](https://github.com/TeamPiped/Piped/issues/4270), “Piped not working” (oct-2026) [S].
- El modo local mitiga el problema, pero entonces hereda los problemas de NewPipeExtractor.
- Errores “not a bot” documentados en la issue [#6116](https://github.com/libre-tube/libretube/issues/6116) [S].
- Sin cola de reproducción comparable a la de NewPipe (0 referencias a `PlayQueue`; puede usar otro nombre) [V-código, débil].

**F. Puntuación provisional**

| Criterio | Nota |
|---|---|
| Funcionalidades | 8 |
| Rendimiento | 7 |
| Interfaz | 8 |
| Reproducción | 7 |
| Personalización | 7 |
| Privacidad | 7 (las instancias Piped ven tu IP; 9 en modo local) |
| Estabilidad | 6 |
| Mantenimiento | 8 |
| Potencial | 7 |

---

## 4. Grayjay (FUTO)

**A. Identificación**

| Campo | Dato |
|---|---|
| Equipo | FUTO Holdings, Inc. (financiado; impulsado públicamente por Louis Rossmann [S]) |
| Repositorio | [futo-org/grayjay-android](https://github.com/futo-org/grayjay-android) (espejo de gitlab.futo.org/videostreaming/grayjay), [Grayjay.Desktop](https://github.com/futo-org/Grayjay.Desktop) |
| Web | grayjay.app |
| Licencia | **Source First License 1.1**: uso, copia y modificación **solo con fines no comerciales**; distribución solo gratuita y no comercial [V-repo: LICENSE.md]. **No es software libre/open source** según la OSI [S: [HiPhish](https://hiphish.github.io/blog/2023/10/18/grayjay-is-not-open-source)]. |
| Lenguaje | Kotlin (Android); escritorio .NET + web [NV en detalle] |
| Plataformas | Android, Windows, Linux, macOS |
| Última actualización | Android 2026-11-03 (tag 401), escritorio 2026-10-21 [V-repo] |
| Modelo | Pago voluntario de licencia (unos 9,99 USD según [S]); la app funciona sin pagar [S]. |
| Estado | Activo |

**B. Arquitectura: la más interesante del ecosistema para nosotros**
- **Las fuentes son plugins JavaScript** ejecutados en V8 mediante **Javet** (`javet-v8-android:4.1.5`) [V-código]. Cada plugin incluye [V-doc: `plugin-development.md`]:
  - `config.json` con `sourceUrl` para actualizarse, `scriptUrl`, `packages` (Http, DOMParser, Utilities) y `allowUrls`, la **lista blanca de dominios** por plugin (si es “everywhere”, se avisa al usuario);
  - **firma del script** (*Script Signing*);
  - funciones de contrato como `getHome`, `search` y `getContentDetails`, con paginadores.
- Plugins oficiales como submódulos [V-código: `.gitmodules`]: YouTube, PeerTube, Twitch, Kick, Odysee, Rumble, Nebula, Patreon, SoundCloud y BiliBili.
- Media3 (con RTSP y transformer), Room, Dagger, protobuf y WorkManager [V-código].
- **Casting**: FCast (protocolo propio y abierto de FUTO), Chromecast y AirPlay [V-código: 10 ficheros; V-doc: `docs/casting.md`].
- **Sincronización** entre dispositivos [V-doc] e identidad **Polycentric** (red social descentralizada de FUTO, `docs/polycentric.md`) para comentarios.
- **Reutilizable:**
  - La *idea* de un SDK de fuentes en JS con permisos por dominio, firma y actualización independiente de la app.
  - FCast, que es un protocolo abierto [V-doc; revisar la licencia del SDK].
  - **No** su código: la licencia impide el uso comercial.

**C. Funcionalidades** [V-doc + V-código]
- Feed universal multiplataforma, suscripciones agregadas entre plataformas y descargas.
- Cast (FCast, Chromecast, AirPlay), PiP (2 referencias), capítulos y subtítulos.
- Comentarios propios (Polycentric) más los de cada plataforma, y sincronización.
- La app no integra SB (0 referencias); podría estar dentro del plugin de YouTube [NV].

**D. UX** [S]: navegación unificada entre plataformas.
- **Ventaja percibida:** cuando YouTube rompe algo, el plugin se actualiza solo, en horas y sin publicar una versión de la app [S: [foro GrapheneOS](https://discuss.grapheneos.org/d/14346-issues-with-newpipe-due-to-changes-from-youtube?page=2)].

**E. Problemas**
- La licencia aleja a contribuidores y bloquea forks comerciales [V-repo].
- Sincronización inestable: issue #80 en el escritorio, “Unable to setup sync” [S].
- Inestabilidad del plugin de YouTube y peticiones de login (r/grayjay, “Super unstable”) [S].
- Las descargas de YouTube a veces se quedan colgadas [S].
- El motor V8 aumenta el tamaño del APK y el consumo de memoria [I].

**F. Puntuación provisional**

| Criterio | Nota |
|---|---|
| Funcionalidades | 9 |
| Rendimiento | 6 (V8, multiplataforma) |
| Interfaz | 8 |
| Reproducción | 8 (cast real) |
| Personalización | 7 |
| Privacidad | 7 (Polycentric y sincronización opcionales) |
| Estabilidad | 6 |
| Mantenimiento | 9 (empresa financiada) |
| Potencial | 8 técnico / **4 como base reutilizable** por la licencia |

---

## 5. FreeTube

**A. Identificación**

| Campo | Dato |
|---|---|
| Equipo | FreeTubeApp (comunidad) |
| Repositorio | [FreeTubeApp/FreeTube](https://github.com/FreeTubeApp/FreeTube) |
| Licencia | AGPL-3.0 |
| Stack | Electron 44, Vue 3, **youtubei.js 18.3**, **Shaka Player 5.3** [V-código: package.json] |
| Plataformas | Windows, macOS, Linux (no hay móvil) |
| Última actualización | 2026-11-06, v0.26.0-beta [V-repo] |
| Estado | Activo |

**B. Arquitectura**
- Dos extractores a elegir: el integrado (youtubei.js, local) o una instancia **Invidious** [V-doc].
- Datos 100 % locales.
- Admite proxy y Tor [V-doc].

**C. Funcionalidades** [V-doc]
- Suscripciones sin cuenta, organizadas en **perfiles** (feeds temáticos); importación y exportación.
- Capítulos, SB y DA.
- Abrir vídeos desde el navegador mediante una extensión; reproductor externo.
- Temas, captura de pantalla, varias ventanas, **mini player/PiP**, atajos de teclado.
- **Modo familiar** y **ajustes “sin distracciones”** para ocultar elementos.

**D. UX**: referencia en ajustes *distraction-free* y en perfiles de suscripciones (idea a adoptar).

**E. Problemas**
- Electron consume mucha memoria [I].
- Sin móvil ni sincronización entre dispositivos; las exportaciones son manuales [V-doc].
- Roturas cuando cambia YouTube [S].

**F. Puntuación provisional**

| Criterio | Nota |
|---|---|
| Funcionalidades | 8 |
| Rendimiento | 5 |
| Interfaz | 7 |
| Reproducción | 7 |
| Personalización | 9 |
| Privacidad | 9 |
| Estabilidad | 7 |
| Mantenimiento | 9 |
| Potencial | 6 (solo escritorio) |

---

## 6. Invidious

**A. Identificación**

| Campo | Dato |
|---|---|
| Equipo | iv-org |
| Repositorio | [iv-org/invidious](https://github.com/iv-org/invidious) (Crystal) y [invidious-companion](https://github.com/iv-org/invidious-companion) (Deno/TypeScript) |
| Licencia | AGPL-3.0 |
| Última actualización | 2026-11-04, v2.20261103.0; companion 2026-11-01 [V-repo] |
| Estado | Activo |

**B. Arquitectura**
- Frontend web servidor y API REST propia (que consumen clientes como Clipious y Yattee).
- Desde 2025 la **obtención de streams se delegó en *companion***, que según su README “handle all the video stream retrieval from YouTube servers” [V-doc]. El companion contiene la lógica de PoToken (14 ficheros) [V-código].
- Es una respuesta arquitectónica a los bloqueos: aislar en un servicio aparte la pieza que más cambia.
- El servidor hace de *proxy* de vídeo de forma opcional.

**C. Funcionalidades**: suscripciones con cuenta local de la instancia, listas, importación, API, funciona sin JavaScript y preferencias por URL [V-doc / S].

**E. Problemas**
- Pocas instancias públicas: un blog citó **3** en marzo de 2026 [S, baja fiabilidad: [dev.to](https://dev.to/selfhostingsh/invidious-vs-piped-4ijn)].
- YouTube bloquea las IP de servidores (centros de datos), lo que hace frágil el modelo de instancias públicas [S/I].

**F. Puntuación provisional**

| Criterio | Nota |
|---|---|
| Funcionalidades | 6 |
| Rendimiento | 6 |
| Interfaz | 5 |
| Reproducción | 6 |
| Personalización | 6 |
| Privacidad | 8 (si es autoalojado) |
| Estabilidad | 5 |
| Mantenimiento | 8 |
| Potencial | 5 |

**Lección:** depender de servidores que hablan con YouTube es estructuralmente frágil.

---

## 7. Piped

**A. Identificación**

| Campo | Dato |
|---|---|
| Equipo | TeamPiped (liderado por FireMasterK/Kavin [S]) |
| Repositorio | [TeamPiped/Piped](https://github.com/TeamPiped/Piped) (frontend Vue) y [Piped-Backend](https://github.com/TeamPiped/Piped-Backend) (Java, usa NewPipeExtractor) |
| Licencia | AGPL-3.0 |
| Última actualización | frontend 2026-10-24; **backend 2026-05-30** [V-repo] |
| Estado | Frontend activo, backend lento |

**B. Arquitectura**
- Backend con NewPipeExtractor, *piped-proxy* (Rust) para el vídeo, PostgreSQL y API REST, que consume LibreTube.
- Cuentas y suscripciones del lado del servidor y feed precalculado.

**E. Problemas**
- Issues “Is Piped dead?” y [#4270](https://github.com/TeamPiped/Piped/issues/4270) (oct-2026) [S].
- Las instancias se rompen o sufren limitación de peticiones con regularidad [S].

**F. Puntuación provisional**

| Criterio | Nota |
|---|---|
| Funcionalidades | 6 |
| Rendimiento | 7 |
| Interfaz | 6 |
| Reproducción | 6 |
| Personalización | 5 |
| Privacidad | 7 |
| Estabilidad | 4 |
| Mantenimiento | 4 |
| Potencial | 4 |

---

## 8. SkyTube

**A. Identificación**

| Campo | Dato |
|---|---|
| Equipo | SkyTubeTeam |
| Repositorio | [SkyTubeTeam/SkyTube](https://github.com/SkyTubeTeam/SkyTube) |
| Licencia | GPL-3.0 |
| Lenguaje | Java |
| Última actualización | 2026-10-29, v3.003 [V-repo] |
| Estado | Activo |

**B. Arquitectura**
- Históricamente usaba la **YouTube Data API**; hoy depende de **NewPipeExtractor** [V-código], además de ExoPlayer 2, Jackson y RxJava 3.
- Hay dos variantes de build: la *extra* incluye **Chromecast** (`cast-framework`) y la OSS no [V-código / S].

**C. Funcionalidades** [V-doc]
- **Bloqueador de vídeos avanzado**:
  - listas negra y blanca de canales;
  - bloqueo por idioma, por pocas visualizaciones o por muchos dislikes;
  - contador de vídeos bloqueados.
- Marcado de vídeos vistos, reanudación, gestos (volumen, brillo, comentarios).
- Marcadores, importación de suscripciones, descargas, SB y copias de seguridad locales.

**E. Problemas**: interfaz anticuada [I]; sin cola avanzada ni PiP (0 referencias) [V-código].

**F. Puntuación provisional**

| Criterio | Nota |
|---|---|
| Funcionalidades | 6 |
| Rendimiento | 7 |
| Interfaz | 4 |
| Reproducción | 6 |
| Personalización | 7 (filtros) |
| Privacidad | 8 |
| Estabilidad | 6 |
| Mantenimiento | 7 |
| Potencial | 4 |

---

## 9. YTDLnis

**A. Identificación**

| Campo | Dato |
|---|---|
| Desarrollador | deniscerri |
| Repositorio | [deniscerri/ytdlnis](https://github.com/deniscerri/ytdlnis) |
| Licencia | GPL-3.0 |
| Stack | Kotlin, **youtubedl-android** (yt-dlp + Python embebidos), FFmpeg, Media3, Room, WorkManager y Compose [V-código] |
| Última actualización | 2026-11-03, v1.9.1.1 [V-repo] |
| Estado | Activo |

**C. Funcionalidades** [V-doc]: no es un reproductor, sino el mejor **gestor de descargas**:
- Más de 1000 sitios; cola, programación y descargas concurrentes; pausa y reanudación.
- **Observar fuentes**: vigila canales o listas y descarga lo nuevo.
- Cortar por marcas de tiempo o capítulos, recortar, dividir por capítulos.
- SB para eliminar o marcar segmentos; incrustar subtítulos y metadatos.
- Letras desde lrclib, subida a Nextcloud, plantillas de nombre de archivo.
- Terminal con yt-dlp, Python y FFmpeg; notificaciones en vivo de Android 16.

**E. Problemas**: legales, los propios de yt-dlp (doc 05); APK grande por Python y FFmpeg [I].

**F. Puntuación provisional**: Funcionalidades 9 (descarga) · Rendimiento 7 · Interfaz 7 · Reproducción 3 (no es su objetivo) · Personalización 9 · Privacidad 9 · Estabilidad 7 · Mantenimiento 9 · Potencial 7.

**Lección:** la “observación de fuentes” y el post-procesado son funciones muy valoradas. Son trasladables a fuentes legítimas como podcasts, PeerTube y RSS.

---

## 10. SmartTube

**A. Identificación**

| Campo | Dato |
|---|---|
| Desarrollador | yuliskov |
| Repositorio | [yuliskov/SmartTube](https://github.com/yuliskov/SmartTube) |
| Licencia | MIT [V-repo] |
| Stack | Java; fork propio de ExoPlayer (incluye `exoplayer-sabr`), Leanback, Cronet, cast-framework, FFmpeg y protobuf [V-código] |
| Plataformas | **Solo Android TV / Google TV / Fire TV**; no soporta móviles [V-doc] |
| Última actualización | 2026-11-06 [V-repo] |
| Estado | Activo |

**B. Arquitectura**: cliente nativo de InnerTune para TV, con **login con cuenta de Google** y SABR implementado en su propio fork de ExoPlayer (84 ficheros con SABR, el mayor del ecosistema) [V-código].

**C. Funcionalidades** [V-doc]: SB, velocidad, **8K, 60 fps, HDR**, chat en vivo, botones configurables y no requiere Google Services.
- Limitaciones declaradas: no funciona en móviles, los comentarios son inestables y la búsqueda por voz y el casting son inferiores a los oficiales.

**E. Problemas**
- El README incluye “Important announcement about the app” y “How to revoke access”, lo que sugiere un incidente relacionado con el acceso a la cuenta de Google [V-doc; contenido NV].
- Mantenimiento de un fork de ExoPlayer.

**F. Puntuación provisional**: Funcionalidades 8 · Rendimiento 8 · Interfaz 8 (TV) · Reproducción 9 · Personalización 8 · Privacidad 5 (login de Google) · Estabilidad 7 · Mantenimiento 8 · Potencial 6.

**Lección:** en TV, la calidad de imagen (HDR/8K) y el control remoto son críticos. Queda fuera de nuestro MVP.

---

## 11. ReVanced (y Morphe)

**A. Identificación**

| Campo | Dato |
|---|---|
| Equipo | ReVanced |
| Repositorio | [ReVanced/revanced-manager](https://github.com/ReVanced/revanced-manager) (último commit 2026-05-11, v2.7.0-dev.11) [V-repo]; revanced-patches no accesible desde aquí |
| Licencia | GPL-3.0 |
| Fork | **Morphe** ([morphe-patches](https://github.com/MorpheApp/morphe-patches), activo) |

**B. Diferencia clave con un cliente independiente**
- ReVanced **no es un cliente**. Es un sistema de **parches en bytecode sobre el APK oficial de YouTube** (Manager + Patcher + Patches).
- El usuario obtiene la app oficial con anuncios eliminados, BG, SB, etc.

| Aspecto | ReVanced / Morphe | Cliente independiente (NewPipe…) |
|---|---|---|
| Interfaz | La oficial de YouTube | Propia |
| Cuenta de Google | Sí, mediante GmsCore/microG | No (en general) |
| Recomendaciones | Las de YouTube | Ninguna o locales |
| Mecanismo | Modifica la app de Google | Reimplementa el acceso a YouTube |
| Riesgo legal | Modificación de software ajeno y bloqueo de anuncios | ToS y acceso automatizado |
| Fragilidad | Se rompe con cada versión de YouTube | Se rompe con los cambios de InnerTube |

**E. Problemas**: conflicto ReVanced ↔ Morphe y retirada por DMCA en 2026 [S]; dependencia total de los APK de Google.

**F. Puntuación provisional**: Funcionalidades 9 · Rendimiento 8 · Interfaz 8 (la de YouTube) · Reproducción 9 · Personalización 8 · Privacidad 3 (cuenta de Google y telemetría oficial) · Estabilidad 6 · Mantenimiento 5 (crisis 2026) · Potencial 3 (no es un producto propio).

**Lección:** no es replicable como producto legítimo. Queda descartado como modelo.

---

## 12. Flow

**A. Identificación**

| Campo | Dato |
|---|---|
| Desarrollador | A-EDev, organización Flow-Tube |
| Repositorio | **[Flow-Tube/Flow](https://github.com/Flow-Tube/Flow)** |
| Licencia | GPL-3.0 |
| Stack | Kotlin, **Jetpack Compose + Material 3, Hilt (Dagger), Media3** (exoplayer, session, muxer, inspector), Room, Ktor, OkHttp, kotlinx-serialization, WorkManager y NewPipeExtractor [V-código] |
| Plataformas | Android; Flow-Desktop en beta [S] |
| Creación | 2025 [S; fecha exacta NV] |
| Última actualización | 2026-11-06, v3.0.0 [V-repo] |
| Estado | Activo, con cadencia muy alta |

**B. Arquitectura**
- El **stack más moderno** de los clientes analizados.
- Usa NewPipeExtractor e implementa PoToken (51 ficheros) y SABR (65) [V-código].
- Motor de recomendación local **FlowNeuro**. Según [V-doc]: “Runs 100% on-device — no server, no telemetry”. Aprende de lo que ves, saltas, te gusta, buscas y del tiempo de visionado.

**C. Funcionalidades** [V-doc + V-código]
- Media3 con cambio de resolución; SB, DA y RYD.
- BG, PiP y **cast** (18 ficheros).
- Velocidad, capítulos y gestos (brillo, volumen, posición).
- **Subtítulos personalizables** y descargas VP9/AV1; reanudación.
- **Reproductor de música dedicado**:
  - visualizaciones y **letras sincronizadas**;
  - cola con reordenación, aleatorio y repetición;
  - **ecualizador** (53 ficheros) y normalización (168 ficheros con palabras clave relacionadas).
- Mini player persistente.
- Biblioteca de medios locales (v2.2.0) [S] e importación CSV de suscripciones (v1.4.0) [S].
- Sincronización: 42 ficheros con palabras clave relacionadas; mecanismo exacto NV.

**D. UX** [I]: Material 3 nativo en Compose; es el que más se parece a la “app ideal” en lo visual.

**E. Problemas**
- Proyecto joven, con historial de estabilidad aún corto.
- Hereda la fragilidad de NewPipeExtractor y añade la carga de mantener YT Music.
- **Ritmo de funcionalidades muy alto frente al tamaño del equipo** [I], con riesgo de deuda técnica.

**F. Puntuación provisional**

| Criterio | Nota |
|---|---|
| Funcionalidades | 9 |
| Rendimiento | 7 [NV] |
| Interfaz | 9 |
| Reproducción | 9 |
| Personalización | 8 |
| Privacidad | 9 |
| Estabilidad | 6 (joven) |
| Mantenimiento | 8 |
| Potencial | 8 |

**Es el competidor directo más peligroso para un producto Android nuevo.**

---

## 13. Fichas breves de proyectos adicionales

| Proyecto | Por qué importa | Evidencia |
|---|---|---|
| **Tubular** | NewPipe + SB + RYD. Demuestra que los usuarios hacen fork para conseguir integraciones que NewPipe rechaza. | [V-código]: 26 ficheros SB, 9 RYD |
| **Metrolist** | Cliente de YT Music con Compose, Hilt, Media3 y **media3-cast + mediarouter**. Referencia de cast moderno con Media3. | [V-código] |
| **Materialious** | Web, escritorio y Android a partir de **una sola base SvelteKit 3 + Svelte 5 + Capacitor 8 + Shaka 5**. Prueba que una web progresiva puede ser también la app móvil. | [V-código] |
| **Yattee** | Cliente Apple nativo de Invidious y Piped. Muestra la demanda en iOS. | [V-repo] |
| **Seal** | UX de descarga muy pulida (Material You). | [V-repo] |
| **Kodi plugin.video.youtube** | Usa la **Data API oficial con claves que aporta el usuario**. Es un precedente del enfoque legal-técnico. | [S/I] |
| **ViMusic** | Abandonado desde 2023, con forks posteriores. **Riesgo de “proyecto de una persona”.** | [V-repo] |
