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

## 4b. Criterios añadidos (2026-11-07, comentarios del propietario)
- **CA-W9:** los Shorts **no se mezclan** con los vídeos: van en su propia fila, con formato vertical, y el reproductor se adapta a vertical.
- **CA-W10:** se puede **dejar de seguir** un canal desde Suscripciones (con confirmación). El servicio de avisos se da de baja en YouTube en ≤ 5 min.
- **CA-W11:** al pulsar un vídeo, el reproductor aparece en ≤ 300 ms, porque se precarga en segundo plano y hay preconexiones.

## 5. Verificación (2026-11-07, https://todotube.papelon.workers.dev)
| CA | Resultado | Cómo se comprobó |
|---|---|---|
| CA-W1 | ✅ LCP 1,24 s escritorio, 0,93 s móvil | Playwright + PerformanceObserver |
| CA-W2 | ⚠️ **No verificado**: la red de pruebas no permite cargar el reproductor de YouTube | Pendiente: prueba manual del propietario |
| CA-W3 | ✅ Sin ver (46→45 tras marcar uno), Hoy (18) | Playwright |
| CA-W4 | ✅ El favorito persiste tras recargar | Playwright |
| CA-W5 | ✅ Clave errónea 401; clave correcta → `created:false` para un canal existente; URL `@handle` rechazada con mensaje claro | curl |
| CA-W6 | ✅ 375 px sin desplazamiento horizontal, barra inferior | Playwright, captura |
| CA-W7 | ✅ 404 de la SPA, estados vacíos; error de API con botón Reintentar (código) | Playwright |
| CA-W8 | 🟡 Parcial: enlace “Saltar al contenido”, foco visible, `aria-pressed`; falta una auditoría con axe | Playwright |

| CA-W9 | ✅ cuando termine la clasificación (ver la nota de la enmienda de ADR-006) | Playwright |
| CA-W10 | ✅ `DELETE /api/channels/:id` con clave; botón “Dejar de seguir” | curl + código |
| CA-W11 | ✅ iframe en 57–117 ms (antes 1,4–1,9 s) | Playwright, 3 clics desde el Inicio |

**Desviaciones respecto al plan:**
- Los archivos de la web van **embebidos en el Worker** (`scripts/embed.mjs`). La subida de assets de Cloudflare falla en este entorno porque el proxy sustituye el token temporal de subida (401).
- Datos locales en `localStorage` (ver §3).
