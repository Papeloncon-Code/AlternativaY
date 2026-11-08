# ADR-010 · Reproductor propio obligatorio y límites de transporte

- **Estado:** Aceptado (2026-11-08; actualización por decisión expresa del propietario).
- **Sustituye:** el fallback automático al reproductor oficial descrito en la versión anterior de este ADR.
- **Relacionado con:** ADR-005, ADR-009, Spike T-100, `apps/web/src/player/TodoTubePlayer.ts`, `apps/web/src/player/ShakaPlayerAdapter.ts`, Issue #3.

## Objetivo del producto

La interfaz de reproducción debe pertenecer a TodoTube. No se debe insertar el reproductor oficial de YouTube como sustituto automático cuando falte TodoTube Puente o falle el reproductor propio.

Esto es un requisito de producto, no una afirmación de que el transporte esté resuelto.

## Decisión de interfaz

1. `PlayerHost` monta siempre `OwnPlayer`.
2. `ShortsPlayer` monta siempre `OwnPlayer`.
3. Si el navegador no tiene TodoTube Puente, el área de vídeo muestra una pantalla propia con una instrucción para activar el Puente. No carga un iframe de YouTube.
4. Si el reproductor propio falla, muestra un error propio y una acción de reintento. No cambia silenciosamente a un reproductor de terceros.
5. Se retiran del código activo `OfficialPlayer.tsx` y `player/embed.ts`, que implementaban el iframe `youtube-nocookie`.
6. Las pruebas de regresión deben comprobar que vídeos, minirreproductor y Shorts no insertan iframes de YouTube.

## Estado técnico de reproducción

El reproductor propio ya existe como conjunto de componentes:

- Shaka Player proporciona el elemento de reproducción y los controles de TodoTube.
- `youtubei.js` obtiene la respuesta de reproducción mediante InnerTube.
- `googlevideo` y `SabrStreamingAdapter` implementan el transporte SABR/UMP.
- `bgutils-js` ejecuta BotGuard en el navegador y genera el token de integridad.
- `ShakaPlayerAdapter` conecta Shaka con las respuestas multimedia.

Pero la implementación web actual sigue usando TodoTube Puente para las solicitudes que el navegador no puede realizar directamente por CORS. Quitar la condición `useBridge()` de `PlayerHost` no elimina esa dependencia; solo impide que la interfaz caiga en el iframe oficial. Por eso, sin Puente, la interfaz propia muestra una pantalla de activación y no reproduce el vídeo.

## Gateway: qué está y qué no está decidido

La PoC del PR #2 demuestra transporte HTTP con fixtures propios: GET/HEAD, Range, 206/416, CORS, streaming y cancelación. No solicita URLs de `googlevideo`, no ejecuta InnerTube, no genera BotGuard/PoToken y no demuestra reproducción real de YouTube. No está desplegada.

El propietario ha solicitado Gateway-first y Puente como respaldo. La revisión técnica identificó que un Worker que solicite el contenido desde su propia infraestructura necesita resolver los controles anti-bot y las restricciones de origen/IP de YouTube. No es correcto presentar la PoC de fixtures como solución a ese problema.

Se mantienen estas restricciones:

- No generar ni falsificar BotGuard/PoToken en el servidor.
- No trasladar al Worker tokens de integridad del navegador para hacer que las solicitudes del servidor parezcan solicitudes legítimas del usuario.
- No rotar IP para sortear bloqueos.
- No suplantar clientes ni automatizar evasiones de controles técnicos.
- No crear un proxy abierto de URLs de vídeo.

Estas restricciones no autorizan a volver a mostrar el iframe oficial. Son un límite sobre cómo puede obtenerse el contenido, no sobre qué interfaz debe mostrar TodoTube.

## Modos de funcionamiento resultantes

| Condición | Interfaz | Resultado |
|---|---|---|
| Puente instalado y flujo de extracción operativo | Reproductor propio de TodoTube | Reproducción mediante Shaka/SABR en el navegador |
| Puente ausente | Pantalla propia de TodoTube con CTA para activarlo | No hay reproducción de YouTube hasta disponer de un transporte compatible |
| Error de InnerTube, BotGuard o SABR | Mensaje de error propio y reintento | No se cambia al iframe oficial |
| Gateway disponible para contenido propio/licenciado | Reproductor propio de TodoTube | Transporte de esos recursos; no implica compatibilidad con YouTube |

## Trabajo pendiente para cerrar la función principal

- Verificar en navegador real la reproducción de vídeos completos con Puente: VOD largo, Shorts, seek, calidades, audio, subtítulos, cancelación y expiración/renovación de respuesta.
- Reducir fricción de instalación del Puente. La publicación/firma en tiendas sigue pendiente.
- Investigar alternativas del lado cliente, como userscript con gestor compatible, sin asumir que eliminan la necesidad de un componente con permisos de red.
- Separar transporte de extracción mediante una interfaz de proveedor para que se pueda añadir una vía autorizada sin reescribir Shaka.
- No declarar «sin Puente» completado hasta que una sesión limpia reproduzca un vídeo real usando el reproductor propio.
- No declarar Gateway-first completado con pruebas de fixtures propios.

## Consecuencias

- La interfaz de TodoTube ya no debe mostrar el iframe ni la marca del reproductor oficial como fallback automático.
- La experiencia sin Puente es visualmente propia, pero la reproducción de YouTube requiere activar Puente.
- ADR-005 sigue vigente: extracción en el dispositivo, no en nuestros servidores.
- La PoC de Gateway sigue siendo útil para contenido propio o con licencia; no es una implementación del Gateway de YouTube.
- Issue #3 permanece abierto hasta demostrar el objetivo de reproducción sin instalación manual o una alternativa autorizada y funcional.
