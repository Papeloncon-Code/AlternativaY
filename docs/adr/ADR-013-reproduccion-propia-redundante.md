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
- No se declara terminado por pasar TypeScript: exige evidencia real de audio/vídeo completo.

## Estado actual de implementación

PR #37 integra la primera versión a nivel de código. En el commit `1528993e1ac1a0f6185adbe18e7f8c706d3c537b`, CI #467 terminó con build, TypeScript, Bridge, Gateway, avisos y 86/86 pruebas Playwright en verde; CodeQL #106 también pasó. La PR permanece en borrador y no está desplegada. Aún faltan instalación del Bridge en navegador real y evidencia de reproducción de audio/vídeo, seek y failover con contenido real. Por tanto, playback no se declara completo.
