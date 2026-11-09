# YouTube completo · especificación de reproducción y cliente

| Campo | Valor |
|---|---|
| Estado | PR #37 integrada en `main`; smoke real del 2026-11-09 sin metadata decodificada; PR #46–#47 abiertas y no desplegadas; aceptación E4 pendiente |
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
7. Los fallos transitorios de red, timeout, 5xx o estancamiento pueden recuperar/reintentar la ruta y, si es necesario, avanzar a otro candidato, conservando timestamp y estado.
8. Un HTTP 400 detiene la rotación a otro perfil. Si Onesie devuelve solo `FAILED_PRECONDITION` genérico, TodoTube permite probar InnerTube normal con el mismo perfil WEB; si ese request también es 400, termina la cadena. 401/403/407/429 y denegaciones explícitas de login, edad, región, consentimiento, anti-bot o tráfico automatizado detienen todas las rutas YouTube. No se cambia identidad ni backend para sortear una denegación.
9. El watchdog observa el avance del elemento de vídeo cada segundo. Tras 2 s sin avance y con menos de 0,25 s de buffer, recupera como máximo tres veces; ignora pausa, seek, fin, pestaña oculta y estado offline.
10. R2 y runtime web pueden entregarse el control conservando posición, estado, volumen y velocidad, siempre que R2 sea una copia autorizada del mismo asset.

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
- CA10.13: un estancamiento real se detecta en un máximo aproximado de 3 s (2 s más el intervalo de muestreo) cuando no hay progreso ni buffer útil; no se dispara por pausa, seek, vídeo terminado, pestaña oculta o navegador offline.
- CA10.14: la recuperación es limitada y reutiliza el mismo Player/Shaka; conserva currentTime, play/pause, volumen y velocidad al cambiar de candidato.
- CA10.15: HTTP 400 detiene la rotación de perfiles; solo un `FAILED_PRECONDITION` genérico de Onesie permite probar InnerTube normal en el mismo perfil WEB, una vez. Un segundo 400 termina la cadena. 401/403/407/429 y restricciones explícitas detienen las rutas YouTube; no se evaden restricciones ni se rotan identidades.
- CA10.16: los errores transitorios (timeout, red y 5xx) siguen siendo elegibles para recuperación/failover.
- CA10.17: la función no se marca terminada hasta completar E4: vídeo real con primer frame/dimensiones, imagen en movimiento, sonido audible y sincronizado, avance, seek hacia delante/atrás, controles TodoTube y recuperación segura en navegador/despliegue objetivo.
- CA10.18: las denegaciones anti-bot, PoToken/BotGuard, tráfico automatizado, región o acceso bloquean los demás providers que dependan del origen YouTube; Invidious o un backend remoto no pueden usarse para cambiar la red/IP y superar la denegación.

## Validación pendiente para cerrar

- Instalar la extensión TodoTube Bridge compilada por CI en Chrome y Edge.
- Probar desde una instalación limpia sin Bridge y comprobar que el error explica el requisito sin crear iframe.
- Probar el flujo con Bridge activo; CI Playwright no sustituye esta verificación.
- Reproducir un vídeo público corto, un vídeo largo (>1 h), un vídeo con audio adaptativo, un Short y un directo cuando la fuente entregue una ruta compatible.
- Simular timeout, 5xx, recurso vencido y estancamiento para demostrar recuperación limitada.
- Simular 400 genérico y `FAILED_PRECONDITION` de Onesie: permitir solo el endpoint estándar del mismo perfil y bloquear cualquier perfil diferente si se repite el 400. Simular además 401, 403, 407, 429 y denegaciones explícitas; comprobar que se detienen todas las rutas YouTube.
- Forzar fallo de Onesie no relacionado con acceso para comprobar el fallback InnerTube del mismo perfil; no usar el fallback ante una denegación explícita.
- Verificar audio, seek, reanudación y ausencia de audio duplicado.
- Medir TTFF p50/p75, buffer ratio y tiempo de conmutación.
- Validar Firefox/Android por separado; Manifest V3 inicial cubre Chrome/Edge, no implica compatibilidad universal.

## Regla de cierre E4

Build, TypeScript, Playwright con fixtures, resultado de extractor, respuesta JSON, manifest, URL o `readyState` sin audio comprobado son evidencias parciales, no éxito final. La única aceptación de reproducción es una ejecución E4 real conforme a `docs/testing/real-playback-release-gate.md` desde el despliegue objetivo. El registro debe incluir evidencia de imagen, audio audible, avance, seek de ida/vuelta, controles propios, recuperación transitoria y manejo correcto de denegaciones. Hasta entonces el estado permanece **PLAYBACK PENDIENTE DE VALIDACIÓN REAL**.
