# Avisos en tiempo real: especificación

| Campo | Valor |
|---|---|
| Estado | Borrador (reorganizado el 2026-11-07 desde `002-mvp/spec.md`) |
| Requisitos | RF-035 |
| Decisiones | ADR-006 |
| Plataformas | Servidor + Android + web |
| Plan técnico | [plan.md](plan.md) |
| Tareas | [tasks.md](tasks.md) |

## Objetivo
Avisar en minutos cuando un canal seguido publica, estrena o emite en directo, sin sondeos ni cuenta.

## Historias y criterios de aceptación
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

## Aclaraciones pendientes ([NECESITA ACLARACIÓN])
Resolver antes de cerrar el plan (paso *clarify*):
- [ ] Latencia real de WebSub (spike 003 en curso): ¿se mantiene el objetivo de ≤ 3 min p90?
- [ ] ¿Política de Google Play sobre alarmas exactas para avisar de estrenos (build `play`)?
- [ ] ¿UnifiedPush: qué distribuidor recomendamos por defecto (ntfy)?
