# Spike T-007 · Avisos WebSub de YouTube

Especificación: [`specs/003-spike-websub/spec.md`](../../specs/003-spike-websub/spec.md).

- **Worker:** `alternativay-websub`, en `https://alternativay-websub.papelon.workers.dev` (cuenta Cloudflare del propietario, plan gratis).
- **Base de datos:** D1 `alternativay-websub`.

## Recibir los avisos en el teléfono
1. Instala **ntfy** (Google Play o F-Droid).
2. Pulsa **+**, *Subscribe to topic*, y escribe el nombre del topic privado. Ese nombre **no** está en el repositorio: se guarda como secreto del Worker (`NTFY_TOPIC`) y se te dio por chat.
3. Cada vídeo nuevo llega como: “Nuevo: <título>” · “WebSub · X min tras publicar”.

## Comandos
```bash
npm install
npm test
```
Despliegue, base de datos e informe (requieren `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID`):
```bash
npx wrangler d1 execute alternativay-websub --remote --file=schema.sql
npx wrangler deploy
npx wrangler d1 execute alternativay-websub --remote --file=seed-channels.sql
npx wrangler d1 execute alternativay-websub --remote --file=report.sql
```

## Añadir canales
Inserta una fila en `channels` con el ID `UC…` (22 caracteres tras `UC`). La tarea programada hace el resto en ≤ 5 min:
1. comprueba el canal por RSS;
2. guarda una línea base para no contar vídeos viejos como nuevos;
3. se suscribe al hub y renueva la suscripción antes de que caduque.

## Verificado el 2026-11-07
| Prueba | Resultado |
|---|---|
| Tests unitarios (parser Atom, HMAC-SHA1 RFC 2202, ventana de 48 h) | 6/6 ✅ |
| `/health` | ok ✅ |
| POST sin firma o con firma falsa | 403 ✅ (CA-S4) |
| Verificación con `hub.topic` falso | 404 ✅ |
| Canal no registrado | 404 ✅ |
