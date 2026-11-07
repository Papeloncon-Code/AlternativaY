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

## Avance (2026-11-07): campanita y Web Push en la web
- **Campanita por canal** (como en YouTube): **Todas / Sin Shorts / Ninguna / Dejar de seguir**. Se guarda en `channels.notify`. El servicio de avisos la respeta antes de enviar.
- **Web Push** (VAPID + aes128gcm, librería `@block65/webcrypto-web-push` 2.0.0, MIT): *service worker* `/sw.js`; al tocar el aviso se abre el vídeo en TodoTube.
- “**Solo directos y estrenos**” no está disponible todavía en la web: el aviso de YouTube no indica si es un directo y el servidor no extrae. Llegará con Android (CA11.2).
- **Verificado:** prueba unitaria de cifrado (7/7 pruebas); API (401 sin clave, 400 con valor inválido, cambio persistido); menú de la campanita con Playwright.
- **Pendiente de verificar en el navegador del propietario:** recepción real del aviso. Requiere conceder el permiso de notificaciones, y desde este entorno no se puede comprobar.
