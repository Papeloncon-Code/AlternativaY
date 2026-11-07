# Reproductor y biblioteca: especificación

| Campo | Valor |
|---|---|
| Estado | Borrador (reorganizado el 2026-11-07 desde `002-mvp/spec.md`) |
| Requisitos | RF-003, RF-004, RF-005, RF-006, RF-007, RF-008 |
| Decisiones | — |
| Plataformas | Android + web |
| Plan técnico | [plan.md](plan.md) |
| Tareas | [tasks.md](tasks.md) |

## Objetivo
Reproducir cualquier fuente con una experiencia de primer nivel y organizar lo visto y guardado.

## Historias y criterios de aceptación
### H3. Reproducción (RF-003, RF-004)
- **CA3.1:** audio y vídeo nativos (podcast, PeerTube, local) siguen sonando con la pantalla apagada y se controlan desde la notificación, la pantalla de bloqueo y los auriculares Bluetooth.
- **CA3.2:** al pulsar Inicio durante un vídeo nativo se entra en PiP (Android 8+; automático en 12+).
- **CA3.3:** velocidad de 0,5× a 3× en pasos de 0,05; saltos configurables (por defecto −10/+30 s en audio y ±10 s en vídeo).
- **CA3.4:** reanudación: al reabrir un elemento continúa desde la última posición menos 3 s.
  - Se marca como visto al llegar al 95 % o a menos de 30 s del final.
- **CA3.5:** cola: añadir al final o a continuación, reordenar arrastrando y quitar. Se conserva tras matar el proceso.
- **CA3.6:** contenido de YouTube **en la web** (y en la build `play`, fase 2):
  - se abre en el reproductor IFrame oficial;
  - al salir de la pantalla **se pausa**;
  - no existe opción de descarga;
  - se muestra el aviso descrito en `ux.md` §3.4.

### H4. Descargas (RF-005)
- **CA4.1:** solo aparece “Descargar” en los elementos cuyo conector declara `canDownload`: enclosures de podcast y PeerTube cuando la instancia permite la descarga [NV: campo exacto de la API].
- **CA4.2:** las políticas “solo wifi” y “límite de N GB” se respetan. Un elemento descargado se reproduce en modo avión.

### H5. Biblioteca e historial (RF-006, RF-007)
- **CA5.1:** crear, renombrar y borrar colecciones; añadir y quitar elementos; marcar favorito; etiquetar.
- **CA5.2:** el historial registra cada reproducción de más de 10 s. Se puede pausar y borrar por rango.

### H6. Búsqueda local (RF-008)
- **CA6.1:** buscar “entrevista” encuentra coincidencias en título, descripción y autor en < 100 ms con 10 000 elementos (FTS), sin red.

## Aclaraciones pendientes ([NECESITA ACLARACIÓN])
Resolver antes de cerrar el plan (paso *clarify*):
- [ ] ¿Los saltos por defecto (−10/+30 s audio) son adecuados para el público de YouTube?
- [ ] Campo exacto de la API de PeerTube que indica si se permite descargar
