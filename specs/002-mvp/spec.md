# Especificación técnica del MVP

Estado: **Borrador v2 (ADR-005/006)** · 2026-11-06 · Alcance: RF-001 a RF-009, RF-011, RF-012, **RF-034 a RF-038** + RNF-001 a RNF-010.

## 1. Objetivo
Una persona puede:
- **ver YouTube como en las mejores apps alternativas**: sin anuncios, en segundo plano, con PiP, descargas y SponsorBlock;
- **enterarse en minutos** cuando sus creadores publican, estrenan o emiten en directo;
- reunir además sus podcasts, PeerTube y archivos locales;
- continuar en la web desde donde lo dejó en Android, sin cuenta de Google.

Orden de construcción (actualizado el 2026-11-07 por decisión del propietario): **primero la web v0.1** (`specs/004-web-v0`), para ver el producto con datos reales del servicio de avisos; **después Android** (YouTube completo → importación automática → avisos push → sincronización con la web → resto de fuentes).

## 2. Fuera de alcance (explícito)
- IA.
- SDK de conectores de terceros.
- Cast.
- Jellyfin.
- Marcadores, grupos y filtros avanzados.
- Perfiles familiares.
- Android TV, iOS nativo y escritorio nativo.
- Build `play` con YouTube oficial (RF-010): pasa a la fase 2. El MVP se publica solo en F-Droid, IzzyOnDroid y GitHub.
- Login con cuenta de YouTube (fase 2).
- Extracción de YouTube en la web: el navegador no puede hacerlo por CORS y el servidor no extrae (constitución §I.2). La web reproduce YouTube con el reproductor oficial incrustado y comparte la biblioteca, el progreso y los avisos.
- Cualquier elusión de DRM o acceso a contenido de pago (constitución §I.1).

## 3. Historias y criterios de aceptación

### H1. Añadir fuentes (RF-001)
- **CA1.1:**
  - *Dado* un usuario sin fuentes,
  - *cuando* pega la URL de un feed RSS/Atom válido,
  - *entonces* se crea la suscripción y en < 5 s (en wifi) aparecen los últimos 50 elementos.
- **CA1.2:**
  - *Dada* una URL de un canal PeerTube (`https://instancia/c/canal` o `/a/cuenta`),
  - *cuando* se añade,
  - *entonces* se resuelve mediante la API REST de la instancia y se listan los vídeos.
- **CA1.3:** *Dada* una carpeta concedida por SAF (Android), *entonces* se indexan los ficheros de audio y vídeo con su duración y miniatura.
- **CA1.4:**
  - *Dada* una URL de canal de YouTube (`/channel/UC…` o `@handle`),
  - *entonces* se resuelve el `channel_id` y la suscripción usa **solo** el RSS público.
  - Si no se puede resolver el `@handle` sin extracción, se pide la URL `/channel/` [NV: confirmar el método].
- **CA1.5:** una URL inválida o inaccesible muestra un error con su causa (formato, red, 404) y no crea la suscripción.

### H2. Feed unificado (RF-002)
- **CA2.1:** el Inicio muestra las novedades de todas las fuentes ordenadas por fecha, con chips de filtro: Todo, Vídeo, Audio, Sin ver, < 20 min.
- **CA2.2:** la actualización en segundo plano (WorkManager) se ejecuta cada 2 h como mínimo, configurable, y respeta las restricciones de batería y datos.
- **CA2.3:** si una fuente falla, las demás se muestran igual y aparece un banner con el número de fuentes con error.

### H3. Reproducción (RF-003, RF-004)
- **CA3.1:** audio y vídeo nativos (podcast, PeerTube, local) siguen sonando con la pantalla apagada y se controlan desde la notificación, la pantalla de bloqueo y los auriculares Bluetooth.
- **CA3.2:** al pulsar Inicio durante un vídeo nativo se entra en PiP (Android 8+; automático en 12+).
- **CA3.3:** velocidad de 0,5× a 3× en pasos de 0,05; saltos configurables (por defecto −10/+30 s en audio y ±10 s en vídeo).
- **CA3.4:** reanudación: al reabrir un elemento continúa desde la última posición menos 3 s.
  - Se marca como visto al llegar al 95 % o a menos de 30 s del final.
- **CA3.5:** cola: añadir al final o a continuación, reordenar arrastrando y quitar. Se conserva tras matar el proceso.
- **CA3.6:** contenido de YouTube **en la web** (y en la build `play`, fase 2):
  - se abre en el reproductor IFrame oficial;
  - al salir de la pantalla **se pausa**;
  - no existe opción de descarga;
  - se muestra el aviso descrito en `ux.md` §3.4.

### H4. Descargas (RF-005)
- **CA4.1:** solo aparece “Descargar” en los elementos cuyo conector declara `canDownload`: enclosures de podcast y PeerTube cuando la instancia permite la descarga [NV: campo exacto de la API].
- **CA4.2:** las políticas “solo wifi” y “límite de N GB” se respetan. Un elemento descargado se reproduce en modo avión.

### H5. Biblioteca e historial (RF-006, RF-007)
- **CA5.1:** crear, renombrar y borrar colecciones; añadir y quitar elementos; marcar favorito; etiquetar.
- **CA5.2:** el historial registra cada reproducción de más de 10 s. Se puede pausar y borrar por rango.

### H6. Búsqueda local (RF-008)
- **CA6.1:** buscar “entrevista” encuentra coincidencias en título, descripción y autor en < 100 ms con 10 000 elementos (FTS), sin red.

### H7. Importar/exportar (RF-009)
- **CA7.1:** importar un OPML crea las suscripciones a podcasts.
- **CA7.2:** importar la exportación JSON de NewPipe:
  - crea las suscripciones de PeerTube y SoundCloud que sean compatibles;
  - convierte las de YouTube en suscripciones por RSS;
  - informa de las que no se pudieron convertir.
  - Formatos de FreeTube y LibreTube: [NV], definir con ejemplos reales en la tarea T-061.
- **CA7.3:** exportar genera un JSON con esquema versionado (`packages/contracts`) y un OPML. Reimportarlo en una instalación limpia reproduce el estado (prueba de ida y vuelta).

### H8. Cuenta y sincronización (RF-011)
- **CA8.1:** la app funciona al 100 % sin cuenta.
- **CA8.2:** registro e inicio de sesión con passkey o enlace por email. Vincular un segundo dispositivo sube el estado local completo y lo fusiona.
- **CA8.3:** convergencia:
  - *dados* dos dispositivos que editan sin conexión la misma colección (A añade X, B añade Y y borra Z),
  - *cuando* ambos se reconectan,
  - *entonces* los dos muestran {X, Y} sin Z en < 10 s (RNF-005).
- **CA8.4:** el progreso de reproducción iniciado en Android se puede continuar en la web desde la posición sincronizada.
- **CA8.5:** borrar la cuenta elimina los datos del servidor en ≤ 30 días (inmediato en el log activo) y conserva los datos locales.

### H9. Web PWA (RF-012)
- **CA9.1:** las mismas pantallas P0 (Inicio, Buscar, Biblioteca, Suscripciones, Historial, Reproductor, Perfil) en Chrome, Firefox y Safari (últimas 2 versiones).
- **CA9.2:** es instalable como PWA. Sin red, abre la biblioteca desde SQLite-WASM.
- **CA9.3:** la Media Session API muestra los controles en el sistema operativo; el PiP del navegador funciona para vídeo nativo.
- **CA9.4:** los feeds RSS se actualizan mediante el proxy del servidor, que incluye protección SSRF (`arquitectura.md` §10).

### H10. YouTube completo (RF-034, RF-036, RF-037)
- **CA10.1:** buscar en YouTube devuelve vídeos, canales y listas. Abrir un vídeo empieza a reproducir en < 2 s (p75, wifi) sin anuncios.
- **CA10.2:** segundo plano, PiP, cola, velocidad, subtítulos, capítulos y calidad (hasta la máxima disponible; AV1/VP9 si el dispositivo lo decodifica) funcionan igual que en el resto de fuentes (H3).
- **CA10.3:** se puede descargar vídeo o audio, y el elemento descargado se reproduce sin red.
- **CA10.4:** SponsorBlock salta los segmentos de las categorías elegidas y lo muestra con un aviso. DeArrow y RYD se pueden activar por separado.
- **CA10.5:** importar el CSV de suscripciones de Google Takeout y las exportaciones de NewPipe y PipePipe crea todas las suscripciones de YouTube compatibles. Informa de las que no se pudieron importar.
- **CA10.6:** ante un error de extracción repetido, la app muestra un estado único (“YouTube cambió algo”) y busca una actualización. El hotfix firmado se instala desde la app.
- **CA10.7:** contenido con DRM o de pago: se muestra “No disponible en esta app” y no se intenta reproducir.
- **CA10.8:** un test de CI garantiza que la build `play` no contiene el módulo `:connector:youtube`.

### H11. Avisos en tiempo real (RF-035)
- **CA11.1:**
  - *Dado* un canal seguido con avisos activados,
  - *cuando* el creador publica un vídeo,
  - *entonces* el usuario recibe la notificación en **≤ 3 min (p90)** en Android, con FCM o UnifiedPush, y en la web con Web Push.
  - Medición: canales de prueba propios durante 2 semanas. El objetivo se ajusta tras medir; **no se publica ninguna cifra sin medirla**.
- **CA11.2:** estreno o directo programado: aviso al detectarlo (“Estreno hoy a las 20:00”) y otro aviso al empezar (±2 min de la hora real).
- **CA11.3:** las ediciones de título o descripción **no** generan avisos duplicados.
- **CA11.4:** si WebSub falla en un canal, el respaldo por RSS lo detecta en ≤ 15 min.
- **CA11.5:** sin servicios de Google (build `full`), los avisos funcionan con UnifiedPush (ntfy). Sin distribuidor, la app ofrece sondeo local cada 15 min o más y explica la diferencia.
- **CA11.6:** ajustes por canal (todos, solo directos y estrenos, o nada), horas de silencio y agrupación. Todo funciona **sin cuenta**.
- **CA11.7:** privacidad. Con FCM el servidor no guarda la relación usuario ↔ canal (topics). Con UnifiedPush o Web Push guarda endpoints anónimos revocables.

### H12. Importación automática de suscripciones (RF-038, ADR-007)
- **CA12.1:** la bienvenida pregunta “¿Qué usas para ver vídeos?”. Si la respuesta es YouTube y la app está instalada, ofrece la importación automática como opción principal.
- **CA12.2:** antes del aviso del sistema se muestra una explicación propia: qué se lee (solo nombres de canales), que no sale del dispositivo y cómo desactivarlo. Sin aceptar esa pantalla no se pide el permiso.
- **CA12.3:**
  - *Dada* una cuenta con 40 suscripciones en la app de YouTube (es o en),
  - *cuando* el usuario activa el permiso,
  - *entonces* la app lee la lista sin intervención en ≤ 30 s y detecta ≥ 95 % de los canales.
- **CA12.4:** solo se piden confirmaciones para los nombres ambiguos. Con ≥ 90 % de coincidencias exactas, la importación termina con un toque.
- **CA12.5:** si no se reconoce la pantalla en 10 s, el lector se detiene y ofrece importar desde archivo.
- **CA12.6:** al terminar, el servicio se desactiva solo o lleva al usuario a desactivarlo con un toque.
- **CA12.7:** el servicio solo observa el paquete de YouTube y solo durante la importación (verificado con un test instrumentado).
- **CA12.8:** si el APK se instaló a mano y Android bloquea el permiso (ajustes restringidos), la guía muestra los pasos para desbloquearlo.
- **CA12.9:** la build `play` no contiene el servicio de accesibilidad (test de CI, como CA10.8).
- **CA12.10:** las suscripciones importadas aparecen en la web y en los demás dispositivos tras la sincronización (H8).

## 4. Modelo de datos del MVP (resumen; fuente de verdad: `packages/contracts`)

| Entidad | Campos clave |
|---|---|
| `Source` | id, connectorId, url, title, iconUrl, addedAt, lastFetchAt, lastError |
| `Feed` | id, sourceId, groupId?, muted |
| `MediaItem` | id, feedId?, connectorId, externalId, kind(audio/video), title, author, description, durationMs, publishedAt, thumbnailUrl, playback(PlaybackSpec) |
| `Progress` | itemId, positionMs, completed, updatedAt (HLC) |
| `HistoryEvent` | id, itemId, startedAt, playedMs |
| `Collection` / `CollectionItem` | id, name, sort / OR-Set de itemIds |
| `Tag`, `ItemTag`, `Favorite` | — |
| `Download` | itemId, state, bytes, path |
| `QueueEntry` | position, itemId (solo local; no se sincroniza en el MVP) |
| `SyncOp` | opId, deviceId, hlc, entity, entityId, field, value |

## 5. API del servidor del MVP (resumen; fuente de verdad: OpenAPI)

| Método | Ruta | Propósito |
|---|---|---|
| POST | `/auth/passkey/register`, `/auth/passkey/login`, `/auth/email/link` | Autenticación |
| POST | `/sync/push` | Enviar un lote de operaciones (≤ 500) |
| GET | `/sync/pull?since=` | Recibir operaciones desde un cursor |
| GET | `/ws` | Avisos de cambios |
| GET | `/proxy/feed?url=` | Solo para la web; con caché de 15 min y SSRF-safe |
| POST/DELETE | `/notify/channels` | Alta y baja anónima de canales a vigilar (+ endpoint UnifiedPush o Web Push) |
| GET/POST | `/websub/callback/:subId` | Verificación (`hub.challenge`) y recepción de avisos del hub; HMAC obligatorio |
| GET/DELETE | `/account`, `/account/devices/:id` | Gestión de la cuenta |

## 6. Definición de terminado (MVP)
- Todos los CA en verde con tests automatizados donde sea posible:
  - unitarios para el dominio y la sincronización;
  - de contrato para los conectores, con fixtures grabadas;
  - E2E con Playwright para la web;
  - Compose UI tests para los flujos P0 en Android.
- Vectores de conformidad de sincronización en verde en los dos motores.
- Presupuestos de rendimiento medidos (Macrobenchmark, Lighthouse).
- Auditoría de accesibilidad (axe + revisión manual con TalkBack).
- Revisión legal de ADR-005 (riesgos aceptados) y RL-01/02/03; nombre definitivo registrado.
- Latencia de avisos medida y publicada internamente (CA11.1).
