# ADR-005 · Cliente de YouTube completo (dirección histórica)

- **Estado:** HISTÓRICA; sus ideas de cliente completo han sido retomadas y ampliadas por ADR-013. No es la fuente de verdad vigente.
- **Sustituida originalmente por:** ADR-011.
- **Dirección actual:** ADR-013 · Reproducción propia de YouTube con cadena redundante de proveedores.

## Antecedente

Esta ADR registró la primera intención de TodoTube de competir con clientes como NewPipe, PipePipe y Flow con reproducción local, segundo plano, PiP, descargas y otras funciones. Su implementación se orientaba a Android y mencionaba NewPipeExtractor.

## Qué se conserva como intención

- El cliente debe ser útil para consumir vídeos dentro de TodoTube.
- La extracción/resolución de medios se ejecuta en el dispositivo, no en nuestro Media Gateway.
- La UI y el estado de reproducción son de TodoTube.
- No se elude DRM/Widevine, no se accede a contenido de pago sin autorización y no se redistribuye contenido de terceros.

## Qué ha cambiado

- La referencia actual de Flow abandonó NewPipeExtractor en v3.0.0 y utiliza su propio cliente InnerTube.
- La arquitectura web usa Shaka, googlevideo/SABR, youtubei.js, Onesie y TodoTube Bridge; ver ADR-013.
- La estrategia de redundancia usa una cadena de clientes y transportes, no un único NewPipeExtractor.
- La selección de fuentes, el failover y la continuidad son responsabilidades de un broker común.
- La arquitectura de builds Android full/play descrita aquí ya no define por sí sola las plataformas actuales.

## Consecuencia

No crear tareas nuevas tomando este ADR de manera aislada. Consultar ADR-013 y las especificaciones 009/010, que son la referencia vigente.
