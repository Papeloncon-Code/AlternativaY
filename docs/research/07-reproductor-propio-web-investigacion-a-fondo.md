# 07 · Reproductor propio en web: investigación y decisión de implementación

**Estado:** investigación incorporada a la arquitectura en ADR-013 (2026-11-08). Las conclusiones iniciales fueron superadas por el prototipo Kira y por la cadena de clientes de Flow.

## Hallazgo principal

Kira demuestra un reproductor web con UI propia y transportes SABR mediante Shaka. Utiliza youtubei.js, googlevideo, BgUtils y un Bridge del navegador para resolver las barreras de origen. El vídeo no necesita pasar por un proxy multimedia de TodoTube.

La integración de TodoTube toma la arquitectura de Kira como base de implementación MIT, preservando el aviso de licencia. Toma de Flow la estrategia de redundancia y recuperación, pero no copia su código GPL.

## Flow: referencia actual

La referencia actual de Flow ha cambiado: Flow v3.0.0 eliminó NewPipeExtractor y utiliza su propio cliente InnerTube. La cadena observada en Flow Desktop intenta VISIONOS, MWEB, WEB, TV_TIZEN y varios perfiles ANDROID_VR/ANDROID; usa SABR en clientes web cuando está disponible y renueva enlaces durante fallos midstream. La implementación web de TodoTube adapta esta estrategia a los tipos de cliente que expone la versión de youtubei.js instalada.

## Ruta técnica elegida

1. TodoTube inicia un único Shaka Player y conecta su UI propia.
2. TodoTube Bridge habilita el transporte de solicitudes desde el navegador del usuario.
3. El proveedor WEB intenta Onesie y cae a InnerTube normal.
4. El broker continúa por perfiles de cliente alternativos.
5. Cada respuesta genera candidatos SABR, DASH, HLS o progresivos cuando son válidos.
6. El player renueva la fuente activa una vez; luego salta a otro transporte/cliente.
7. Un proveedor de almacenamiento autorizado R2 puede actuar como ruta independiente para el mismo asset.
8. El cambio conserva timestamp y estado; no monta un segundo reproductor.

## Proyectos de referencia y licencias

- [Kira](https://github.com/LuanRT/kira): MIT. Se han adaptado partes de BotguardService, ShakaPlayerAdapter, helpers y lógica Onesie/SABR; ver el archivo THIRD_PARTY_NOTICES.md dentro del runtime web.
- [ytc-bridge](https://github.com/LuanRT/ytc-bridge): MIT. El Bridge de TodoTube adapta permisos, orígenes y validación de destinos; conserva su LICENSE.
- [googlevideo](https://github.com/LuanRT/googlevideo): dependencia MIT de transporte SABR/UMP.
- [Flow Android](https://github.com/Flow-YouTube/Flow) y [Flow Desktop](https://github.com/Flow-YouTube/Flow-Desktop): referencia de arquitectura y comportamiento; sus implementaciones GPL no se copian dentro de TodoTube.

## Qué no se debe volver a afirmar

- No es cierto que la única forma web de tener un player propio sea usar un iframe oficial.
- No es cierto que el único fallback sea un proxy multimedia server-side.
- La extensión oficial de Flow no es el Bridge de TodoTube: Flow Desktop y su extensión funcionan como aplicación de escritorio y handoff; TodoTube necesita su propio runtime web.
- Un perfil InnerTube alternativo no equivale a un proveedor independiente de CDN. La independencia real requiere orígenes de contenido distintos, como una copia autorizada R2 o un origin de creador.

## Pendiente de prueba

La existencia de Kira y Flow demuestra precedentes técnicos, no valida automáticamente la integración TodoTube. Cerrar mediante pruebas reales de audio/vídeo completo, seek, buffering, midstream failover y reanudación, según ADR-013.
