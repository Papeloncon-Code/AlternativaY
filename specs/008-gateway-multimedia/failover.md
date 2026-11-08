# Media Origin Failover · Especificación técnica

Estado: implementación en rama feat/authorized-media-origin-failover; no desplegado.

## Objetivo
Añadir redundancia de almacenamiento para archivos multimedia propios/licenciados, sin cambiar el reproductor ni el contrato HTTP de medios.

## Configuración
- Obligatorio: R2 binding MEDIA_BUCKET.
- Opcional: R2 binding MEDIA_BUCKET_REPLICA.
- Opcional: MEDIA_ORIGIN_TIMEOUT_MS (50–5000 ms; default 1800 ms).
- Opcional: MEDIA_WRITE_TIMEOUT_MS (1000–120000 ms; default 45000 ms).
- No se configura el binding secundario hasta crear el bucket R2 correspondiente.

## Comportamiento
- GET/HEAD: consultar orígenes en paralelo; gana el primer objeto legible.
- Stream interrumpido: continuar desde el byte siguiente en otra copia del mismo tamaño/versión; si las copias no pueden verificarse, no se mezclan.
- Range: aplicar el mismo rango al origen elegido y conservar 206/416.
- 404: todos los orígenes responden que el objeto no existe o no es público.
- 503: los orígenes no permiten determinar disponibilidad.
- Upload: dividir el stream y escribir en cada origen; indicar réplicas exitosas y degradación.
- Catalog: unir IDs públicos y reportar orígenes disponibles/degradados.
- Delete: eliminar en todos los orígenes; responder 503 si la operación queda parcial.
- Privacidad: privados siguen requiriendo autorización y private, no-store.

## Pruebas
- Primario caído y réplica disponible.
- Primario bloqueado y réplica rápida.
- Catálogo combinado sin duplicados y estado degradado.
- Escrituras replicadas y mediaVersion común.
- Recuperación exacta de un body interrumpido durante Range.
- Distinción entre 404 y 503.
- Borrado en todos los orígenes.

## Limitaciones conocidas
- La réplica debe existir y estar provisionada en Cloudflare.
- No incluye reconciliación automática de escrituras parciales, checksum criptográfico incremental ni circuit breaker persistente.
- No obtiene ni extrae streams de YouTube ni de otras plataformas externas.
- No hay garantía de HA hasta completar pruebas reales en staging y producción.
