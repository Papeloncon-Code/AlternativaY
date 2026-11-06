# AlternativaY

> Nombre de trabajo. “YouTube Killer” es solo un nombre interno; ver el riesgo de marca RL-11.

Plataforma audiovisual multiplataforma (Android + web) diseñada con **SDD, Desarrollo Guiado por Especificaciones**. Todavía no hay código: primero se investigó, se especificó y se planificó.

## Conclusión principal (leer primero)
- La investigación muestra que lo que hace atractivos a NewPipe, PipePipe o Flow (YouTube **sin anuncios, en segundo plano y con descargas**) depende de:
  - incumplir los Términos de YouTube;
  - superar controles anti-bots: todos los clientes analizados generan PoTokens (`docs/research/01-catalogo.md` §D).
- El encargo prohíbe eludir controles técnicos, así que **ese camino queda descartado** (`docs/research/05-legal-y-viabilidad.md`).
- La propuesta resultante es una **biblioteca y reproductor universal de contenido legítimo**:
  - podcasts, PeerTube, RSS, Jellyfin, archivos locales y YouTube por la vía oficial;
  - con **sincronización local-first entre Android y web** y **búsqueda dentro de lo que se dice**, que nadie del ecosistema tiene.

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
1. Aprobar o cambiar la estrategia “sin extracción de YouTube” (constitución §I).
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
