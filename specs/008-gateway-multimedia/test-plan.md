# Plan de pruebas 008

## CI

`npm test` en `apps/media-gateway`:
- health endpoint;
- GET Range/206;
- HEAD sin cuerpo;
- Range no satisfacible 416;
- objeto privado no accesible;
- PUT sin token rechazado;
- metadatos de titularidad/licencia obligatorios;
- catálogo de objetos públicos;
- CORS rechaza orígenes no autorizados.

La web ejecuta build y Playwright. Los tests del Worker no validan por sí mismos la UI ni el despliegue R2.

## Integración antes de producción

1. Crear R2 y desplegar Worker.
2. Configurar `MEDIA_UPLOAD_TOKEN`.
3. Cargar MP4/WebM/Ogg autorizado de hasta 90 MiB con ID opaco.
4. Confirmar GET, HEAD y rangos desde el origen TodoTube.
5. Probar seek adelante/atrás en Chrome y Firefox.
6. Confirmar private=404 y admin sin token=401.
7. Verificar play/pause, volumen, velocidad, fullscreen, duración y progreso.
8. Medir cancelación, latencia, concurrencia y coste.
