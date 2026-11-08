# Especificación 009 · Media Source Provider Broker

- Estado: diseño técnico; no implementado como broker multi-proveedor.
- Objetivo: abstraer múltiples proveedores de entrega autorizados sin acoplar el player ni la UI a un extractor.

## Requisitos funcionales

- RF-01: separar discovery/metadatos de media delivery/stream.
- RF-02: cada fuente debe identificar providerId, assetId, protocolo, MIME, expiración, assetFingerprint y authorizationRef.
- RF-03: solo admitir HTTPS y hosts aprobados/configurados en servidor.
- RF-04: rechazar fuentes sin evidencia interna de autorización.
- RF-05: soportar file progressive, HLS y DASH en adaptadores compatibles.
- RF-06: seleccionar entre proveedores disponibles con timeout y prioridad.
- RF-07: conmutar por fallos de red recuperables; no disfrazar errores de autorización como fallos de red.
- RF-08: continuar reproducción usando byte offset para copias idénticas o timeline/timecode para HLS/DASH alineados.
- RF-09: no cambiar entre assets de fingerprint distinto.
- RF-10: estado de circuit breaker compartido entre isolates mediante Durable Object, D1 o KV.
- RF-11: registrar métricas sin tokens, cookies ni URLs firmadas.
- RF-12: mantener controles, UI e historial en el player de TodoTube.
- RF-13: los adaptadores dependen de fuentes cuyo titular/proveedor permita la entrega al player propio.

## Pruebas de aceptación

- Cero proveedores saludables -> error visible y medible, sin player infinito.
- Proveedor lento -> candidato rápido elegido dentro del timeout.
- Proveedor 5xx -> se prueba el siguiente candidato.
- Proveedor 401/403 -> no se intenta ocultar el problema de permisos.
- URL firmada vencida -> renovación autorizada o exclusión del candidato.
- Fingerprint diferente -> rechazar fallback.
- HLS/DASH con timeline no alineada -> no prometer continuidad sin saltos.
- Stream de archivo interrumpido -> reanudar byte exacto solo en réplica del mismo mediaVersion/ETag y tamaño.
- Circuit breaker abierto -> evitar enviar tráfico a fuente degradada; half-open prueba limitada.
- Los logs deben estar libres de credenciales y URLs firmadas.

## Fuera de alcance

El sistema no extrae ni retransmite segmentos de YouTube por endpoints no oficiales, no automatiza evasión anti-bot ni traslada tokens de integridad o credenciales de sesión. Un proveedor de YouTube solo puede implementarse con autorización y un mecanismo de entrega documentado que permita el player propio.
