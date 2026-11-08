# Plan 017 · Paridad de interfaz y comportamiento

## Flujo de trabajo por pantalla

1. Elegir una superficie concreta del inventario y fijar su estado inicial.
2. Obtener referencia de YouTube y capturar TodoTube en el mismo viewport/DPR/tema.
3. Comparar estructura, posición, tamaño, tipografía, iconos, color, espacios y comportamiento.
4. Dividir diferencias en tareas pequeñas, cada una con resultado verificable.
5. Implementar con componentes compartidos, evitando overrides acumulativos.
6. Añadir pruebas funcionales y responsive; no depender únicamente de snapshots.
7. Ejecutar build, TypeScript y regresión de la superficie.
8. Guardar capturas y actualizar tasks/results/issue.
9. Desplegar solo con CI verde y verificar la URL publicada.
10. Pasar a la siguiente pantalla sin perder los defectos abiertos.

## Secuencia inicial

1. Navegación global y accesibilidad.
2. Inicio/feed y tarjetas.
3. Shorts desktop/mobile.
4. Watch y minirreproductor.
5. Búsqueda.
6. Canal.
7. Suscripciones y grupos.
8. Tú, Historial, Ver más tarde, Me gusta y listas.
9. Medios propios.
10. Ajustes, Privacidad y errores globales.

## Herramientas de verificación

- Playwright: viewports, geometría de elementos, aria, navegación, teclado, scroll y acciones.
- Capturas PNG: misma resolución/DPR/tema para comparación visual.
- GitHub Actions: build, TypeScript, suites unitarias y E2E.
- Producción: smoke test después del despliegue. Un commit en main no equivale a producción actualizada.

## Reglas de calidad

- No bajar timeouts o borrar asserts solo para hacer pasar un test.
- Un test debe comprobar el comportamiento real y no simular la implementación objetivo.
- Si un flujo no existe (p. ej. reproducción del stream YouTube dentro de TodoTube), el estado se comunica con claridad; no se construyen controles placebo.
- Registrar limitaciones, no esconderlas dentro de copy genérico.
