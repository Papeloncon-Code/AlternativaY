# TodoTube · Auditoría de paridad funcional y visual con YouTube Web

- Estado: auditoría activa; no declarada pixel-perfect.
- Fecha: 2026-11-08.
- Seguimiento: https://github.com/Papeloncon-Code/AlternativaY/issues/9
- Principio: TodoTube conserva marca, identidad y controles propios. YouTube se representa mediante metadatos/enlaces; el Gateway reproduce archivos propios/licenciados, no segmentos YouTube.

## Criterio de verdad

La referencia de YouTube se usa para comparar arquitectura de información, densidad, jerarquía, espaciado, tamaños, iconografía, navegación y microinteracciones. No se copia la marca ni se prometen acciones que TodoTube no pueda ejecutar.

Estados:
- **En código:** existe en main; puede necesitar corrección visual o prueba.
- **CI:** tiene prueba automatizada; no equivale a aceptación visual.
- **Pendiente visual:** falta capturar referencia y TodoTube en idéntico viewport/estado y compararlos.
- **No disponible:** requiere fuente autorizada, cuenta o capacidad aún no disponible.

## 1. Navegación global

| Superficie / función | Estado actual | Pendiente |
|---|---|---|
| Barra superior: menú, logo, buscador, avisos, cuenta | En código; CI parcial | Geometría, anchuras, alineación, foco y overlays |
| Marca y logo | Marca TodoTube propia | Comparar tamaño, peso y alineación; no copiar el logo de YouTube |
| Buscador: Enter, sugerencias, recientes, flechas, Esc y borrar | En código; E2E | Capturar estados y paneles móvil/escritorio |
| Búsqueda por voz | No implementada | Evaluar valor y privacidad |
| Campana, contador y menú ⋮ | En código; E2E | Densidad, miniatura, texto y posicionamiento |
| Menú de cuenta: biblioteca, historial, medios, aspecto, Foco, atajos, ajustes, datos, privacidad | En código; E2E | Foco de teclado, cierre y responsive |
| Sidebar expandido/compacto | En código | Anchos, altura de filas, iconos, active state y scroll |
| Barra inferior móvil/safe area | En código | Viewports 360/390 px y notch |
| TodoTube Puente | Retirado | Cualquier aparición residual es bug |
| Botón Crear de YouTube | No aplica | TodoTube no es plataforma de subida |

## 2. Inicio / feed

| Función | Estado actual | Pendiente |
|---|---|---|
| Feed de novedades de canales seguidos | En código | Medir jerarquía y densidad |
| Cuadrícula adaptativa | En código; pruebas de columnas | Capturas 600, 1024, 1243, 1440 y 1920 px |
| Tarjeta: miniatura, duración, avatar, título, canal y metadatos | En código | Tamaño de miniatura, clamp, baseline y separación |
| Chips/filtros por grupo y canal | En código; E2E | Scroll, flechas, hover/active y navegación Atrás |
| Fila separada de Shorts | En código | Posición exacta tras filas completas |
| Scroll infinito, skeleton, empty y error | En código; pruebas | Carga repetida y recuperación de red |
| Vista previa animada al hover | No implementada | Requiere una fuente autorizada |
| Directo/espectadores | No implementado | No simular contadores |

## 3. Shorts

Los Shorts de YouTube **no se reproducen dentro de TodoTube**. La pantalla conserva una ficha externa vertical; no es un reproductor funcional.

| Función | Estado actual | Pendiente |
|---|---|---|
| Superficie vertical y metadatos del Short | En código | Miniatura estática adecuada y encuadre |
| Abrir origen | En código | Probar enlace y estados de miniatura |
| Me gusta local y Compartir | En código | Persistencia y feedback |
| Navegar anterior/siguiente | En código; E2E | Rueda, touch, teclado, límites y Atrás |
| Canal | En código si se conoce | Casos de canal desconocido |
| Pausa, silencio, bucle, scrub, velocidad | No disponibles | No renderizar controles simulados |

## 4. Watch

Los vídeos de YouTube se muestran como contenido externo. El área principal no reproduce el stream.

| Función | Estado actual | Pendiente |
|---|---|---|
| Título, canal, avatar y metadatos públicos | En código | Longitud, truncado, alineación y responsive |
| Superficie externa «Abrir origen» | En código | Mejorar presencia visual sin fingir reproducción |
| Acceso a Medios propios | En código | Navegación y retorno |
| Me gusta local, Compartir y Guardar | En código | E2E de persistencia y feedback |
| Descripción/enlaces | Parcial, depende de metadatos | Empty, texto largo y enlaces seguros |
| Recomendaciones / A continuación | En código | Densidad y miniaturas |
| Modo cine/fullscreen de ficha | En código | Geometría y teclado |
| Autoplay de siguiente vídeo | Retirado para YouTube externo | No se puede detectar el fin de reproducción |
| Barra de progreso/reanudar de YouTube | No disponible | No simular progreso |
| Capítulos, comentarios, subtítulos y ABR de YouTube | No disponibles | Solo con fuente autorizada |

## 5. Minirreproductor

El contenido externo no sigue reproduciéndose dentro de TodoTube. El minirreproductor es una tarjeta compacta de continuidad de navegación.

| Función | Estado actual | Pendiente |
|---|---|---|
| Superficie compacta al salir de Watch | En código | Tamaño, esquina, elevación y espaciado |
| Volver a la ficha | En código; E2E | Conservar ruta/lista |
| Abrir vídeo original | En código | Hit-area y accesibilidad |
| Cerrar | En código; E2E | Confirmar escritorio y móvil |
| Posición fixed | CSS corregido en commit 4ea2825 | Verificar CI y viewport real |
| Continuidad real del vídeo | No disponible para YouTube | No llamarlo reproducción persistente |

## 6. Canales y suscripciones

| Función | Estado actual | Pendiente |
|---|---|---|
| Cabecera, avatar, nombre, descripción y metadatos | En código | Proporciones, banner y espaciado |
| Tabs Inicio/Vídeos/Shorts | En código | Capturas por tab y estados vacíos |
| Buscar dentro del canal y ordenar | En código | Query, orden y URL |
| Seguir/dejar de seguir y campanita | En código | Sin clave, permisos y error de servidor |
| Formulario de suscripción | En código | Jerarquía; evitar aspecto de panel administrativo |
| Grupos de canales | En código | Editar/eliminar y consistencia de chips |
| Importar suscripciones desde cuenta YouTube | No implementado | Consentimiento y flujo autorizado pendientes |

## 7. Tú, biblioteca y listas

| Función | Estado actual | Pendiente |
|---|---|---|
| Historial, Ver más tarde, Me gusta | Datos locales | Empty/populated, fecha y acciones |
| Listas: crear, renombrar, ordenar y quitar elementos | En código | Interacción y responsive |
| Biblioteca R2 | UI implementada; Gateway no provisionado | Catálogo vacío, error, carga real y player |
| Importar/exportar JSON | En código; E2E | Compatibilidad y validación |
| Cuentas/sincronización multidispositivo | No implementado | Backlog; no aparentar sincronización |

## 8. Ajustes y privacidad

| Función | Estado actual | Pendiente |
|---|---|---|
| Tema claro/oscuro/sistema | En código; E2E | Contraste y persistencia |
| Web Push | En código | Permiso denegado/concedido/revocado |
| DeArrow | En código | Revisar atribución/licencia antes de monetizar |
| Modo Foco | En código; acceso desde menú de cuenta | Estados y persistencia tras recarga |
| Ocultar por palabras | En código | Coincidencias y deshacer |
| Clave de propietario | En código | Revisión de seguridad/almacenamiento |
| Privacidad | Página disponible | Contrastar texto con tráfico/almacenamiento real |

## 9. Comparación visual obligatoria

Para cada superficie capturar la misma ruta, datos y estado en ambas interfaces.

Viewports mínimos:
- Escritorio: 1440×900 y 1920×1080.
- Tablet: 1024×768.
- Móvil: 390×844 y 360×800.

Estados mínimos: normal, hover/focus, menú abierto, loading, empty, error, contenido largo, scroll, claro/oscuro, sidebar expandido/compacto, safe area/notch.

Registrar por pantalla: ancho/alto de regiones, alineación, gaps, paddings, tipografía, line-height, radios, colores, iconos, capas/z-index, scroll y microinteracciones. Guardar capturas de referencia y de TodoTube como artefactos de CI. Tolerancia objetivo inicial para geometría: 2 px; excepciones documentadas.

**Bloqueo actual:** aún no hay un conjunto completo de capturas comparables en el repositorio. Por tanto, no se declara paridad pixel-perfect.

## 10. Orden de trabajo

1. CI verde y revisión del minirreproductor.
2. Barra superior, cuenta, sidebar y navegación móvil.
3. Inicio y tarjetas.
4. Shorts como ficha externa.
5. Watch y minirreproductor.
6. Canales y Suscripciones.
7. Búsqueda.
8. Tú, listas y biblioteca.
9. Ajustes, privacidad, diálogos, toasts y accesibilidad.

Cada tanda exige capturas de referencia y TodoTube, diferencias anotadas, código, Playwright, build, responsive y actualización de esta especificación. No pasar a la siguiente por intuición ni cerrar una tarea por parecido superficial.
