# Constitución del proyecto

Principios **no negociables**. Toda especificación, plan, tarea o PR que los contradiga se rechaza. Para cambiarlos hace falta un ADR (Architecture Decision Record) aprobado por el propietario del producto.

Versión 2.0 · 2026-11-06 · Basada en `docs/research/01–05` y en **ADR-005** (cliente de YouTube completo).

> Cambio respecto a la v1.0: el propietario decidió (ADR-005) que el producto sea un cliente de YouTube completo, que compita con NewPipe, PipePipe y Flow. La v1.0 excluía la extracción de YouTube; la v2.0 la permite, con los límites siguientes.

## I. Límites legales y de sostenibilidad
1. **Nunca se elude DRM** (Widevine u otros) ni se accede a contenido de pago sin pagarlo: películas, series de alquiler o contenido exclusivo de miembros o de Premium.
2. **La extracción de YouTube solo se ejecuta en el dispositivo del usuario.** Nuestros servidores solo usan mecanismos oficiales: WebSub y RSS público. Ningún servidor nuestro descarga ni reproduce streams de YouTube.
   - **Enmienda (2026-11-07, aprobada por el propietario):** el servidor puede leer además los **metadatos públicos de vista previa** de la página de cada canal seguido (`og:image` y `og:title`, los mismos que usan las apps de mensajería al compartir un enlace), **como máximo una vez al día por canal**, dejando de leer en cuanto los encuentra. Nada sobre vídeos ni sobre usuarios. Detalle: ADR-006, enmienda 3.
   - **Enmienda (2026-11-08):** en esa misma lectura diaria se toma también la **cabecera pública del canal** (banner, @usuario, suscriptores, número de vídeos, verificado, descripción y primer enlace), cortando al cerrarla. Sin peticiones nuevas y sin la API interna. Detalle: ADR-006, enmienda 4.
   - **Enmienda (2026-11-08, «sí a todo» del propietario):** también una vez al día la **pestaña pública «Vídeos»** del canal: los ~30 vídeos más recientes con su duración. Sin API interna. Detalle: ADR-006, enmienda 5.
   - **Enmienda (2026-11-08):** búsqueda en todo y cualquier canal **bajo demanda** con las páginas públicas de resultados y de canal. Sin API interna. Si YouTube pide comprobar que no somos un robot, se para: nunca se elude. La consulta solo pasa por el servidor, que la guarda unos minutos en memoria y sin registros. Detalle: ADR-006, enmienda 6.
3. **El módulo de YouTube está aislado** (`:connector:youtube`). Debe poder eliminarse con una opción de build sin romper nada más. La variante `play` no lo incluye.
4. **No se tocan las credenciales del usuario en el servidor.** Si existe login de YouTube, se guarda solo en el dispositivo (Keystore).
5. **No se redistribuye contenido.** Las descargas son para uso privado del usuario.
6. **Las marcas ajenas no forman parte de nuestro nombre ni de nuestro logotipo.**
7. **Asesoría legal obligatoria antes de monetizar** o de constituir la empresa (ADR-005).
8. Las demás fuentes (podcasts, PeerTube, Jellyfin, locales) se integran por canales autorizados y documentan su base legal (`RL-xx`).

## II. El usuario es dueño de sus datos
6. **Local-first.** La app es completamente usable sin cuenta y sin servidor. El servidor solo sincroniza y hace copias de seguridad.
7. **Exportación completa en formato abierto** (JSON documentado y OPML para feeds) desde el día 1.
8. **Sin telemetría por defecto.** Cualquier métrica es opt-in, agregada y está documentada.
9. **La IA es opt-in.** El procesamiento en el dispositivo es la opción preferente. Si algo se envía a un servidor, se avisa antes y por cada acción.
9b. **Las notificaciones no requieren cuenta.** El servidor no debe necesitar saber qué usuario sigue qué canal cuando el canal de push lo permita (topics, ADR-006).

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
