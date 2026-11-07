# AlternativaY

> Nombre de trabajo. “YouTube Killer” es solo un nombre interno; ver el riesgo de marca RL-11.

Plataforma audiovisual multiplataforma (Android + web) diseñada con **SDD, Desarrollo Guiado por Especificaciones**. Todavía no hay código: primero se investigó, se especificó y se planificó.

## Conclusión principal (leer primero)
**v2 (ADR-005/006):** el producto es un **cliente de YouTube completo** (sin anuncios, en segundo plano, con PiP, descargas y SponsorBlock), al nivel de PipePipe y Flow. Encima añade lo que ningún cliente alternativo tiene:

1. **Avisos en tiempo real** de vídeos, estrenos y directos, por push con WebSub, el mecanismo oficial de YouTube. Hoy NewPipe pregunta cada 15 min o más, y PipePipe, Flow y LibreTube no usan push (verificado en su código). Ver [ADR-006](docs/adr/ADR-006-notificaciones-tiempo-real.md).
2. **Sincronización Android ↔ web** sin cuenta de Google.
3. **Biblioteca universal:** YouTube + podcasts + PeerTube + Jellyfin + locales.

Riesgos aceptados y límites (nunca DRM, nunca extracción en servidores): [ADR-005](docs/adr/ADR-005-cliente-youtube-completo.md). El análisis legal original sigue en `docs/research/05-legal-y-viabilidad.md` como evaluación de riesgos (§7, actualización).

## Mapa de entregables

| # | Entregable | Documento |
|---|---|---|
| 1 | Catálogo de aplicaciones y proyectos | [docs/research/01-catalogo.md](docs/research/01-catalogo.md) |
| 2 | Análisis individual | [docs/research/02-analisis-individual.md](docs/research/02-analisis-individual.md) |
| 3 | Comparativa funcional | [docs/research/03-comparativa.md](docs/research/03-comparativa.md) §1–2 |
| 4 | Análisis de código y arquitectura | [03-comparativa.md](docs/research/03-comparativa.md) §3 · [evidencia](docs/research/evidencia/) |
| 5 | Problemas recurrentes | [03-comparativa.md](docs/research/03-comparativa.md) §4.4 |
| 6 | Necesidades de los usuarios | [docs/research/04-usuarios.md](docs/research/04-usuarios.md) |
| 7 | Funcionalidades innovadoras | [specs/001-plataforma/spec.md](specs/001-plataforma/spec.md) §5 |
| 8 | Matriz de prioridades | [spec.md](specs/001-plataforma/spec.md) §6 |
| 9 | Arquitectura Android | [specs/001-plataforma/arquitectura.md](specs/001-plataforma/arquitectura.md) §4 |
| 10 | Arquitectura web | [arquitectura.md](specs/001-plataforma/arquitectura.md) §5 |
| 11 | Arquitectura compartida | [arquitectura.md](specs/001-plataforma/arquitectura.md) §1–3, §6–11 |
| 12 | Viabilidad legal y técnica | [docs/research/05-legal-y-viabilidad.md](docs/research/05-legal-y-viabilidad.md) |
| 13 | Diseño de interfaces | [specs/001-plataforma/ux.md](specs/001-plataforma/ux.md) |
| 14 | Roadmap | [specs/001-plataforma/plan.md](specs/001-plataforma/plan.md) §3 |
| 15 | Stack recomendado | [plan.md](specs/001-plataforma/plan.md) §1 |
| 16 | Estructura del repositorio | [plan.md](specs/001-plataforma/plan.md) §2 |
| 17 | Especificación del MVP | [specs/002-mvp/spec.md](specs/002-mvp/spec.md) |
| 18 | Riesgos y mitigación | [plan.md](specs/001-plataforma/plan.md) §4 · [05-legal](docs/research/05-legal-y-viabilidad.md) §6 |
| 19 | Tareas por prioridad | [specs/002-mvp/tasks.md](specs/002-mvp/tasks.md) |
| — | Constitución (principios) | [specs/000-constitucion/constitucion.md](specs/000-constitucion/constitucion.md) |
| — | Metodología, registro y limitaciones | [docs/00-metodologia-y-registro.md](docs/00-metodologia-y-registro.md) |

## Decisiones pendientes del propietario
1. ~~Estrategia sobre YouTube~~ → decidida: cliente completo (ADR-005).
2. Nombre definitivo (RL-11).
3. Licencia (ADR-004, propuesta en `plan.md` §1).
4. Equipo y recursos, que determinan el escenario E1, E2 o E3 del roadmap.

## Registro de decisiones (ADR)
| ADR | Decisión | Estado |
|---|---|---|
| ADR-001 | Compartir contratos (esquemas, DDL, protocolo de sincronización y SDK de conectores), no la UI; KMP pospuesto | Propuesto |
| ADR-002 | Web: React + Vite SPA/PWA + SQLite-WASM (alternativa: SvelteKit) | Propuesto |
| ADR-003 | Backend: Node + Hono + PostgreSQL + pg-boss, sin Redis en el MVP | Propuesto |
| ADR-004 | Licencias: clientes GPL-3.0, SDK y contracts Apache-2.0, servidor AGPL-3.0 | **Decisión del propietario** |
| [ADR-005](docs/adr/ADR-005-cliente-youtube-completo.md) | Cliente de YouTube completo, extracción solo en el dispositivo, builds `full` y `play` | **Aceptado** |
| [ADR-006](docs/adr/ADR-006-notificaciones-tiempo-real.md) | Avisos en tiempo real: WebSub → FCM / UnifiedPush / Web Push, con respaldo RSS | Propuesto |
| [ADR-007](docs/adr/ADR-007-importacion-automatica-suscripciones.md) | Importación automática de suscripciones sin iniciar sesión: lector automático (Android `full`), “Permitir” de Google (`play`), extensión (web) | **Aceptado** |
