# 09 · ¿Se puede instalar TodoTube Puente con un solo “Permitir”, como el permiso de notificaciones?

| Campo | Valor |
|---|---|
| Fecha | 2026-11-07 |
| Pregunta del propietario | Al entrar en la web, que aparezca el diálogo **nativo** del navegador (como “www.youtube.com quiere: Mostrar notificaciones · Permitir / Bloquear”) y que con ese único clic se instale todo, Puente incluido, sin mandar a nadie a otra página. |
| Método | Búsqueda en documentación oficial (Chrome, Mozilla, MDN, Microsoft), artículos de seguridad, Bugzilla, GitHub, foros y prensa técnica. Páginas oficiales leídas completas (texto guardado en el entorno de trabajo). |
| Leyenda | [V] verificado en fuente primaria · [S] fuente secundaria · [I] inferencia · [NV] no verificado |

## 1. Respuesta corta
- **El diálogo nativo de notificaciones: sí.** Es `Notification.requestPermission()`, la misma llamada que usa YouTube. Se implementa (§4).
- **Instalar una extensión desde ese diálogo (o desde cualquier permiso web): no, en ningún navegador.** No existe ningún permiso web que instale extensiones; los navegadores lo prohíben a propósito porque era la vía principal de malware [V, §2].
- **Lo más cercano que sí existe**, por navegador:
  - **Firefox (escritorio):** un clic en nuestra web abre el diálogo **nativo** de Firefox “¿Añadir TodoTube Puente?” → *Añadir*, **sin salir de la página** [V]. Requiere firmar el Puente en Mozilla (gratis; puede ser “no listado”).
  - **Chrome, Edge, Brave, Opera:** hay que pasar por la ficha de la tienda (se puede abrir en una ventanita y cerrarla sola al terminar): *Añadir a Chrome* → confirmación. Requiere publicar el Puente en Chrome Web Store / Edge Add-ons [V].
  - **Móvil:** Chrome para Android no admite extensiones; ahí la solución es la app de Android de TodoTube (ya planificada).

## 2. Lo que dicen las fuentes primarias
| Hecho | Fuente | Nivel |
|---|---|---|
| Chrome eliminó la instalación desde webs (`chrome.webstore.install`): desde Chrome 71 la llamada lanza `TypeError`; Google indica sustituirla por “una navegación directa a la ficha de la Chrome Web Store”. | [FAQ de Google sobre la retirada de la instalación en línea](https://developer.chrome.com/docs/extensions/mv2/inline-faq) | [V] |
| Única alternativa fuera de la tienda: un **programa instalador** que escribe en el registro de Windows o en un archivo de preferencias (macOS/Linux). En Windows y macOS debe apuntar a la Chrome Web Store y **el usuario debe confirmar** en un diálogo; solo en Linux puede ser un archivo propio sin confirmación. | [Chrome: alternative installation methods](https://developer.chrome.com/docs/extensions/how-to/distribute/install-extensions) | [V] |
| Publicar en la Chrome Web Store exige registrarse como desarrollador y pagar una tasa única. | [Chrome Web Store: registro](https://developer.chrome.com/docs/webstore/register) | [V] (importe no indicado en la página) |
| La Chrome Web Store considera infracción “facilitar la descarga de vídeos de YouTube”. | [Chrome Web Store: troubleshooting](https://developer.chrome.com/docs/webstore/troubleshooting) | [V] |
| Firefox: un enlace a un `.xpi` **firmado**, servido con `Content-Type: application/x-xpinstall` y pulsado por el usuario, hace que **Firefox lo instale** (con su diálogo nativo). No funciona en Firefox para Android. | [Extension Workshop: self-distribution](https://extensionworkshop.com/documentation/publish/self-distribution/) | [V] |
| Firefox está retirando `InstallTrigger` (la antigua API para instalar desde webs). | [Bugzilla 1754441](https://bugzilla.mozilla.org/show_bug.cgi?id=1754441) | [S] |
| Notificaciones: la petición “debe hacerse en respuesta a una interacción del usuario”; Firefox lo exige desde la versión 72. | [MDN: requestPermission](https://developer.mozilla.org/en-US/docs/Web/API/Notification/requestPermission_static), [Mozilla Hacks](https://hacks.mozilla.org/2019/11/upcoming-notification-permission-changes-in-firefox-72/) | [V] |
| Chrome muestra una versión “silenciosa” del diálogo (solo un icono en la barra) a webs con muy pocas aceptaciones o a usuarios que deniegan mucho. | [USENIX Security 2021 (Google)](https://www.usenix.org/conference/usenixsecurity21/presentation/bilogrevic), [NDSS 2024](https://www.ndss-symposium.org/wp-content/uploads/2024-108-paper.pdf) | [S] |

## 3. Alternativas investigadas y descartadas
| Vía | Por qué no sirve hoy | Nivel |
|---|---|---|
| “Instalación en línea” de Chrome | Eliminada en 2018 (Chrome 71) | [V] |
| Programa instalador (.exe/.pkg) que registra la extensión | Hay que descargar y ejecutar un programa; en Windows/macOS además hace falta la tienda y una confirmación | [V] |
| Directivas de empresa (`ExtensionInstallForcelist`) | Solo en equipos administrados por una organización | [S] |
| Isolated Web Apps con Direct Sockets (harían innecesario el Puente) | Solo ChromeOS gestionado, instaladas por el administrador y, desde Chrome 143, solo apps en lista de Google | [S] |
| Web Install API (`navigator.install`) | Instala aplicaciones web (PWA), no extensiones; una PWA sigue sin poder saltarse CORS | [S] |
| PWA / service worker | Mismas restricciones CORS que la web | [I] |
| Proxy en nuestro servidor | Va contra la constitución (extracción en el servidor) y las URL de vídeo están ligadas a la IP del usuario | [V, doc 07] |
| Bookmarklet / userscript | El userscript necesita otra extensión (Tampermonkey); el bookmarklet no salta CORS | [I] |

## 4. Diseño propuesto (lo más cercano a “un clic” que permiten los navegadores)
1. **Avisos:** el diálogo nativo del navegador al llegar, como YouTube. En Chrome/Edge se pide a los pocos segundos de cargar; en Firefox, en la primera interacción con la página (lo exige). Si se acepta, se activa el envío de avisos. *(Implementado.)*
2. **Puente, un botón “Activar TodoTube Puente”** (y en la misma pulsación se piden también los avisos si faltan):
   - Firefox → diálogo nativo de instalación en la misma página.
   - Chrome/Edge → se abre la ficha de la tienda en una ventana pequeña; al instalarse, el Puente se activa en las pestañas ya abiertas (sin recargar) y la ventana se cierra.
   - Sin tienda todavía → guía de instalación manual (/puente), como ahora.
3. **Requisitos que dependen del propietario:** cuenta de Mozilla para firmar (gratis), cuenta de Chrome Web Store (tasa única) y de Microsoft Edge (gratis).
   - **Riesgo [I]:** las tiendas podrían rechazar un Puente relacionado con YouTube. La Chrome Web Store prohíbe expresamente facilitar descargas de YouTube; el Puente no descarga, pero la decisión es discrecional.
   - Mozilla firma también extensiones “no listadas” (sin ficha pública) tras una revisión automática [S].

## 5. Decisiones del propietario
- [x] **Firefox primero** (2026-11-07): firmar el Puente en Mozilla como “no listado”.
- [ ] Chrome Web Store y Edge Add-ons: más adelante.

## 6. Preparación para Mozilla (hecha)
| Requisito | Fuente | Estado |
|---|---|---|
| `browser_specific_settings.gecko.id` obligatorio para firmar MV3 | [MDN](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings) [V] | ✅ `puente@todotube.app` |
| `data_collection_permissions` obligatorio en envíos nuevos desde el 3-11-2025; si no se recoge nada: `"required": ["none"]` | [MDN](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings), [Extension Workshop](https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/) [V] | ✅ El Puente no envía datos a TodoTube ni a terceros: solo hace, desde tu navegador, las peticiones que pide la web a los servidores de vídeo |
| Firefox 127+ muestra y concede los permisos de sitio en el propio diálogo de instalación | [MDN host_permissions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/host_permissions) [V] | ✅ `strict_min_version` 128 |
| Paquete sin `background.service_worker` (Firefox usa `scripts`) | `web-ext lint` | ✅ 0 errores, 0 avisos |
| Firma “no listada”: AMO → *Submit a New Add-on* → **On your own**; revisión automática, hasta 24 h | [Extension Workshop](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/) [V] | Pendiente del propietario |
| Servir el `.xpi` firmado con `Content-Type: application/x-xpinstall` | [Extension Workshop](https://extensionworkshop.com/documentation/publish/self-distribution/) [V] | ✅ preparado: se publica solo cuando exista `apps/bridge/firmado/todotube-puente.xpi` |

**No verificado [NV]:** si Firefox activa el Puente en la pestaña ya abierta justo después de instalarlo. Por eso, si no se anuncia en 60 s, la web ofrece «Recargar».
