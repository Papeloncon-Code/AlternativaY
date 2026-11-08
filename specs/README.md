# Cómo trabajamos: SDD en TodoTube

Proceso basado en Spec-Driven Development. El código, las pruebas y las decisiones de arquitectura deben describir el mismo comportamiento.

## Estructura vigente

| Carpeta | Estado y función |
|---|---|
| 000-constitucion/ | Principios no negociables; v3.0, vigente |
| 001-plataforma/ | Visión y arquitectura objetivo a largo plazo; no describe todo lo desplegado |
| 002-mvp/ | Índice histórico de requisitos y tareas transversales |
| 003-spike-websub/ | Spike de WebSub; Worker desplegado, medición de latencia/cobertura pendiente |
| 004-web-v0/ | Historial de la primera web desplegada; la reproducción fue sustituida por ADR-011 |
| 005-diseno/ | Sistema de diseño y decisión visual |
| 006-spike-reproductor-propio/ | Investigación histórica de la ruta con Puente; supersedida en transporte |
| 007-paridad-funcional/ | Auditoría activa de paridad funcional/visual por pantalla; issue #9 |
| 008-gateway-multimedia/ | Gateway R2 y player HTML5 para archivos propios/licenciados; especificación activa |
| 010…016/ | Backlog futuro de YouTube, avisos, importación, biblioteca, sync, fuentes y PWA |
| _plantillas/ | Plantillas de nuevas funcionalidades |

## Orden de autoridad

1. Constitución vigente.
2. ADR aceptadas más recientes.
3. Especificación funcional activa.
4. Plan y tareas.
5. Código y pruebas.
6. Informes históricos.

Una ADR supersedida se conserva como historial, no como instrucción. A fecha 2026-11-08, ADR-011 gobierna el transporte y reemplaza las partes contradictorias de ADR-005/010.

## Pasos SDD

1. Especificar qué y por qué con criterios medibles.
2. Resolver dudas que cambien el diseño antes de implementar.
3. Planificar cómo, enlazando arquitectura y ADR.
4. Crear tareas trazables a criterios de aceptación.
5. Ejecutar python3 tools/spec-check.py.
6. Implementar cada criterio con pruebas automáticas.
7. Registrar evidencia real; un test omitido no cuenta como aprobado.
8. Para dependencias externas (Cloudflare/R2, DNS, navegadores reales), registrar el provisionamiento y una prueba de integración operativa.

## Reglas

- Un PR que cambia comportamiento actualiza la especificación correspondiente.
- No declarar una característica desplegada por tener código o tests unitarios.
- Los estados válidos de trabajo son: Backlog, En construcción, Parcial, Implementado en código, Desplegado, Verificado en producción, Supersedido y Bloqueado.
- Una PoC con fixtures no demuestra compatibilidad con un proveedor externo real.
- Cualquier cambio de rumbo crea/actualiza una ADR y corrige todas las referencias contradictorias.
