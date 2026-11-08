# Especificación 008 · PoC de gateway multimedia para la web

- **Estado:** Lista para implementación experimental; no autoriza producción.
- **Fecha:** 2026-11-07
- **Decisión relacionada:** [ADR-009](../../docs/adr/ADR-009-gateway-multimedia-sin-puente.md)
- **Decisión que se mantiene:** [ADR-005](../../docs/adr/ADR-005-cliente-youtube-completo.md)

## 1. Objetivo

Comprobar, con un origen de vídeo controlado por TodoTube, si un Cloudflare Worker independiente puede retransmitir multimedia en streaming y ser consumido por Shaka/HTML5 sin instalar TodoTube Puente.

La PoC debe producir evidencia reproducible. No debe intentar reproducir contenido de YouTube en el Worker.

## 2. Estado actual confirmado

- `apps/web/src/components/PlayerHost.tsx`: el reproductor propio se monta solo si existe bridge y no se activó fallback.
- `apps/web/src/player/TodoTubePlayer.ts`: usa Shaka, YouTube.js, BotGuard y `SabrStreamingAdapter`; `available()` exige `checkExtension()`.
- `apps/web/src/player/ShakaPlayerAdapter.ts`: Shaka hace `fetch(uri, init)` en el navegador; procesa respuestas UMP con `SabrUmpProcessor`.
- `apps/web/wrangler.toml`: configura el Worker web actual `todotube`. No reutilizar este Worker como gateway ni modificar su ruta de producción para esta PoC.
- `apps/web/package.json`: build actual ejecuta TypeScript, Vite y empaquetado del puente. No romper este flujo.

## 3. Alcance

### Incluido

1. Crear un Worker separado para el gateway experimental, siguiendo las convenciones reales del repositorio después de inspeccionarlas.
2. Configurar un origen de prueba controlado por el proyecto (fixture de vídeo pequeño, sin copyright de terceros).
3. Implementar proxy streaming limitado al origen de prueba, con:
   - GET y HEAD;
   - Range de bytes y respuesta 206;
   - Content-Range, Accept-Ranges, Content-Length y Content-Type cuando correspondan;
   - CORS explícito para el origen de desarrollo/prueba;
   - respuesta OPTIONS coherente;
   - propagación de cancelación del cliente al upstream cuando la plataforma lo permita;
   - propagación de errores y códigos HTTP sin convertir todos los errores en 200.
4. Pruebas automatizadas unitarias e integración del Worker.
5. Una página/fixture de prueba aislada que reproduzca el vídeo con HTML5 y, si el entorno permite, con Shaka.
6. Informe con resultados, límites, costes/mediciones disponibles y recomendación.

### Fuera de alcance

- Reproducir vídeos reales de YouTube a través del gateway.
- InnerTube, YouTube.js, BotGuard, PoToken, cookies de Google o descifrado de firmas en el Worker.
- Reemplazar o eliminar la extensión Puente.
- Cambiar `PlayerHost`, `OwnPlayer`, `OfficialPlayer` o el comportamiento de fallback en producción.
- Cambiar la interfaz/controles del reproductor.
- Desplegar Workers, configurar dominios, secretos, DNS o rutas de producción.
- Guardar en caché contenido multimedia de terceros.
- Abrir un proxy genérico que acepte URLs arbitrarias.

## 4. Requisitos funcionales

- **RF-01:** el Worker solo puede recuperar recursos desde un origen de prueba allowlisted y configurado por variable de entorno.
- **RF-02:** el cliente puede solicitar el archivo completo mediante GET.
- **RF-03:** el cliente puede solicitar un rango de bytes; si el origen responde correctamente, el Worker devuelve 206 y preserva Content-Range.
- **RF-04:** HEAD devuelve cabeceras equivalentes sin cuerpo.
- **RF-05:** el Worker retransmite el cuerpo mediante Streams API; no llama a `arrayBuffer()`, `text()` ni `blob()` para almacenar el archivo completo.
- **RF-06:** OPTIONS devuelve las cabeceras CORS necesarias únicamente para los orígenes permitidos.
- **RF-07:** el Worker rechaza métodos no soportados, destinos fuera de allowlist, rutas malformadas y redirecciones hacia hosts no permitidos.
- **RF-08:** cancelar la reproducción cancela la lectura upstream cuando sea técnicamente posible.
- **RF-09:** los errores upstream conservan un estado HTTP apropiado y se registran sin filtrar URLs sensibles ni tokens.
- **RF-10:** la PoC no modifica la ruta de reproducción de producción ni el comportamiento de Puente.

## 5. Requisitos de seguridad

- No aceptar una URL completa arbitraria desde query string o body.
- No permitir SSRF, acceso a IP privadas, localhost, metadata endpoints ni hosts no allowlisted.
- Validar método, path, origen y parámetros antes de hacer fetch.
- Desactivar credenciales/cookies por defecto.
- No aceptar ni registrar cookies, Authorization, PoToken o credenciales de Google.
- No seguir redirecciones a un host no permitido; validar cada destino o rechazar redirecciones.
- Limitar tamaño/rango, concurrencia y tiempo de solicitudes de acuerdo con límites documentados de Cloudflare.
- No exponer trazas, cabeceras internas ni secretos al cliente.
- Añadir límites básicos contra abuso; documentar qué controles requieren autenticación antes de cualquier uso público.
- No usar CORS como mecanismo de autenticación: CORS no impide que otros clientes HTTP llamen al endpoint.

## 6. Arquitectura objetivo de la PoC

```text
Browser (fixture de prueba)
  |
  | GET /media/test-video.mp4
  | Range: bytes=...
  v
Cloudflare Worker: todotube-media-gateway-dev
  |
  | fetch a origen fijo allowlisted
  v
Origen de fixture controlado por el proyecto
```

El Worker web actual permanece independiente. El gateway no recibe IDs de YouTube ni URLs de Googlevideo.

## 7. Criterios de aceptación

- **CA-01:** el Worker se ejecuta localmente con Wrangler sin modificar el Worker web existente.
- **CA-02:** un GET de fixture devuelve los mismos bytes y Content-Type que el origen.
- **CA-03:** Range válido devuelve 206, Content-Range correcto y bytes exactos.
- **CA-04:** Range no satisfacible devuelve 416 con la cabecera adecuada cuando corresponda.
- **CA-05:** HEAD no devuelve cuerpo.
- **CA-06:** OPTIONS responde con CORS limitado al origen permitido; origen no permitido no recibe autorización CORS.
- **CA-07:** destino arbitrario, localhost, IP privada, metadata endpoint y redirección a host no permitido son rechazados.
- **CA-08:** una prueba de streaming confirma que el Worker entrega chunks antes de que el fixture completo se haya consumido; no materializa el archivo entero en memoria.
- **CA-09:** cancelar la petición aborta upstream o documenta la limitación demostrada.
- **CA-10:** el fixture reproduce y permite seek con HTML5; probar Shaka si la integración aislada puede hacerse sin acoplar producción.
- **CA-11:** build, lint/typecheck y suite existente de la web continúan pasando.
- **CA-12:** no hay cambios de producción ni llamadas a YouTube/Googlevideo desde el Worker.
- **CA-13:** se entrega un informe que separa resultados verificados, no verificados y limitaciones del entorno.

## 8. Definición de terminado

La PoC está terminada cuando todos los criterios CA-01 a CA-13 tienen evidencia o una explicación explícita de bloqueo. Un test omitido no cuenta como aprobado. No se considera que la dependencia de Puente esté eliminada ni que YouTube funcione sin extensión por haber aprobado esta PoC.
