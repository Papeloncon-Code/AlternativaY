# Plan 008 · Media Gateway R2 y player HTML5

## Arquitectura

- Worker: `todotube-media-gateway`.
- Bucket R2: `todotube-media`; binding `MEDIA_BUCKET`.
- Key: `media/<id>`.
- Cliente: `/medios` y `/medios/:id`, HTML5 `video` con controles TodoTube.
- Formatos: MP4, WebM y Ogg progresivos.
- CORS allowlist; catálogo público explícito; administración Bearer token.
- Fuente: únicamente R2 propio; no se consulta a terceros.
- Límite actual por carga: 90 MiB.

## Provisionamiento pendiente

1. Crear bucket R2 `todotube-media`.
2. Revisar que el API Token de GitHub pueda desplegar el Worker. Si se limita a Workers existentes, crear el Worker en Dashboard y añadirlo al alcance.
3. Ejecutar manualmente **Deploy · Media Gateway**.
4. Crear secret `MEDIA_UPLOAD_TOKEN` en Cloudflare → Worker → Settings → Variables and Secrets.
5. Cargar un archivo de prueba propio/licenciado y verificar el catálogo.

## Contrato de carga

- `PUT /v1/admin/media/:id`
- `Authorization: Bearer <MEDIA_UPLOAD_TOKEN>`
- `Content-Type`
- `Content-Length` (máximo 90 MiB)
- `X-Media-Title`
- `X-Media-Creator`
- `X-Media-License: owned|licensed`
- `X-Media-License-Reference` obligatorio para licensed
- `X-Media-Visibility: public|private`

El secreto no se incluye en el bundle web ni en variables públicas.
