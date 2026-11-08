# Servicio de avisos WebSub/RSS

Servicio de backend que registra canales seguidos, recibe avisos WebSub y usa RSS como respaldo. Es la capa de datos de avisos de TodoTube, no el reproductor de vídeo.

- **Worker:** alternativay-websub — https://alternativay-websub.papelon.workers.dev
- **Base de datos:** D1 alternativay-websub
- **Configuración:** wrangler.toml
- **Esquema inicial:** schema.sql
- **Migraciones incrementales:** migrations-001 a migrations-008

## Desarrollo y pruebas

    npm ci
    npm test

Las pruebas son locales y no requieren credenciales Cloudflare.

## Permisos Cloudflare

Los workflows usan secretos del entorno GitHub produccion:

- **CLOUDFLARE_API_TOKEN:** despliegue de Workers existentes, con rol Workers Editor sobre todotube y alternativay-websub.
- **CLOUDFLARE_ACCOUNT_ID:** identificador de la cuenta Cloudflare.
- **CLOUDFLARE_D1_API_TOKEN:** permiso Account D1 Edit, reservado para ejecutar SQL remoto.

No reutilices el token de despliegue para operaciones D1. No guardes tokens en este repositorio.

Consulta el [runbook de Cloudflare y GitHub Actions](../../docs/runbooks/cloudflare-github-actions.md) para crear los tokens y configurar los secretos.

## Despliegue del Worker

El workflow CI/CD publica alternativay-websub únicamente en push a main, después de pasar las pruebas y si los secretos de Workers están configurados. Si faltan credenciales, el deploy se omite.

Para una operación local controlada, configura temporalmente CLOUDFLARE_API_TOKEN y CLOUDFLARE_ACCOUNT_ID en el entorno de tu terminal y ejecuta:

    npm ci
    npx wrangler deploy

## Base de datos D1

Las consultas SQL remotas requieren el token separado CLOUDFLARE_D1_API_TOKEN con permiso D1 Edit.

**No ejecutes schema.sql ni todas las migraciones a ciegas sobre una base existente.** Las migraciones 001–007 alteran tablas y columnas y deben aplicarse solo tras comprobar el esquema remoto actual.

La migración 008 añade índices con CREATE INDEX IF NOT EXISTS. Su workflow dedicado es manual:

1. GitHub → Actions → D1 · aplicar índices 008.
2. Selecciona main.
3. Marca confirm_apply y ejecútalo solo cuando hayas decidido modificar D1.
4. Revisa la consulta previa y la verificación posterior de los seis índices.

El procedimiento completo está en el [runbook](../../docs/runbooks/cloudflare-github-actions.md). La existencia del archivo SQL o del workflow no significa que la migración se haya aplicado.

## Añadir canales y operación

Añadir canales y gestionar avisos se hace desde TodoTube y sus endpoints protegidos con la clave de propietario. El Worker programa comprobaciones RSS/WebSub y conserva la información pública de los canales y vídeos.
