# Plan de pruebas · Gateway multimedia PoC

## Principios

- Ejecutar en local con Wrangler y fixtures propios.
- Ninguna prueba debe consultar YouTube, Googlevideo, InnerTube ni BotGuard.
- Cada caso debe registrar status, cabeceras relevantes, bytes recibidos y resultado.
- No marcar como aprobado un caso que no se ejecutó.
- Probar en navegador real al menos una vez para validar CORS y seek.

## Matriz de pruebas

| ID | Caso | Resultado esperado |
|---|---|---|
| GW-001 | GET completo | 200; bytes y hash iguales al fixture de origen |
| GW-002 | HEAD | 200; cabeceras de representación; cuerpo vacío |
| GW-003 | Range `bytes=0-1023` | 206; Content-Range exacto; 1024 bytes |
| GW-004 | Range intermedio | 206; devuelve exactamente el intervalo pedido |
| GW-005 | Range abierto `bytes=N-` | 206 con longitud restante correcta |
| GW-006 | Range fuera de tamaño | 416 y `Content-Range: bytes */<length>` |
| GW-007 | Range malformado/múltiple | Rechazo seguro o comportamiento documentado; nunca devolver bytes incorrectos |
| GW-008 | OPTIONS desde origen permitido | 204/200 con métodos y cabeceras estrictamente necesarios |
| GW-009 | OPTIONS desde origen no permitido | Sin `Access-Control-Allow-Origin` autorizante |
| GW-010 | GET con origen no permitido | Política explícita; no reflejar el origen arbitrariamente |
| GW-011 | Host destino fuera de allowlist | 400/403; no se hace fetch |
| GW-012 | localhost, loopback, RFC1918, link-local y metadata IP | Rechazo; no se hace fetch |
| GW-013 | path traversal y encoding ambiguo | Rechazo |
| GW-014 | redirección del origen a host no permitido | Rechazo; no seguir redirección abierta |
| GW-015 | upstream 404/500 | Propagar estado adecuado; no devolver 200 |
| GW-016 | upstream sin Content-Length | Streaming correcto sin inventar longitud |
| GW-017 | cancelación del cliente | Se aborta upstream cuando sea posible; medir/registrar comportamiento |
| GW-018 | streaming incremental | Primer chunk llega antes de consumir el cuerpo completo en origen |
| GW-019 | archivo de vídeo HTML5 | Reproduce, pausa, seek, volumen y finalización |
| GW-020 | Shaka aislado (si viable) | Carga el fixture y puede hacer seek sin errores de red |
| GW-021 | regresión web | Build, typecheck y Playwright existentes siguen pasando |
| GW-022 | aislamiento de producción | Diff confirma que el Worker web, sus rutas y el Puente no cambiaron |

## Validaciones de protocolo

### Range

- Enviar Range al origen solo después de validarlo.
- Si upstream devuelve 206, preservar Content-Range, Content-Length, Content-Type y Accept-Ranges coherentes.
- Si upstream ignora Range y devuelve 200, no fingir una respuesta 206.
- No construir un 206 incorrecto cortando un cuerpo completo almacenado en memoria.
- Validar que el rango solicitado corresponde al tamaño del fixture.

### CORS

- Permitir solo el origen de desarrollo definido en configuración.
- No usar `Access-Control-Allow-Origin: *` junto con credenciales.
- Exponer `Accept-Ranges`, `Content-Range`, `Content-Length` y `Content-Type` solo si el cliente los necesita.
- Permitir únicamente headers/métodos requeridos por las pruebas.
- Recordar: CORS no es control de acceso ni protección contra abuso.

### Streaming y cancelación

- Utilizar `Response.body` como ReadableStream y reenviar el stream sin materializar el archivo completo.
- Propagar AbortSignal si la API de fetch/Worker lo permite.
- Testear backpressure y cancelación; documentar limitaciones del runtime.
- No añadir caché hasta demostrar que respeta Range, validators y privacidad.

## Pruebas manuales

En Chromium y Firefox:

1. Abrir la página de fixture local.
2. Verificar que el vídeo comienza antes de descargarlo completo.
3. Saltar a un punto cercano al final.
4. Comprobar que se realiza una solicitud Range.
5. Revisar Network: origen de la petición, status 206, Content-Range y ausencia de CORS errors.
6. Repetir con DevTools throttling.
7. Cancelar/cerrar el reproductor y revisar que no continúan solicitudes innecesarias.

## No cubierto por esta PoC

- Compatibilidad con URLs de Googlevideo.
- Firma/descifrado de URL.
- PoToken/BotGuard.
- UMP/SABR real de YouTube.
- Directos y DVR de YouTube.
- Viabilidad contractual de retransmitir contenido de YouTube desde Cloudflare.
- Coste de producción a escala.

Estos puntos requieren otra fase y otra aprobación. No inferir que funcionan a partir de los resultados del fixture.
