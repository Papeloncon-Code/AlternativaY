# ADR-010 · Interfaz de reproducción propia

- **Estado:** SUPERSEDIDO por ADR-013 (2026-11-08) en selección y transporte de fuentes. La interfaz propia y el único PlayerHost se conservan.
- **Documento rector actual:** [ADR-013 · Reproducción propia de YouTube con cadena redundante de proveedores](ADR-013-reproduccion-propia-redundante.md).

## Decisión vigente

1. La interfaz, controles, historial y continuidad de reproducción pertenecen a TodoTube.
2. Existe un solo PlayerHost/Player UI por sesión. Los proveedores no montan interfaces paralelas.
3. El PlayerHost utiliza un broker para escoger fuentes y mantener el estado al cambiar de proveedor.
4. R2 sigue sirviendo medios propios/licenciados. No es un proxy remoto de YouTube.
5. El runtime web usa el Bridge del navegador cuando está instalado y los proveedores client-side definidos en ADR-013.

## Registro histórico

La versión anterior retiró el Bridge y limitó YouTube a metadatos/enlaces. Esa limitación se revoca mediante ADR-013. No debe usarse como criterio de aceptación actual.

## Pendiente de operación

- Confirmar la configuración de R2/replica y el secret de carga.
- Probar archivos propios/licenciados con GET, HEAD, Range/206, seek, privacidad y failover.
- Probar vídeos YouTube con el runtime y Bridge en Chrome/Edge.
- Publicar el paquete de extensión y sus instrucciones de instalación una vez CI y la matriz de reproducción estén verdes.
