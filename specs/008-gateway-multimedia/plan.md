# Plan 008 · Media Gateway R2 y reproductor propio

## Arquitectura

- Worker independiente: todotube-media-gateway.
- Almacenamiento: bucket R2 todotube-media.
- Binding: MEDIA_BUCKET.
- Key: media/<id>.
- Cliente web: /medios y /medios/:id, reproductor Shaka.
- Seguridad: IDs validados, CORS allowlist, acceso público explícito y administración Bearer-token.
- Fuente de medios: únicamente R2 propio; no se hace fetch a terceros.

## Provisionamiento operativo pendiente

1. Crear bucket R2 todotube-media en la cuenta Cloudflare.
2. Revisar que el API Token de GitHub pueda desplegar el Worker nuevo. Si está limitado a Workers existentes, crear el Worker en Dashboard o ampliar alcance a este Worker.
3. Ejecutar manualmente el workflow Deploy · Media Gateway.
4. Crear el secret de Worker MEDIA_UPLOAD_TOKEN en Cloudflare Dashboard → Worker → Settings → Variables and Secrets.
5. Cargar un archivo de prueba propio y hacerlo público con metadatos de titularidad.

## Contrato de carga

- PUT /v1/admin/media/:id
- Authorization: Bearer <MEDIA_UPLOAD_TOKEN>
- Content-Type
- Content-Length (máximo 2 GiB)
- X-Media-Title
- X-Media-Creator
- X-Media-License: owned|licensed
- X-Media-License-Reference obligatorio para licensed
- X-Media-Visibility: public|private

El secreto nunca se incluye en el bundle web ni en GitHub Actions como variable pública.
