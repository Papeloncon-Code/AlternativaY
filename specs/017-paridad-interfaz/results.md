# Resultados 017 · 2026-11-08

## Auditoría inicial

Hallazgos confirmados en el código:
- Menú de cuenta conservaba un enlace a /puente sin ruta en App.
- Medios propios aparecía como destino primario paralelo a Inicio/Shorts/Suscripciones; se movió a la sección Tú.
- El menú lateral/footer mostraba versión fija web v0.2.
- Shorts conservaba botones play/pause y mute sin un objeto PlayerHandle funcional.
- La ficha Watch mantenía atajos de seek, velocidad y pause que no podían ejecutar sobre el contenido de YouTube externo.
- PlayerHost mostraba pause/play en miniplayer aunque no existía stream activo.
- SponsorBlock seguía expuesto en ajustes aunque ya no era posible saltar segmentos de YouTube dentro de TodoTube.
- La cuenta atrás y toggle de autoplay dependían del evento ended que no podía ocurrir en el player externo.
- Las pruebas E2E asumían falsamente que el nodo de reproductor persistía al pasar a miniplayer, aunque el contenido externo solo se representa como ficha.

## Cambios aplicados en main

- Navegación principal reorganizada: Inicio, Shorts y Suscripciones; Medios propios movido a Tú.
- Enlace de TodoTube Puente retirado del menú de cuenta.
- Atajos del menú de cuenta reducidos a acciones que sí están implementadas.
- Controles placebo de Shorts y miniplayer eliminados; se mantiene navegación de Shorts, acciones de favoritos/compartir y enlace al origen.
- PlayerHost presenta una ficha externa en lugar de simular un video en reproducción.
- Watch conserva datos, acciones, modo cine, navegación y recomendaciones, pero no ofrece seek/pause/play sobre un stream ausente.
- SponsorBlock retirado de ajustes, estado local y lógica de comunidad; DeArrow permanece como personalización de títulos.
- Estado autoplay retirado del almacenamiento local mientras la fuente externa no pueda disparar un fin de reproducción real.
- Tests de miniplayer y atajos ajustados para comprobar el comportamiento real.

## Iteración 2 · Suscripciones (verificada en producción)

- La ruta `/suscripciones` muestra un feed de publicaciones de los canales seguidos.
- Los filtros Todos, Vídeos, Shorts, grupos y canales funcionan; Shorts se muestran en shelf o cuadrícula según el filtro.
- La pantalla administrativa está separada en `/suscripciones/gestionar`: altas/bajas, campanita, PushToggle y grupos.
- El menú de cuenta enlaza a la gestión.
- Las dos pruebas E2E que aún apuntaban a la ruta anterior se corrigieron para usar `/suscripciones/gestionar`; no se relajaron las aserciones.
- PR #11 fusionado en `71cd3325eb3883dfe63c2d1a10554f9c6e2a67dd`.
- CI, TypeScript, Playwright, Gateway, WebSub, despliegue Cloudflare y smoke de producción: todos correctos en [workflow #157](https://github.com/Papeloncon-Code/AlternativaY/actions/runs/42524061539).

## Aún no verificado

- Comparación pixel a pixel con capturas de referencia de YouTube en cada viewport.
- Capturas baseline completas de todas las pantallas.
- Build + Playwright en el commit consolidado más reciente.
- Despliegue y smoke test en producción.

No declarar paridad visual completa. Esta especificación sigue en construcción y el trabajo continúa desde la sección A.


## Iteración 3 · Navegación móvil según el rediseño vigente de YouTube (2026-11-08)

- En móvil, la barra inferior ya no incluye Suscripciones: queda Inicio, Shorts, Crear y Tú.
- Los feeds Inicio y Subs se muestran en pestañas superiores bajo la barra superior; se ocultan automáticamente tras unos 2,2 s y reaparecen al arrastrar hacia abajo o desplazarse hacia arriba.
- La pestaña Subs abre el feed de suscripciones; la pantalla de gestión continúa en `/suscripciones/gestionar`.
- Crear abre un panel que permite crear una lista de reproducción real y enlaza a Seguir canales y Medios propios. No se presenta subida de vídeo porque esa función no existe.
- Referencias: [YouTube Help · new Home feeds](https://support.google.com/youtube/blog/474148940/new-ways-to-explore-youtube-from-your-home-page), [9to5Google · rollout 5 Nov 2026](https://9to5google.com/2026/11/05/youtube-app-redesign-subscriptions-tab/), [Gadgets 360 · top bar auto-hidden](https://www.gadgets360.com/apps/news/youtube-removes-subscription-tab-new-home-page-major-app-redesign-android-ios-12291726).
- `Tú` mantiene estado activo en Historial, Ver más tarde, Me gusta, listas y Medios propios.
- Playwright valida ocultar la fila inicial y recuperarla con gesto/scroll; la auditoría visual captura estados visible y colapsado.
- PR #23 superó TypeScript, Playwright, CodeQL, Gateway y WebSub; el despliegue de main se valida en [workflow #177](https://github.com/Papeloncon-Code/AlternativaY/actions/runs/42524551825).
- Se capturaron los estados Home/Inicio, Shorts, watch, canal, feed de suscripciones, gestión, búsqueda, Tú, ajustes, medios, privacidad, menú de cuenta y avisos a 1440×900; Inicio/Watch/canal a 1024×768; siete pantallas más búsqueda a 390×844.
- Esta captura es una baseline de TodoTube, no una comparación pixel a pixel. Aún faltan capturas de la referencia oficial de YouTube en la misma cuenta/experimento, viewport, zoom y estado de interacción.


## Iteración 4 · Auto-ocultar pestañas de feed móvil

- Las pestañas Inicio/Subs se muestran inicialmente bajo la topbar.
- Se ocultan tras 2,2 segundos; el scroll hacia abajo las contrae, y el scroll hacia arriba o gesto de arrastre hacia abajo las vuelve a mostrar.
- Al navegar entre Inicio y Subs se reinicia el estado visible y vuelve a aplicarse el tiempo de ocultación.
- Playwright comprueba el estado inicial, auto-ocultación, reaparición, selección de Subs y acción Crear; la auditoría visual captura ambos estados.
- Implementación en revisión en PR pendiente. No declarar esta iteración desplegada hasta completar CI y smoke de producción.


## Iteración 4 · Auditoría del panel Crear

- Se añade una captura baseline del panel Crear en móvil (390×844).
- Las métricas incluyen geometría del diálogo, formulario y acciones rápidas.
- Playwright comprueba cierre por Escape y clic fuera, así como que cerrar el panel sin enviar no cree listas.
- La acción de creación de lista ya está cubierta en la prueba de navegación móvil y verifica persistencia en localStorage.
- Pendiente: revisar visualmente la captura y ajustar proporciones/espaciado con referencia equivalente de YouTube.
