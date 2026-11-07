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

## 3. Funcionalidades del MVP (una carpeta por funcionalidad)
Desde el 2026-11-07, las historias y los criterios de aceptación viven en **carpetas por funcionalidad**, cada una con `spec.md` (qué y por qué), `plan.md` (cómo) y `tasks.md`. Este documento queda como **índice del alcance**, junto con el modelo de datos, la API y la definición de terminado.

| Orden | Funcionalidad | Historias | Requisitos |
|---|---|---|---|
| 0 | [Web v0.1](../004-web-v0/spec.md): **publicada** | — | RF-002/003/006/007/012 (parcial) |
| 1 | [YouTube completo](../010-youtube-completo/spec.md) | H10 | RF-034, RF-036, RF-037 |
| 2 | [Importación de suscripciones](../012-importacion-suscripciones/spec.md) | H12, H7 | RF-009, RF-036, RF-038 |
| 3 | [Avisos en tiempo real](../011-avisos-tiempo-real/spec.md) (prueba: [003](../003-spike-websub/spec.md)) | H11 | RF-035 |
| 4 | [Reproductor y biblioteca](../013-reproductor-y-biblioteca/spec.md) | H3, H4, H5, H6 | RF-003 a RF-008 |
| 5 | [Cuentas y sincronización](../014-cuentas-y-sincronizacion/spec.md) | H8 | RF-011 |
| 6 | [Web (PWA)](../016-web-pwa/spec.md) | H9 | RF-012 |
| 7 | [Fuentes abiertas y feed](../015-fuentes-abiertas/spec.md) | H1, H2 | RF-001, RF-002, RF-010 |

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
