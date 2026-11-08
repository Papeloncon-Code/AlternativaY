# Cloudflare + GitHub Actions: credenciales y migración D1 008

El entorno tiene dos Workers existentes, una D1 compartida y un tercer Worker de medios en preparación:

- Worker web: `todotube`
- Worker de avisos: `alternativay-websub`
- Media Gateway (nuevo): `todotube-media-gateway` — código integrado; requiere crear R2 y provisionar el Worker antes de desplegar.
- Base D1: `alternativay-websub`
- D1 ID: `676928c8-1061-40cc-9d67-9f7395c9c958`

Los workflows que realizan despliegues o cambios remotos declaran el entorno GitHub `produccion`. Si todavía no existe, créalo con ese nombre en **Settings → Environments**. Después configura los valores en **Settings → Environments → produccion → Environment secrets**. No los escribas en archivos del repositorio, commits, Issues, PRs ni chats.

## Identificador de cuenta y secretos necesarios

El Account ID no es una credencial. Se mantiene como configuración pública en ambos archivos Wrangler:

- `apps/web/wrangler.toml` → `account_id = "e48698b986db439c7b5509c37d219c9a"`
- `spikes/websub/wrangler.toml` → el mismo `account_id`

Por eso **no hace falta guardar `CLOUDFLARE_ACCOUNT_ID` en GitHub** ni pasarlo por entorno. Esto evita que un valor de cuenta mal copiado haga que Wrangler intente desplegar en una cuenta distinta.

| Secreto exacto | Uso | Permiso mínimo recomendado |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Despliega los Workers existentes | Workers **Editor** limitado a `todotube` y `alternativay-websub` |
| `CLOUDFLARE_D1_API_TOKEN` | Solo ejecuta la migración D1 008 manual | Account **D1 Edit** en la cuenta que contiene esa base |

Se separan los tokens deliberadamente. El token de despliegue no necesita permiso directo de escritura sobre D1: Cloudflare indica que desplegar un Worker con binding D1 requiere permiso Editor sobre el Worker; el permiso sobre el recurso ligado solo es necesario cuando se consulta o modifica D1 directamente. La migración sí consulta y escribe D1, por eso tiene su token específico. Véanse los documentos oficiales de [roles de Workers](https://developers.cloudflare.com/workers/authorization/workers/) y [permisos de API tokens](https://developers.cloudflare.com/fundamentals/api/reference/permissions/).

## Crear el token de despliegue

1. En el dashboard de Cloudflare, abre **Account API Tokens** → **Create Token** → **Custom**.
2. Para los dos Workers existentes, concede Workers Editor limitado a `todotube` y `alternativay-websub`.
3. Para el nuevo Worker, primero créalo desde Workers & Pages en el Dashboard (nombre `todotube-media-gateway`). Después amplía el alcance del token para incluir ese Worker con rol Editor. Un token limitado a los dos Workers antiguos no puede crear ni desplegar un tercero.
4. Alternativa: un token de despliegue con Workers Admin a nivel de producto puede crear Workers nuevos, pero tiene permisos mucho más amplios; no es la opción de mínimo privilegio.
5. Limita el recurso a la cuenta correcta.
6. No añadas permisos D1 ni Workers Routes Write: el despliegue usa workers.dev, y Cloudflare indica que un binding R2 no requiere permisos R2 adicionales para desplegar el Worker.
7. Copia el token una sola vez al secreto GitHub `CLOUDFLARE_API_TOKEN`.

Cloudflare documenta que un Worker existente requiere Editor y crear uno nuevo requiere Workers Admin a nivel de producto. Los bindings R2/D1/KV no necesitan permisos propios para desplegar el Worker; esos permisos solo aplican si el token también gestiona los recursos directamente.

## Crear el token específico de D1

1. En **Account API Tokens** → **Create Token** → **Custom**, crea un token distinto.
2. Selecciona **Account → D1 → Edit**. No basta con **D1 Read**: la migración ejecuta `CREATE INDEX`.
3. Limita el token a la cuenta que contiene la D1 `alternativay-websub`; no le des Workers Editor, DNS, Zone Routes ni permisos globales innecesarios.
4. Guarda el token en el secreto GitHub `CLOUDFLARE_D1_API_TOKEN`.

El permiso Cloudflare **D1 Edit** es el que otorga escritura en D1. El comando utilizado es `wrangler d1 execute` con `--remote`, `--file` y `--yes`; esos parámetros son los admitidos por la documentación oficial de Wrangler.

## Añadir los secretos a GitHub

En el repositorio `Papeloncon-Code/AlternativaY`:

1. Abre **Settings → Environments → produccion**.
2. En **Environment secrets**, crea `CLOUDFLARE_API_TOKEN` para el despliegue.
3. Crea `CLOUDFLARE_D1_API_TOKEN` solo si vas a ejecutar la migración manual.
4. No crees `CLOUDFLARE_ACCOUNT_ID`: Wrangler toma el Account ID de los archivos de configuración.
5. Añade los valores directamente desde el dashboard/gestor seguro. No los pegues en el código ni en una conversación.
6. No borres ni rotes el token anterior hasta haber validado el despliegue controlado. Si el token se expuso fuera del almacén seguro, revócalo y sustitúyelo inmediatamente.

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

## Diagnóstico del despliegue CI/CD

El workflow `.github/workflows/ci-cd.yml` lee los secretos del entorno `produccion` con estos nombres exactos:

- `secrets.CLOUDFLARE_API_TOKEN`
- `secrets.CLOUDFLARE_ACCOUNT_ID`

Los nombres alternativos no se reconocen automáticamente. Por ejemplo, si el mismo token está guardado como `MY_SECRET_TOKET_ALTER`, hay que crear también el secreto `CLOUDFLARE_API_TOKEN` con ese mismo valor. No hace falta generar otro token de Cloudflare por cambiar el nombre.

El job de despliegue solo corre cuando el evento es un `push` a `main`. Un `workflow_dispatch` ejecuta las pruebas, pero no satisface la condición de despliegue actual. Para validar credenciales y publicación hay que producir un commit en `main`, esperar a que pasen los jobs de pruebas y revisar estos pasos del job **Despliegue en Cloudflare y humo en producción**:

1. **Comprobar secretos** debe terminar correctamente.
2. **Servidor de avisos** debe ejecutarse y publicar `alternativay-websub`.
3. **Web** debe ejecutarse y publicar `todotube`.
4. **Pruebas de humo contra la web publicada** debe terminar correctamente.

Un job global en verde no demuestra por sí solo que hubo despliegue: comprueba que los pasos 2–4 no figuren como `skipped`. Este workflow no aplica migraciones D1; la migración 008 permanece como operación manual e independiente.


## Corrección de despliegue 2026-11-08

El job de despliegue comprobó que los secretos existían, pero Wrangler recibió el error Cloudflare `7003` al resolver `/accounts/<id>/workers/services/alternativay-websub`. Cloudflare asocia este error con un Account ID incorrecto. Se fijó el Account ID de la cuenta activa en ambos `wrangler.toml` y se retiró la dependencia del secreto `CLOUDFLARE_ACCOUNT_ID` en los workflows de despliegue y de migración. Los workflows ahora solo requieren el API Token correspondiente. El siguiente push a `main` debe volver a validar esta corrección; no se debe declarar el despliegue correcto hasta que ambos pasos `wrangler deploy` y el smoke test final terminen en verde.


## Media Gateway R2 · provisionamiento necesario

El código y el workflow del Gateway están en main, pero Cloudflare todavía no tiene creado el bucket R2 ni el Worker nuevo.

### 1. Crear el bucket R2

1. Cloudflare Dashboard → **R2 Object Storage** → **Create bucket**.
2. Nombre exacto: `todotube-media`.
3. No es público ni tiene dominio propio: el Worker accede por binding R2.
4. El bucket no debe alojar streams de YouTube; solo archivos que se puedan distribuir legalmente.

### 2. Crear el Worker

1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Worker**.
2. Nombre exacto: `todotube-media-gateway`.
3. Puedes dejar un Hello World inicial; el workflow manual lo sustituirá con el código del repositorio.
4. Una vez creado, limita el API Token de GitHub para que incluya este Worker con rol **Workers Editor**. Si no se hace, Wrangler no podrá publicar un Worker que aún no existe.
5. El archivo apps/media-gateway/wrangler.toml declara el binding MEDIA_BUCKET con bucket_name todotube-media.

### 3. Publicar

1. GitHub → Actions → **Deploy · Media Gateway** → **Run workflow** sobre main.
2. Espera a que el workflow termine.
3. Verifica en el Worker la ruta `/health`: debe responder JSON con ok=true.
4. Verifica `/v1/catalog`: debe devolver items vacío si aún no hay archivos públicos.

### 4. Configurar el secreto de carga

En Cloudflare → Workers & Pages → todotube-media-gateway → Settings → Variables and Secrets:

- Añade un **Secret** llamado `MEDIA_UPLOAD_TOKEN`.
- Usa un valor aleatorio de alta entropía generado en un gestor seguro.
- No lo guardes en GitHub, en código ni en el navegador. Se utiliza solo para llamadas administrativas PUT/DELETE.

### 5. Primera prueba real

Sube un archivo MP4/WebM propio, con licencia verificada, usando el endpoint administrativo documentado en specs/008-gateway-multimedia/plan.md. Después comprueba GET, HEAD, Range/206 y seek en Chrome y Firefox. No marques el Gateway como verificado en producción hasta completar esta prueba.

La cuenta actual tiene token de despliegue limitado a Workers existentes; por ello, el paso de crear el Worker en Dashboard y después incluirlo en el alcance del token es necesario para mantener mínimo privilegio.
