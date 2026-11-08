# ADR-009 · PoC de transporte multimedia en Worker

- **Estado:** Antecedente técnico; alcance experimental sustituido por ADR-011.
- **Fecha:** 2026-11-07.
- **Relacionado con:** ADR-005, ADR-011 y especificación 008.

## Contexto

La PoC inicial evaluó si un Worker podía servir vídeo propio con semántica HTTP compatible con HTML5/Shaka: GET, HEAD, Range, 206/416, CORS, streaming y cancelación.

## Resultado

La prueba en apps/media-gateway de la rama experimental mostró que el transporte de fixtures propios se podía implementar. No demostró reproducción real de YouTube, no integró el reproductor web y no fue una solución para BotGuard/PoToken o CORS entre YouTube y una página web.

## Límite

ADR-009 nunca autorizó un proxy abierto ni la retransmisión de segmentos YouTube. La implementación de producto que queda vigente es ADR-011: Worker + R2 con IDs opacos para contenido propio o con licencia expresa.

## Consecuencia

Esta ADR se conserva como historial de la investigación. Para código y operación actual, seguir ADR-011 y specs/008-gateway-multimedia/.
