# 08 · ¿Podemos cargar con la página todo lo que necesita el reproductor? ¿Y qué permisos pedir para las suscripciones?

Consulta: 2026-11-07. Petición del propietario: “investiga bien a fondo si podemos poner en la carga de la página lo que necesita el reproductor para funcionar bien y rápido; y qué permiso hay que pedir para lo de las suscripciones”.

## 1. Conclusión
1. **Sin instalar nada, no.** Lo comprobamos directamente: la API de datos del vídeo de YouTube **rechaza a nuestra web** (preflight CORS → 403) y los servidores de vídeo no la aceptan. Además, los enlaces del vídeo quedan atados a la IP de quien los pide, así que tampoco puede pedirlos nuestro servidor por el usuario. Una web no puede instalar extensiones por su cuenta: Chrome eliminó la instalación desde webs en 2018 por abusos.
2. **Lo que sí se puede hacer en la propia página, sin puente:** la verificación anti-bots (BotGuard), cuyo servidor **acepta nuestro origen**. Es la parte más lenta de preparar.
3. **Con el puente instalado (un paso, una vez), se puede precargar casi todo** mientras el usuario mira el inicio, para que el vídeo empiece al instante (§3).
4. **Suscripciones en la web:** el mismo puente puede pedir, **solo cuando el usuario pulsa “Importar”**, un permiso adicional del navegador para leer su lista de suscripciones de youtube.com con su sesión (§4). Es la “visita automática” que planteó el propietario, pero en el navegador.

## 2. Evidencia
| Hecho | Cómo se comprobó | Nivel |
|---|---|---|
| `www.youtube.com/youtubei/v1/player` responde **403** al preflight desde `todotube.papelon.workers.dev` | `curl -X OPTIONS` con `Origin` y `Access-Control-Request-Method` (2026-11-07) | V-test |
| `youtubei.googleapis.com/youtubei/v1/player`: **403** igual | Ídem | V-test |
| `jnn-pa.googleapis.com` (BotGuard *Create*) responde **200** con `access-control-allow-origin: https://todotube.papelon.workers.dev` | Ídem | V-test |
| Los enlaces de googlevideo van ligados a la IP (`ip=`) y dan 403 desde otra IP | [issue de ytm-player](https://github.com/peternaame-boop/ytm-player/issues/135), [YoutubeExplode #149](https://github.com/Tyrrrz/YoutubeExplode/issues/149), [Tyrrrz](https://tyrrrz.me/blog/reverse-engineering-youtube-revisited) | S |
| googlevideo no envía cabeceras CORS para otros orígenes | Por eso ytc-bridge las añade con reglas DNR ([rules.json](https://github.com/LuanRT/ytc-bridge)) | V-código |
| Chrome eliminó la instalación de extensiones desde webs (Chrome 71, 2018) | [FAQ de Chrome](https://developer.chrome.com/docs/extensions/mv2/inline-faq), [The Register](https://www.theregister.com/2018/06/12/chrome_inline_installation/) | S-oficial |
| Firefox ha retirado algunas extensiones relacionadas con YouTube, normalmente por comportamiento malicioso (código remoto) | [ghacks](https://www.ghacks.net/?p=186431), [Bugzilla](https://bugzilla.mozilla.org/show_bug.cgi?id=1570377) | S |
| Las extensiones pueden pedir permisos opcionales en tiempo de ejecución, tras un clic del usuario (`chrome.permissions.request` + `optional_host_permissions`) | [Chrome: permissions API](https://developer.chrome.com/docs/extensions/reference/api/permissions) | S-oficial |
| YouTube tiene un mecanismo de arranque rápido (*onesie*: datos y primeros segmentos en una sola petición), soportado sin cifrar por googlevideo 3.0+ | [googlevideo releases](https://github.com/LuanRT/googlevideo/releases), [Invidious #2711](https://github.com/iv-org/invidious/issues/2711) | S |

## 3. Plan de carga rápida (con el puente instalado)
| Momento | Qué se hace | Ahorro esperado |
|---|---|---|
| Al abrir la web (en reposo) | Cargar el módulo del reproductor; crear la sesión de YouTube.js (guardada en caché en IndexedDB entre visitas); iniciar BotGuard y obtener el token de integridad | Lo más lento (BotGuard e intérprete) queda hecho antes del clic |
| Al pasar el ratón o el dedo por un vídeo | Pedir por adelantado los datos de reproducción de **ese** vídeo (caché de 5 min) y abrir la conexión al servidor de vídeo (`preconnect`) | La petición de datos y el handshake TLS desaparecen del clic |
| Al pulsar | Solo se monta Shaka con datos ya listos; empieza con una calidad estimada razonable y sube después | Primer fotograma más rápido |
| Futuro | Probar *onesie* (datos + primeros segmentos en una petición) | Por medir |

**Sin puente** (reproductor oficial): ya se precarga la API del reproductor oficial al abrir la web (iframe en 57–117 ms).

**Límite:** no podemos medir el primer fotograma desde este entorno (el sistema de permisos bloquea la reproducción automatizada). Lo mide el propietario: el reproductor escribe en la consola `[TodoTube] primer fotograma en X ms`.

## 4. Permisos para las suscripciones (web)
| Método | Permiso que ve el usuario | Cuándo se pide |
|---|---|---|
| **Puente + permiso opcional** (recomendado para la web) | Al instalar: “leer y cambiar datos en TodoTube y en los servidores de vídeo”. Al pulsar **Importar mis suscripciones**: el navegador pregunta “¿Permitir acceso a youtube.com?” | Solo al importar. La extensión hace **una** petición con la sesión del usuario a su lista de suscripciones, la convierte en canales y suelta el permiso |
| Lector automático (Android `full`, ADR-007) | Permiso de accesibilidad | Solo al importar; se desactiva al terminar |
| “Permitir” de Google (build `play`, web pública) | Pantalla de consentimiento de Google (`youtube.readonly`) | Solo al importar |

Reglas de privacidad del permiso opcional: solo tras un clic; solo `www.youtube.com`; solo la lista de canales; nada se envía a TodoTube salvo los IDs de canal que el usuario confirma; el permiso se retira tras importar (`chrome.permissions.remove`).

## 5. Decisión recomendada
- **Implementar ya** la carga rápida de §3. Solo afecta a quien tiene el puente y no añade riesgos nuevos.
- **Diseñar y luego implementar** la importación con permiso opcional (§4), como parte de RF-038 / ADR-007, tras la aprobación del propietario. Toca la sesión de Google del usuario.
- **Distribución del puente:** Firefox (AMO) y Edge como primeras tiendas; Chrome en modo desarrollador mientras se evalúa la Chrome Web Store.
