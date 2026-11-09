# ADR-013 · Reproducción propia de YouTube con cadena redundante de proveedores

- **Estado:** Aceptado por el propietario del producto el 2026-11-08; arquitectura rectora de playback.
- **Sustituye:** ADR-011 como dirección de reproducción de YouTube; deja sin vigencia las prohibiciones técnicas de la Constitución v3.
- **Conserva:** los límites de seguridad sobre DRM, datos privados y almacenamiento autorizado.
- **Referencias técnicas:** Flow Android/Desktop (cadena de clientes y recuperación), Kira (SABR/Onesie en navegador), youtubei.js, googlevideo y Shaka Player.
- **Implementación inicial:** PR #37, rama `feat/todotube-unified-playback`.

## Objetivo de producto

TodoTube reproduce el vídeo dentro de su propia interfaz, con controles, continuidad e historial propios. El reproductor no debe depender del iframe de YouTube como solución principal ni como fallback visual. Si falla una ruta, TodoTube prueba la siguiente dentro del mismo host de reproducción y conserva la posición.

Las decisiones previas del repositorio no pueden bloquear este objetivo. Esta ADR es la única referencia vigente para la arquitectura de reproducción.

## Arquitectura única

```text
TodoTube UI / PlayerHost (un solo reproductor)
              |
      Playback Broker
              |
     +--------+------------------------+
     |                                 |
  R2 propio/licenciado             YouTube web runtime
  (si existe backup)                    |
                              +---------+----------------+
                              |                          |
                        Onesie / SABR               InnerTube normal
                              |                          |
                       Shaka + googlevideo         cliente alternativo
                              |
                   perfiles/clientes en cadena
                              |
                   SABR / DASH / HLS / directo
```

### Niveles de redundancia

1. **Proveedor de contenido:** R2 de TodoTube para una copia propia/licenciada del mismo vídeo; runtime YouTube en el dispositivo cuando no existe esa copia.
2. **Resolución del player:** Onesie como primera ruta del cliente WEB; petición InnerTube normal como alternativa inmediata para el mismo cliente.
3. **Cadena de clientes:** perfiles independientes de InnerTube. La implementación actual está fijada a `youtubei.js@16.0.0` y solo compila con MWEB, WEB, TV, TV_EMBEDDED, WEB_EMBEDDED, ANDROID_CREATOR y ANDROID. VISIONOS y ANDROID_VR quedan diferidos hasta actualizar la dependencia y validar el nuevo contrato. La presencia en la cadena no implica que un perfil resuelva o reproduzca cada vídeo.
4. **Transportes:** SABR/UMP, DASH, HLS y URL progresiva directa cuando el resultado contenga un recurso utilizable. No se considera candidata una respuesta sin medio reproducible.
5. **Recuperación en reproducción:** renovar una vez los datos/URL del cliente actual; si falla, avanzar por el resto de candidatos y clientes. R2 puede revalidarse después de una caída del runtime web.
6. **Conmutación:** guardar timestamp, play/pause, volumen y velocidad; cargar la siguiente fuente desde el timestamp guardado. Nunca cambiar a otro vídeo por similitud de título.

## Componentes

- **PlayerHost:** dueño único del dock, navegación y selección de fuente.
- **PlaybackBroker:** prioridades, timeouts, salud, cuarentena temporal y política de failover.
- **YouTubeSabrRuntime:** runtime de extracción y reproducción en el navegador; mantiene una instancia Shaka por sesión.
- **TodoTube Bridge:** extensión local Manifest V3, actualmente compilada para Chrome/Edge. Es requisito para el runtime SABR web porque habilita las peticiones que el navegador bloquea por CORS. Solo se inyecta en TodoTube/localhost y solo acepta los dominios declarados. Sin Bridge, el player comunica la limitación y no finge reproducción.
- **Media Gateway R2:** almacén y entrega de archivos propios/licenciados. No es un proxy de YouTube ni un requisito para el runtime SABR.
- **Android/Desktop:** futuros adaptadores nativos implementarán el mismo contrato del broker, sin duplicar la UI web ni mezclar sus dependencias con el runtime web.

## Reglas de resiliencia

- Cada resolución y carga tiene un timeout finito.
- Un proveedor que falla entra en cooldown exponencial; se vuelve a probar en una ventana half-open.
- Un éxito restaura la salud del proveedor.
- Se distingue entre fallo de red, recurso vencido, respuesta no reproducible, restricción del vídeo y error del usuario.
- Un error no recuperable para un vídeo no debe quemar toda la cadena sin probar la siguiente ruta que sí pueda servirlo.
- No se reintenta indefinidamente el mismo candidato.
- El progreso se guarda cada pocos segundos, al pausar, al cambiar de fuente y al desmontar el player.
- El failover solo cuenta como exitoso después de que el reproductor haya cargado y comience a entregar datos; resolver un URL no prueba que el vídeo funcione.
- Los logs nunca incluyen cookies, tokens de integridad, claves, cuerpos cifrados ni URLs firmadas completas.

## Seguridad y operación

- La resolución y entrega de YouTube ocurren desde el dispositivo/runtime del usuario. Cloudflare Workers y R2 no retransmiten streams de YouTube.
- TodoTube Bridge limita ejecución al origen de TodoTube y a hosts HTTPS explícitamente permitidos; no acepta destinos arbitrarios.
- Nunca se elude DRM/Widevine ni se intenta reproducir contenido de pago sin autorización.
- No se suben ni almacenan vídeos de YouTube en R2 por defecto. El Gateway sigue reservado a contenido propio/licenciado con evidencia de derechos.
- No se almacenan credenciales de Google en nuestros servidores.
- La implementación técnica no constituye una garantía de cumplimiento de las condiciones de terceros. Antes de distribución comercial se revisan términos, licencias y jurisdicciones aplicables; una incertidumbre externa no se convierte en una prohibición interna automática, pero sí se registra como riesgo concreto.

## Hallazgo adicional: fallback local de Materialious

La inspección del código de Materialious añade una pista que debe distinguirse de un segundo CDN:

- Su función de selección de vídeo puede elegir `getVideoYTjs()` en vez de `getVideoInvidious()` cuando el backend YouTube está activo, cuando `useEngineFallback('Video')` lo decide o cuando se fuerza YouTube.js en una plataforma no restringida.
- Su documentación de desarrollador distingue SPA web estática, full web con backend Node, Desktop/Electron y Android. Define la plataforma no restringida como full backend o plataforma nativa; por tanto, la SPA estática no recibe automáticamente el mismo fallback local.
- En el issue Materialious #869, el mantenedor atribuyó el fallo de reproducción web a que Google estaba bloqueando Invidious y recomendó usar el fallback local en Android/Desktop. Esto demuestra una recuperación en esos entornos concretos, no una garantía para una SPA web estática.
- TodoTube ya tiene un runtime de navegador con `youtubei.js`; todavía no tiene el Node runtime local de Android ni el full backend de Materialious. Una prueba de compatibilidad de versiones y una ejecución E4 real deben preceder a cualquier cambio de runtime.
- Un backend remoto o una instancia Invidious no se debe utilizar para desplazar solicitudes a otra red cuando la respuesta indique BotGuard, PoToken, tráfico automatizado, restricciones de acceso, región o IP. Eso sería cambiar el origen de la petición para evitar una denegación, no una recuperación técnica autorizada.

Fuentes de la investigación: [Materialious issue #869](https://github.com/Materialious/Materialious/issues/869), [Materialious DEV.md — tipos de app y runtime](https://github.com/Materialious/Materialious/blob/main/docs/DEV.md), [selector de motor de Materialious](https://raw.githubusercontent.com/Materialious/Materialious/main/materialious/src/lib/api/index.ts).

## Puerta final de aceptación E4

La aceptación de playback se cierra solo con un vídeo real en el TodoTube desplegado: metadata y primer frame, dimensiones válidas, imagen en movimiento, sonido audible sincronizado, avance sostenido de `currentTime`, seek de ida y vuelta, pausa/reanudación, volumen, velocidad y pantalla completa desde controles TodoTube, y recuperación segura de un fallo transitorio en staging. La denegación explícita debe detener la cadena sin cambiar de identidad ni usar otro backend para eludirla. La prueba debe registrar navegador, Bridge, commit y proveedor/ruta. Ver `docs/testing/real-playback-release-gate.md`.

## Criterios de aceptación

- Reproducir un vídeo real de duración completa en Chrome y Edge con controles propios.
- Confirmar audio y vídeo; seek hacia delante/atrás; calidad adaptativa; subtítulos si el proveedor los entrega; fullscreen; pausa/reanudación.
- Confirmar que un fallo simulado de Onesie pasa a InnerTube.
- Confirmar que un cliente fallido pasa al cliente siguiente.
- Confirmar que SABR fallido pasa a DASH/HLS/directo cuando existan candidatos.
- Confirmar que una caída a mitad del vídeo cambia de fuente y conserva el tiempo de reproducción.
- Confirmar que R2 y runtime YouTube se revalidan uno al otro sin crear dos instancias de reproductor ni audio duplicado.
- Confirmar que no existe iframe de YouTube como fallback dentro de TodoTube.
- Medir tiempo al primer frame, duración de cada intento, tasa de éxito por proveedor y tiempo de failover.
- Pruebas automatizadas de los contratos y pruebas manuales con vídeos públicos variados, directos, Shorts, vídeos largos y casos restringidos.
- Build, TypeScript, contratos y Playwright son puertas intermedias; **E4 es el único cierre** y exige que un vídeo sí reproduzca en el despliegue objetivo con imagen, sonido audible/sincronizado, avance, seek, controles propios y recuperación real. Un error correcto ante contenido restringido es una prueba de seguridad separada, no un éxito de playback.

## Estado actual de implementación

PR #37 integra la primera versión a nivel de código y ya está fusionada en `main`. En el commit `1528993e1ac1a0f6185adbe18e7f8c706d3c537b`, CI #467 terminó con build, TypeScript, Bridge, Gateway, avisos y 86/86 pruebas Playwright en verde; CodeQL #106 también pasó. La integración no equivale a aceptación E4. El smoke desplegado del 2026-11-09 no decodificó metadata y las ramas de diagnóstico/recuperación #46–#47 siguen abiertas sin fusionar ni desplegar. Aún falta evidencia E4 de imagen, sonido audible, seek y recuperación con contenido real. Por tanto, playback no se declara completo.

## Adaptación SABR derivada de Materialious

La inspección del SABR local de Materialious añadió tres pasos: preparar `ENGAGEMENT_TYPE_UNBOUND` en el mismo cliente YouTube.js, escuchar `StreamProtectionStatus=3`, y renovar attestation/WebPO desde el minter local. TodoTube implementa esos pasos en PR #47 dentro de `YouTubeSabrRuntime` y `ShakaPlayerAdapter`; no se introduce proxy, `jsdom`, helper de PoToken ni cambio de IP. La bandera Onesie `sendVideoPlaybackConfig=false` se elimina, porque desactiva explícitamente la transmisión de la configuración de playback. El efecto de ese cambio sobre la respuesta real todavía debe probarse.

El SABR de Materialious se construye a partir de `/player` WEB normal. Invidious PR #5814 observa que ciertas respuestas Onesie no habilitan contextos SABR que luego el servidor entrega vía `SABR_CONTEXT_UPDATE`; la PR sigue draft y también contiene un proxy/PoToken helper que TodoTube no adopta. No se asume que la ruta Onesie de TodoTube sea SABR-ready por el simple hecho de devolver HTTP 200 y un campo UStreamer.

Estos cambios son una adaptación protocolaria, no evidencia de éxito. E4 sigue siendo obligatorio.