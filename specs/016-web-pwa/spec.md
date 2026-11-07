# Web (PWA): especificación

| Campo | Valor |
|---|---|
| Estado | Borrador (reorganizado el 2026-11-07 desde `002-mvp/spec.md`) |
| Requisitos | RF-012 |
| Decisiones | ADR-002 |
| Plataformas | Web |
| Plan técnico | [plan.md](plan.md) |
| Tareas | [tasks.md](tasks.md) |

## Objetivo
La misma experiencia de biblioteca y reproducción en el navegador, instalable y usable sin conexión.

## Historias y criterios de aceptación
### H9. Web PWA (RF-012)
- **CA9.1:** las mismas pantallas P0 (Inicio, Buscar, Biblioteca, Suscripciones, Historial, Reproductor, Perfil) en Chrome, Firefox y Safari (últimas 2 versiones).
- **CA9.2:** es instalable como PWA. Sin red, abre la biblioteca desde SQLite-WASM.
- **CA9.3:** la Media Session API muestra los controles en el sistema operativo; el PiP del navegador funciona para vídeo nativo.
- **CA9.4:** los feeds RSS se actualizan mediante el proxy del servidor, que incluye protección SSRF (`arquitectura.md` §10).

## Aclaraciones pendientes ([NECESITA ACLARACIÓN])
Resolver antes de cerrar el plan (paso *clarify*):
- [ ] ¿Cuándo migrar de localStorage (v0.1) a SQLite-WASM? Depende del spike T-006
- [ ] Reproducción de YouTube en la web: solo reproductor oficial (sin extracción en servidor). ¿Se acepta esa diferencia con Android?
