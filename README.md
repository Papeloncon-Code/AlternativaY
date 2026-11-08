# TodoTube

> Estado del repositorio: 8 de noviembre de 2026. La aplicación web y el servicio de avisos están desplegados. La nueva biblioteca de medios y el Worker Gateway están implementados en el código; el despliegue del Gateway requiere provisionar R2.

TodoTube es una aplicación web para descubrir novedades públicas de canales seguidos y organizar medios. El repositorio se llama AlternativaY.

## Estado real del producto

### Web en producción

- Feed de novedades de canales seguidos, filtros y carga continua.
- Páginas de canal, vídeos y Shorts basados en metadatos públicos.
- Búsqueda pública del servicio propio y búsqueda local en los canales seguidos.
- Favoritos, historial, progreso, Ver más tarde, listas y grupos en el navegador.
- Avisos WebSub/RSS, campanita por canal y Web Push.
- React, Vite, TypeScript y Cloudflare Workers.

### Reproducción

La interfaz de reproducción pertenece a TodoTube y no usa el iframe oficial de YouTube como fallback.

- YouTube: TodoTube conserva metadatos públicos y enlaces al origen. No obtiene ni retransmite sus segmentos; al pulsar un vídeo de YouTube se muestra el enlace para abrirlo en YouTube.
- Medios propios/licenciados: Shaka Player reproduce recursos del Media Gateway R2 en /medios y /medios/:id.
- TodoTube Puente: retirado del código de la web, del build, del menú y de los flujos de permiso.

### Media Gateway

El Worker todotube-media-gateway está implementado en apps/media-gateway con un binding R2 llamado MEDIA_BUCKET y bucket todotube-media.

- GET /health y GET /v1/catalog.
- GET y HEAD de /v1/media/:id.
- Streaming desde R2 con Range, 206 y 416.
- Carga y borrado autenticados; metadatos owned o licensed.
- No admite URLs arbitrarias ni retransmite medios de YouTube.

**Estado operativo:** el código está en main, pero el bucket R2, el secret Worker MEDIA_UPLOAD_TOKEN, el despliegue del Worker y la prueba manual con archivo real aún requieren provisionamiento en Cloudflare. No se presenta como Gateway de producción hasta completar esos pasos.

## Arquitectura actualmente desplegada

| Componente | Responsabilidad | Estado |
|---|---|---|
| todotube | Web y API | Desplegado |
| alternativay-websub | WebSub/RSS y avisos | Desplegado |
| D1 alternativay-websub | Canales, vídeos y eventos | Compartida por ambos Workers |
| todotube-media-gateway | Streaming de R2 para medios propios/licenciados | Código integrado; despliegue pendiente |
| R2 todotube-media | Archivos multimedia | Bucket por crear |

## Límites del producto

- No existe cliente Android nativo en main.
- No existen cuentas ni sincronización de biblioteca entre dispositivos.
- Los metadatos de YouTube no equivalen a acceso a sus streams.
- El Gateway no es un proxy de YouTube ni un proxy URL genérico.
- El marcado owned/licensed no sustituye la comprobación de los derechos de distribución.

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
- .github/workflows/ci-cd.yml: pruebas y despliegue automático de los dos Workers existentes en push a main.
- .github/workflows/deploy-media-gateway.yml: despliegue manual del Worker R2 tras crear el bucket.

## Decisiones vigentes

- ADR-006: WebSub/RSS y avisos.
- ADR-007: importación de suscripciones como backlog de futuras plataformas.
- ADR-008: nombre TodoTube y equipo inicial.
- ADR-009: registro histórico de la PoC de transporte.
- ADR-010: interfaz de reproducción propia.
- ADR-011: decisión vigente de Gateway autorizado y retirada de Puente.

La Constitución vigente está en specs/000-constitucion/constitucion.md; la especificación de producto del Gateway está en specs/008-gateway-multimedia/.
