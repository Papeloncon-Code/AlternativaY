# YouTube completo · especificación de reproducción y cliente

| Campo | Valor |
|---|---|
| Estado | PR #37: build y 86/86 Playwright verdes; reproducción real en navegador pendiente |
| Decisión rectora | ADR-013 |
| Broker | Especificación 009 |
| Plataformas | Web Chrome/Edge (Bridge MV3); Android/Desktop vía providers nativos futuros |
| Player | Shaka + controles TodoTube propios |

## Objetivo

Reproducir vídeos de YouTube en TodoTube sin depender de un iframe visible, con una única interfaz, distintas rutas de extracción/transporte y failover automático conservando el estado. No se marca como terminado por resolver metadatos o un URL: debe reproducir el contenido completo.

## Flujo implementado en web

1. PlayerHost consulta si existe una copia autorizada en R2.
2. Si existe, reproduce en GatewayPlayer. Si R2 no está disponible, usa YouTubeSabrPlayer.
3. TodoTube Bridge habilita el acceso del navegador a las solicitudes necesarias desde el origen TodoTube.
   - Requisito actual: instalación manual de Bridge en Chrome/Edge. Sin él, la web no puede ejecutar la ruta SABR y presenta un error recuperable; no hay iframe como fallback.
4. YouTubeSabrRuntime crea sesiones InnerTube independientes para los perfiles soportados.
5. WEB intenta Onesie primero y cae a InnerTube estándar en el mismo perfil.
6. Cada respuesta puede producir candidatos SABR, DASH, HLS o progresivo. Solo se intenta una fuente que exponga datos utilizables.
7. Si el transporte activo falla, se intenta renovar el player response y luego el candidato/perfil siguiente.
8. R2 y runtime web pueden entregarse el control conservando posición, estado, volumen y velocidad.

## Criterios de aceptación

- CA10.1: reproducción completa con audio/vídeo real dentro de controles TodoTube en Chrome y Edge.
- CA10.2: el arranque no queda bloqueado por un único cliente; cada resolución tiene timeout y la cadena tiene presupuesto total medido.
- CA10.3: audio y vídeo sincronizados en progressive y adaptive; seek usable y calidad adaptativa donde esté disponible.
- CA10.4: si Onesie falla, InnerTube normal se intenta antes de abandonar el cliente WEB.
- CA10.5: se recorren perfiles alternativos y se registra cuál entrega playback real.
- CA10.6: ante fallo midstream, se obtienen enlaces nuevos y se reanuda donde se interrumpió.
- CA10.7: cambio R2/runtime y runtime/R2 conserva timestamp, play/pause, volumen y velocidad.
- CA10.8: no hay iframe oficial como fallback de la interfaz TodoTube.
- CA10.9: el contenido DRM/de pago no se desbloquea ni se fuerza; se informa de su indisponibilidad.
- CA10.10: bridge se inyecta solo en TodoTube/localhost y bloquea hosts no permitidos.
- CA10.11: UI propia incluye play/pause, seek, volumen, velocidad y pantalla completa; controles visibles también en modo mini.
- CA10.12: telemetría de diagnóstico excluye credenciales, tokens de integridad y URLs firmadas completas.

## Validación pendiente para cerrar

- Instalar la extensión TodoTube Bridge compilada por CI en Chrome y Edge.
- Probar desde una instalación limpia sin Bridge y comprobar que el error explica el requisito sin crear iframe.
- Probar el flujo con Bridge activo; CI Playwright no sustituye esta verificación.
- Reproducir un vídeo público corto, un vídeo largo (>1 h), un vídeo con audio adaptativo, un Short y un directo cuando la fuente entregue una ruta compatible.
- Forzar fallo de Onesie, perfil WEB, SABR y R2 para demostrar failover.
- Verificar audio, seek, reanudación y ausencia de audio duplicado.
- Medir TTFF p50/p75, buffer ratio y tiempo de conmutación.
- Validar Firefox/Android por separado; Manifest V3 inicial cubre Chrome/Edge, no implica compatibilidad universal.
