# TodoTube Web v0.1: primera versión visible

Estado: **En construcción** · 2026-11-07 · Decisión del propietario: empezar por la web para ver el producto; Android después.
Requisitos que cubre (parcialmente): RF-002, RF-003 (web), RF-006, RF-007, RF-012, RF-035 (lado de datos). Restricciones: constitución §I.2, porque la web no extrae YouTube.

## 1. Objetivo
Una web real, publicada en Cloudflare, donde se pueda:
- ver las **novedades de los canales seguidos**, con datos reales del servicio de avisos (WebSub + RSS);
- reproducir un vídeo;
- guardar favoritos;
- tener historial y “seguir viendo”;
- gestionar los canales seguidos.

## 2. Alcance
| Entra | Fuera (siguientes versiones) |
|---|---|
| Inicio: “Seguir viendo” + Novedades con filtros (Todo · Sin ver · Hoy · por canal) | Búsqueda en YouTube (la web no extrae: requiere API oficial o la app Android) |
| Reproductor con el **reproductor oficial de YouTube** incrustado (constitución §I.2: la web no extrae) | Segundo plano y descargas en la web |
| Progreso y reanudación (IFrame Player API), marcar como visto | Cuentas y sincronización |
| Suscripciones: lista con estado del aviso (activo, pendiente, inválido) y añadir canal por URL `/channel/UC…` o ID | Importación automática (ADR-007, Android y extensión) |
| Biblioteca: Favoritos e Historial (en el navegador) | Web Push (avisos en el navegador) |
| Diseño responsive: barra inferior en móvil, barra lateral en escritorio; tema oscuro por defecto y claro | Podcasts, PeerTube, IA |

## 3. Arquitectura v0.1
- **Worker `todotube`** (Cloudflare, plan gratis):
  - sirve la web estática (React + Vite + TypeScript, ADR-002);
  - expone una API mínima sobre la **misma D1** del servicio de avisos:
    - `GET /api/feed?limit=` → vídeos con canal, ordenados por fecha de publicación;
    - `GET /api/channels` → canales con su estado;
    - `POST /api/channels` → alta de un canal (lo procesa el cron del servicio de avisos). Protegido con la cabecera `X-Owner-Key` (secreto del Worker), porque v0.1 no tiene cuentas.
- **Datos locales** (favoritos, historial, progreso) en `localStorage`. Es una desviación consciente de la especificación, que pide SQLite-WASM: en v0.1 basta y se migrará cuando llegue la sincronización.
- **Miniaturas:** URL pública `i.ytimg.com/vi/<id>/hqdefault.jpg`.

## 4. Criterios de aceptación
- **CA-W1:** la URL pública carga el Inicio con vídeos reales en < 2,5 s (LCP) en escritorio.
- **CA-W2:** al pulsar un vídeo se abre el reproductor y empieza a reproducirse. Al volver al Inicio aparece en “Seguir viendo” con su barra de progreso.
- **CA-W3:** los filtros Sin ver, Hoy y por canal funcionan sin recargar la página.
- **CA-W4:** favoritos e historial persisten al recargar.
- **CA-W5:** añadir un canal con la URL `/channel/UC…` lo crea como pendiente. Con una clave errónea se rechaza (401).
- **CA-W6:** usable a 375 px de ancho sin desplazamiento horizontal; navegación inferior en móvil.
- **CA-W7:** estados vacíos y de error en todas las pantallas (sin canales, API caída, vídeo no disponible).
- **CA-W8:** navegación con teclado y textos alternativos en miniaturas (base de accesibilidad AA).
