# TodoTube

> Estado del repositorio: 8 de noviembre de 2026. El cliente web y el servicio de avisos están implementados; el cliente Android y la sincronización multidispositivo siguen en planificación.

TodoTube es un cliente web de YouTube con un feed propio de canales seguidos, avisos WebSub/RSS, biblioteca local y dos modos de reproducción. El repositorio se llama **AlternativaY**.

## Estado real del producto

### Implementado en la web

- Feed de novedades de canales seguidos, con filtros y carga continua.
- Páginas de canal, vídeos y Shorts; búsqueda sobre las novedades disponibles.
- Reproductor de vídeo, minirreproductor persistente, modo cine, autoplay y navegación entre Shorts.
- Historial, progreso, Me gusta, Ver más tarde, listas, grupos y filtros personales.
- Avisos WebSub/RSS, campanita por canal y Web Push.
- Exportación e importación de los datos locales.
- Página de privacidad y respaldo RSS para cuando D1 no responde.

La web está construida con React, Vite, TypeScript y Cloudflare Workers. La interfaz y buena parte de las preferencias viven en el navegador.

### Dos modos de reproducción: no confundirlos

| Estado del navegador | Reproductor que usa TodoTube | Límite |
|---|---|---|
| **TodoTube Puente instalado** | Reproductor propio (Shaka + SABR/YouTube.js), con las solicitudes de extracción en el dispositivo | Depende de la extensión y de los mecanismos de compatibilidad del cliente |
| **Sin Puente** | Embed oficial de YouTube en youtube-nocookie.com | Conserva los controles y la atribución de YouTube; no es un flujo HTML5 independiente |

**Importante:** quitar el Puente no hace que el embed oficial se convierta en el reproductor propio. La web sin extensión sigue pudiendo reproducir vídeos mediante el iframe oficial, con su marca y controles.

La idea de un gateway multimedia como ruta principal para vídeos de YouTube no está implementada. La decisión actual de [ADR-010](docs/adr/ADR-010-modos-de-reproduccion-y-gateway-first.md) rechaza obtener o retransmitir medios de YouTube desde el servidor. La PoC del [PR #2](https://github.com/Papeloncon-Code/AlternativaY/pull/2) comprueba transporte HTTP Range/streaming con archivos de prueba propios; no demuestra reproducción real de YouTube, no está desplegada y permanece en borrador.

## Arquitectura desplegada en el repositorio

| Ruta | Responsabilidad |
|---|---|
| apps/web | Aplicación web, Worker HTTP/API, reproductores y pruebas Playwright |
| apps/bridge | Código fuente de TodoTube Puente para navegadores Chromium |
| spikes/websub | Worker de avisos WebSub/RSS, parser Atom, pruebas y esquema D1 |
| specs/ | Especificaciones, contratos y planificación |
| docs/adr/ | Decisiones de arquitectura |
| docs/research/ | Investigación técnica, de producto y riesgos |
| docs/runbooks/ | Procedimientos operativos, incluido Cloudflare/GitHub Actions |

### Límites que siguen pendientes

- **Android:** no hay todavía un cliente Android implementado en este repositorio; su arquitectura y alcance están documentados.
- **Cuentas y sincronización:** no hay cuentas de usuario ni sincronización de la biblioteca entre dispositivos. Historial, progreso, favoritos, listas y preferencias se guardan en localStorage del navegador.
- **Instalación del Puente con un clic:** todavía falta publicar la extensión en las tiendas y completar la firma/revisión de los canales correspondientes.
- **Gateway para YouTube:** no está integrado en producción. La vía de obtener/retransmitir YouTube desde un Worker está rechazada en ADR-010.
- **Producción:** los últimos cambios de código están en main, pero los despliegues de Cloudflare se omiten mientras no existan los secretos del entorno produccion.
- **D1 008:** la migración de índices existe y tiene un workflow manual, pero su aplicación en la base remota no está confirmada.

## Desarrollo y pruebas

Requisitos: Node.js 22 y npm.

    cd apps/web
    npm ci
    npm run build
    npm run preview

La vista previa utiliza la API publicada de TodoTube por defecto. No la uses para probar operaciones que cambien datos de producción.

Pruebas del servicio de avisos:

    cd spikes/websub
    npm ci
    npm test

En GitHub Actions, Playwright se ejecuta contra una API local determinista creada por apps/web/scripts/e2e-api.mjs; así las pruebas de interfaz no consumen la cuota de D1 ni dependen de los vídeos que publique un canal.

## CI/CD y Cloudflare

El workflow [CI/CD](.github/workflows/ci-cd.yml) valida el servicio de avisos, build, TypeScript y Playwright. En un push a main, solo intenta publicar si están configurados CLOUDFLARE_API_TOKEN y CLOUDFLARE_ACCOUNT_ID en el entorno GitHub produccion.

Los secretos y permisos se explican en el [runbook Cloudflare + GitHub Actions](docs/runbooks/cloudflare-github-actions.md). La migración D1 008 se ejecuta por separado, de forma manual y con un token D1 independiente.

## Decisiones que guían el producto

- [ADR-005](docs/adr/ADR-005-cliente-youtube-completo.md): la extracción de YouTube se ejecuta en el dispositivo, no en el servidor.
- [ADR-006](docs/adr/ADR-006-notificaciones-tiempo-real.md): avisos en tiempo real mediante WebSub/RSS.
- [ADR-008](docs/adr/ADR-008-nombre-y-equipo.md): nombre TodoTube y equipo inicial de una persona.
- [ADR-010](docs/adr/ADR-010-modos-de-reproduccion-y-gateway-first.md): modos de reproducción, fallback oficial y límites del gateway.

## Historial reciente de integración

- [PR #4](https://github.com/Papeloncon-Code/AlternativaY/pull/4) — CI determinista para Playwright y smoke de producción separado (integrado).
- [PR #5](https://github.com/Papeloncon-Code/AlternativaY/pull/5) — controles del embed oficial, navegación móvil de Shorts y viewport mínimo del minirreproductor (integrado).
- [PR #6](https://github.com/Papeloncon-Code/AlternativaY/pull/6) — separación de tokens Cloudflare y runbook de D1 (integrado).
- [PR #2](https://github.com/Papeloncon-Code/AlternativaY/pull/2) — PoC de gateway multimedia con fixtures propios (abierto, en borrador; no desplegado).
- [Issue #3](https://github.com/Papeloncon-Code/AlternativaY/issues/3) — seguimiento de la propuesta Gateway-first y sus decisiones.

## Investigación y especificaciones

La investigación y las especificaciones originales siguen disponibles en:

- [Catálogo y comparativa de alternativas](docs/research/01-catalogo.md) · [comparativa](docs/research/03-comparativa.md)
- [Investigación de usuarios](docs/research/04-usuarios.md)
- [Viabilidad legal y técnica](docs/research/05-legal-y-viabilidad.md)
- [Especificación de plataforma](specs/001-plataforma/spec.md) · [arquitectura](specs/001-plataforma/arquitectura.md) · [UX](specs/001-plataforma/ux.md)
- [Especificación MVP](specs/002-mvp/spec.md) · [tareas](specs/002-mvp/tasks.md)
- [Constitución del proyecto](specs/000-constitucion/constitucion.md)
