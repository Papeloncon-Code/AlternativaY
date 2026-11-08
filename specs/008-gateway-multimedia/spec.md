# Especificación 008 · Media Gateway de contenido autorizado

- Estado: Implementado en código; despliegue y verificación operativa pendientes.
- Fecha de consolidación: 2026-11-08.
- Decisión vigente: ADR-011.
- Alcance: archivos propios o con licencia expresa para distribución. No retransmite YouTube.

## Objetivo

Ofrecer en TodoTube un reproductor Shaka propio que reproduzca archivos multimedia alojados en el bucket R2 del proyecto, sin extensión de navegador.

## Requisitos

- RF-01: cada medio se identifica por un ID opaco y se almacena en R2 bajo media/<id>.
- RF-02: GET y HEAD devuelven metadatos correctos y el cuerpo como stream; no se carga el archivo completo en memoria.
- RF-03: Range válido devuelve 206 y Content-Range exacto; Range no satisfacible devuelve 416.
- RF-04: un objeto lleva licencia owned o licensed; licensed requiere referencia interna de autorización.
- RF-05: solo objetos marcados public aparecen en el catálogo público.
- RF-06: PUT y DELETE requieren Authorization: Bearer con MEDIA_UPLOAD_TOKEN.
- RF-07: MIME multimedia limitado; Content-Length obligatorio y máximo 2 GiB.
- RF-08: CORS limitado a la web TodoTube y localhost de desarrollo.
- RF-09: el navegador construye la URL del stream desde el ID del catálogo; no acepta una URL remota arbitraria.
- RF-10: ninguna ruta acepta IDs/URLs de YouTube, Googlevideo, InnerTube, BotGuard, PoToken, cookies ni credenciales de Google.

## API

| Método | Ruta | Propósito |
|---|---|---|
| GET | /health | Salud del Worker |
| GET | /v1/catalog | Catálogo público en R2 |
| GET / HEAD | /v1/media/:id | Streaming con metadatos y Range |
| PUT | /v1/admin/media/:id | Carga autenticada |
| DELETE | /v1/admin/media/:id | Borrado autenticado |

## Criterios de aceptación

- CA-01: health responde 200.
- CA-02: GET devuelve contenido y Content-Type.
- CA-03: Range devuelve 206, Content-Range y bytes solicitados.
- CA-04: Range no satisfacible devuelve 416.
- CA-05: HEAD devuelve metadatos sin cuerpo.
- CA-06: objetos private no se leen públicamente.
- CA-07: PUT/DELETE sin token responden 401.
- CA-08: datos de licencia incompletos o MIME no permitido se rechazan.
- CA-09: el catálogo solo lista objetos públicos.
- CA-10: CORS rechaza orígenes no autorizados.
- CA-11: /medios y /medios/:id usan el catálogo y el stream del Gateway.
- CA-12: web build y Playwright pasan sin código/paquetes de Puente.

## Límites explícitos

La PoC anterior con fixtures no demostró una ruta de YouTube. El Gateway R2 almacena y sirve archivos que el propietario tiene derecho a distribuir. No obtiene, descarga, retransmite, desbloquea ni transforma contenido de YouTube.
