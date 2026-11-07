# ADR-007 · Importación automática de suscripciones sin iniciar sesión

- **Estado:** Aceptado por el propietario (2026-11-07)
- **Requisito:** RF-038 (amplía RF-036)

## Problema
Para pasarse a una app nueva, el usuario necesita sus suscripciones. Lo que existe hoy exige trabajo manual o iniciar sesión:
- **Google Takeout** (descargar un archivo); a veces tarda horas o falla ([GrapheneOS](https://discuss.grapheneos.org/d/36103-newpipe-cannot-import-subscriptions-csv-from-youtube-takeout));
- **OAuth** (iniciar sesión con Google);
- **capturas de pantalla**.

Requisito del propietario: **el usuario solo da una autorización y todo ocurre solo**, sin iniciar sesión, sin archivos y sin saber cómo funciona.

## Restricciones técnicas (investigadas el 2026-11-07)
- **Android:** cada app vive en su sandbox. No se puede leer la sesión ni los datos de la app de YouTube [I: modelo de seguridad de Android].
- **Web:** una página no puede usar las cookies de `youtube.com` (política de mismo origen) [I].
- **WebView propia:** obligaría a iniciar sesión de nuevo, y Google bloquea el inicio de sesión en WebViews incrustadas [I: conocido, NV en esta sesión].
- **iOS:** no existe ninguna API pública para leer la interfaz de otra app ([foros de Apple](https://developer.apple.com/forums/thread/844393)) [S].

## Decisión
Estrategia por plataforma, ordenada por preferencia. Todas terminan en la misma pantalla de confirmación.

| Plataforma / build | Método principal | Respaldo |
|---|---|---|
| **Android `full`** (F-Droid, IzzyOnDroid, GitHub) | **Lector automático** (`AccessibilityService`): abre la app de YouTube en Suscripciones, desplaza la lista y lee los nombres de los canales | Importar archivo (Takeout o exportación de NewPipe, PipePipe, FreeTube o LibreTube) |
| **Android `play`** | **Autorización de Google** con la cuenta ya presente en el teléfono (un toque “Permitir”, scope `youtube.readonly`; `subscriptions.list mine=true`) | Importar archivo |
| **Web (ordenador)** | **Extensión del navegador** (Chrome, Firefox, Edge) que usa la sesión de `youtube.com` del usuario y lee sus suscripciones | Autorización de Google; importar archivo |
| **iOS** (futuro) | Autorización de Google | Importar archivo |
| **TV y otros** | Ninguno: llegan por **sincronización** desde otro dispositivo | — |

**Principio clave:** importar **una sola vez en un solo dispositivo**. La sincronización (RF-011) lleva las suscripciones a todos los demás.

## Diseño del lector automático (Android `full`)

### Flujo
1. **Bienvenida:** “¿Qué usas para ver vídeos?” → [YouTube] [NewPipe/PipePipe/LibreTube/otra] [Nada].
2. Si responde **YouTube** y la app de YouTube está instalada (`PackageManager`): explicación previa en una pantalla propia. Qué hará, qué leerá (solo nombres de canales), que no se guarda nada más y que se puede desactivar después. Es la *prominent disclosure* y genera confianza ante el aviso del sistema.
3. Guía paso a paso para activar el servicio. Si Android lo bloquea (“ajustes restringidos”, Android 13+, en APK instaladas a mano), la guía muestra: Información de la app → ⋮ → **Permitir ajustes restringidos** ([9to5Google](https://9to5google.com/2022/05/06/android-13-sideloaded-accessibility/)).
4. La app abre YouTube directamente en la lista de suscripciones (intent a `https://www.youtube.com/feed/channels` con el paquete de YouTube) [NV: comprobar a qué pantalla lleva].
5. El servicio lee los nodos visibles, desplaza con `ACTION_SCROLL_FORWARD` y repite hasta que no aparecen canales nuevos (2 iteraciones sin cambios) o pasan 60 s. Una superposición muestra “Leyendo tus suscripciones… N”.
6. Vuelve a nuestra app, **resuelve cada nombre** con la búsqueda de canales del extractor local y prioriza la coincidencia exacta.
7. **Pantalla de confirmación:** lista con foto, marcando solo las ambiguas (“¿Es este?”). Botón **Importar**.
8. Sugiere **desactivar el permiso** con un acceso directo, y se desactiva solo al terminar si el sistema lo permite (`disableSelf()`).

### Reglas de robustez
- Leer **texto y `contentDescription`**, no IDs internos de vistas (cambian con cada versión de YouTube).
- Diccionario de títulos de pantalla por idioma (es, en, pt, fr, de… ampliable) para saber que se está en “Suscripciones / Todas”.
- **Modo seguro:** si en 10 s no se reconoce la pantalla, se detiene y ofrece el respaldo (archivo) sin dejar a medias la app de YouTube.
- El servicio **solo actúa durante la importación**, con el paquete `com.google.android.youtube` filtrado (`packageNames`). No observa otras apps.
- Sin red durante la lectura. Los nombres no salen del dispositivo.

## Consecuencias y riesgos
| Riesgo | Mitigación |
|---|---|
| Google Play prohíbe este uso del permiso ([política](https://support.google.com/googleplay/android-developer/answer/10964491?hl=en)) | El lector solo existe en la build `full`; la build `play` usa la autorización de Google |
| Ajustes restringidos de Android 13+ ([Esper](https://www.esper.io/blog/android-13-sideloading-restriction-harder-malware-abuse-accessibility-apis)); informes contradictorios con F-Droid ([foro](https://forum.f-droid.org/t/sideloading-restrictions-or-removal-in-future-how-it-effects-f-droid/21089)) | Guía visual; prueba en dispositivos reales (T-090) |
| YouTube cambia su interfaz | Lectura por texto; modo seguro; actualizador rápido (arquitectura §12) |
| Desconfianza ante el permiso de accesibilidad | Explicación previa clara; desactivación al terminar; código abierto |
| Nombres de canal ambiguos | Confirmación solo de los dudosos, con foto |
| La autorización de Google requiere registrar la app y la revisión de Google | Solo para `play` y web; el trámite lo hace el equipo una vez, nunca el usuario |
