# Importación de suscripciones: especificación

| Campo | Valor |
|---|---|
| Estado | Borrador (reorganizado el 2026-11-07 desde `002-mvp/spec.md`) |
| Requisitos | RF-009, RF-036, RF-038 |
| Decisiones | ADR-007 |
| Plataformas | Android `full` (lector), `play`/web (autorización de Google, extensión) |
| Plan técnico | [plan.md](plan.md) |
| Tareas | [tasks.md](tasks.md) |

## Objetivo
Traer las suscripciones del usuario sin iniciar sesión ni descargar archivos, y exportar sus datos en formato abierto.

## Historias y criterios de aceptación
### H12. Importación automática de suscripciones (RF-038, ADR-007)
- **CA12.1:** la bienvenida pregunta “¿Qué usas para ver vídeos?”. Si la respuesta es YouTube y la app está instalada, ofrece la importación automática como opción principal.
- **CA12.2:** antes del aviso del sistema se muestra una explicación propia: qué se lee (solo nombres de canales), que no sale del dispositivo y cómo desactivarlo. Sin aceptar esa pantalla no se pide el permiso.
- **CA12.3:**
  - *Dada* una cuenta con 40 suscripciones en la app de YouTube (es o en),
  - *cuando* el usuario activa el permiso,
  - *entonces* la app lee la lista sin intervención en ≤ 30 s y detecta ≥ 95 % de los canales.
- **CA12.4:** solo se piden confirmaciones para los nombres ambiguos. Con ≥ 90 % de coincidencias exactas, la importación termina con un toque.
- **CA12.5:** si no se reconoce la pantalla en 10 s, el lector se detiene y ofrece importar desde archivo.
- **CA12.6:** al terminar, el servicio se desactiva solo o lleva al usuario a desactivarlo con un toque.
- **CA12.7:** el servicio solo observa el paquete de YouTube y solo durante la importación (verificado con un test instrumentado).
- **CA12.8:** si el APK se instaló a mano y Android bloquea el permiso (ajustes restringidos), la guía muestra los pasos para desbloquearlo.
- **CA12.9:** la build `play` no contiene el servicio de accesibilidad (test de CI, como CA10.8).
- **CA12.10:** las suscripciones importadas aparecen en la web y en los demás dispositivos tras la sincronización (H8).

### H7. Importar/exportar (RF-009)
- **CA7.1:** importar un OPML crea las suscripciones a podcasts.
- **CA7.2:** importar la exportación JSON de NewPipe:
  - crea las suscripciones de PeerTube y SoundCloud que sean compatibles;
  - convierte las de YouTube en suscripciones por RSS;
  - informa de las que no se pudieron convertir.
  - Formatos de FreeTube y LibreTube: [NV], definir con ejemplos reales en la tarea T-061.
- **CA7.3:** exportar genera un JSON con esquema versionado (`packages/contracts`) y un OPML. Reimportarlo en una instalación limpia reproduce el estado (prueba de ida y vuelta).

## Aclaraciones pendientes ([NECESITA ACLARACIÓN])
Resolver antes de cerrar el plan (paso *clarify*):
- [ ] ¿A qué pantalla lleva el intent `youtube.com/feed/channels` en la app de YouTube actual?
- [ ] ¿Funciona el permiso de accesibilidad sin “ajustes restringidos” al instalar desde F-Droid? (informes contradictorios)
- [ ] Formatos exactos de exportación de FreeTube y LibreTube (falta un ejemplo real)
