# Media Origin Failover · Arquitectura

Estado: implementada en la rama feat/authorized-media-origin-failover; no desplegada.

El Gateway admite un R2 primario y una réplica R2 opcional. Cuando ambos bindings existen, las lecturas consultan ambos en paralelo con timeout acotado y usan el primer origen que entregue el objeto. Las cargas se replican; el catálogo combina objetos públicos y reporta degradación.

- Principal: binding MEDIA_BUCKET, bucket todotube-media.
- Réplica: binding opcional MEDIA_BUCKET_REPLICA, bucket todotube-media-replica.
- Timeout de lectura por origen: MEDIA_ORIGIN_TIMEOUT_MS, default 1800 ms, máximo 5000 ms.
- Timeout de escritura: MEDIA_WRITE_TIMEOUT_MS, default 45000 ms, máximo 120000 ms.
- Timeout de inactividad del body: MEDIA_STREAM_IDLE_TIMEOUT_MS, default 8000 ms, máximo 30000 ms; un origen que deja de entregar bytes también activa failover.
- Las cargas nuevas guardan mediaVersion común en todas las réplicas para validar que una copia alternativa corresponde a la misma versión.
- X-Media-Origin identifica el origen que respondió, solo para diagnóstico.
- 404 significa que todos los orígenes consultados confirman que no hay un objeto público disponible.
- 503 significa que la disponibilidad no se pudo determinar por errores o timeout.
- Cargas parciales y borrados parciales se reportan como degradados/errores; requieren reconciliación.
- Los objetos privados siguen requiriendo autorización y Cache-Control private, no-store.

## Flujo

TodoTube Player → Media Gateway → R2 primario + R2 réplica → primer origen legible.

## Provisionamiento

Crear primero el bucket todotube-media-replica en Cloudflare R2. Después añadir el binding MEDIA_BUCKET_REPLICA al Worker. El binding permanece comentado en wrangler.toml hasta que el bucket exista. No hay redundancia real mientras solo esté configurado el primario.

## Continuidad durante el stream

Si el body del origen seleccionado se trunca, falla o permanece inactivo más allá del timeout después de empezar a enviarse, el Gateway intenta abrir otra copia desde el byte siguiente al último entregado. Comprueba tamaño y versión mediaVersion; en archivos antiguos sin esa marca exige ETag coincidente. Mantiene el mismo Content-Length y Range. Si no encuentra una copia que coincida, termina con error en lugar de mezclar versiones.

## Límites de esta iteración

No incluye reparación automática en segundo plano de escrituras parciales, quorum, circuit breaker persistente ni verificación criptográfica incremental del contenido. Tampoco protege frente a pérdida simultánea, borrado replicado, corrupción replicada o caída del propio proveedor Cloudflare.

Este Gateway sirve archivos propios/licenciados. No obtiene ni retransmite streams de YouTube.
