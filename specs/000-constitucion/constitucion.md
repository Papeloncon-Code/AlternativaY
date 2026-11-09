# Constitución del proyecto

Principios rectores del producto. Se pueden revisar mediante ADR aprobado por el propietario; ningún documento histórico ni limitación heredada puede bloquear el objetivo vigente.

Versión 4.0 · 2026-11-08 · Dirección de reproducción unificada definida por ADR-013.

## I. Objetivo, seguridad y sostenibilidad

1. **El objetivo del producto gobierna los medios técnicos.** Las ADR, especificaciones y elecciones de infraestructura son instrumentos revisables. No se convierten en límites inmutables por haber sido escritas antes.
2. **Reproductor propio:** TodoTube debe reproducir dentro de su interfaz con controles, historial y continuidad propios. El iframe oficial no es el player principal ni un fallback de interfaz.
3. **Redundancia por diseño:** playback usa un broker común con varios proveedores, clientes, métodos de resolución y transportes. Cada ruta tiene timeout, estado de salud y una alternativa ordenada.
4. **Failover transparente:** un cambio de ruta mantiene el vídeo correcto, timestamp, estado de reproducción, volumen y velocidad. No se simula éxito cuando solo se resolvió una URL.
5. **DRM y acceso de pago:** nunca se elude Widevine/DRM ni se accede a material de pago sin autorización.
6. **Aislamiento de infraestructura:** los streams de YouTube no atraviesan el Media Gateway ni Cloudflare Workers. El acceso ocurre en el runtime del dispositivo; R2 se reserva para medios propios/licenciados.
7. **Bridge acotado:** la extensión de navegador solo se ejecuta en TodoTube/localhost y limita solicitudes a hosts del proveedor expresamente declarados. No se implementa un proxy abierto.
8. **Sin redistribución no autorizada:** no se guardan ni sirven copias de terceros en nuestro R2 sin derechos que permitan almacenamiento y distribución.
9. **Sin secretos de usuario en servidor:** no se almacenan credenciales de Google/YouTube ni tokens de sesión/integridad en infraestructura de TodoTube.
10. **Riesgo externo documentado:** las reglas, licencias y condiciones de terceros se evalúan con fuentes actuales antes de distribución o monetización. Ese análisis no debe confundirse con una orden de abandonar el objetivo técnico.
11. Las demás fuentes (podcasts, PeerTube, Jellyfin, archivos locales y proveedores de creadores) se integran por adaptadores del broker y declaran su mecanismo de entrega.

## II. El usuario es dueño de sus datos

12. **Local-first.** La app es usable sin cuenta y sin servidor. El servidor solo sincroniza y hace copias de seguridad.
13. **Exportación completa en formato abierto** (JSON documentado y OPML para feeds) desde el día 1.
14. **Sin telemetría por defecto.** Cualquier métrica es opt-in, agregada y documentada.
15. **La IA es opt-in.** El procesamiento en el dispositivo es preferente. Si algo se envía a un servidor, se avisa antes y por cada acción.
16. **Las notificaciones no requieren cuenta** cuando el canal de push permita topics o suscripciones anónimas (ADR-006).

## III. Calidad de ingeniería

17. **Spec-first sin burocracia:** cada cambio material tiene criterios de aceptación y pruebas; la especificación evoluciona junto con el código y no retrasa una implementación viable.
18. **Contratos compartidos y lógica nativa.** Android y web comparten contratos (esquemas, protocolo y SDK de conectores), no frameworks de UI.
19. **Módulos con fronteras explícitas.** Un módulo depende de interfaces, no de implementaciones ajenas.
20. **Pruebas:** cada conector tiene tests de contrato; la sincronización tiene tests de convergencia. Ningún PR reduce cobertura sin justificación.
21. **Accesibilidad AA** (WCAG 2.2) como criterio de aceptación de cada pantalla.
22. **Presupuesto de rendimiento:**
    - Android: arranque en frío < 1,5 s en un dispositivo de gama media de referencia y APK base < 25 MB.
    - Web: LCP < 2,5 s en 4G.
    - El rendimiento de playback se mide con TTFF, rebuffering y tiempo de failover; los presupuestos se definen tras obtener línea base real.

## IV. Producto

23. **No afirmamos superioridad sin medirla.** Las comparativas públicas solo citan funcionalidades implementadas y verificadas.
24. **Bus factor ≥ 2.** Ningún módulo crítico depende de una sola persona.
25. **Simplicidad primero.** La redundancia se implementa detrás de una sola interfaz de reproductor; no se multiplican reproductores visibles ni arquitecturas paralelas.
