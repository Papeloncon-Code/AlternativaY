# YouTube completo: especificación

| Campo | Valor |
|---|---|
| Estado | Borrador (reorganizado el 2026-11-07 desde `002-mvp/spec.md`) |
| Requisitos | RF-034, RF-036, RF-037 |
| Decisiones | ADR-005 |
| Plataformas | Android `full` |
| Plan técnico | [plan.md](plan.md) |
| Tareas | [tasks.md](tasks.md) |

## Objetivo
Reproducir YouTube sin anuncios, en segundo plano, con PiP, descargas y SponsorBlock, extrayendo solo en el dispositivo.

## Historias y criterios de aceptación
### H10. YouTube completo (RF-034, RF-036, RF-037)
- **CA10.1:** buscar en YouTube devuelve vídeos, canales y listas. Abrir un vídeo empieza a reproducir en < 2 s (p75, wifi) sin anuncios.
- **CA10.2:** segundo plano, PiP, cola, velocidad, subtítulos, capítulos y calidad (hasta la máxima disponible; AV1/VP9 si el dispositivo lo decodifica) funcionan igual que en el resto de fuentes (H3).
- **CA10.3:** se puede descargar vídeo o audio, y el elemento descargado se reproduce sin red.
- **CA10.4:** SponsorBlock salta los segmentos de las categorías elegidas y lo muestra con un aviso. DeArrow y RYD se pueden activar por separado.
- **CA10.5:** importar el CSV de suscripciones de Google Takeout y las exportaciones de NewPipe y PipePipe crea todas las suscripciones de YouTube compatibles. Informa de las que no se pudieron importar.
- **CA10.6:** ante un error de extracción repetido, la app muestra un estado único (“YouTube cambió algo”) y busca una actualización. El hotfix firmado se instala desde la app.
- **CA10.7:** contenido con DRM o de pago: se muestra “No disponible en esta app” y no se intenta reproducir.
- **CA10.8:** un test de CI garantiza que la build `play` no contiene el módulo `:connector:youtube`.

## Aclaraciones pendientes ([NECESITA ACLARACIÓN])
Resolver antes de cerrar el plan (paso *clarify*):
- [ ] ¿Qué versión de NewPipeExtractor y con qué estrategia de actualización (dependencia directa o vendorizada)?
- [ ] Licencia de los datos de SponsorBlock (CC BY-NC-SA, sin verificar): ¿afecta a un plan de pago?
- [ ] ¿Shorts dentro del feed o aparte por defecto?
