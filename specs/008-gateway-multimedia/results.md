# Resultados · PoC del gateway multimedia (spec 008, ADR-009)

| Campo | Valor |
|---|---|
| Fecha | 2026-11-08 |
| Rama | `feat/008-gateway-multimedia-poc` (desde `sdd/investigacion-y-especificacion`) |
| Proyecto | `apps/media-gateway/` — Worker independiente `todotube-media-gateway-dev` |
| Despliegue | **Ninguno.** `workers_dev = false`, sin rutas, y `npm run deploy` falla a propósito |
| YouTube | **Nada.** Ni URLs de YouTube/Googlevideo, ni InnerTube, BotGuard, PoToken ni SABR |

> Esta PoC demuestra que un Cloudflare Worker puede transportar vídeo en streaming con las semánticas HTTP que necesita Shaka.
> **No demuestra que TodoTube funcione sin Puente** ni que YouTube acepte peticiones desde un Worker.
> ADR-005 sigue vigente: el siguiente paso necesita una decisión del propietario y revisión legal escrita (ADR-009 §12).

## 1. Qué se construyó
| Archivo | Para qué |
|---|---|
| `src/gateway.js` | Lógica pura (inyectable y probable sin red): ruta `/media/<archivo>` de una lista cerrada; GET, HEAD, OPTIONS; un único rango; CORS solo para orígenes permitidos; `redirect: 'manual'`; señal de cancelación al origen; cabeceras de respuesta en lista blanca; interruptor; límite por IP; registro sin URLs |
| `src/index.js` | Punto de entrada del Worker |
| `wrangler.toml` | Configuración aislada; origen de prueba fijo; `enable_request_signal` para la cancelación |
| `scripts/make-fixture.sh` | Genera el vídeo **propio** con ffmpeg (patrón de prueba + tono, 30 s): MP4 (H.264/AAC), WebM (VP9/Opus) y DASH por rangos |
| `scripts/origin.mjs` | Origen de prueba local con Range real y fallos simulados (lento, sin longitud, 404, 500, redirección a host ajeno) |
| `scripts/page-server.mjs` + `public/index.html` | Página **experimental** en otro origen (8790): HTML5 y Shaka con DASH |
| `test/unit.test.mjs` · `test/integration.test.mjs` · `test/browser.test.mjs` | 20 unitarias, 14 de integración en el runtime real de Workers (`wrangler dev`, workerd) y 2 en navegador |

Fixture (sha256): `test-video.mp4` `fd699f30…ccc4045` (6 000 766 B) · `test-video.webm` `8ee23a1d…7e61529` · `test-dash.mpd` `be052468…b071c6`.

## 2. Comandos ejecutados
```bash
cd apps/media-gateway
npm install
npm run fixture                  # ffmpeg: vídeo propio + copia de Shaka para la página
npm test                         # unitarias
npm run test:integration         # wrangler dev (workerd) + origen local
npm run test:browser             # Chromium de Playwright
cd ../web && npm run build && npx tsc -b && npx playwright test --trace off   # regresión de la web
```

## 3. Matriz de pruebas (test-plan.md)
| ID | Caso | Resultado | Evidencia |
|---|---|---|---|
| GW-001 | GET completo | ✅ Aprobado | Unitaria + integración: hash sha256 idéntico al fixture |
| GW-002 | HEAD | ✅ Aprobado | 200, `Content-Length` = tamaño real, cuerpo vacío |
| GW-003 | `bytes=0-1023` | ✅ Aprobado | 206, `bytes 0-1023/6000766`, 1024 bytes exactos |
| GW-004 | Rango intermedio | ✅ Aprobado | `bytes=3000000-3001999` exactos |
| GW-005 | `bytes=N-` | ✅ Aprobado | Últimos 777 bytes exactos |
| GW-006 | Fuera de tamaño | ✅ Aprobado | 416 + `Content-Range: bytes */6000766` |
| GW-007 | Malformado o múltiple | ✅ Aprobado | 416 **sin llamar al origen** (política documentada: un solo rango) |
| GW-008 | OPTIONS permitido | ✅ Aprobado | 204; métodos `GET, HEAD, OPTIONS`; cabecera `Range`; sin credenciales |
| GW-009 | OPTIONS no permitido | ✅ Aprobado | 403 sin `Access-Control-Allow-Origin` |
| GW-010 | GET con origen no permitido | ✅ Aprobado | 403; no se refleja el origen; no se llama al origen |
| GW-011 | Destino fuera de la lista | ✅ Aprobado | `?url=`, `/proxy?url=`, otros nombres, rutas extra → 400/404 sin llamar al origen |
| GW-012 | Bucle local, privadas, enlace local, metadatos | ✅ Aprobado | La configuración rechaza http, 127/8, 10/8, 172.16/12, 192.168/16, 169.254.169.254, `[::1]`, `localhost`, `*.internal`, credenciales en la URL. Solo `DEV_ALLOW_LOOPBACK=1` admite el origen local de pruebas |
| GW-013 | Traversal y codificación ambigua | ✅ Aprobado | `%2F..`, `%2e%2e`, `%2E`, mayúsculas, espacios, `%00` → rechazo sin llamar al origen |
| GW-014 | Redirección a host ajeno | ✅ Aprobado | 502; no se sigue ni se expone `Location` |
| GW-015 | Origen 404/500 | ✅ Aprobado | Se propagan 404, 500 y 503; origen caído → 502 |
| GW-016 | Sin `Content-Length` | ✅ Aprobado | Bytes íntegros; no se inventa longitud |
| GW-017 | Cancelación | ✅ Aprobado | Runtime real: al cortar el cliente, el origen registró la desconexión en **278–279 ms**, tras enviar 196 608 de 6 000 766 bytes |
| GW-018 | Streaming incremental | ✅ Aprobado | Unitaria: el primer trozo llega mientras el origen no ha terminado. Runtime real: primer trozo en < 1,5 s con un origen que tarda ~14 s en enviar todo |
| GW-019 | HTML5 | ✅ Aprobado (Chromium) | Reproduce, pausa, salta al segundo 25, volumen 0,5 y llega al final; peticiones `bytes=0-`, `bytes=4784128-`… con 206 |
| GW-020 | Shaka | ✅ Aprobado (Chromium) | DASH: 13 peticiones (manifiesto + 12 trozos por rango), **todas** con `Origin` y CORS autorizado; reproduce y salta al segundo 20 sin errores |
| GW-021 | Regresión web | ✅ Aprobado | `vite build` ✅ · `tsc -b` ✅ · Playwright **50/50** |
| GW-022 | Aislamiento de producción | ✅ Aprobado | `git diff` contra la rama de referencia: solo archivos nuevos en `apps/media-gateway/`, `docs/adr/ADR-009*` y `specs/008-*`. Ningún cambio en `apps/web`, `apps/bridge` ni `spikes/` |

## 4. Criterios de aceptación (spec.md)
| CA | Estado | Nota |
|---|---|---|
| CA-01 | ✅ Aprobado | `wrangler dev --local` sin tocar el Worker web |
| CA-02 | ✅ Aprobado | GW-001 |
| CA-03 | ✅ Aprobado | GW-003…005 |
| CA-04 | ✅ Aprobado | GW-006 |
| CA-05 | ✅ Aprobado | GW-002 |
| CA-06 | ✅ Aprobado | GW-008…010 |
| CA-07 | ✅ Aprobado | GW-011…014 |
| CA-08 | ✅ Aprobado | GW-018 |
| CA-09 | ✅ Aprobado | GW-017 (cancelación demostrada, no solo documentada) |
| CA-10 | ✅ Aprobado en Chromium · ⏸️ **No ejecutado en Firefox** | Firefox no está instalado en este entorno |
| CA-11 | ✅ Aprobado | GW-021 |
| CA-12 | ✅ Aprobado | GW-022; el código del gateway no menciona YouTube salvo en comentarios de prohibición |
| CA-13 | ✅ Aprobado | Este informe |

## 5. Hallazgos durante la PoC
1. **Proxy del entorno:** `wrangler dev` enruta las peticiones del Worker por las variables `HTTPS_PROXY`; en local hay que lanzarlo sin ellas (`scripts/env.mjs`). En producción no aplica.
2. **Shaka con MP4 progresivo** usa el `<video>` nativo (`src=`) y no hace peticiones propias: no ejercita CORS. Para probar la ruta real (fetch + Range + MSE) hace falta DASH; por eso se añadió el fixture DASH.
3. **Playwright** oculta `Origin` en `request.headers()`; hay que usar `allHeaders()`.
4. **Cierre de las pruebas:** sin `closeAllConnections()` y sin parar el **grupo de procesos** de Wrangler (npx → wrangler → workerd), la suite no terminaba sola. Corregido: integración 14/14 en 2 s y navegador 2/2 en 9 s, sin procesos sobrantes.

## 6. Límites de Cloudflare
Los límites y precios de las referencias del paquete (`REFERENCIAS_CLOUDFLARE.md`, consultadas el 2026-11-07: 128 MB de memoria, streaming sin materializar el cuerpo, 6 conexiones salientes por invocación, cobro por solicitudes y CPU) **no se han vuelto a verificar** en esta ejecución: `developers.cloudflare.com` no es accesible desde este entorno. Esta PoC hace **una** petición al origen por petición del cliente.

## 7. Seguridad
- Sin proxy abierto: el cliente solo elige un nombre de una lista; el destino lo fija la configuración.
- SSRF: origen validado al arrancar (https público; redes privadas y metadatos rechazados).
- No se reenvía ninguna cabecera del cliente salvo `Range` validado. Credenciales omitidas. Cabeceras de respuesta en lista blanca (no pasan `Set-Cookie` ni cabeceras internas).
- CORS no es control de acceso: el límite por IP es orientativo (cada instancia lleva su propia cuenta). Antes de cualquier uso público haría falta autenticación o el *binding* de límites de Cloudflare.
- Registro: solo operación, estado y milisegundos.

## 8. Costes
**No medidos.** Sin despliegue no hay métricas de facturación. Las 13 peticiones de Shaka para ~30 s de vídeo en DASH dan una idea del orden: el coste depende del número de peticiones por reproducción (ADR-009 §5.1), que habría que medir con vídeos reales y duraciones reales.

## 9. Pendiente (no ejecutado)
- Firefox y Edge, y Chrome con limitación de red (DevTools throttling).
- Medición de latencia y caudal desplegado en Cloudflare (requiere desplegar, fuera de alcance).
- Sesiones concurrentes (GW-05 del ADR-009).

## 10. Recomendación
**Continuar solo como experimento.** El transporte funciona: rangos exactos, CORS correcto, streaming real y cancelación en menos de 0,3 s, con Shaka y DASH.

El siguiente paso **no es técnico**. Llevar vídeos de YouTube por el gateway exige:
1. que el propietario cambie ADR-005;
2. revisión legal escrita sobre retransmitir streams desde servidores (ADR-009 §6 y §12);
3. pruebas de SABR/PoToken desde servidor, sin mecanismos de evasión.

Hasta entonces: reproductor propio con Puente y reproductor oficial sin él (rutas A + D del ADR-009).
