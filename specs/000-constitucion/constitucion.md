# Constitución del proyecto

Principios **no negociables**. Toda especificación, plan, tarea o PR que los contradiga se rechaza. Para cambiarlos hace falta un ADR (Architecture Decision Record) aprobado por el propietario del producto.

Versión 3.0 · 2026-11-08 · Actualizada por ADR-011 (Media Gateway autorizado y retirada de Puente).

> Cambio respecto a la v2.0: la decisión de extraer streams de YouTube queda supersedida por ADR-011. TodoTube elimina Puente y sirve en su reproductor propio únicamente medios propios o autorizados.

## I. Límites legales y de sostenibilidad
1. **Nunca se elude DRM** (Widevine u otros) ni se accede a contenido de pago sin autorización.
2. **El Media Gateway no obtiene ni retransmite streams de YouTube.** No llama InnerTube para resolver medios, no procesa URLs googlevideo, no ejecuta BotGuard/PoToken en servidores ni falsifica clientes o IP.
3. **YouTube en la web:** TodoTube conserva metadatos públicos obtenidos por WebSub/RSS y otras lecturas públicas limitadas documentadas en ADR-006. Los elementos enlazan al origen; no hay reproducción interna ni extracción de segmentos.
4. **El Gateway solo sirve medios propios o licenciados para distribución.** Cada objeto declara owned o licensed; los objetos licenciados requieren una referencia interna de autorización.
5. **No existe proxy abierto.** El Gateway acepta IDs opacos del bucket R2 propio, nunca URLs arbitrarias, destinos enviados por el usuario o hosts externos.
6. **No se redistribuye contenido de terceros sin autorización.** El marcado de licencia no sustituye la comprobación efectiva de los derechos.
7. **No se almacenan credenciales de Google/YouTube en el servidor.**
8. **Las marcas ajenas no forman parte del nombre ni del logotipo de TodoTube.**
9. **Asesoría legal obligatoria antes de monetizar** o constituir la empresa.
10. Las demás fuentes (podcasts, PeerTube, Jellyfin, archivos locales) se integran solo por canales autorizados y documentan su base legal (RL-xx).

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
