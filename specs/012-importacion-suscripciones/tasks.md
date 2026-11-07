# Importación de suscripciones: tareas

Ordenadas por dependencia. IDs globales (ver `specs/002-mvp/tasks.md` para las transversales).

- T-090 · [técnico] **Spike del lector automático** en un teléfono Android real (13, 14 y 15+; instalación por F-Droid y APK): ajustes restringidos, apertura de Suscripciones por intent, desplazamiento y lectura de nombres en es/en, tiempo con 40 canales → CA12.3, CA12.8
- T-024f · [android] Pantalla “¿Qué usas para ver vídeos?” + explicación previa + guía de activación del permiso → CA12.1, CA12.2, CA12.8 · depende de T-090
- T-024g · [android] `:feature:import-assistant` (flavor `full`): AccessibilityService filtrado a YouTube, desplazamiento, lectura por texto con diccionario de idiomas, modo seguro, autodesactivación → CA12.3, CA12.5–12.7
- T-024h · [android] Resolución nombre → canal con el extractor + pantalla de confirmación de ambiguos → CA12.4
- T-024i · [ci] Test: la build `play` no contiene el servicio de accesibilidad → CA12.9
- T-024j · [web] (fase 2) Extensión de navegador para importar desde youtube.com; autorización de Google para `play` y web → ADR-007
- T-060 · [contracts] Formato de exportación v1 + OPML → CA7.1, CA7.3
- T-061 · [android/web] Importadores de NewPipe, FreeTube y LibreTube a partir de ejemplos reales de sus exportaciones → CA7.2
- T-062 · [qa] Test de ida y vuelta (exportar → instalación limpia → importar → mismo estado) → CA7.3
