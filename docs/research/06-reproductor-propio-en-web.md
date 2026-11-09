# 06 · Reproductor propio de YouTube en la web

**Estado:** actualizado 2026-11-08. La conclusión de este documento sustituye la conclusión original del 2026-11-07. Documento rector: ADR-013.

## Conclusión corregida

Kira demuestra un runtime web con Shaka, youtubei.js, googlevideo/SABR, BgUtils y un puente local. Materialious full web demuestra otra variante: proxy same-origin en backend Node para las peticiones que el navegador no puede realizar directamente. TodoTube prueba ahora un enfoque intermedio: extractor/attestation en el navegador y relay HTTPS restringido en el Worker del mismo dominio.

La SPA no puede realizar directamente todas las peticiones cross-origin por las reglas CORS. La rama `fix/web-playback-without-bridge-2026-11-09` prueba un relay same-origin restringido para eliminar la instalación manual de Bridge. El éxito todavía depende de que YouTube acepte las solicitudes desde el Worker y se confirme E4.

## Arquitectura elegida

- **UI y controles:** TodoTube, un solo PlayerHost y Shaka.
- **Resolución:** Onesie como primera ruta WEB; InnerTube estándar como fallback.
- **Clientes alternativos:** cadena Flow-style, adaptada a los perfiles disponibles en youtubei.js.
- **Transporte:** SABR/UMP; DASH, HLS y URL progresiva cuando la respuesta los incluya.
- **Relay:** ruta same-origin del Worker que reenvía únicamente destinos HTTPS permitidos, con respuesta de segmentos en streaming y soporte Range.
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
- La web no pide instalar Bridge. Si el relay o YouTube falla, TodoTube muestra un error propio y no inserta un iframe como sustituto.
- Las fuentes de YouTube pertenecen a un mismo proveedor upstream. Los distintos perfiles y modos mejoran resiliencia, pero no equivalen a múltiples CDN independientes.
- El failover de dominio independiente se obtiene con R2/creator-origin cuando exista una copia autorizada del mismo asset.

## Validación obligatoria

Ver ADR-013 y la matriz de pruebas de la especificación 010: vídeo corto, largo, audio adaptativo, Short, directo, cambio de origen, reanudación y fallos inducidos.
