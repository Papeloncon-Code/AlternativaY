# Cómo trabajamos: SDD en TodoTube

Proceso basado en GitHub Spec Kit (*specify → clarify → plan → tasks → analyze → implement*) y en las lecciones de práctica recogidas el 2026-11-07:
- [guía de Spec Kit](https://vinitshahdeo.substack.com/p/spec-driven-development-github-spec-kit);
- [desfase de especificaciones](https://www.scalablepath.com/ai/spec-driven-development-workflow);
- [análisis de Thoughtworks, resumido](https://daily.dev/posts/understanding-spec-driven-development-kiro-spec-kit-and-tessl-wbu9w3aj6);
- [especificaciones que los agentes siguen](https://code-of-us.beehiiv.com/p/specification-driven-development-update-how-to-write-better-specs-that-ai-agents-actually-follow).

## Estructura
| Carpeta | Qué contiene |
|---|---|
| `000-constitucion/` | Principios no negociables |
| `001-plataforma/` | Visión global, arquitectura, UX y roadmap (documentos marco) |
| `002-mvp/` | **Índice** del alcance del MVP, modelo de datos, API, definición de terminado y tareas transversales |
| `003-spike-websub/` | Prueba técnica de avisos (en ejecución) |
| `004-web-v0/` | Web v0.1 (**publicada**) |
| `010…016/` | **Una carpeta por funcionalidad**: `spec.md` (qué y por qué), `plan.md` (cómo), `tasks.md` |
| `_plantillas/` | Plantillas para funcionalidades nuevas |

## Pasos para cada funcionalidad
1. **Especificar** (`spec.md`): qué y por qué, historias y criterios de aceptación medibles. **Sin tecnologías.** Máximo unas 2 páginas: si el resumen necesita dos “y”, dividir.
2. **Aclarar:** listar cada duda como `- [ ]` en “Aclaraciones pendientes”. No se cierra el plan con dudas que cambien el diseño. *No inventar lo que falta.*
3. **Planificar** (`plan.md`): cómo, enlazando la arquitectura y los ADR. Las decisiones con alternativas van a un ADR.
4. **Tareas** (`tasks.md`): cada tarea indica qué criterios cumple (`→ CA10.3`).
5. **Revisar coherencia:** `python3 tools/spec-check.py`. Comprueba que todos los criterios tienen tarea, que están los 3 archivos y el tamaño de la especificación. Con errores no se empieza a programar.
6. **Implementar:** cada criterio tiene al menos una prueba automática que empieza por su ID.
7. **Verificar:** anotar el resultado de cada criterio en `spec.md` (como en `004-web-v0` §5), incluido lo que **no** se pudo verificar.

## Reglas contra los errores más comunes
- **Desfase entre especificación y código** (el error número uno): un PR que cambia el comportamiento **actualiza su `spec.md` en el mismo PR**. Si el código y la especificación discrepan, se corrige uno de los dos, nunca se deja así.
- **Proceso proporcional:** los arreglos pequeños (erratas, dependencias, fallos sin cambio de comportamiento) no necesitan especificación; basta con un commit claro. Las funcionalidades y los cambios de rumbo sí la necesitan.
- **Cambios de rumbo** = un ADR nuevo en `docs/adr/` y la actualización de las especificaciones afectadas (ejemplos: ADR-005, ADR-007).
- **Una especificación equivocada genera código equivocado:** los criterios se revisan con el propietario antes de implementar.
- **Mismo nombre para lo mismo:** “canal seguido” (no suscripción, salvo en YouTube), “aviso” (notificación push), “vídeo nuevo” (publicado hace < 48 h y no visto antes).
