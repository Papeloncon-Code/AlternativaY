# 01 · Catálogo de aplicaciones y proyectos

Consulta: 2026-11-06. Las columnas “Último commit” y “Etiqueta más alta” son **[V-repo]** (git). La etiqueta más alta se obtiene ordenando por versión y puede no coincidir con la release estable (por ejemplo, FreeTube muestra una beta). Licencia **[V-repo]**, leída del fichero LICENSE.

Estado (criterio explícito):
- **Activo**: commit en los últimos 60 días.
- **Lento**: commit hace entre 60 días y 12 meses.
- **Inactivo**: más de 12 meses sin commits, o archivado.

## A. Proyectos obligatorios

| # | Proyecto | Repositorio oficial | Licencia | Último commit | Etiqueta más alta | Estado | Tipo |
|---|---|---|---|---|---|---|---|
| 1 | **PipePipe** | [InfinityLoop1308/PipePipe](https://github.com/InfinityLoop1308/PipePipe) (repo principal con submódulos) · [PipePipeClient](https://github.com/InfinityLoop1308/PipePipeClient) · espejo [Codeberg](https://codeberg.org/NullPointerException/PipePipe) | GPL-3.0 | 2026-11-06 (cliente) | v5.0.0 (cliente), v3.5.1 (Codeberg) | Activo | Cliente Android, fork de NewPipe |
| 2 | **NewPipe** | [TeamNewPipe/NewPipe](https://github.com/TeamNewPipe/NewPipe) · [NewPipeExtractor](https://github.com/TeamNewPipe/NewPipeExtractor) | GPL-3.0 | 2026-11-06 | v0.29.1 / extractor v0.26.5 | Activo | Cliente Android + librería extractora |
| 3 | **LibreTube** | [libre-tube/LibreTube](https://github.com/libre-tube/LibreTube) | GPL-3.0 | 2026-11-02 | v32.1 | Activo | Cliente Android (Piped o extracción local) |
| 4 | **Grayjay** | [futo-org/grayjay-android](https://github.com/futo-org/grayjay-android) (espejo de gitlab.futo.org) · [Grayjay.Desktop](https://github.com/futo-org/Grayjay.Desktop) | **Source First 1.1** (no comercial, no libre) | 2026-11-03 / 2026-10-21 | 401 (Android), 20 (escritorio) | Activo | Cliente multiplataforma con plugins JS |
| 5 | **FreeTube** | [FreeTubeApp/FreeTube](https://github.com/FreeTubeApp/FreeTube) | AGPL-3.0 | 2026-11-06 | v0.26.0-beta | Activo | Escritorio (Electron + Vue) |
| 6 | **Invidious** | [iv-org/invidious](https://github.com/iv-org/invidious) · [invidious-companion](https://github.com/iv-org/invidious-companion) | AGPL-3.0 | 2026-11-04 / 2026-11-01 | v2.20261103.0 | Activo | Frontend web autoalojable (Crystal) + companion (Deno) |
| 7 | **Piped** | [TeamPiped/Piped](https://github.com/TeamPiped/Piped) · [Piped-Backend](https://github.com/TeamPiped/Piped-Backend) | AGPL-3.0 | 2026-10-24 / **2026-05-30** | (sin etiquetas) | Frontend activo, **backend lento** | Frontend web (Vue) + backend (Java) |
| 8 | **SkyTube** | [SkyTubeTeam/SkyTube](https://github.com/SkyTubeTeam/SkyTube) | GPL-3.0 | 2026-10-29 | v3.003 | Activo | Cliente Android |
| 9 | **YTDLnis** | [deniscerri/ytdlnis](https://github.com/deniscerri/ytdlnis) | GPL-3.0 | 2026-11-03 | v1.9.1.1 | Activo | Descargador Android (yt-dlp) |
| 10 | **SmartTube** | [yuliskov/SmartTube](https://github.com/yuliskov/SmartTube) | MIT | 2026-11-06 | (etiquetas no semánticas) | Activo | Cliente Android TV |
| 11 | **ReVanced** | [ReVanced/revanced-manager](https://github.com/ReVanced/revanced-manager); revanced-patches **no clonable** desde aquí | GPL-3.0 | **2026-05-11** (manager) | v2.7.0-dev.11 | Lento / en conflicto | Parches sobre la app oficial |
| 12 | **Flow** | **[Flow-Tube/Flow](https://github.com/Flow-Tube/Flow)** (canónico; [A-EDev/Flow](https://github.com/A-EDev/Flow) tiene el mismo HEAD `af3a711`) | GPL-3.0 | 2026-11-06 | v3.0.0 | Activo | Cliente Android Compose + YT Music |

### Desambiguación de “Flow” (requisito explícito)
- **Proyecto correcto:** Flow, cliente de YouTube y YouTube Music para Android con Jetpack Compose y Material 3, con motor de recomendación local **FlowNeuro**.
  - Autor original: GitHub `A-EDev`. Organización actual: `Flow-Tube`. Web de recursos: `flow-tube.org`. Distribución: GitHub Releases, [IzzyOnDroid](https://apt.izzysoft.de/packages/io.github.aedev.flow) (paquete `io.github.aedev.flow`) y Obtainium.
  - [V-repo]: A-EDev/Flow y Flow-Tube/Flow comparten el commit `af3a711` y los badges del README apuntan a Flow-Tube.
  - El desarrollador lo presentó en Reddit en enero de 2026 [S, [snapshot](https://reddit.sentinel-team.org/posts/1qnp7ux/snapshots/2026-01-27T02%3A41%3A38.648895Z)].
  - Existe también [Flow-Desktop](https://newreleases.io/project/github/Flow-Tube/Flow-Desktop/release/v0.1.0), en pre-release [S].
- **No confundir con:**
  - Las decenas de forks homónimos (`lowi-kr/Flow`, `OshekharO/Flow`, etc.).
  - El framework “Flow” de Kotlin (`kotlinx.coroutines.flow`).
  - Cualquier otra app llamada Flow.

### Estado de ReVanced (verificado parcialmente)
- `revanced-manager`: último commit el 2026-05-11 [V-repo]. `revanced-patches` no se pudo clonar desde GitHub [V-repo: fallo].
- Según [Wikipedia](https://en.wikipedia.org/wiki/YouTube_Vanced) y [daily.dev](https://daily.dev/posts/i-switched-to-morphe-after-revanced-stopped-working-and-it-s-basically-everything-i-loved-about-the-5tqf7tmr2) [S], el repositorio principal se retiró en 2026 por un DMCA de los desarrolladores de **Morphe** (fork de antiguos miembros de ReVanced) y el proyecto se trasladó temporalmente a GitLab.
- **Morphe** ([MorpheApp/morphe-patches](https://github.com/MorpheApp/morphe-patches), GPL-3.0, commit 2026-11-06, v2.1.0-dev.12) está activo [V-repo].
- La disputa es controvertida: no tomo partido.

## B. Proyectos adicionales descubiertos

| Proyecto | Repositorio | Licencia | Último commit | Estado | Relevancia para nosotros |
|---|---|---|---|---|---|
| **Tubular** | [polymorphicshade/Tubular](https://github.com/polymorphicshade/Tubular) | GPL-3.0 | 2026-07-06 | Lento | Fork de NewPipe con SponsorBlock y RYD. Muestra la demanda de esas integraciones. |
| **Morphe** | [MorpheApp/morphe-patches](https://github.com/MorpheApp/morphe-patches) | GPL-3.0 | 2026-11-06 | Activo | Sucesor de facto de ReVanced. |
| **Metrolist** | [MetrolistGroup/Metrolist](https://github.com/MetrolistGroup/Metrolist) | GPL-3.0 | 2026-11-03 | Activo | Cliente de YT Music. Stack moderno (Compose, Hilt, Media3 con cast). Buena referencia de arquitectura. |
| **InnerTune** | [z-huang/InnerTune](https://github.com/z-huang/InnerTune) | GPL-3.0 | 2025-11-13 | Lento/inactivo | Origen de la familia de clientes de YT Music. |
| **ViMusic** | [vfsfitvnm/ViMusic](https://github.com/vfsfitvnm/ViMusic) | GPL-3.0 | **2023-09-23** | Inactivo | Ejemplo de abandono. |
| **Kreate** | [knighthat/Kreate](https://github.com/knighthat/Kreate) | GPL-3.0 | 2026-11-06 | Activo | Cliente de música (linaje de ViMusic). |
| **Seal** | [JunkFood02/Seal](https://github.com/JunkFood02/Seal) | GPL-3.0 | 2026-09-25 | Activo | Descargador Android con yt-dlp y Material You. |
| **Yattee** | [yattee/yattee](https://github.com/yattee/yattee) | AGPL-3.0 | 2026-10-31 | Activo | Cliente iOS/macOS/tvOS (Invidious/Piped). |
| **Clipious** | [lamarios/clipious](https://github.com/lamarios/clipious) | AGPL-3.0 | 2025-09-13 | Lento | Cliente Android de Invidious (Flutter). |
| **Materialious** | [Materialious/Materialious](https://github.com/Materialious/Materialious) | AGPL-3.0 | 2026-11-07 | Activo | Web/escritorio/Android con SvelteKit, Capacitor y Shaka. **La referencia web más cercana a nuestro Producto B.** |
| **TizenTube** | [reisxd/TizenTube](https://github.com/reisxd/TizenTube) | GPL-3.0 | 2026-10-17 | Activo | TV Samsung (Tizen). |
| **Kodi YouTube add-on** | [anxdpanic/plugin.video.youtube](https://github.com/anxdpanic/plugin.video.youtube) | GPL (carpeta LICENSES) | 2026-07-09 | Lento | Usa la Data API con claves propias del usuario. Precedente del modelo “trae tu clave”. |
| **VueTube** | VueTube/VueTube | — | clon fallido | [NV] | Se reporta archivado [NV]. |
| **NouTube** | — | — | no localizado | [NV] | Aparece en listados de AlternativeTo; repositorio no identificado. |

## C. Librerías y servicios reutilizables (sin app propia o como infraestructura)

| Componente | Repositorio | Licencia | Último commit | Qué aporta | Riesgo |
|---|---|---|---|---|---|
| **NewPipeExtractor** | [TeamNewPipe/NewPipeExtractor](https://github.com/TeamNewPipe/NewPipeExtractor) | GPL-3.0 | 2026-11-02 | Extracción de YouTube, SoundCloud, PeerTube, Bandcamp y media.ccc. | GPL contagia la app. La parte de YouTube choca con los ToS (ver doc 05). |
| **YouTube.js (youtubei.js)** | [LuanRT/YouTube.js](https://github.com/LuanRT/YouTube.js) | MIT | 2026-11-04 | Cliente JS de la API interna InnerTube. Lo usan FreeTube y Materialious. | Misma tensión con los ToS. |
| **yt-dlp** | [yt-dlp/yt-dlp](https://github.com/yt-dlp/yt-dlp) | Unlicense | 2026-11-04 | Descarga de más de 1000 sitios. | Caso Uberspace (doc 05). |
| **cobalt** | [imputnet/cobalt](https://github.com/imputnet/cobalt) | AGPL-3.0 | 2026-04-06 | Descargador web. | Ídem. |
| **SponsorBlock** | [ajayyy/SponsorBlock](https://github.com/ajayyy/SponsorBlock) | GPL-3.0 (extensión); API pública | 2026-10-18 | Segmentos colaborativos y DeArrow. | Servicio de terceros; depende de su disponibilidad. |
| **Return YouTube Dislike** | [Anarios/return-youtube-dislike](https://github.com/Anarios/return-youtube-dislike) | — | (no clonado) | Estimación de dislikes. | Los datos son estimaciones, no oficiales. |
| **PeerTube** | [Chocobozzz/PeerTube](https://github.com/Chocobozzz/PeerTube) | AGPL-3.0 | 2026-11-06 | Vídeo federado con **API REST abierta y documentada**. | Bajo: es una fuente legítima. |
| **Jellyfin** | jellyfin/jellyfin | GPL-2.0 [NV: clon no incluido] | — | Servidor multimedia personal con API abierta. | Bajo. |
| **Media3 / ExoPlayer** | androidx/media | Apache-2.0 | — | Reproductor estándar en Android. | Bajo. |
| **Shaka Player** | shaka-project/shaka-player | Apache-2.0 | — | DASH/HLS en la web (lo usan FreeTube y Materialious [V-código]). | Bajo. |
| **Javet (V8)** | caoccao/Javet | Apache-2.0 | — | Motor JS en Android; Grayjay lo usa para sus plugins [V-código: `javet-v8-android:4.1.5`]. | Tamaño del APK. |

## D. Hallazgo transversal del catálogo

Todos los clientes de YouTube activos analizados contienen código para **generar PoTokens** (atestación anti-bots de YouTube basada en BotGuard) o para gestionar **SABR** (el protocolo de streaming que YouTube está imponiendo) [V-código; conteos en `evidencia/potoken-sabr.md`].
- NewPipe: `app/.../util/potoken/PoTokenWebView.kt` y `PoTokenGenerator.kt`, que ejecutan BotGuard en una WebView oculta.
- LibreTube: `api/poToken/PoTokenWebView.kt`.
- También PipePipe, Flow, SmartTube, FreeTube, Grayjay, Invidious-companion y YouTube.js.

**Consecuencia:** el coste de mantenimiento de un cliente de YouTube ya no es solo “parsear HTML”. Es una carrera continua contra mecanismos anti-bots. Esto pesa en la viabilidad (doc 05) y condiciona la constitución.
