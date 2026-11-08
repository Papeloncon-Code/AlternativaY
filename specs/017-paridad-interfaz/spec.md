# Especificación 017 · Paridad funcional y visual con YouTube

- **Estado:** En construcción.
- **Fecha:** 2026-11-08.
- **Issue:** #9.
- **Relacionados:** ADR-011, spec 008, specs 004–007.

## Objetivo

Consolidar TodoTube como una aplicación web de vídeo cuya arquitectura de información, densidad visual, navegación, jerarquía de contenido, estados e interacciones sean familiares para usuarios de YouTube. La implementación se audita pantalla por pantalla, menú por menú y función por función.

La paridad visual requiere comparaciones con referencias reales del mismo viewport. No se declara “pixel perfect” por intuición ni por pasar una compilación.

## Límites de producto no negociables

1. La interfaz, marca y componentes son propios de TodoTube.
2. YouTube se muestra como metadatos y enlace al origen; no se extraen ni retransmiten sus segmentos desde TodoTube.
3. El reproductor propio reproduce contenido propio/licenciado a través del Media Gateway R2 (spec 008).
4. No se muestran controles falsos de play/pause/mute/seek para un stream que no está cargado.
5. Ningún botón, ruta, atajo o ajuste se presenta como operativo sin una implementación y una prueba.
6. No se reintroduce TodoTube Puente, el iframe oficial o un fallback silencioso.
7. Los datos del usuario y las limitaciones del catálogo deben describirse con precisión.

## Inventario de pantallas y módulos

### Navegación global
- Barra superior: menú, logo, buscador y autocompletado, avisos, menú de cuenta.
- Sidebar completo/colapsado.
- Bottom navigation móvil y áreas seguras.
- Menús, popovers, diálogos, estados de foco y navegación por teclado.

### Descubrimiento
- Inicio/feed: grid, chips, filtros, densidad de tarjetas, Shorts shelf, scroll infinito.
- Shorts: layout vertical, metadata, acciones, scroll/touch/keyboard y estado de origen externo.
- Búsqueda: sugerencias, recientes, resultados, filtros y estados vacíos/error.
- Suscripciones: alta, lista, grupos y notificaciones.
- Canal: cabecera, pestañas Inicio/Vídeos/Shorts, grid y búsqueda de canal.

### Consumo y biblioteca
- Watch: proporción del reproductor, metadatos, acciones, descripción y recomendaciones.
- Minirreproductor: geometría, posición, retorno a la ficha, origen y cierre.
- Tú: Historial, Ver más tarde, Me gusta, listas.
- Medios propios: catálogo R2, permisos, error Gateway, ficha y reproducción.
- Listas: creación, edición, orden, estado vacío y navegación.

### Preferencias y sistema
- Ajustes: tema, notificaciones, personalización del feed, filtros de palabras, datos, clave de propietario.
- Privacidad y explicación de datos.
- 404, offline, error API, skeletons, empty states, toasts y permisos.
- Accesibilidad: etiquetas, foco, teclado, contraste y reduced motion.

## Método de comparación

Cada pantalla tiene:
- referencia externa capturada por el propietario o desde una sesión de navegador autorizada;
- captura TodoTube en el mismo viewport y estado;
- viewport, escala DPR y tema registrados;
- bounding boxes de elementos principales;
- checklist funcional de cada control;
- diferencias visuales y de comportamiento;
- evidencia de Playwright y resultado manual cuando corresponda.

Viewports base:
- Desktop: 1920×1080, 1366×768, 1280×720.
- Tablet: 1024×768 y 768×1024.
- Mobile: 390×844 y 360×800.

Criterios visuales iniciales:
- contenedores y alineaciones principales: desviación objetivo ≤ 2 CSS px;
- altura/ancho de header, sidebar y navegación móvil: ≤ 2 CSS px;
- espaciados y gaps de componentes: ≤ 2 CSS px;
- tipografía: familia, peso, tamaño, altura de línea y truncado coincidentes con la referencia definida;
- grids: mismo número de columnas y misma anchura/gap para el mismo viewport;
- estados, iconos y acciones comparados por captura y por interacción.

Las diferencias que dependan del contenido, anuncios, personalización o funciones propietarias de YouTube se registran como diferencias justificadas; no se falsean ni se copian servicios que TodoTube no tiene.

## Criterios funcionales

- Cada navegación tiene destino válido.
- Cada botón o control modifica el estado esperado y produce feedback.
- El teclado no secuestra teclas mientras se escribe en input, textarea, select o elemento editable.
- El scroll táctil y con rueda actúa sobre el área correcta.
- Menús y diálogos cierran con Escape y fuera de contexto cuando corresponda.
- No hay desbordamiento horizontal involuntario en ningún viewport base.
- Bottom navigation, safe areas, popovers y miniplayer no se solapan.
- Estados loading, empty, error, disabled y success están cubiertos.
- El contenido externo siempre ofrece un enlace de origen claro y no promete reproducción interna.

## Criterios de cierre global

No cerrar la especificación hasta:
- completar todas las superficies del inventario;
- tener referencias visuales comparables por viewport;
- pasar TypeScript/build y todas las pruebas de regresión;
- completar smoke tests tras despliegue;
- actualizar resultados con commits, pruebas, diferencias pendientes y decisiones de diseño.

El cierre de una pantalla no implica el cierre del producto completo.
