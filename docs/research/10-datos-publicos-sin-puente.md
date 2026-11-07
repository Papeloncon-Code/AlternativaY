# 10 · Fotos de canal, visitas y descripciones sin TodoTube Puente

| Campo | Valor |
|---|---|
| Fecha | 2026-11-07 |
| Problema | Sin el Puente no había fotos de canal ni los datos que muestran las tarjetas de YouTube (visitas, me gusta, descripción); además, las tarjetas se veían más pequeñas que en YouTube. |
| Decisión | Del propietario, 2026-11-07: vista previa pública del canal **una vez al día** y datos del RSS público. Ver ADR-006, enmienda 3, y constitución §I.2. |
| Leyenda | [V] verificado en fuente primaria o con prueba propia · [S] fuente secundaria · [I] inferencia |

## 1. Qué trae cada fuente
| Fuente | Foto del canal | Nombre | Visitas | Me gusta | Descripción | Duración | ¿Short? | ¿Permitida? |
|---|---|---|---|---|---|---|---|---|
| Aviso WebSub | — | — | — | — | — | — | — | Sí (ya en uso) |
| RSS público del canal | — | ✅ | ✅ `media:statistics views` | ✅ `media:starRating count` | ✅ `media:description` | — | ✅ el enlace apunta a `/shorts/ID` | Sí (ya en uso) [V: feed real de LTT] |
| oEmbed (desde el navegador) | — | ✅ | — | — | — | — | — | Sí (ya en uso) |
| Vista previa del canal (Open Graph) | ✅ `og:image` en `yt3.googleusercontent.com` | ✅ `og:title` | — | — | — | — | — | **Sí desde la enmienda de 2026-11-07** |
| API oficial de datos de YouTube | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | **No:** sus normas prohíben bloquear anuncios en la app que la usa; pueden quitar la clave o cerrar la cuenta de Google [V: developer-policies, vía buscador] |
| TodoTube Puente (en el dispositivo) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Sí |

La duración y la insignia de verificado siguen necesitando el Puente.

## 2. Vista previa del canal: cómo se lee sin abusar
- La página del canal pesa ~2,6 MB y `og:image` aparece hacia el byte 835 000 [V: medido].
- El servidor la lee por partes y **cancela la descarga** en cuanto tiene la foto y el nombre: ~0,8 MB por canal y día.
- Va en una **tarea programada aparte** (cada 10 min, un canal cada vez), para no afectar a los avisos si algún día excede el tiempo de CPU.
- Solo acepta fotos de `yt3.googleusercontent.com` / `yt3.ggpht.com` y pide el tamaño 176 px.
- Si YouTube responde con error o la bloquea, se anota el intento y se muestran las iniciales: como mucho un intento al día por canal.
- Pruebas: `spikes/websub/test/preview.test.mjs` (etiquetas partidas entre trozos, cancelación, CDN no permitida, errores).

## 3. Tamaño de las tarjetas
- YouTube no publica sus cortes; fuentes secundarias coinciden en que hoy muestra **3 vídeos por fila** en muchas pantallas, y 4–5 en monitores anchos [S: DroidWin, iTechGuides].
- TodoTube mostraba 4 columnas a 1243 px (captura del propietario). Ahora las columnas se calculan con tarjetas de al menos 320 px: 1243 px → 3, 1920 px con menú → 4, 2560 px → 6.

## 4. Privacidad (auditoría)
- Registros de Cloudflare desactivados en los dos servicios (`observability: null`, `logpush: false`) [V: API de Cloudflare].
- Eliminado el reenvío de avisos a ntfy.sh (tercero) y su secreto.
- Los registros técnicos (`events`, `runs`) se borran a los 7 días.
- Página pública `/privacidad` con lo que se guarda, lo que se queda en el navegador y los servicios a los que llama tu navegador.

## Fuentes
- [YouTube API Services — Developer Policies](https://developers.google.com/youtube/terms/developer-policies) · [Guía de cumplimiento](https://developers.google.com/youtube/terms/developer-policies-guide)
- [Media RSS](https://rssboard.org/media-rss) · feed real `youtube.com/feeds/videos.xml?channel_id=UCXuqSBlHAE6Xw-yeJA0Tunw` (2026-11-07)
- [DroidWin: 3 vídeos por fila](https://droidwin.com/youtube-showing-3-videos-per-row-how-to-increase-it/) · [iTechGuides: prueba de miniaturas grandes](https://www.itechguides.com/youtube-is-testing-giant-homepage-thumbnails-and-many-desktop-users-hate-losing-the-video-grid/)
