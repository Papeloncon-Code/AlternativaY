# Tareas del MVP (ordenadas por prioridad y dependencia)

Formato: `T-xxx · [área] tarea → requisitos/CA · depende de`.
**Bloque 0** desbloquea todo. Dentro de cada bloque, las tareas marcadas con [P] se pueden hacer en paralelo.

## Bloque 0: decisiones y validación (antes de escribir código)
- T-001 · [producto] Aprobar la constitución v1.0 y `specs/001-plataforma/spec.md` → todas
- T-002 · [producto] Elegir un nombre definitivo sin marcas ajenas y comprobar su disponibilidad (marca y dominio) → RL-11
- T-003 · [legal] Revisión legal de RL-01/02/03/05: leer íntegramente los ToS de YouTube, las Developer Policies, la RMF y las branding guidelines; política de Google Play → constitución §1–5
- T-004 · [producto] Decidir la licencia (ADR-004) → plan §1
- T-005 · [investigación] Encuesta de validación (n ≥ 200) y 10 entrevistas → doc 04 §5 · *si menos del 30 % usaría la app sin YouTube sin anuncios, volver a la especificación*
- T-006 · [técnico] Spike: SQLite-WASM + OPFS en Safari/Firefox/Chrome (FTS5 incluido) → RF-012, R4
- T-007 · [técnico] Spike: IFrame Player oficial en una WebView de Android (pausa al salir, cumplimiento de la RMF) → CA3.6, R2
- T-008 · [técnico] Spike: resolver `@handle` → `channel_id` de YouTube sin extracción (¿oEmbed? ¿página pública?) → CA1.4

## Bloque 1: cimientos
- T-010 · [repo] Monorepo según plan §2; CI (lint y tests) para android/web/server/contracts → constitución §13
- T-011 · [contracts] JSON Schema de las entidades del MVP + codegen Kotlin/TS → spec MVP §4
- T-012 · [contracts] Especificación del protocolo de sincronización v1 + 20 vectores de conformidad → RF-011, CA8.3
- T-013 · [contracts] DDL de SQLite compartido + migraciones versionadas → RF-008
- T-014 · [contracts] OpenAPI 3.1 del servidor del MVP → spec MVP §5
- T-015 · [diseño] Design tokens + componentes base (claro/oscuro, accesibles) → RNF-007

## Bloque 2: Android núcleo [P entre subtareas]
- T-020 · [android] `:core:database` (Room sobre el DDL compartido, FTS) → RF-006/007/008
- T-021 · [android] `:connector:api` + `:connector:rss` (RSS 2.0/Atom/Podcasting 2.0), con tests de contrato y fixtures → CA1.1
- T-022 · [android] `:connector:peertube` → CA1.2
- T-023 · [android] `:connector:local` (SAF/MediaStore) → CA1.3
- T-024 · [android] `:connector:youtube-official` (RSS + PlaybackSpec OFFICIAL_EMBED) → CA1.4, CA3.6 · depende de T-007/T-008
- T-025 · [android] `:core:player` (MediaSessionService, notificación, PiP, velocidad, saltos, reanudación, cola persistente) → CA3.1–3.5
- T-026 · [android] WorkManager para actualizar feeds con restricciones → CA2.2
- T-027 · [android] `:core:download` (Media3 DownloadManager + políticas) → CA4.1–4.2

## Bloque 3: servidor
- T-030 · [server] Hono + Postgres + migraciones; healthchecks; docker-compose → RNF-009
- T-031 · [server] Autenticación con passkeys + enlace por email, sesiones y revocación de dispositivos → CA8.2, CA8.5
- T-032 · [server] Sync push/pull + cursor + WebSocket de avisos → CA8.3/8.4
- T-033 · [server] Proxy de feeds con protección SSRF, caché de 15 min y rate limiting; tests de seguridad (IP privadas, redirecciones, tamaño) → CA9.4, R5
- T-034 · [server] Borrado de cuenta y exportación → CA8.5

## Bloque 4: motores de sincronización
- T-040 · [android] `:core:sync` (HLC, log de operaciones, LWW por campo, OR-Set) que pasa los vectores de T-012 → CA8.3
- T-041 · [web] Motor de sincronización en TS que pasa los mismos vectores → CA8.3
- T-042 · [qa] Tests de propiedades: N dispositivos y órdenes aleatorios → convergencia → R3

## Bloque 5: Android pantallas P0
- T-050 · [android] Onboarding (3 pantallas) + estado vacío del Inicio → ux §4
- T-051 · [android] Inicio (Seguir viendo + Novedades + chips) → CA2.1/2.3
- T-052 · [android] Reproductor completo + mini-player → CA3.*
- T-053 · [android] Biblioteca (colecciones, favoritos, etiquetas, historial) → CA5.*
- T-054 · [android] Buscar (Mi biblioteca) → CA6.1
- T-055 · [android] Suscripciones + Gestión de fuentes → H1
- T-056 · [android] Descargas → H4
- T-057 · [android] Perfil y sincronización → H8
- T-058 · [android] Ajustes P0 (reproducción, descargas, apariencia, privacidad, exportación)

## Bloque 6: importación y exportación
- T-060 · [contracts] Formato de exportación v1 + OPML → CA7.3
- T-061 · [android/web] Importadores de NewPipe, FreeTube y LibreTube a partir de ejemplos reales de sus exportaciones → CA7.2
- T-062 · [qa] Test de ida y vuelta (exportar → instalación limpia → importar → mismo estado) → CA7.3

## Bloque 7: web PWA
- T-070 · [web] Shell React + Router + SQLite-WASM en un Worker → CA9.2 · depende de T-006
- T-071 · [web] Pantallas P0 (paridad con el bloque 5) → CA9.1
- T-072 · [web] Reproductor HTML5 + hls.js + Media Session + PiP; IFrame de YouTube → CA9.3, CA3.6
- T-073 · [web] PWA (Workbox) e instalación → CA9.2

## Bloque 8: calidad y lanzamiento
- T-080 · [android] Baseline Profiles + Macrobenchmark (arranque en frío < 1,5 s) → RNF-001
- T-081 · [web] Lighthouse CI (LCP/INP) → RNF-003
- T-082 · [qa] Auditoría de accesibilidad (axe + TalkBack + teclado) → RNF-007
- T-083 · [seg] Revisión MASVS-L1 / ASVS-L2 + escaneo de dependencias → RNF-010
- T-084 · [release] Build reproducible F-Droid + pista interna de Google Play → plan fase 1
- T-085 · [release] Beta de 4 semanas con 50 usuarios; criterio de crash < 1 % → plan fase 1

## Trazabilidad rápida
| RF | Tareas |
|---|---|
| RF-001 | T-021, T-022, T-023, T-024, T-055 |
| RF-002 | T-026, T-051 |
| RF-003/004 | T-025, T-052, T-072 |
| RF-005 | T-027, T-056 |
| RF-006/007 | T-020, T-053 |
| RF-008 | T-013, T-020, T-054 |
| RF-009 | T-060, T-061, T-062 |
| RF-010 | T-007, T-008, T-024 |
| RF-011 | T-012, T-031, T-032, T-040, T-041, T-042, T-057 |
| RF-012 | T-006, T-070–T-073 |
