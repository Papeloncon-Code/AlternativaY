# TodoTube

> Estado de código: 8 de noviembre de 2026. La presencia de código en main no implica que la última versión esté publicada ni que el Gateway esté operativo.

TodoTube es una aplicación web para descubrir novedades públicas de canales seguidos, organizar una biblioteca personal y reproducir archivos multimedia propios o licenciados.

## Estado real

- Inicio con feed, filtros, tarjetas y carga progresiva.
- Búsqueda, páginas de canal, Suscripciones, fichas externas de Shorts, historial, Ver más tarde, Me gusta y listas.
- Avisos WebSub/RSS, campanita por canal y Web Push.
- Preferencias locales: tema, Modo Foco, DeArrow y filtros por palabras.
- Biblioteca local del navegador; no hay cuentas ni sincronización multidispositivo.

### YouTube

TodoTube conserva metadatos públicos y enlaces al origen. No obtiene ni retransmite segmentos de YouTube. Las fichas usan una superficie propia con enlace «Abrir origen». No hay reproducción interna de YouTube, iframe oficial ni extensión Puente. No se anuncian controles de reproducción externa ni avance automático.

### Medios propios/licenciados

`/medios` muestra el catálogo R2 y `/medios/:id` usa el elemento nativo HTML5 `video` con controles propios: play/pause, seek, volumen, velocidad y pantalla completa. Los formatos de esta iteración son MP4, WebM y Ogg progresivos; no incluye DASH/HLS ni ABR.

### Media Gateway R2

Worker `todotube-media-gateway` en `apps/media-gateway`:
- GET `/health` y `/v1/catalog`.
- GET/HEAD de `/v1/media/:id`.
- Streaming R2, Range, 206 y 416.
- Carga/borrado autenticados; metadatos `owned` o `licensed`.
- Límite de carga actual: 90 MiB por objeto.
- No acepta URLs arbitrarias ni retransmite YouTube.

**Pendiente de operación:** bucket R2 `todotube-media`, Worker desplegado, `MEDIA_UPLOAD_TOKEN`, archivo autorizado y prueba real de seek en Chrome/Firefox. Hasta entonces, el Gateway no se declara operativo.

## Arquitectura

| Componente | Estado |
|---|---|
| `todotube` | Worker existente; hay que validar qué commit está publicado |
| `alternativay-websub` | Worker existente |
| D1 `alternativay-websub` | Datos de canales, vídeos y eventos |
| `todotube-media-gateway` | Código integrado; provisionamiento pendiente |
| R2 `todotube-media` | Bucket pendiente |


## Desarrollo y pruebas

Node.js 22 y npm.

Web:
    cd apps/web
    npm ci
    npm run build
    npx playwright test --trace off

Gateway:
    cd apps/media-gateway
    npm ci
    npm test

Avisos:
    cd spikes/websub
    npm ci
    npm test

CI/CD:
- `.github/workflows/ci-cd.yml`: pruebas y despliegue de Workers existentes cuando pasan todas las dependencias.
- `.github/workflows/deploy-media-gateway.yml`: despliegue manual del Gateway tras provisionarlo.

## Documentación vigente

- Constitución: `specs/000-constitucion/constitucion.md`.
- Paridad pantalla por pantalla: [issue #9](https://github.com/Papeloncon-Code/AlternativaY/issues/9) y `specs/007-paridad-funcional/spec.md`.
- Gateway R2: [issue #3](https://github.com/Papeloncon-Code/AlternativaY/issues/3), ADR-011 y `specs/008-gateway-multimedia/`.

No declares terminada una función solo porque exista una pantalla o pase un test unitario: la aceptación exige interacción real, revisión visual y verificación de producción cuando aplique.
