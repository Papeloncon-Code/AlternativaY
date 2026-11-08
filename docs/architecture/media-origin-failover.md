# Media Origin Failover · Arquitectura

Estado: implementada en la rama feat/authorized-media-origin-failover; no desplegada.

El Gateway admite un R2 primario y una réplica R2 opcional. Cuando ambos bindings existen, las lecturas consultan ambos en paralelo con timeout acotado y usan el primer origen que entregue el objeto. Las cargas se replican; el catálogo combina objetos públicos y reporta degradación.

- Principal: binding MEDIA_BUCKET, bucket todotube-media.
- Réplica: binding opcional MEDIA_BUCKET_REPLICA, bucket todotube-media-replica.
- Timeout por origen: MEDIA_ORIGIN_TIMEOUT_MS, default 1800 ms, máximo 5000 ms.
- X-Media-Origin identifica el origen que respondió, solo para diagnóstico.
- 404 significa que todos los orígenes consultados confirman que no hay un objeto público disponible.
- 503 significa que la disponibilidad no se pudo determinar por errores o timeout.
- Cargas parciales y borrados parciales se reportan como degradados/errores; requieren reconciliación.
- Los objetos privados siguen requiriendo autorización y Cache-Control private, no-store.

## Flujo

TodoTube Player → Media Gateway → R2 primario + R2 réplica → primer origen legible.

## Provisionamiento

Crear primero el bucket todotube-media-replica en Cloudflare R2. Después añadir el binding MEDIA_BUCKET_REPLICA al Worker. El binding permanece comentado en wrangler.toml hasta que el bucket exista. No hay redundancia real mientras solo esté configurado el primario.

## Límites de esta iteración

No incluye reparación automática en segundo plano, verificación de hashes, quorum, circuit breaker persistente ni failover si el body del stream falla después de que la respuesta HTTP ya comenzó a enviar bytes. Tampoco protege frente a pérdida simultánea, borrado replicado, corrupción replicada o caída del propio proveedor Cloudflare.

Este Gateway sirve archivos propios/licenciados. No obtiene ni retransmite streams de YouTube.
