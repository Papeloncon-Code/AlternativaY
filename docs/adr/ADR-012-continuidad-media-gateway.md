# ADR-012 · Continuidad y redundancia de Media Gateway

- Estado: propuesto para revisión; no desplegado en producción.
- Fecha: 2026-11-08.
- Complementa ADR-011. No modifica la política de fuentes de contenido.

## Contexto

El Gateway inicial dependía de un único binding R2. Una indisponibilidad del bucket, errores de lectura o latencia elevada afectaban directamente a la reproducción de archivos propios/licenciados. Un nombre de bucket secundario sin provisionamiento no crea redundancia.

## Decisión propuesta

1. Mantener R2 primario (MEDIA_BUCKET) y admitir una réplica R2 independiente (MEDIA_BUCKET_REPLICA).
2. Si hay dos bindings, las lecturas consultan ambos en paralelo con timeout acotado y el primer origen legible gana.
3. Las cargas administrativas se replican a todos los orígenes configurados.
4. El catálogo fusiona objetos públicos por ID y reporta cuántos orígenes respondieron.
5. El borrado se intenta en todos los orígenes. Si no se confirma en todos, devuelve error de borrado parcial.
6. El binding secundario es opcional en código, pero solo existe redundancia efectiva cuando el bucket está creado, enlazado y contiene una copia válida.
7. Los objetos privados nunca heredan caché pública.
8. Esta capa sirve exclusivamente archivos que TodoTube tiene derecho a distribuir. No implementa extractores, proxies de YouTube ni rotación de clientes/IP/tokens anti-bot.

## Parámetros operativos

- Timeout de lectura inicial: 1.8 s, configurable por MEDIA_ORIGIN_TIMEOUT_MS, con máximo de 5 s.
- Timeout de escritura: default 45 s, configurable por MEDIA_WRITE_TIMEOUT_MS, con máximo de 120 s.
- Cada carga genera mediaVersion, compartida por todas las réplicas.
- GET/HEAD y Range se resuelven en el origen ganador.
- 404 solo cuando todos los orígenes consultados confirman que el objeto no existe.
- 503 cuando no se puede determinar disponibilidad por errores/timeout.
- El header X-Media-Origin identifica el origen que respondió para diagnóstico.

## Escritura, consistencia y recuperación

- La carga se duplica usando streams tee para no almacenar el archivo completo en memoria.
- La respuesta 201 con replicas.degraded=true significa que hubo escritura parcial; no debe considerarse una réplica íntegra.
- Los borrados parciales requieren reconciliación.
- El catálogo es la unión de los catálogos disponibles; un catálogo parcial se marca como degradado.
- Si un body se trunca durante la reproducción, se intenta continuar desde el byte exacto en otra copia con el mismo tamaño y mediaVersion; para archivos previos a mediaVersion se exige ETag coincidente.
- Esta versión no implementa reparación automática en segundo plano, quorum, verificación criptográfica incremental ni circuit breaker persistente.

## Operación pendiente

1. Crear bucket R2 independiente todotube-media-replica.
2. Añadir binding MEDIA_BUCKET_REPLICA al Worker con ese bucket.
3. Desplegar Gateway desde la rama y ejecutar pruebas de smoke con objetos presentes en ambos buckets.
4. Probar failover en staging, no en producción.
5. Añadir monitorización/alertas y reconciliación de escrituras parciales antes de declarar HA.

## Consecuencias

La aplicación puede tolerar la caída de un origen R2 para objetos que ya existan en la réplica. No protege frente a pérdida simultánea, borrado accidental replicado, corrupción replicada, indisponibilidad del Worker o fallos del proveedor Cloudflare. La disponibilidad real debe medirse y probarse.
