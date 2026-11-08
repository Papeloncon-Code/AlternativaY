# ADR-011 · Media Gateway R2 y retirada completa de TodoTube Puente

- **Estado:** Aceptado como arquitectura vigente (2026-11-08).
- **Sustituye:** ADR-005 para el transporte de reproducción de YouTube y la parte de transporte de ADR-010.
- **Complementa:** ADR-009 como evolución de la PoC, ADR-006 para metadatos públicos y especificación 008.

## Contexto

El producto exige interfaz y controles de reproducción propios, sin extensión de navegador. La PoC anterior demostraba transporte HTTP con fixtures propios, no una vía de acceso a streams YouTube. La extracción de YouTube a través de infraestructura propia no se implementará mediante evasión de medidas anti-bot, falsificación de identidad de cliente, rotación de IP o transferencia de tokens de integridad al servidor.

## Decisión

1. **TodoTube Puente se retira completamente** del producto web: extensión, instalador, archivos ZIP, ruta, prompt, empaquetador y dependencias de código.
2. El producto conserva el reproductor visual propio. No inserta el iframe oficial de YouTube como fallback.
3. El reproductor Shaka de TodoTube sirve los archivos del Media Gateway cuando el origen es nuestro bucket R2.
4. El Gateway usa IDs opacos y solo puede acceder a objetos del bucket R2 todotube-media. No recibe URLs arbitrarias ni hace fetch a dominios de terceros.
5. Solo se almacenan medios que el propietario pueda distribuir: owned para contenido propio y licensed para el que exista autorización expresa. Los objetos licenciados requieren referencia interna de autorización.
6. El catálogo público solo incluye objetos marcados public. La carga y el borrado requieren un secreto que reside únicamente en Cloudflare.
7. Los elementos de YouTube en feed, búsqueda y páginas de canal son metadatos/enlaces. Al intentar reproducirlos dentro de TodoTube se muestra una salida clara al vídeo original; no se extraen ni retransmiten sus segmentos.
8. No se genera ni falsifica BotGuard/PoToken en servidor, no se trasladan tokens de integridad, no se rotan IP, no se suplanta el cliente ni se sortean controles técnicos.

## Arquitectura

TodoTube Web / Shaka
        |
        | GET /v1/media/:id + Range
        v
Cloudflare Worker: todotube-media-gateway
        |
        | R2 binding, key media/:id
        v
R2 bucket: todotube-media

La API pública está limitada a /health, /v1/catalog y /v1/media/:id (GET/HEAD). El API administrativo expone PUT/DELETE con Bearer token. No existe endpoint de proxy remoto.

## Estado de implementación

- Código Worker: implementado en apps/media-gateway/src/index.js.
- Test suite: implementada en apps/media-gateway/test/gateway.test.mjs.
- Biblioteca y player web: implementados en /medios y /medios/:id.
- Retirada de Puente del código web: aplicada en main.
- Bucket R2, secret MEDIA_UPLOAD_TOKEN, despliegue del Worker y prueba manual Chrome/Firefox: pendientes de provisionamiento y verificación operativa.

## Consecuencias y límites

- TodoTube puede reproducir dentro de su player medios propios/licenciados publicados en R2.
- El Gateway no habilita reproducción interna de YouTube; para eso se necesita una fuente/proveedor que autorice expresamente el acceso y la entrega del stream al reproductor propio.
- No se considera el Gateway terminado en producción hasta provisionar R2, desplegarlo y verificar un archivo real con seek, Range, cancelación y privacidad.
- La declaración de licencia en metadatos no sustituye la obligación del propietario de verificar los derechos de distribución.
