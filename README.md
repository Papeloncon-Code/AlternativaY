# TodoTube

> Estado del repositorio: 8 de noviembre de 2026. El cliente web y el servicio de avisos están implementados; el cliente Android y la sincronización multidispositivo siguen en planificación.

TodoTube es un cliente web de YouTube con un feed propio de canales seguidos, avisos WebSub/RSS y biblioteca local. El repositorio se llama **AlternativaY**.

## Estado real del producto

### Implementado en la web

- Feed de novedades de canales seguidos, con filtros y carga continua.
- Páginas de canal, vídeos y Shorts; búsqueda sobre las novedades disponibles.
- **Interfaz de reproducción propia obligatoria** para vídeos y Shorts: Shaka Player, controles de TodoTube y minirreproductor persistente.
- Historial, progreso, Me gusta, Ver más tarde, listas, grupos y filtros personales.
- Avisos WebSub/RSS, campanita por canal y Web Push.
- Exportación e importación de los datos locales.
- Página de privacidad y respaldo RSS para cuando D1 no responde.

La web está construida con React, Vite, TypeScript y Cloudflare Workers. La interfaz y buena parte de las preferencias viven en el navegador.

### Reproducción: nuestro reproductor, sin iframe de YouTube

El reproductor oficial incrustado **ya no es una alternativa automática**. Los vídeos normales, el minirreproductor y Shorts montan los componentes propios de TodoTube; el código del iframe oficial (`OfficialPlayer.tsx` y `player/embed.ts`) fue retirado del proyecto.

| Estado del navegador | Interfaz que muestra TodoTube | Capacidad real |
|---|---|---|
| **TodoTube Puente instalado y operativo** | Reproductor propio (Shaka + SABR/YouTube.js) | Puede solicitar datos y segmentos desde el navegador del usuario mediante el Puente |
| **Sin Puente** | La misma interfaz propia de TodoTube, con una pantalla para activar el Puente | La reproducción de YouTube no está disponible todavía; no se sustituye por el iframe oficial |

**No confundir los dos objetivos:** la interfaz ya no debe mostrar controles, marca ni iframe del reproductor de YouTube. Eso no significa que hayamos resuelto la obtención de vídeo sin Puente. El flujo actual de YouTube.js, BotGuard y segmentos sigue dependiendo del Puente para las solicitudes que el navegador no puede realizar directamente por CORS.

### Gateway y reproducción sin Puente

La PoC del [PR #2](https://github.com/Papeloncon-Code/AlternativaY/pull/2) comprueba transporte HTTP Range/streaming con archivos de prueba propios; no obtiene ni retransmite vídeos reales de YouTube y no está desplegada. El Gateway para contenido propio o con licencia no elimina por sí solo la dependencia de extracción de YouTube.

ADR-005 mantiene la extracción en el dispositivo. ADR-010 prohíbe trasladar al Worker la generación/falsificación de BotGuard/PoToken, la rotación de IP o la suplantación de clientes. Por tanto, no se presenta el Gateway como reproductor de YouTube listo hasta que exista una ruta autorizada, técnicamente demostrada y probada de extremo a extremo.

## Arquitectura desplegada en el repositorio

| Ruta | Responsabilidad |
|---|---|
| apps/web | Aplicación web, Worker HTTP/API, reproductor propio y pruebas Playwright |
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
- **Reproducción sin Puente:** la interfaz es propia, pero la ruta de extracción/reproducción de YouTube sin extensión todavía no está resuelta.
- **Gateway para YouTube:** no está integrado en producción. La PoC actual solo usa fixtures propios; no permite afirmar que el Gateway reproduzca YouTube.
- **Producción:** los cambios de código se despliegan a Cloudflare solo si están configurados los secretos del entorno `produccion`.
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

El workflow [CI/CD](.github/workflows/ci-cd.yml) valida el servicio de avisos, build, TypeScript y Playwright. En un push a main, solo intenta publicar si están configurados CLOUDFLARE_API_TOKEN y CLOUDFLARE_ACCOUNT_ID en el entorno GitHub `produccion`.

Los secretos y permisos se explican en el [runbook Cloudflare + GitHub Actions](docs/runbooks/cloudflare-github-actions.md). La migración D1 008 se ejecuta por separado, de forma manual y con un token D1 independiente.

## Decisiones que guían el producto

- [ADR-005](docs/adr/ADR-005-cliente-youtube-completo.md): la extracción de YouTube se ejecuta en el dispositivo, no en el servidor.
- [ADR-006](docs/adr/ADR-006-notificaciones-tiempo-real.md): avisos en tiempo real mediante WebSub/RSS.
- [ADR-008](docs/adr/ADR-008-nombre-y-equipo.md): nombre TodoTube y equipo inicial de una persona.
- [ADR-010](docs/adr/ADR-010-modos-de-reproduccion-y-gateway-first.md): reproductor propio obligatorio, sin iframe automático y límites de transporte.

## Historial reciente de integración

- [PR #4](https://github.com/Papeloncon-Code/AlternativaY/pull/4) — CI determinista para Playwright y smoke de producción separado (integrado).
- [PR #5](https://github.com/Papeloncon-Code/AlternativaY/pull/5) — correcciones del reproductor oficial anterior; este fallback fue retirado en la nueva implementación.
- [PR #6](https://github.com/Papeloncon-Code/AlternativaY/pull/6) — separación de tokens Cloudflare y runbook de D1 (integrado).
- [PR #2](https://github.com/Papeloncon-Code/AlternativaY/pull/2) — PoC de gateway multimedia con fixtures propios (abierto, en borrador; no desplegado).
- [Issue #3](https://github.com/Papeloncon-Code/AlternativaY/issues/3) — seguimiento de la reproducción sin instalación manual y Gateway-first.

## Investigación y especificaciones

La investigación y las especificaciones originales siguen disponibles en:

- [Catálogo y comparativa de alternativas](docs/research/01-catalogo.md) · [comparativa](docs/research/03-comparativa.md)
- [Investigación de usuarios](docs/research/04-usuarios.md)
- [Viabilidad legal y técnica](docs/research/05-legal-y-viabilidad.md)
- [Especificación de plataforma](specs/001-plataforma/spec.md) · [arquitectura](specs/001-plataforma/arquitectura.md) · [UX](specs/001-plataforma/ux.md)
- [Especificación MVP](specs/002-mvp/spec.md) · [tareas](specs/002-mvp/tasks.md)
- [Constitución del proyecto](specs/000-constitucion/constitucion.md)
