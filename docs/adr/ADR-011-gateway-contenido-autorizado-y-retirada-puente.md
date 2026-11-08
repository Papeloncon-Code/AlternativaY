# ADR-011 · Media Gateway R2 y retirada completa de TodoTube Puente

- **Estado:** Aceptado como arquitectura vigente (2026-11-08).
- **Sustituye:** ADR-005 para el transporte de reproducción de YouTube y la parte de transporte de ADR-010.
- **Complementa:** ADR-009 como antecedente de la PoC, ADR-006 para metadatos públicos y especificación 008.

## Contexto

La PoC anterior demostraba transporte HTTP con fixtures propios, no una vía de acceso a streams YouTube. No se implementará extracción de YouTube a través de infraestructura propia mediante evasión anti-bot, falsificación de identidad, rotación de IP o traslado de tokens de integridad al servidor.

## Decisión

1. TodoTube Puente se retira del producto web: extensión, instalador, ZIP, ruta, prompt, empaquetador y dependencias.
2. La interfaz de vídeo pertenece a TodoTube. No se inserta el iframe oficial de YouTube como fallback.
3. Los archivos propios/licenciados se reproducen con HTML5 `video` y controles propios de TodoTube.
4. El Gateway usa IDs opacos y accede únicamente al bucket R2 `todotube-media`. No recibe URLs arbitrarias ni hace fetch a terceros.
5. Solo se almacenan medios distribuibles legalmente: `owned` o `licensed`; estos últimos requieren referencia interna de autorización.
6. El catálogo público solo incluye objetos marcados `public`. Carga y borrado requieren secreto en Cloudflare.
7. YouTube en feed, búsqueda, Shorts y páginas de canal son metadatos/enlaces. TodoTube muestra una ficha propia con enlace al origen; no retransmite segmentos.
8. No se genera/falsifica BotGuard/PoToken, no se trasladan tokens de integridad, no se rotan IP ni se suplanta cliente.

## Arquitectura

TodoTube Web / HTML5 video con controles propios
        |
        | GET /v1/media/:id + Range
        v
Cloudflare Worker: todotube-media-gateway
        |
        | R2 binding MEDIA_BUCKET, key media/:id
        v
R2 bucket: todotube-media

API pública: `/health`, `/v1/catalog` y `/v1/media/:id` (GET/HEAD). Administración: PUT/DELETE con Bearer token. No existe proxy remoto.

## Estado de implementación

- Worker: `apps/media-gateway/src/index.js`.
- Tests unitarios: `apps/media-gateway/test/gateway.test.mjs`.
- Biblioteca /medios y ficha /medios/:id: implementadas.
- Player: HTML5 nativo con controles propios; no depende de Shaka.
- Límite de carga: 90 MiB por objeto.
- Retirada de Puente del código web: aplicada en main.
- Bucket R2, secret MEDIA_UPLOAD_TOKEN, despliegue del Worker y prueba manual: pendientes.

## Consecuencias y límites

- TodoTube puede reproducir archivos propios/licenciados en R2 cuando el Gateway esté provisionado.
- La iteración actual es reproducción progresiva; no declara DASH/HLS, ABR ni directos.
- El Gateway no habilita reproducción interna de YouTube; requeriría una fuente que autorice expresamente la entrega al player propio.
- No se declara terminado hasta verificar archivo real, seek, Range, cancelación y privacidad.
- Los metadatos de licencia no sustituyen la comprobación de derechos.
