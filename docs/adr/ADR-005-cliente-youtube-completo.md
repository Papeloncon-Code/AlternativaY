# ADR-005 · Cliente de YouTube completo (opción A)

- **Estado:** Aceptado por el propietario del producto (2026-11-06)
- **Sustituye:** constitución v1.0, §I.1 y §I.3; doc 05 §3 (conclusión “sin extracción”)

## Contexto
- La versión 1.0 de la especificación excluía la extracción de YouTube. Lo hacía por la frase de la sección 10 del encargo: “No propongas mecanismos para evadir controles de acceso, DRM, autenticación o restricciones técnicas”.
- El propietario aclara que el objetivo es un **“YouTube Killer”**: el mejor cliente de YouTube posible, que compita directamente con NewPipe, PipePipe y Flow (sin anuncios, en segundo plano, con descargas, etc.) y que además tenga lo que ellos no tienen.

## Decisión
1. El producto incluye un **cliente de YouTube completo**:
   - extracción en el dispositivo (InnerTube) con NewPipeExtractor o equivalente;
   - reproducción con Media3, segundo plano, PiP, descargas y SponsorBlock;
   - sin anuncios.
2. **La extracción se ejecuta solo en el dispositivo del usuario**, nunca en nuestros servidores. El motivo es doble:
   - YouTube bloquea las IP de centros de datos (lección de Piped e Invidious);
   - un servidor que extrae concentra el riesgo legal en la empresa.
3. **Límites que se mantienen** (no negociables):
   - no se elude **DRM** (Widevine): películas y series de pago, contenido de pago sin haber pagado;
   - no se recogen credenciales de Google en nuestros servidores (el login, si llega a existir, es local);
   - no se redistribuye contenido descargado.
4. **Dos variantes de build:**
   - `full` (F-Droid, IzzyOnDroid, GitHub): con el módulo de YouTube;
   - `play` (Google Play): sin el módulo de extracción. YouTube solo por la vía oficial (RSS + reproductor incrustado).
5. **Notificaciones en tiempo real** de nuevos vídeos, estrenos y directos mediante **WebSub/PubSubHubbub**, el mecanismo oficial de YouTube (ver ADR-006).

## Consecuencias y riesgos aceptados
| Riesgo | Aceptado | Mitigación |
|---|---|---|
| Incumplimiento de los Términos de YouTube (descarga, acceso automatizado) | Sí | Igual que el resto del ecosistema; distribución fuera de Google Play; sin servidores que extraigan |
| Riesgo de elusión de medidas técnicas (PoToken; precedente OLG Hamburgo 5 U 54/23) | Sí, **con asesoría legal obligatoria** antes de monetizar | Usar librerías mantenidas por la comunidad (NewPipeExtractor) en lugar de desarrollar técnicas propias; jurisdicción de la empresa elegida con un abogado |
| Expulsión de Google Play | Sí para `full` | Variante `play` sin extracción |
| Monetizar un cliente así atrae acciones legales contra la empresa | **Alto** | Modelo de ingresos ligado a lo que es nuestro (sincronización, notificaciones, IA) y no a “YouTube sin anuncios”; revisión legal previa |
| Mantenimiento: YouTube rompe la extracción cada pocas semanas | Sí | Módulo de YouTube aislado; actualizaciones rápidas (ver la arquitectura, §12) |
| Licencia GPL-3.0 de NewPipeExtractor | Sí | Los clientes ya eran GPL-3.0 (ADR-004) |
