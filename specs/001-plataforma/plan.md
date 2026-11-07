# Plan: roadmap, stack, repositorio y riesgos

Estado: **Borrador** · 2026-11-06.

## 1. Stack tecnológico recomendado (resumen)

| Capa | Tecnología | Documento |
|---|---|---|
| Android | Kotlin, Compose + Material 3, Media3, Room/SQLite FTS, Hilt, corrutinas, WorkManager, DataStore, OkHttp, kotlinx-serialization, Coil | `arquitectura.md` §4 |
| Web | React 19, TypeScript, Vite, TanStack Router/Query, SQLite-WASM (OPFS), hls.js, Workbox (PWA), Radix | §5.1 |
| Backend | Node.js LTS, Hono, PostgreSQL, pg-boss, passkeys + email, WebSocket, OpenAPI 3.1 | §5.2 |
| Contratos | JSON Schema → generación de código Kotlin/TS; vectores de conformidad de sincronización | §3 |
| IA (fase 4) | whisper.cpp (en el dispositivo), LLM por API con proveedor intercambiable (por ejemplo, Claude) | `spec.md` §5 |
| CI/CD | GitHub Actions; F-Droid (build reproducible) + Google Play; contenedor del backend | — |
| Licencia (**decisión del propietario**, ADR-004) | Recomendación: clientes **GPL-3.0** (confianza, F-Droid, competir con NewPipe); SDK de conectores y contracts **Apache-2.0** (adopción); servidor **AGPL-3.0**. Monetización con sincronización e IA alojadas (servicio), no con el código. | — |

## 2. Estructura inicial del repositorio (monorepo)

```
alternativay/
├─ specs/                      # SDD: constitución, specs, planes, tareas
├─ docs/research/              # investigación y evidencia
├─ docs/adr/                   # decisiones (ADR-001…)
├─ packages/
│  ├─ contracts/               # JSON Schema, OpenAPI, sync-vectors, tokens.json
│  └─ connector-sdk/           # (fase 3) SDK TS + runtime de pruebas
├─ apps/
│  ├─ android/                 # proyecto Gradle (módulos de arquitectura §4.2)
│  ├─ web/                     # React + Vite
│  └─ server/                  # Hono + Postgres
├─ tools/codegen/              # JSON Schema → Kotlin / TS
├─ .github/workflows/          # ci-android, ci-web, ci-server, contracts
└─ docker-compose.yml          # Postgres + server para desarrollo y autoalojamiento
```
**Monorepo** para que un cambio de contrato rompa los tres productos en un mismo PR. Así se evita la fragmentación de repositorios y numeraciones que se vio en PipePipe (doc 02).

## 3. Roadmap por fases

Las estimaciones son **por escenarios**, ya que el equipo y los recursos no se conocen. Están en semanas efectivas y son intervalos, no compromisos.
- **E1**: 1 desarrollador fullstack a tiempo parcial (unas 20 h/semana).
- **E2**: 2 desarrolladores a tiempo completo (Android + web/backend).
- **E3**: 4–5 personas (2 Android, 1 web, 1 backend, 0,5 diseño + 0,5 QA).

### Fase 1: MVP
- **Funcionalidades:** ver el índice en `specs/002-mvp/spec.md` §3 (una carpeta por funcionalidad; web v0.1 ya publicada).
- **Dependencias:** constitución aprobada; nombre definitivo (RL-11); ADR-002/003/004.
- **Tecnologías:** el stack completo de §1, salvo IA y SDK de conectores.
- **Dificultad:** media-alta. La sincronización y la PWA con SQLite-WASM son las piezas de mayor riesgo.
- **Tiempo estimado:** E1 36–52 sem · E2 16–24 sem · E3 10–14 sem.
- **Riesgos:** roturas de la extracción de YouTube; latencia real de WebSub (spike T-007); sincronización con errores de convergencia; soporte de OPFS en Safari.
- **Criterios de cierre:**
  - todos los criterios de aceptación del MVP en verde;
  - RNF-001/002/003/007 medidos;
  - 50 beta testers durante 4 semanas con < 1 % de sesiones con crash;
  - publicación en F-Droid y en la pista interna de Google Play aprobada.

### Fase 2: funcionalidades diferenciadoras
- **Funcionalidades:** marcadores (RF-013), grupos y filtros (RF-014/015), modos de foco (RF-016), cast (RF-017), Jellyfin (RF-018), normalización y recorte de silencios (RF-019), estadísticas (RF-020), temporizador (RF-021) y SponsorBlock en el embed (tras RL-08).
- **Dependencias:** MVP estable; validación de usuarios (doc 04 §5).
- **Dificultad:** media.
- **Tiempo:** E1 20–30 · E2 8–12 · E3 5–8 sem.
- **Riesgos:** sobrecargar la UI (constitución §18).
- **Criterio de cierre:** métricas de retención opt-in de beta ≥ objetivo definido tras el MVP; puntuación de usabilidad (SUS) ≥ 75 con 10 usuarios.

### Fase 3: ecosistema multiplataforma
- **Funcionalidades:** SDK de conectores en sandbox (RF-028), control multidispositivo (RF-030), perfiles y control parental (RF-022), Data API de YouTube (RF-029, si se supera la auditoría), conectores de Vimeo, Dailymotion e Internet Archive (tras revisión legal), FCast y compartir colecciones.
- **Dependencias:** auditoría de seguridad del sandbox; revisión legal por conector.
- **Dificultad:** alta (sandbox con QuickJS en Android y firma).
- **Tiempo:** E1 30–45 · E2 12–18 · E3 8–12 sem.
- **Riesgos:** seguridad de los conectores de terceros; imputación por facilitar conectores que infringen ToS (doc 05 §4).
- **Criterio de cierre:** pentest externo del sandbox sin hallazgos críticos; 3 conectores de la comunidad publicados.

### Fase 4: inteligencia artificial
- **Funcionalidades:** transcripción en el dispositivo (RF-023), búsqueda hablada (RF-024), capítulos y resúmenes (RF-025), preguntas y respuestas (RF-026) y recomendaciones explicables (RF-027).
- **Dependencias:** validación de la demanda (hoy es hipótesis, doc 04); modelo de costes; uso de transcripciones de Podcasting 2.0 cuando existan.
- **Dificultad:** alta (rendimiento de whisper en gama media, batería).
- **Tiempo:** E1 24–40 · E2 10–16 · E3 6–10 sem.
- **Riesgos:** coste por usuario; calidad en idiomas distintos del inglés; batería; derechos de autor (doc 05 §5).
- **Criterio de cierre:**
  - WER (tasa de error por palabra) ≤ 15 % en un corpus de prueba en español e inglés;
  - transcribir 1 h de audio en un dispositivo de referencia en ≤ 15 min y con ≤ 8 % de batería [objetivo, NV];
  - coste del servidor por usuario de IA conocido y cubierto por el plan de pago.

### Fase 5: escalabilidad
- **Funcionalidades:** cifrado de extremo a extremo opcional, compactación de logs, réplicas de Postgres, CDN, autoalojamiento documentado, Android TV (RF-033) y escritorio (por ejemplo, la PWA instalable o Tauri si se demuestra necesario).
- **Tiempo:** continuo; primer ciclo E2 8–12 sem.
- **Criterio de cierre:** 10 000 usuarios activos simulados con p95 de sincronización < 500 ms y coste dentro de RNF-008.

## 4. Riesgos y mitigación

| # | Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|---|
| R1 | **YouTube rompe la extracción** (cambios de PoToken o SABR) y la app deja de reproducir | Alta (recurrente) | Alto | NewPipeExtractor mantenido por la comunidad + parches upstream; detector de roturas; actualizador in-app (arquitectura §12) |
| R1b | **Acción legal o de plataforma** contra el cliente de YouTube (ADR-005) | Media | Alto | Asesoría legal; sin extracción en servidores; monetizar servicios propios, no “sin anuncios” |
| R1c | **WebSub deja de funcionar o se retrasa** | Baja-media | Medio | Respaldo RSS en el servidor + sondeo local (ADR-006) |
| R2 | Google Play rechaza también la build `play` (por el embed de YouTube o las alarmas exactas) | Media | Medio | Cumplir RMF y branding; si se rechaza, la build `play` se publica sin YouTube |
| R3 | Errores de convergencia en la sincronización | Media | Alto | Vectores de conformidad, tests de propiedades (fuzzing de órdenes) y beta larga |
| R4 | Safari/iOS limita OPFS o el segundo plano | Alta | Medio | Fallback a IndexedDB; documentar las limitaciones; spike en la semana 1 |
| R5 | El proxy de feeds abusado (SSRF, DDoS) | Media | Alto | Lista de denegación de IP privadas, límites, caché compartida y rate limiting |
| R6 | Proyecto de una persona (bus factor) | Alta en E1 | Alto | Specs y ADR completos (este repositorio); constitución §17 |
| R7 | Licencia de SponsorBlock no comercial | Media | Bajo | Confirmar; usarla solo en la edición gratuita o pedir permiso |
| R8 | Coste de la IA | Media | Medio | En el dispositivo por defecto; servidor solo en el plan de pago, con límites |
| R9 | Marca (“YouTube”) | Alta | Alto | Nombre propio antes de cualquier publicación |
| R10 | Competidores (Flow, Grayjay) añaden sincronización o podcasts | Media | Medio | Velocidad en la web y en la sincronización, que es nuestra ventaja estructural; Grayjay está limitado por su licencia |
| R11 | Exceso de alcance (como en este propio encargo) | Alta | Alto | MVP cerrado por especificación; todo lo demás al backlog |

## 5. Estimación de coste de infraestructura (MVP) [I: órdenes de magnitud, no presupuestos]
- 1 VPS (2 vCPU, 4 GB) + Postgres gestionado pequeño + almacenamiento de objetos mínimo: del orden de **decenas de USD al mes** para miles de usuarios activos. El vídeo no pasa por el servidor.
- El coste variable principal es el **proxy de feeds para la web**, que se mitiga con la caché compartida de 15 min.
- La IA en servidor es el único coste que escala con el uso y va en el plan de pago (fase 4).


## 6. Implementación de las funcionalidades nuevas (movido desde `spec.md` §5)

Dificultad y mantenimiento: B = bajo, M = medio, A = alto.

| Funcionalidad | Implementación | Tecnologías | Dific. | Mant. |
| --- | --- | --- | --- | --- |
| Biblioteca universal | Modelo `MediaItem` común; conectores | Room/SQLite, Postgres | M | M |
| Sincronización local-first | Registro de operaciones + HLC + LWW por campo | Kotlin, TS, Postgres | A | M |
| Marcadores por minuto | Entidad `Bookmark(itemId, posMs, nota)` | — | B | B |
| Perfiles de calidad | Reglas por red/batería → selección de pista | Media3 TrackSelector | B | B |
| Normalización de volumen | `LoudnessEnhancer`/audio processor Media3; web: WebAudio | Media3, WebAudio | M | B |
| Ecualizador | `Equalizer` de Android; web: BiquadFilter | — | B | B |
| Recorte de silencios | `SilenceSkippingAudioProcessor` (Media3) | Media3 | B | B |
| Subtítulos avanzados | `CaptionStyleCompat`; tamaño, fondo, posición; WebVTT en la web | Media3, `<track>` | B | B |
| Control multidispositivo | Canal de presencia por WebSocket a través del servidor de sincronización | WS, protocolo propio | M | M |
| Cast | `media3-cast`; FCast (abierto) en fase 3 | Cast SDK | M | M |
| Transcripción | whisper.cpp en el dispositivo (modelo tiny/base) o en servidor (opt-in) | whisper.cpp (MIT), NNAPI/GPU | A | M |
| Búsqueda por palabras pronunciadas | FTS sobre segmentos de transcripción con marcas de tiempo | SQLite FTS5 / Postgres tsvector | M | B |
| Capítulos automáticos | Segmentación de la transcripción (LLM o heurística de pausas y temas) | LLM local/servidor | M | M |
| Resumen | LLM sobre la transcripción; en el dispositivo si hay modelo pequeño, si no servidor opt-in | LLM vía API (p. ej. Claude) o modelo local | M | **A** (coste por token) |
| Preguntas y respuestas | RAG sobre segmentos de la transcripción | Embeddings + LLM | A | A |
| Extracción de conceptos | LLM → lista de conceptos con marcas de tiempo | LLM | M | M |
| Organización automática | Clasificación por embeddings → etiquetas sugeridas (nunca automáticas sin confirmar) | Embeddings | M | M |
| Recomendaciones controladas | Puntuación local con pesos visibles y editables, sin servidor | Kotlin/TS | M | B |
| Traducción de subtítulos | Traducción automática local o en servidor | Modelos de traducción | A | A |
| Estadísticas de consumo | Agregación local de eventos de reproducción | Room | B | B |
| Modo productividad | Oculta el feed; solo biblioteca y cola; límites | UI | B | B |
| Control parental | Perfiles con PIN, listas permitidas y límites | — | M | M |
| Servidores personales | Conector de Jellyfin (API REST abierta) | — | M | M |
| Podcasts | RSS 2.0 + namespace Podcasting 2.0 (capítulos, transcripciones) | Parser XML | B | B |
