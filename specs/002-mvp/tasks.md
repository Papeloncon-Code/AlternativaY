# Tareas transversales del MVP

Las tareas de cada funcionalidad están en su carpeta (`specs/010…016/tasks.md`). Aquí quedan las decisiones, los cimientos compartidos y la calidad y el lanzamiento.

Formato: `T-xxx · [área] tarea → requisitos/CA · depende de`.
**Bloque 0** desbloquea todo. Dentro de cada bloque, las tareas marcadas con [P] se pueden hacer en paralelo.

## Bloque 0: decisiones y validación (antes de escribir código)
- T-001 · [producto] Aprobar la constitución v1.0 y `specs/001-plataforma/spec.md` → todas
- T-002 · ✅ **TodoTube** (ADR-008); queda comprobar el registro de marcas y el dominio · [producto] Elegir un nombre definitivo sin marcas ajenas y comprobar su disponibilidad (marca y dominio) → RL-11
- T-003 · [legal] Revisión legal de los riesgos aceptados en ADR-005 (ToS de YouTube, anti-elusión según la jurisdicción de la empresa, monetización) → constitución §I.7
- T-004 · [producto] Decidir la licencia (ADR-004; GPL-3.0 obligatoria en los clientes por NewPipeExtractor) → plan §1
- T-005 · [investigación] Encuesta de validación (n ≥ 200) y 10 entrevistas: ¿cuánto valen los avisos en tiempo real y la sincronización con la web frente a PipePipe y Flow? → doc 04 §5


## Bloque 1: cimientos
- T-010 · [repo] Monorepo según plan §2; CI (lint y tests) para android/web/server/contracts → constitución §13
- T-011 · [contracts] JSON Schema de las entidades del MVP + codegen Kotlin/TS → spec MVP §4
- T-013 · [contracts] DDL de SQLite compartido + migraciones versionadas → RF-008
- T-014 · [contracts] OpenAPI 3.1 del servidor del MVP → spec MVP §5
- T-015 · [diseño] Design tokens + componentes base (claro/oscuro, accesibles) → RNF-007


## Bloque 3: servidor
- T-030 · [server] Hono + Postgres + migraciones; healthchecks; docker-compose → RNF-009


## Bloque 5: Android pantallas P0
- T-050 · [android] Onboarding (3 pantallas) + estado vacío del Inicio → ux §4



## Bloque 8: calidad y lanzamiento
- T-080 · [android] Baseline Profiles + Macrobenchmark (arranque en frío < 1,5 s) → RNF-001
- T-081 · [web] Lighthouse CI (LCP/INP) → RNF-003
- T-082 · [qa] Auditoría de accesibilidad (axe + TalkBack + teclado) → RNF-007
- T-083 · [seg] Revisión MASVS-L1 / ASVS-L2 + escaneo de dependencias → RNF-010
- T-084 · [release] Build reproducible F-Droid + pista interna de Google Play → plan fase 1
- T-085 · [release] Beta de 4 semanas con 50 usuarios; criterio de crash < 1 % → plan fase 1


## Índice de tareas por funcionalidad
| Funcionalidad | Tareas |
|---|---|
| [010 YouTube completo](../010-youtube-completo/tasks.md) | T-008, T-024, T-024b–e |
| [011 Avisos en tiempo real](../011-avisos-tiempo-real/tasks.md) | T-007, T-009, T-035–T-039 |
| [012 Importación de suscripciones](../012-importacion-suscripciones/tasks.md) | T-090, T-024f–j, T-060–T-062 |
| [013 Reproductor y biblioteca](../013-reproductor-y-biblioteca/tasks.md) | T-020, T-025, T-027, T-052–T-054, T-056, T-058 |
| [014 Cuentas y sincronización](../014-cuentas-y-sincronizacion/tasks.md) | T-012, T-031–T-034, T-040–T-042, T-057 |
| [015 Fuentes abiertas](../015-fuentes-abiertas/tasks.md) | T-021–T-023, T-026, T-051, T-055 |
| [016 Web (PWA)](../016-web-pwa/tasks.md) | T-006, T-070–T-073 |
