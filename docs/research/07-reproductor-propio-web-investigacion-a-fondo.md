# 07 · Reproductor propio en web: investigación y decisión de implementación

**Estado:** investigación incorporada a la arquitectura en ADR-013 (2026-11-08). Las conclusiones iniciales fueron superadas por el prototipo Kira y por la cadena de clientes de Flow.

## Hallazgo principal

Kira demuestra un runtime web con Bridge local; Materialious full web demuestra un backend Node con proxy same-origin. TodoTube prueba ahora una adaptación intermedia: youtubei.js/BotGuard/Shaka permanecen en el cliente, y el Worker del mismo dominio actúa como relay HTTPS acotado para solicitudes de control y segmentos.

La integración de TodoTube toma la arquitectura de Kira como base de implementación MIT, preservando el aviso de licencia. Toma de Flow la estrategia de redundancia y recuperación, pero no copia su código GPL.

## Flow: referencia actual

La referencia actual de Flow ha cambiado: Flow Desktop utiliza su propio cliente InnerTube, SABR y renovación durante fallos midstream. Esa matriz de referencia no equivale a la implementación web de TodoTube. TodoTube fija `youtubei.js@16.0.0`: la cadena compilada hoy es MWEB, WEB, TV, TV_EMBEDDED, WEB_EMBEDDED, ANDROID_CREATOR y ANDROID. VISIONOS requiere youtubei.js 18 y ANDROID_VR requiere 17; ambos quedan diferidos hasta actualizar y volver a probar dependencias.

## Ruta técnica elegida

1. TodoTube inicia un único Shaka Player y conecta su UI propia.
2. El Worker Relay recibe solicitudes same-origin de la web, valida host/ruta y método y transmite la respuesta upstream sin almacenar el medio.
3. El proveedor WEB intenta Onesie y cae a InnerTube normal.
4. El broker continúa por perfiles de cliente alternativos.
5. Cada respuesta genera candidatos SABR, DASH, HLS o progresivos cuando son válidos.
6. El player renueva la fuente activa una vez; luego salta a otro transporte/cliente.
7. Un proveedor de almacenamiento autorizado R2 puede actuar como ruta independiente para el mismo asset.
8. El cambio conserva timestamp y estado; no monta un segundo reproductor.

## Proyectos de referencia y licencias

- [Kira](https://github.com/LuanRT/kira): MIT. Se han adaptado partes de BotguardService, ShakaPlayerAdapter, helpers y lógica Onesie/SABR; ver el archivo THIRD_PARTY_NOTICES.md dentro del runtime web.
- [Materialious full web](https://github.com/Materialious/Materialious/blob/main/docs/DOCKER-FULL.md): referencia para proxy same-origin con allowlist y límites. TodoTube no copia su backend Node ni su configuración de autenticación.
- [googlevideo](https://github.com/LuanRT/googlevideo): dependencia MIT de transporte SABR/UMP.
- [Flow Android](https://github.com/Flow-YouTube/Flow) y [Flow Desktop](https://github.com/Flow-YouTube/Flow-Desktop): referencia de arquitectura y comportamiento; sus implementaciones GPL no se copian dentro de TodoTube.

## Qué no se debe volver a afirmar

- No es cierto que la única forma web de tener un player propio sea usar un iframe oficial.
- El proxy same-origin es una opción para resolver CORS, pero no es una CDN nueva ni una forma de saltarse denegaciones de YouTube.
- La extensión oficial de Flow no es el Bridge de TodoTube: Flow Desktop y su extensión funcionan como aplicación de escritorio y handoff; TodoTube necesita su propio runtime web.
- Un perfil InnerTube alternativo no equivale a un proveedor independiente de CDN. La independencia real requiere orígenes de contenido distintos, como una copia autorizada R2 o un origin de creador.

## Estado real de integración

La implementación original pasó build y Playwright con fixtures, pero sus smokes reales con Bridge no alcanzaron metadata ni primer frame. La nueva variante sin Bridge está en la rama `fix/web-playback-without-bridge-2026-11-09`; su CI debe probar contratos/seguridad y el deploy de `main` ejecutará un nuevo smoke E4 sin cargar extensiones. No se considera terminada hasta ver vídeo real.

## Pendiente de prueba

La existencia de Kira y Flow demuestra precedentes técnicos, no valida automáticamente la integración TodoTube. Cerrar mediante pruebas reales de audio/vídeo completo, seek, buffering, midstream failover y reanudación, según ADR-013.
