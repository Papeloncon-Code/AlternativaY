# Spike T-100 · Reproductor propio en la web con “TodoTube Puente”

Estado: **En construcción** · 2026-11-07 · Investigación: `docs/research/07-reproductor-propio-web-investigacion-a-fondo.md`
Decisión del propietario: “haz todo lo que haga falta”.

## 1. Pregunta
¿Puede la web de TodoTube reproducir vídeos **completos** con **nuestro propio reproductor**, sin logo, “Más vídeos” ni anuncios de YouTube, extrayendo en el navegador del usuario y sin servidor, con una instalación razonable?

## 2. Diseño
| Pieza | Elección | Origen |
|---|---|---|
| Puente | Extensión MV3 **“TodoTube Puente”**: fork **endurecido** de [ytc-bridge](https://github.com/LuanRT/ytc-bridge) (MIT, LuanRT) | §3 |
| Datos del vídeo | YouTube.js (`youtubei.js/web`), con `fetch` a través del puente | MIT |
| Anti-bots | BgUtils (`bgutils-js`): BotGuard se ejecuta en el propio navegador y genera el PoToken | MIT |
| Streaming | googlevideo `SabrStreamingAdapter` + adaptador Shaka (derivado de `examples/sabr-shaka-example`) | MIT |
| Reproductor | Shaka Player con **interfaz propia de TodoTube** | Apache-2.0 |
| Sin puente | Reproductor oficial (comportamiento actual) + aviso para instalar el puente | — |

## 3. Endurecimiento de seguridad frente a ytc-bridge
| ytc-bridge | TodoTube Puente |
|---|---|
| El script de contenido se ejecuta en `<all_urls>`: cualquier web puede usar el navegador del usuario como proxy | Solo en `todotube.papelon.workers.dev` y `localhost` |
| `host_permissions: <all_urls>`; el fondo hace `fetch` a cualquier URL (incluida la red local) | Lista cerrada de hosts de YouTube y Google; todo lo demás se rechaza |
| Las reglas de cabeceras CORS se aplican a cualquier iniciador salvo youtube.com | Solo al iniciador TodoTube (`initiatorDomains`) |
| — | `credentials: 'omit'` (sin cookies del usuario), como el original |

## 4. Criterios de aceptación
- **CA-P1:** con el puente instalado, un vídeo de más de 10 minutos se reproduce **entero** (prueba de los ~60 s del límite de octubre de 2026), en Chrome y Firefox de escritorio.
- **CA-P2:** no aparece ningún elemento de YouTube en el reproductor: logo, “Más vídeos”, anuncios ni tarjetas.
- **CA-P3:** tiempo hasta el primer fotograma ≤ 3 s (p50) en una conexión doméstica.
- **CA-P4:** sin el puente, la web sigue funcionando con el reproductor oficial y muestra cómo instalarlo.
- **CA-P5:** el puente rechaza cualquier URL fuera de la lista de hosts (test automático) y no se activa en otras webs.
- **CA-P6:** la instalación cabe en ≤ 5 pasos guiados.

## 5. Límites del entorno de pruebas (honestidad)
Este contenedor tiene la red restringida y una IP de centro de datos, que YouTube trata como bot. CA-P1, CA-P2 y CA-P3 **solo se pueden verificar en el navegador del propietario**. Aquí se verifican la compilación, el puente (CA-P5) y el respaldo (CA-P4).

## 6. Resultados (2026-11-07)
| CA | Resultado | Cómo |
|---|---|---|
| CA-P5 | ✅ El puente rechaza `example.com` y `192.168.1.1` (“Host no permitido”); permite youtube.com | Chromium automatizado con la extensión cargada |
| CA-P4 | ✅ Si el reproductor propio falla, pasa solo al de reserva y lo explica | Ídem |
| Integración | ✅ El puente se detecta; YouTube.js obtiene la respuesta del reproductor a través del puente; el adaptador SABR arranca y pide segmentos a googlevideo | Ídem. El primer intento falló solo porque la red del entorno bloqueaba el host de googlevideo |
| CA-P1, CA-P2, CA-P3 | ⏳ **Pendiente de la prueba del propietario** | Ver abajo |

**Límite de esta sesión:** el sistema de permisos bloqueó repetir la prueba de reproducción automatizada desde el contenedor, clasificándola como “elusión de controles anti-bots”. No se intentó rodear. La verificación de reproducción la hace una persona en su propio navegador (`/puente`), que es el caso de uso real.

**Implicación de seguridad (BotGuard):** el reproductor propio descarga de Google el intérprete de BotGuard y lo ejecuta en la página de TodoTube, como hace youtube.com. Así, en nuestro origen se ejecuta código de terceros. Se aísla en el chunk del reproductor, que solo se carga con el puente instalado. Mitigación pendiente: ejecutarlo dentro de un `<iframe>` *sandbox* en un subdominio propio.
