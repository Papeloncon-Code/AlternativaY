# Fuentes abiertas y feed: especificación

| Campo | Valor |
|---|---|
| Estado | Borrador (reorganizado el 2026-11-07 desde `002-mvp/spec.md`) |
| Requisitos | RF-001, RF-002, RF-010 |
| Decisiones | — |
| Plataformas | Android + web |
| Plan técnico | [plan.md](plan.md) |
| Tareas | [tasks.md](tasks.md) |

## Objetivo
Añadir podcasts, PeerTube, archivos locales y YouTube oficial (build `play`) a un feed unificado.

## Historias y criterios de aceptación
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

## Aclaraciones pendientes ([NECESITA ACLARACIÓN])
Resolver antes de cerrar el plan (paso *clarify*):
- [ ] ¿Cómo resolver `@handle` → `channel_id` en la build `play` sin extracción?
- [ ] ¿Prioridad real de podcasts y PeerTube frente a YouTube tras la decisión ADR-005?
