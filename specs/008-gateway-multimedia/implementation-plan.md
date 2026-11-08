# Plan de implementación para agente de código · Gateway multimedia PoC

**Lee primero:** `docs/adr/ADR-005-cliente-youtube-completo.md`, `docs/adr/ADR-009-gateway-multimedia-sin-puente.md`, `specs/006-spike-reproductor-propio/spec.md` y `specs/008-gateway-multimedia/spec.md`.

## Instrucción principal

Implementa una PoC aislada y comprobable de un Cloudflare Worker que retransmita un archivo de vídeo de prueba controlado por el proyecto. No intentes integrar YouTube ni quitar TodoTube Puente en esta tarea.

No afirmes que la web ya funciona sin extensión. No cambies producción. No despliegues.

## Fase 0 — Auditoría antes de editar

1. Inspecciona el árbol real del repositorio, package manager, workspaces, convenciones de tests, configuración Wrangler y scripts.
2. Comprueba si ya existe un Worker auxiliar, fixtures multimedia o utilidades de streaming que deban reutilizarse.
3. Relee los archivos actuales antes de modificarlos; no asumas que las rutas o fragmentos de esta especificación siguen idénticos.
4. Registra en el informe qué archivos planeas crear/modificar y por qué.
5. Si para cumplir una tarea necesitas violar ADR-005, detenerte y reportar el bloqueo. No reinterpretar la decisión por cuenta propia.

## Fase 1 — Worker experimental separado

1. Crear un proyecto Worker separado del Worker web actual. Nombre sugerido: `todotube-media-gateway-dev`; adaptar a convenciones existentes.
2. Usar Wrangler y Streams API según la versión instalada. No actualizar dependencias globales sin necesidad.
3. Definir el origen de fixture mediante configuración local segura; el destino no debe venir libremente del usuario.
4. Exponer una ruta de prueba estable, por ejemplo `GET|HEAD /media/test-video.mp4`.
5. Implementar GET/HEAD, Range, 206, 416, OPTIONS/CORS, streaming por chunks, cancelación y manejo de errores.
6. Mantener allowlist estricta de host y ruta. Deshabilitar credenciales. Validar redirecciones.
7. No usar `response.arrayBuffer()`, `response.blob()` ni `response.text()` para consumir el cuerpo multimedia completo.
8. No crear un endpoint `/proxy?url=` genérico.
9. No añadir lógica de YouTube, Googlevideo, InnerTube, BotGuard, PoToken o SABR al Worker.

## Fase 2 — Fixture y cliente de prueba

1. Añadir un fixture pequeño de vídeo propio o generar uno local para pruebas. Si el repo no puede alojar binarios, documentar cómo generar el fixture con una herramienta ya disponible y no descargar contenido protegido.
2. Crear una página de prueba separada de la aplicación de producción.
3. Reproducir mediante HTML5 y comprobar seek. Si resulta viable, crear una prueba separada con Shaka, sin cambiar el reproductor de producción.
4. La página de prueba debe señalar claramente que es un entorno experimental.

## Fase 3 — Pruebas automatizadas

Implementar los casos de `test-plan.md`. Cubrir como mínimo:

- GET completo y hash de bytes.
- HEAD sin cuerpo.
- Range inicial, intermedio y final.
- Range inválido/insatisfacible.
- OPTIONS y CORS permitido/no permitido.
- destino no permitido, path traversal, localhost, IP privada y metadata endpoints.
- redirección a destino no permitido.
- cancelación del stream.
- respuesta upstream 4xx/5xx y upstream sin cabeceras esperadas.
- evidencia de entrega incremental de chunks.

No simular como aprobada una prueba de streaming si el test consume el cuerpo entero antes de comprobar el primer chunk.

## Fase 4 — Regresión del producto actual

Ejecutar los comandos que realmente existan en el repo:

- build de web;
- TypeScript/typecheck;
- suite Playwright existente;
- tests nuevos del Worker.

No modificar snapshots ni debilitar tests para hacerlos pasar. Si el entorno no permite un test, registrar el error y el motivo exacto.

## Fase 5 — Informe y cierre

Crear `specs/008-gateway-multimedia/results.md` con:

1. resumen de lo implementado;
2. archivos creados/modificados;
3. comandos ejecutados y resultados;
4. matriz CA-01…CA-13: aprobado/fallido/bloqueado/no ejecutado;
5. medidas de latencia/throughput solo si se midieron;
6. límites de Workers identificados con enlaces a documentación oficial y fecha;
7. seguridad: SSRF, CORS, allowlist, redirecciones, abuso;
8. costes: qué se pudo medir y qué no; no inventar estimaciones;
9. pruebas manuales pendientes;
10. recomendación: continuar, rediseñar o detener.

## Restricciones de cambios

- No editar ADR-005.
- No editar `apps/web/src/components/PlayerHost.tsx`, `OwnPlayer.tsx`, `OfficialPlayer.tsx`, `TodoTubePlayer.ts` ni `ShakaPlayerAdapter.ts` para esta PoC.
- No cambiar `apps/web/wrangler.toml`, rutas, DNS, variables o secretos de producción.
- No quitar, debilitar ni cambiar la extensión Puente.
- No cambiar el comportamiento de fallback.
- No usar streams de YouTube como fixtures.
- No hacer deploy.
- No añadir credenciales ni tokens a archivos versionados.

## Resultado esperado

Un Worker experimental separado, tests automatizados reproducibles, fixture HTML5 (y Shaka si viable), y un informe honesto. La PoC solo demuestra la capacidad de transporte con un origen controlado; no demuestra compatibilidad con YouTube ni autoriza una arquitectura de extracción en servidor.
