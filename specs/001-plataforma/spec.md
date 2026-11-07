# Especificación de producto: plataforma (qué y por qué)

Estado: **Borrador para aprobación** · 2026-11-06 · Depende de: constitución v1.0 y `docs/research/*`.

## 1. Visión y propuesta de valor

> **v2 (ADR-005):** el producto es un **cliente de YouTube completo** (sin anuncios, en segundo plano, con PiP, descargas y SponsorBlock), al nivel de PipePipe y Flow. Encima añade lo que ninguno tiene: **avisos en tiempo real** de vídeos, estrenos y directos (ADR-006), **sincronización móvil ↔ web** y una biblioteca universal.

**El mejor cliente de YouTube, que además te avisa en cuanto tu creador publica, te sigue del móvil a la web y reúne todo lo que ves y escuchas en un solo sitio.**

Propuesta de valor concreta (hipótesis por validar, doc 04 §5):
0. **YouTube completo:** sin anuncios, en segundo plano, PiP, descargas, SponsorBlock, DeArrow y RYD (paridad con PipePipe y Flow), con reproductor Media3 moderno.
0b. **Avisos al momento:** cuando un creador publica, programa un estreno o empieza un directo, el aviso llega en minutos por push. Hoy NewPipe pregunta cada 15 min como mínimo y PipePipe, Flow y LibreTube no usan push (verificado en su código).
1. **Biblioteca universal:** YouTube, podcasts, PeerTube, RSS, Jellyfin y ficheros locales, en un único feed, historial y buscador.
2. **Sincronización local-first entre Android y web**, cifrada y sin Google. Es lo que nadie hace bien (doc 03 §4.3).
3. **Control y foco:** filtros, grupos y perfiles, modo sin distracciones, estadísticas de consumo y control parental.
4. **Comprensión del contenido (IA opt-in):** transcripción y búsqueda por lo que se dice, capítulos, resúmenes y marcadores por minuto sobre contenido con acceso legítimo.
5. **Dos builds:** `full` (F-Droid, IzzyOnDroid, GitHub) con YouTube completo; `play` (Google Play) sin extracción.

**Qué NO somos:** una copia de PipePipe. Igualar sus funciones es la entrada; ganamos con push en tiempo real, sincronización con la web y biblioteca universal.

## 2. Segmentos objetivo (por orden)
1. **Oyentes intensivos de podcasts y vídeo largo** que mezclan fuentes. El segmento más fácil de captar: los podcasts no tienen el bloqueo legal de YouTube.
2. **Usuarios de privacidad y fediverso** (PeerTube, Jellyfin, autoalojamiento) que ya usan Grayjay y FreeTube.
3. **Estudiantes y profesionales** que aprenden con vídeo y necesitan notas, marcadores y búsqueda dentro del contenido.
4. **Familias** que quieren un consumo controlado: perfiles, control parental y límites.

## 3. Requisitos funcionales (RF)

Prioridades:
- **P0**: MVP.
- **P1**: fase 2.
- **P2**: fases 3–4.
- **P3**: especulativo.

| ID | Requisito | Prior. | Origen |
|---|---|---|---|
| RF-001 | Añadir fuentes: feed RSS/podcast (URL u OPML), canal/cuenta de PeerTube, carpeta local | P0 | 03 §4.5, 05 RL-01..03 |
| RF-002 | Feed unificado de novedades con filtros por fuente, tipo, duración y estado (visto/no visto) | P0 | 04 #5 |
| RF-003 | Reproductor de audio y vídeo con segundo plano, notificación multimedia, PiP, velocidad 0,5–3×, saltos configurables y reanudación automática | P0 | 03 §4.2 |
| RF-004 | Cola de reproducción (añadir, reordenar, siguiente) | P0 | NewPipe |
| RF-005 | Descargas para escuchar sin conexión (solo fuentes que lo permiten: enclosures de podcast, PeerTube con descarga habilitada) | P0 | 04 #4 |
| RF-006 | Biblioteca: favoritos, colecciones y etiquetas | P0 | Encargo §7 |
| RF-007 | Historial y progreso por elemento | P0 | 03 §4.2 |
| RF-008 | Búsqueda local sobre títulos, descripciones y notas (FTS) | P0 | — |
| RF-009 | Importar/exportar: OPML; JSON completo; importar suscripciones de NewPipe, FreeTube y LibreTube (formatos documentados de sus exportaciones) | P0 | 04 “impedimento #1” |
| RF-010 | YouTube (build `play`): suscribirse por RSS público y ver con el reproductor oficial incrustado | P1 | 05 RL-05 |
| RF-034 | **YouTube completo (build `full`)**: buscar, ver canales, listas, comentarios, Shorts opcionales; reproducción Media3 sin anuncios; segundo plano, PiP, calidad hasta 4K/8K si la hay, AV1/VP9, subtítulos, capítulos; descargas; SponsorBlock, DeArrow, RYD; extracción solo en el dispositivo | **P0** | ADR-005 |
| RF-035 | **Avisos en tiempo real** de vídeos nuevos, estrenos y directos (WebSub → FCM/UnifiedPush/Web Push), con ajustes por canal y horas de silencio | **P0** | ADR-006 |
| RF-036 | Importar suscripciones de YouTube (Google Takeout CSV) y de NewPipe, PipePipe, FreeTube, LibreTube y Flow | **P0** | 04 “impedimento #1” |
| RF-037 | Módulo de YouTube con actualización rápida: canal de actualización in-app para la build `full` (hotfix en horas) | P0 | Lección de Grayjay |
| RF-038 | **Importación automática de suscripciones sin iniciar sesión**: pregunta “¿qué usas para ver vídeos?”. En Android `full`, el lector automático lee la lista de suscripciones de la app de YouTube con el permiso del usuario. En `play` y web, “Permitir” de Google o extensión del navegador. Se importa una vez y llega a todos los dispositivos por sincronización. | **P0** | ADR-007 |
| RF-011 | Cuenta opcional y sincronización (biblioteca, progreso, historial y suscripciones) entre Android y web | P0 | 03 §4.3 #1 |
| RF-012 | Web app (PWA) con las mismas funciones de biblioteca y reproductor (con los límites del navegador) | P0 | Encargo §8B |
| RF-013 | Marcadores por minuto con nota | P1 | Encargo §7 |
| RF-014 | Grupos y perfiles de suscripciones (feeds temáticos) | P1 | FreeTube, LibreTube |
| RF-015 | Filtros de contenido por palabra clave, duración y fuente | P1 | SkyTube, PipePipe |
| RF-016 | Modo sin distracciones / minimalista / cine | P1 | FreeTube |
| RF-017 | Cast con Chromecast (Media3 cast) | P1 | 04 #6 |
| RF-018 | Jellyfin como fuente | P1 | 05 RL-04 |
| RF-019 | Normalización de volumen y recorte de silencios (audio) | P1 | Flow, apps de podcast |
| RF-020 | Estadísticas de consumo (tiempo por fuente y tema, sin enviar nada) | P1 | Encargo §7 |
| RF-021 | Temporizador de apagado | P1 | Flow, PipePipe |
| RF-022 | Perfiles de usuario y control parental (PIN, listas permitidas, límites de tiempo) | P2 | Encargo §7 |
| RF-023 | Transcripción en el dispositivo (audio de fuentes legítimas) | P2 | Innovación |
| RF-024 | Búsqueda por palabras pronunciadas (sobre transcripciones) | P2 | Innovación |
| RF-025 | Capítulos automáticos y resumen (opt-in) | P2 | Innovación |
| RF-026 | Preguntas y respuestas sobre un episodio o vídeo | P2 | Innovación |
| RF-027 | Recomendaciones locales explicables y controladas por el usuario | P2 | Flow (FlowNeuro) |
| RF-028 | SDK de conectores de terceros (sandbox, permisos y firma) | P2 | Grayjay |
| RF-029 | YouTube Data API: búsqueda y metadatos (cuota o clave del usuario) | P2 | 05 RL-06 |
| RF-030 | Control multidispositivo (“reproducir en mi otro dispositivo”) | P2 | Encargo §7 |
| RF-031 | Traducción de subtítulos y transcripciones | P3 | Innovación |
| RF-032 | Organización automática de la biblioteca por temas | P3 | Innovación |
| RF-033 | Android TV | P3 | SmartTube (lección) |

## 4. Requisitos no funcionales (RNF)

| ID | Requisito | Medida |
|---|---|---|
| RNF-001 | Arranque en frío en Android | < 1,5 s (p75, dispositivo de referencia de gama media) |
| RNF-002 | Tamaño del APK base | < 25 MB (los modelos de IA se descargan aparte) |
| RNF-003 | Web | LCP < 2,5 s, INP < 200 ms en 4G |
| RNF-004 | Uso offline | 100 % de las funciones de biblioteca sin red |
| RNF-005 | Convergencia de sincronización | Dos dispositivos con ediciones concurrentes convergen en < 10 s con red |
| RNF-006 | Privacidad | Cero telemetría por defecto; cifrado en reposo en el servidor; E2EE opcional (fase 5) |
| RNF-007 | Accesibilidad | WCAG 2.2 AA; TalkBack y lectores de pantalla en todas las pantalla P0 |
| RNF-008 | Coste de infraestructura | < 0,02 USD por usuario activo al mes sin IA (objetivo de la fase 1) |
| RNF-009 | Disponibilidad de sincronización | 99,5 %. La app funciona igual si el servidor cae. |
| RNF-010 | Seguridad | OWASP MASVS-L1 (Android) y ASVS L2 (web/API) |

## 5. Funcionalidades nuevas: análisis detallado

**Viabilidad:**
- **A**: posible hoy.
- **E**: experimental.
- **S**: especulativo.

**Mantenimiento:** coste estimado relativo (Bajo, Medio o Alto).

| Funcionalidad | Problema que resuelve | Beneficio | ¿Existe? | Implementación | Tecnologías | Dific. | Mant. | Prior. | Límites legales/técnicos | Viab. |
|---|---|---|---|---|---|---|---|---|---|---|
| Biblioteca universal | Contenido disperso en 5 apps | Un solo lugar | Parcial (Grayjay) | Modelo `MediaItem` común; conectores | Room/SQLite, Postgres | M | M | P0 | Solo fuentes legítimas | A |
| Sincronización local-first | Datos atrapados en un dispositivo | Continuidad móvil ↔ web | Mal resuelta (doc 03) | Registro de operaciones + HLC + LWW por campo | Kotlin, TS, Postgres | A | M | P0 | — | A |
| Marcadores por minuto | No se puede volver a “ese momento” | Estudio y referencia | No (en clientes) | Entidad `Bookmark(itemId, posMs, nota)` | — | B | B | P1 | — | A |
| Perfiles de calidad | Datos móviles frente a wifi | Ahorro | Parcial | Reglas por red/batería → selección de pista | Media3 TrackSelector | B | B | P1 | — | A |
| Normalización de volumen | Saltos de volumen entre fuentes | Confort | Flow | `LoudnessEnhancer`/audio processor Media3; web: WebAudio | Media3, WebAudio | M | B | P1 | Ninguno | A |
| Ecualizador | Calidad de audio | Personalización | Flow | `Equalizer` de Android; web: BiquadFilter | — | B | B | P2 | — | A |
| Recorte de silencios | Podcasts más ágiles | Ahorro de tiempo | Apps de podcast (no clientes de vídeo) | `SilenceSkippingAudioProcessor` (Media3) | Media3 | B | B | P1 | — | A |
| Subtítulos avanzados | Legibilidad | Accesibilidad | Flow | `CaptionStyleCompat`; tamaño, fondo, posición; WebVTT en la web | Media3, `<track>` | B | B | P1 | Los de YouTube no son accesibles | A |
| Control multidispositivo | “Sigue en el portátil” | Continuidad | ReVanced/YouTube oficial | Canal de presencia por WebSocket a través del servidor de sincronización | WS, protocolo propio | M | M | P2 | — | A |
| Cast | Ver en la TV | Paridad competitiva | Grayjay, Flow | `media3-cast`; FCast (abierto) en fase 3 | Cast SDK | M | M | P1 | El Cast SDK requiere Google Play Services (build F-Droid sin él) | A |
| Transcripción | El audio no se puede buscar | Búsqueda y accesibilidad | **No** | whisper.cpp en el dispositivo (modelo tiny/base) o en servidor (opt-in) | whisper.cpp (MIT), NNAPI/GPU | A | M | P2 | Solo contenido legítimo; batería | E (rendimiento en gama media NV) |
| Búsqueda por palabras pronunciadas | “¿En qué episodio dijeron X?” | **Diferenciador fuerte** | **No** | FTS sobre segmentos de transcripción con marcas de tiempo | SQLite FTS5 / Postgres tsvector | M | B | P2 | Depende de la transcripción | E |
| Capítulos automáticos | Vídeos largos sin capítulos | Navegación | No (YouTube solo si el autor los pone) | Segmentación de la transcripción (LLM o heurística de pausas y temas) | LLM local/servidor | M | M | P2 | — | E |
| Resumen | Decidir si vale la pena | Ahorro de tiempo | No | LLM sobre la transcripción; en el dispositivo si hay modelo pequeño, si no servidor opt-in | LLM vía API (p. ej. Claude) o modelo local | M | **A** (coste por token) | P2 | No sustituir la obra; enlazar a la fuente | A (servidor) / E (local) |
| Preguntas y respuestas | Encontrar respuestas en contenido largo | Estudio | No | RAG sobre segmentos de la transcripción | Embeddings + LLM | A | A | P2 | Ídem | E |
| Extracción de conceptos | Repaso | Aprendizaje | No | LLM → lista de conceptos con marcas de tiempo | LLM | M | M | P3 | — | E |
| Organización automática | Biblioteca caótica | Orden | No | Clasificación por embeddings → etiquetas sugeridas (nunca automáticas sin confirmar) | Embeddings | M | M | P3 | — | E |
| Recomendaciones controladas | Algoritmos opacos y adictivos | Confianza | Flow (local) | Puntuación local con pesos visibles y editables, sin servidor | Kotlin/TS | M | B | P2 | — | A |
| Traducción de subtítulos | Idioma | Alcance | No | Traducción automática local o en servidor | Modelos de traducción | A | A | P3 | Calidad variable | S (en el dispositivo) |
| Estadísticas de consumo | Falta de conciencia del tiempo | Bienestar digital | No (clientes) | Agregación local de eventos de reproducción | Room | B | B | P1 | — | A |
| Modo productividad | Distracción | Foco | Parcial (FreeTube) | Oculta el feed; solo biblioteca y cola; límites | UI | B | B | P1 | — | A |
| Control parental | Menores | Confianza familiar | No (clientes) | Perfiles con PIN, listas permitidas y límites | — | M | M | P2 | La lista de YouTube depende de su embed | A |
| Servidores personales | Contenido propio | Autoalojamiento | Parcial | Conector de Jellyfin (API REST abierta) | — | M | M | P1 | — | A |
| Podcasts | Fuente principal legítima | Segmento 1 | No en clientes de vídeo | RSS 2.0 + namespace Podcasting 2.0 (capítulos, transcripciones) | Parser XML | B | B | P0 | — | A |

**Detalle importante [I]:** el namespace *Podcasting 2.0* permite que el autor publique **transcripciones y capítulos** en el feed (`podcast:transcript`, `podcast:chapters`). Esto da funciones “de IA” sin IA ni coste en una parte del catálogo. Hay que verificar su adopción real antes de prometerlo.

## 6. Matriz de prioridades (valor/esfuerzo)

Puntuación = (Valor × Confianza) / Esfuerzo, en escala 1–5. El valor procede del doc 04 §3 y la confianza de la calidad de la evidencia.

| Funcionalidad | Valor | Confianza | Esfuerzo | Puntuación | Fase |
|---|---|---|---|---|---|
| **YouTube completo (RF-034)** | 5 | 5 | 4 | 6,3 | MVP |
| **Avisos en tiempo real (RF-035)** | 5 | 4 | 3 | 6,7 | MVP |
| Importar suscripciones de YouTube desde archivo (RF-036) | 3 | 5 | 1 | 15,0 | MVP |
| **Importación automática sin iniciar sesión (RF-038)** | 5 | 3 | 3 | 5,0 | MVP |
| Podcasts + PeerTube + local (RF-001) | 4 | 4 | 2 | 8,0 | MVP |
| Reproductor con segundo plano, PiP y cola (RF-003/004) | 5 | 5 | 3 | 8,3 | MVP |
| Importar/exportar (RF-009) | 5 | 4 | 2 | 10,0 | MVP |
| Sincronización (RF-011) | 5 | 4 | 4 | 5,0 | MVP |
| Web PWA (RF-012) | 4 | 3 | 4 | 3,0 | MVP |
| YouTube oficial para la build `play` (RF-010) | 3 | 3 | 2 | 4,5 | F2 |
| Marcadores (RF-013) | 3 | 3 | 1 | 9,0 | F2 |
| Filtros y grupos (RF-014/015) | 4 | 4 | 2 | 8,0 | F2 |
| Cast (RF-017) | 4 | 4 | 3 | 5,3 | F2 |
| Modos de foco y estadísticas (RF-016/020) | 3 | 3 | 2 | 4,5 | F2 |
| Transcripción y búsqueda hablada (RF-023/024) | 4 | **2** | 4 | 2,0 | F4 |
| Resúmenes y preguntas (RF-025/026) | 3 | **2** | 3 | 2,0 | F4 |
| SDK de conectores (RF-028) | 4 | 3 | 5 | 2,4 | F3 |

## 7. Competencia y diferenciación

| Pregunta | Respuesta honesta |
|---|---|
| ¿Qué haría que alguien deje PipePipe por nosotros? | Igualamos sus funciones de YouTube (entrada obligatoria) y añadimos: **avisos en minutos en lugar de sondeos cada 15 min o más**, la misma biblioteca en la web, interfaz Compose moderna, cast, podcasts y búsqueda dentro del contenido. |
| ¿Qué tendríamos que no tenga NewPipe? | Sincronización, versión web, PiP nativo, cast, podcasts, Jellyfin, medios locales, marcadores por minuto, modos de foco, estadísticas e IA opt-in. |
| ¿Cómo superar a Grayjay? | Licencia libre real (Grayjay es Source First, no comercial); presencia en Google Play; web (Grayjay tiene escritorio, no web); sincronización fiable como prioridad de ingeniería (sus issues de sync); podcasts de primera clase. |
| ¿Ventajas frente a FreeTube? | Móvil + web con los mismos datos; ligereza frente a Electron; podcasts. Adoptaremos sus ideas de perfiles y modo sin distracciones. |
| ¿Cuál es la principal ventaja competitiva? | **Avisos push en tiempo real + sincronización Android ↔ web.** Ningún cliente alternativo tiene ninguna de las dos bien resuelta (verificado en código, doc 03 y ADR-006). Después, la búsqueda dentro del contenido. |
| ¿Qué errores evitar? | (1) Extraer YouTube desde servidores (Piped e Invidious acaban bloqueados); (2) depender de instancias públicas; (3) proyecto de una persona; (4) licencia hostil (Grayjay); (5) acumular funciones sin estabilidad (riesgo de Flow); (6) fragmentar repositorios y numeración (PipePipe); (7) usar “YouTube” en la marca. |

> **Regla (constitución, §16):** no se publicará “somos mejores que X” hasta tener la funcionalidad implementada y medida.
