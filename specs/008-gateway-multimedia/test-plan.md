# Plan de pruebas 008

## CI

El workflow ejecuta npm test en apps/media-gateway:
- health endpoint;
- GET con Range y respuesta 206;
- HEAD sin cuerpo;
- Range no satisfacible 416;
- objetos privados no accesibles;
- carga sin token rechazada;
- metadatos de titularidad/licencia obligatorios;
- catálogo solo incluye objetos públicos;
- CORS rechaza orígenes no autorizados.

## Integración antes de producción

1. Crear bucket R2 y desplegar el Worker.
2. Configurar MEDIA_UPLOAD_TOKEN en el Worker.
3. Cargar un MP4/WebM propio o licenciado con ID opaco.
4. Confirmar GET completo, HEAD y varios Range desde el origen de TodoTube.
5. Probar seek hacia adelante/atrás en Chrome y Firefox.
6. Confirmar que private devuelve 404 al público y admin sin token devuelve 401.
7. Revisar logs, cancelación, latencia y coste con tamaños/concurrencia representativos.
