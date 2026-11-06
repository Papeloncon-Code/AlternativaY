# 05 · Viabilidad legal y técnica

Consulta: 2026-11-06. **Esto no es asesoramiento jurídico.** Es un análisis de riesgos para tomar decisiones de producto. Antes de lanzar comercialmente, hay que validarlo con un abogado especializado en propiedad intelectual y TI, en cada jurisdicción objetivo.

**Limitación de fuentes:** la red de esta sesión no resuelve `youtube.com`, `developers.google.com` ni `support.google.com`. Las citas de esas páginas proceden de **extractos indexados por buscadores** y se marcan [S-oficial]. Hay que verificarlas leyendo la página completa (pendiente en el doc 00 §6).

## 1. Marco normativo y contractual relevante

### 1.1 Términos de Servicio de YouTube [S-oficial]
Según el extracto, el usuario no puede:
- **descargar** contenido salvo que YouTube muestre un enlace de descarga o lo autorice por escrito: “access, reproduce, download, distribute… any part of the Service or any Content except…” (citado en [pythondiscord.com](https://www.pythondiscord.com/pages/tags/ytdl/));
- **acceder por medios automatizados** (“robots, botnets or scrapers”) salvo los buscadores públicos que respetan `robots.txt` o con permiso previo por escrito (citado en [uwlax.edu](https://libguides.uwlax.edu/online-music/copyright)).

Los clientes alternativos operan **contra estos términos**. El riesgo inmediato recae sobre todo en el usuario: bloqueo de IP o de cuenta. Para quien distribuye el cliente, el riesgo es contractual y de plataforma (ver 1.4).

### 1.2 YouTube API Services: Developer Policies [S-oficial: [developers.google.com/youtube/terms/developer-policies](https://developers.google.com/youtube/terms/developer-policies), [guía de cumplimiento](https://developers.google.com/youtube/terms/developer-policies-guide)]
Prohibiciones (“must not”, prohibición absoluta) según los extractos:
- **Separar, aislar o modificar** el audio o el vídeo.
- **Bloquear, modificar o sustituir anuncios**, o restringir anuncios que se mostrarían en YouTube.
- **Modificar o bloquear el reproductor de YouTube.**
- **Reproducción en segundo plano**, es decir, desde un reproductor no visible en la pantalla que el usuario está viendo.
- **Descargar, importar, almacenar en caché o guardar copias** del contenido audiovisual sin aprobación previa por escrito.
- Condicionar el visionado a suscribirse o dar “me gusta”.

Cuota [S-oficial: [Quota and Compliance Audits](https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits)]:
- 10 000 unidades/día por proyecto para el conjunto de endpoints, más un cupo aparte de **100 llamadas `search.list`/día**.
- Para ampliar hay que pasar una **auditoría de cumplimiento**. No se puede comprar más cuota.

### 1.3 Medidas técnicas de protección (anti-elusión)
- **Alemania, OLG Hamburgo, 5 U 54/23 (21-11-2024).**
  - Confirmó que alojar youtube-dl genera responsabilidad.
  - Consideró que el *rolling cipher* de YouTube es una **medida técnica de protección eficaz**, y que el hecho de que otras herramientas la superen no la hace ineficaz.
  - Fuentes: [heise](https://www.heise.de/en/news/OLG-Hamburg-Uberspace-liable-for-hosting-Youtube-DL-10179284.html), [TorrentFreak](https://torrentfreak.com/court-rejects-appeal-of-youtube-dl-hosting-provider-uberspace-241127-1/), [IFPI](https://www.ifpi.org/comment-from-ifpi-on-the-hamburg-appeal-courts-decision-to-uphold-its-order-against-hosting-provider-of-youtube-dl/).
  - IFPI la presenta como firme. No se ha verificado si hubo un recurso posterior [S].
- **UE**: el art. 6 de la Directiva 2001/29/CE protege las medidas técnicas.
- **EE. UU.**: la DMCA §1201 prohíbe eludirlas y traficar con herramientas de elusión [I: conocimiento general; verificar con un abogado].
- **Inferencia [I]:** la generación de **PoTokens**, que ejecuta BotGuard para obtener una atestación y que todos los clientes analizados implementan (doc 01 §D), tiene un perfil de riesgo **igual o mayor** que el *rolling cipher*. Su finalidad es precisamente superar un control anti-bots. **El encargo prohíbe expresamente proponer mecanismos de evasión, así que queda fuera del diseño.**

### 1.4 Google Play
Las retiradas de apps que descargan o acceden a YouTube contra sus ToS se justifican con la política **Device and Network Abuse**, que prohíbe acceder de forma no autorizada a servicios o APIs [S: notificaciones de rechazo citadas en foros de desarrolladores, por ejemplo [b4x](https://www.b4x.com/android/forum/threads/google-rejects-the-application.103059/)]. Por eso **ningún** cliente alternativo de YouTube está en Google Play [V-doc: todos distribuyen por F-Droid, IzzyOnDroid o GitHub].

### 1.5 Marcas
Usar “YouTube” en el nombre o el logotipo del producto, incluido “YouTube Killer”, es un riesgo de marca evidente [I]. **“YouTube Killer” solo puede ser un nombre interno.** AlternativaY también evoca a YouTube; conviene buscar un nombre propio antes del lanzamiento.

### 1.6 Licencias de terceros (para reutilizar código)
| Componente | Licencia | Implicación |
|---|---|---|
| NewPipeExtractor, NewPipe, PipePipe, LibreTube, Flow, SkyTube | GPL-3.0 | Si se integra, toda la app pasa a ser GPL-3.0. |
| Invidious, Piped, FreeTube, PeerTube | AGPL-3.0 | Reutilizarlo en un servidor obliga a publicar el código del servicio. |
| Grayjay | Source First 1.1 | **No reutilizable** en un producto comercial. |
| Media3, Shaka Player, Javet | Apache-2.0 | Libre de usar. |
| YouTube.js | MIT | Permisiva, pero su uso es el de extracción (ver 1.3). |
| Datos de SponsorBlock | CC BY-NC-SA 4.0 [NV: verificar en sponsor.ajay.app] | **No comercial**: impide su uso en un plan de pago si se confirma. |

## 2. Diferencias entre modelos de integración

| Modelo | Descripción | Riesgo legal | Riesgo de mantenimiento | Veredicto |
|---|---|---|---|---|
| **APIs oficiales** (YouTube Data API + IFrame Player) | Metadatos por API y reproducción con el reproductor oficial incrustado | **Bajo** si se cumplen las políticas | Bajo (API estable) y cuota limitada | ✅ Permitido, con anuncios, sin segundo plano y sin descargas |
| **RSS público de canales de YouTube** (`feeds/videos.xml?channel_id=…`) | Feed que YouTube publica para lectores RSS | **Bajo-moderado** [I]: es un formato pensado para lectores; leer los ToS sobre la frecuencia de consulta | Bajo | ✅ Para suscripciones sin gastar cuota; la reproducción va por el embed oficial |
| **Contenido aportado por el usuario** | Ficheros locales, su NAS, su Jellyfin o Nextcloud | **Bajo** (es su contenido o su servidor) | Bajo | ✅ |
| **Fuentes abiertas** (PeerTube, podcasts RSS, Internet Archive, Podcast Index) | APIs y feeds públicos diseñados para clientes de terceros | **Bajo**; respetar la licencia de cada vídeo o episodio | Bajo-medio | ✅ Núcleo del producto |
| **Otras plataformas con API oficial** (Vimeo, Dailymotion, Twitch) | Cada una con sus términos | Medio (revisar cada ToS) | Medio | 🟡 Fase 3, tras revisión legal |
| **Extracción de la API interna** (InnerTube, PoToken, SABR) | Lo que hacen NewPipe, PipePipe, Flow… | **Alto**: ToS, elusión probable y expulsión de Google Play | **Muy alto** (carrera permanente) | ❌ Excluido por la constitución |
| **Descarga de YouTube** | yt-dlp y similares | **Alto** (caso Uberspace) | Alto | ❌ |
| **Reproductor independiente para YouTube** (sin el embed) | Media3 reproduciendo streams de YouTube | Alto (requiere extracción) | Alto | ❌ |
| **Extracción de información pública** (scraping de páginas) | HTML de sitios | Medio-alto según el sitio (ToS y bases de datos) | Alto | ❌ Salvo permiso o API |
| **Plugins de terceros que hagan extracción** | El modelo de Grayjay | El distribuidor del plugin asume el riesgo, pero si nuestro catálogo o diseño lo facilita, se nos podría imputar [I] | — | 🟡 Ver §4 |

## 3. Qué significa esto para el producto (conclusión crítica)

1. **No es viable de forma sostenible y legítima construir “un cliente de YouTube mejor que NewPipe”.**
   - Lo que hace atractivos a NewPipe, PipePipe y Flow (sin anuncios, segundo plano y descargas de YouTube) depende de incumplir los ToS y de superar controles anti-bots.
   - Esto contradice el propio encargo (sección 10: “no propongas mecanismos para evadir…”, “compatible con las condiciones aplicables”).
2. **YouTube sí puede estar presente, con sus reglas:**
   - búsqueda y metadatos con la Data API, con cuota limitada; alternativa: el usuario aporta su propia clave, como el plugin de Kodi [I; verificar que sea compatible con los ToS de la API];
   - suscripciones por RSS público;
   - reproducción con el **reproductor oficial incrustado**, con anuncios, sin segundo plano ni descarga.
   - Además, nuestro valor añadido **fuera del reproductor**: biblioteca, colecciones, notas, marcadores por minuto, organización y estadísticas. Todo con datos que pertenecen al usuario.
3. **Por tanto, el “killer” no puede ser un YouTube sin anuncios.** Tiene que ser una **biblioteca y reproductor universal de contenido legítimo**:
   - podcasts, PeerTube, RSS, Jellyfin, ficheros locales y YouTube oficial;
   - con sincronización local-first entre Android y web;
   - con IA sobre el contenido al que hay acceso legítimo.

   Es una propuesta **distinta**, no una versión mejorada de NewPipe. Es menos atractiva a corto plazo para el usuario de “YouTube sin anuncios” y mucho más sostenible como empresa, además de distribuible en Google Play.

## 4. Política de extensiones (para no heredar el riesgo)
- **Catálogo oficial:** solo conectores revisados que usen APIs o feeds oficiales y respeten los ToS de cada fuente.
- **Conectores de terceros:** instalables por URL, como en Grayjay. La app **no** incluye, enlaza ni promociona conectores que extraigan servicios contra sus términos.
  - **Riesgo residual [I]:** si el mecanismo se usa masivamente para YouTube, Google Play puede considerarlo una facilitación. **Decisión recomendada:** en la build de Google Play, conectores de terceros desactivados; en la build F-Droid, permitidos con aviso.
- La SDK de conectores **no ofrecerá** primitivas para ejecutar BotGuard ni para falsificar clientes. No habrá WebView oculta con JS arbitrario de terceros.

## 5. IA y derechos de autor
- **Transcribir y resumir para uso personal** el contenido con acceso legítimo (podcasts, PeerTube con licencia, medios locales) tiene un riesgo bajo-moderado según la jurisdicción [I]. Hacerlo **en el dispositivo** minimiza la reproducción y el almacenamiento en servidor.
- **YouTube**: los subtítulos de vídeos ajenos no se pueden descargar por la API [NV: `captions.download` parece requerir permisos de edición del vídeo]. La IA sobre vídeos de YouTube quedaría limitada a título, descripción y capítulos. Las Developer Policies pueden restringir además el uso de datos de la API con modelos de IA [NV].
- Los resúmenes no deben sustituir la obra (no publicar transcripciones completas) y deben enlazar siempre a la fuente.

## 6. Matriz de riesgos legales por integración (resumen)

| ID | Integración | Probabilidad de conflicto | Impacto | Mitigación | Fase |
|---|---|---|---|---|---|
| RL-01 | Podcasts RSS + Podcast Index | Baja | Bajo | Respetar caché y `robots`; mostrar al autor | MVP |
| RL-02 | PeerTube (API REST) | Baja | Bajo | Respetar licencias y permisos de descarga de cada instancia | MVP |
| RL-03 | Medios locales / SAF | Muy baja | Bajo | — | MVP |
| RL-04 | Jellyfin (servidor del usuario) | Muy baja | Bajo | Credenciales en Keystore | Fase 2 |
| RL-05 | YouTube: RSS + embed oficial | Baja-media | Medio | Cumplir las Developer Policies y la RMF; sin segundo plano ni bloqueo de anuncios | MVP (limitado) |
| RL-06 | YouTube Data API | Media (cuota y auditoría) | Medio | Auditoría; opción de clave propia del usuario | Fase 2 |
| RL-07 | Vimeo, Dailymotion, Twitch | Media | Medio | Revisión legal por plataforma | Fase 3 |
| RL-08 | SponsorBlock | Media (licencia NC [NV]) | Medio | Solo en el plan gratuito o pedir permiso | Fase 2 |
| RL-09 | IA sobre contenido | Media | Medio | En el dispositivo, opt-in, sin redistribuir | Fase 4 |
| RL-10 | Extracción de YouTube | **Alta** | **Alto** | **Excluida** | — |
| RL-11 | Nombre o marca “YouTube” | Alta | Alto | Nombre propio antes del lanzamiento | Antes del MVP público |
