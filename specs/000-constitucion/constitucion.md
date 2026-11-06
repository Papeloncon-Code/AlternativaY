# Constitución del proyecto

Principios **no negociables**. Toda especificación, plan, tarea o PR que los contradiga se rechaza. Para cambiarlos hace falta un ADR (Architecture Decision Record) aprobado por el propietario del producto.

Versión 1.0 · 2026-11-06 · Basada en `docs/research/01–05`.

## I. Legalidad y sostenibilidad
1. **Nada de eludir controles.** No se implementan mecanismos para eludir DRM, autenticación, atestaciones anti-bots (PoToken/BotGuard), cifrado de firmas ni límites técnicos de ninguna plataforma. No se suplantan clientes oficiales.
2. **Cada fuente se integra por un canal autorizado:** API oficial, feed público diseñado para terceros, servidor del usuario o fichero del usuario. Cada conector documenta su base legal (ID `RL-xx`).
3. **Contenido de YouTube = reproductor oficial.** No se bloquean ni modifican anuncios, no hay segundo plano y no se descarga.
4. **Las marcas ajenas no forman parte de nuestro nombre ni de nuestro logotipo.**
5. **Distribuible en Google Play y F-Droid.** Si una funcionalidad impide publicar en Google Play, no entra en el producto principal.

## II. El usuario es dueño de sus datos
6. **Local-first.** La app es completamente usable sin cuenta y sin servidor. El servidor solo sincroniza y hace copias de seguridad.
7. **Exportación completa en formato abierto** (JSON documentado y OPML para feeds) desde el día 1.
8. **Sin telemetría por defecto.** Cualquier métrica es opt-in, agregada y está documentada.
9. **La IA es opt-in.** El procesamiento en el dispositivo es la opción preferente. Si algo se envía a un servidor, se avisa antes y por cada acción.

## III. Calidad de ingeniería
10. **Spec-first.** No se escribe código sin una especificación aprobada con criterios de aceptación.
11. **Contratos compartidos y lógica nativa.** Android y web comparten contratos (esquemas, protocolo de sincronización y SDK de conectores), no frameworks de UI.
12. **Módulos con fronteras explícitas.** Un módulo solo depende de las interfaces de otros, nunca de su implementación.
13. **Pruebas:** cada conector tiene tests de contrato con fixtures grabadas. La sincronización tiene tests de convergencia. Ningún PR baja la cobertura del núcleo.
14. **Accesibilidad AA** (WCAG 2.2) como criterio de aceptación de cada pantalla, no como una fase posterior.
15. **Presupuesto de rendimiento:**
    - Android: arranque en frío < 1,5 s en un dispositivo de gama media de referencia y APK base < 25 MB.
    - Web: LCP < 2,5 s en 4G.
    - Si se supera, la funcionalidad no se fusiona.

## IV. Producto
16. **No afirmamos superioridad sin medirla.** Las comparativas públicas solo citan funcionalidades implementadas y verificadas.
17. **Bus factor ≥ 2.** Ningún módulo crítico depende de una sola persona (lección de ViMusic y PipePipe).
18. **Simplicidad primero.** Si una funcionalidad de baja prioridad complica la interfaz principal, va a un modo o un ajuste avanzado.
