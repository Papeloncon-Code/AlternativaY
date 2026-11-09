# 06 · Reproductor propio de YouTube en la web

**Estado:** actualizado 2026-11-08. La conclusión de este documento sustituye la conclusión original del 2026-11-07. Documento rector: ADR-013.

## Conclusión corregida

Un reproductor web propio es técnicamente posible cuando la página cuenta con un puente instalado en el navegador y un runtime que entienda los transportes que entrega el proveedor. Kira demuestra una ruta web basada en Shaka, youtubei.js, googlevideo/SABR, BgUtils y una extensión puente. No hace falta retransmitir el vídeo a través de un Worker de TodoTube.

La web sin extensión/bridge no dispone por sí sola de los permisos de origen necesarios para hacer todas las peticiones de este flujo. Por eso TodoTube entrega un Bridge propio, instalado por el usuario, de alcance restringido al dominio de TodoTube.

## Arquitectura elegida

- **UI y controles:** TodoTube, un solo PlayerHost y Shaka.
- **Resolución:** Onesie como primera ruta WEB; InnerTube estándar como fallback.
- **Clientes alternativos:** cadena Flow-style, adaptada a los perfiles disponibles en youtubei.js.
- **Transporte:** SABR/UMP; DASH, HLS y URL progresiva cuando la respuesta los incluya.
- **Bridge:** extensión Manifest V3 para Chrome/Edge. Su inyección está limitada a TodoTube y sus destinos a hosts del proveedor.
- **Redundancia de almacenamiento:** R2 own/licensed y réplica idéntica; no almacenar ni retransmitir vídeos de YouTube sin permiso.
- **Failover:** misma sesión visual; conservar timestamp, play/pause, volumen y velocidad.

## Referencias verificadas

| Proyecto | Aporte técnico | Uso en TodoTube |
|---|---|---|
| [Kira](https://github.com/LuanRT/kira) | Shaka + googlevideo/SABR + youtubei.js + BgUtils + Bridge | Implementación web de referencia; código adaptado con atribución MIT |
| [googlevideo](https://github.com/LuanRT/googlevideo) | Adaptador SABR/UMP para Shaka | Dependencia de transporte |
| [youtubei.js](https://github.com/LuanRT/YouTube.js) | Sesiones y clientes InnerTube | Resolución de vídeo |
| [Flow Android](https://github.com/Flow-YouTube/Flow) | Cadena de clientes nativa y recuperación de playback | Referencia de resiliencia; no se copia implementación GPL |
| [Flow Desktop](https://github.com/Flow-YouTube/Flow-Desktop) | SABR, manifiestos, revalidación y proxy local | Referencia arquitectónica; no se copia implementación GPL |

## Límites conocidos de la primera versión

- Manifest V3 implementado para Chrome/Edge; no se presume compatibilidad con Firefox ni navegadores móviles.
- No hay aún validación manual publicada de vídeo y audio completos con los vídeos reales de la matriz de pruebas.
- Si no se instala Bridge, TodoTube muestra una instrucción de instalación/estado; no debe insertar un iframe de YouTube como sustituto.
- Las fuentes de YouTube pertenecen a un mismo proveedor upstream. Los distintos perfiles y modos mejoran resiliencia, pero no equivalen a múltiples CDN independientes.
- El failover de dominio independiente se obtiene con R2/creator-origin cuando exista una copia autorizada del mismo asset.

## Validación obligatoria

Ver ADR-013 y la matriz de pruebas de la especificación 010: vídeo corto, largo, audio adaptativo, Short, directo, cambio de origen, reanudación y fallos inducidos.
