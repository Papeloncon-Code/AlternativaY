# Especificación 008 · Media Gateway de contenido autorizado

- Estado: Worker y cliente implementados en código; despliegue y verificación operativa pendientes.
- Fecha: 2026-11-08.
- Decisión vigente: ADR-011.
- Alcance: archivos propios o con licencia expresa para distribución. No retransmite YouTube.

## Objetivo

Servir archivos multimedia propios/licenciados desde R2 mediante un Worker y reproducirlos con el elemento nativo HTML5 `video`, con controles visuales propios.

La iteración actual soporta MP4, WebM y Ogg progresivos. No incluye Shaka, manifiestos DASH/HLS, ABR ni directos.

## Requisitos

- RF-01: ID opaco; key R2 `media/<id>`.
- RF-02: GET y HEAD devuelven metadatos correctos y el cuerpo como stream.
- RF-03: Range válido devuelve 206 y Content-Range exacto; Range no satisfacible devuelve 416.
- RF-04: licencia `owned` o `licensed`; licensed requiere referencia interna de autorización.
- RF-05: solo objetos `public` aparecen en catálogo.
- RF-06: PUT/DELETE requieren `Authorization: Bearer` con `MEDIA_UPLOAD_TOKEN`.
- RF-07: MIME MP4/WebM/Ogg; Content-Length obligatorio; máximo 90 MiB por objeto.
- RF-08: CORS limitado a TodoTube y localhost de desarrollo.
- RF-09: cliente construye URL desde ID del catálogo; no admite URL remota arbitraria.
- RF-10: ninguna ruta acepta IDs/URLs YouTube, Googlevideo, InnerTube, BotGuard, PoToken, cookies ni credenciales Google.
- RF-11: player HTML5 implementa play/pause, seek, volumen, velocidad y fullscreen.
- RF-12: historial/progreso se obtiene de eventos reales del elemento HTML5.

## API

| Método | Ruta | Propósito |
|---|---|---|
| GET | `/health` | Salud |
| GET | `/v1/catalog` | Catálogo público |
| GET / HEAD | `/v1/media/:id` | Streaming y Range |
| PUT | `/v1/admin/media/:id` | Carga autenticada |
| DELETE | `/v1/admin/media/:id` | Borrado autenticado |

## Criterios de aceptación

- CA-01: health 200.
- CA-02: GET devuelve contenido y Content-Type.
- CA-03: Range devuelve 206, Content-Range y bytes correctos.
- CA-04: Range no satisfacible devuelve 416.
- CA-05: HEAD devuelve metadatos sin cuerpo.
- CA-06: objetos private no se leen públicamente.
- CA-07: PUT/DELETE sin token devuelven 401.
- CA-08: titularidad/licencia incompleta o MIME no permitido se rechazan.
- CA-09: catálogo solo lista objetos públicos.
- CA-10: CORS rechaza orígenes no autorizados.
- CA-11: /medios y /medios/:id usan catálogo y stream del Gateway.
- CA-12: player reproduce MP4/WebM/Ogg con seek mediante Range.
- CA-13: build y Playwright pasan sin Puente.
- CA-14: `/medios` muestra `originsAvailable` frente a `originsConfigured`; si solo existe un origen, declara explícitamente que no hay redundancia y nunca afirma que se escribió en dos buckets.

## Límites explícitos

La PoC con fixtures no demostró una ruta YouTube. El Gateway sirve archivos que el propietario tiene derecho a distribuir. No obtiene, descarga, retransmite, desbloquea ni transforma contenido YouTube.
