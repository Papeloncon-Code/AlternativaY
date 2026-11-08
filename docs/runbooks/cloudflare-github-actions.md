# Cloudflare + GitHub Actions: credenciales y migración D1 008

Este proyecto usa dos Workers existentes y una D1 compartida:

- Worker web: `todotube`
- Worker de avisos: `alternativay-websub`
- Base D1: `alternativay-websub`
- D1 ID: `676928c8-1061-40cc-9d67-9f7395c9c958`

Los workflows que realizan despliegues o cambios remotos declaran el entorno GitHub `produccion`. Si todavía no existe, créalo con ese nombre en **Settings → Environments**. Después configura los valores en **Settings → Environments → produccion → Environment secrets**. No los escribas en archivos del repositorio, commits, Issues, PRs ni chats.

## Secretos necesarios

| Secreto exacto | Uso | Permiso mínimo recomendado |
|---|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | Identifica la cuenta en ambos workflows | ID de la cuenta; no es una clave secreta |
| `CLOUDFLARE_API_TOKEN` | Despliega los Workers existentes | Workers **Editor** limitado a `todotube` y `alternativay-websub` |
| `CLOUDFLARE_D1_API_TOKEN` | Solo ejecuta la migración D1 008 manual | Account **D1 Edit** en la cuenta que contiene esa base |

Se separan los tokens deliberadamente. El token de despliegue no necesita permiso directo de escritura sobre D1: Cloudflare indica que desplegar un Worker con binding D1 requiere permiso Editor sobre el Worker; el permiso sobre el recurso ligado solo es necesario cuando se consulta o modifica D1 directamente. La migración sí consulta y escribe D1, por eso tiene su token específico. Véanse los documentos oficiales de [roles de Workers](https://developers.cloudflare.com/workers/authorization/workers/) y [permisos de API tokens](https://developers.cloudflare.com/fundamentals/api/reference/permissions/).

## Crear el token de despliegue

1. En el dashboard de Cloudflare, abre **Account API Tokens** → **Create Token** → **Custom**.
2. Concede el rol **Workers Editor** solo a los dos Workers existentes: `todotube` y `alternativay-websub`.
3. Limita el recurso a la cuenta correcta.
4. No añadas permisos D1 ni permisos de zona para Routes/Custom Domains: los `wrangler.toml` actuales usan `workers_dev = true` y el workflow no configura ni modifica rutas de zonas.
5. Copia el token una sola vez al secreto GitHub `CLOUDFLARE_API_TOKEN`.

Cloudflare documenta que desplegar un Worker existente requiere Editor; crear Workers nuevos requiere Admin. Si en el futuro se añade otro Worker, habrá que ampliar el alcance de forma deliberada, no ahora.

## Crear el token específico de D1

1. En **Account API Tokens** → **Create Token** → **Custom**, crea un token distinto.
2. Selecciona **Account → D1 → Edit**. No basta con **D1 Read**: la migración ejecuta `CREATE INDEX`.
3. Limita el token a la cuenta que contiene la D1 `alternativay-websub`; no le des Workers Editor, DNS, Zone Routes ni permisos globales innecesarios.
4. Guarda el token en el secreto GitHub `CLOUDFLARE_D1_API_TOKEN`.

El permiso Cloudflare **D1 Edit** es el que otorga escritura en D1. El comando utilizado es `wrangler d1 execute` con `--remote`, `--file` y `--yes`; esos parámetros son los admitidos por la documentación oficial de Wrangler.

## Añadir los secretos a GitHub

En el repositorio `Papeloncon-Code/AlternativaY`:

1. Abre **Settings → Environments → produccion**.
2. En **Environment secrets**, crea los tres nombres exactamente como aparecen en la tabla.
3. Añade el valor de cada uno directamente desde el dashboard/gestor seguro. No los pegues en el código ni en una conversación.
4. No borres ni rotes el token anterior hasta haber creado el nuevo y validado un despliegue controlado. Si el token actual ya fue expuesto fuera del almacén seguro, revócalo y sustitúyelo inmediatamente.

Cloudflare exige API token y Account ID para autenticar Wrangler en un entorno CI no interactivo. Sus instrucciones oficiales recomiendan guardarlos como secretos del sistema CI, nunca en el repositorio.

## Aplicar la migración 008

La migración no se ejecuta automáticamente al publicar la web. Solo se aplica al disparar su workflow manual, que está aislado de CI/CD:

1. Abre GitHub **Actions → D1 · aplicar índices 008**.
2. Pulsa **Run workflow** sobre `main`.
3. Marca `confirm_apply` solo cuando realmente quieras modificar la base remota y pulsa Run.
4. El workflow consulta primero los seis índices, ejecuta `migrations-008-indices.sql` y consulta de nuevo los seis nombres.
5. Revisa la salida: deben aparecer `idx_events_received`, `idx_events_video`, `idx_runs_at`, `idx_videos_channel`, `idx_videos_published` y `idx_videos_kind`.

El SQL usa `CREATE INDEX IF NOT EXISTS`, por lo que puede volver a ejecutarse sin duplicar índices existentes. No des por aplicada la migración hasta ver el paso final del workflow en verde y los seis índices en la consulta posterior.

## Qué sigue sin haberse hecho

A fecha de 2026-11-08 no hay evidencia en el repositorio de que la migración 008 ya se haya aplicado en la D1 remota. Tampoco se ha desplegado una nueva versión de los Workers desde estos cambios: antes de configurar los secretos, los workflows omiten la publicación deliberadamente.
