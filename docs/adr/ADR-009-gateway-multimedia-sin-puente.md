# ADR-009 · Gateway multimedia web sin extensión

- **Estado:** Propuesto; autoriza únicamente una prueba de concepto aislada.
- **Fecha:** 2026-11-07
- **Relacionado con:** ADR-005, ADR-007, Spike T-100, `apps/web/src/player/TodoTubePlayer.ts`, `apps/web/src/player/ShakaPlayerAdapter.ts`, `apps/web/src/components/PlayerHost.tsx`.

## Contexto

La versión web actual necesita TodoTube Puente para utilizar el reproductor propio. La inspección del código confirma:

1. `PlayerHost.tsx` selecciona `OwnPlayer` solamente cuando `useBridge()` está disponible y la sesión no está en fallback. En caso contrario selecciona `OfficialPlayer`.
2. `TodoTubePlayer.available()` exige `checkExtension()` además de soporte del navegador para Shaka.
3. `ShakaPlayerAdapter.ts` ejecuta `fetch(uri, init)` desde el navegador para las solicitudes multimedia. En respuestas UMP procesa el cuerpo como stream y utiliza `SabrUmpProcessor`.
4. El Puente modifica cabeceras y reglas de red; no retransmite actualmente todos los segmentos multimedia a través de un servidor de TodoTube.

Por tanto, el reproductor propio y el transporte multimedia son responsabilidades distintas. Sustituir los controles visuales no elimina CORS ni la dependencia del Puente.

## Decisión propuesta

Construir una prueba de concepto de un **segundo Cloudflare Worker**, separado del Worker que sirve TodoTube Web. La PoC utilizará exclusivamente un origen multimedia de prueba controlado por el proyecto y archivos de vídeo de prueba propios.

La PoC debe demostrar si un Worker puede entregar contenido multimedia en streaming con las semánticas HTTP necesarias para Shaka: solicitudes GET/HEAD, Range, respuestas 206, cancelación, cabeceras CORS y flujo por chunks.

## Restricción obligatoria: ADR-005 sigue vigente

ADR-005 establece que la extracción de YouTube se ejecuta en el dispositivo del usuario y nunca en nuestros servidores. Este ADR-009 **no revoca ni modifica ADR-005**.

En esta fase queda prohibido:

- Enviar URLs de reproducción de YouTube/Googlevideo al Worker.
- Hacer que el Worker consulte InnerTube, YouTube.js, BotGuard o PoToken.
- Hacer que el Worker obtenga, descifre, transforme o retransmita segmentos reales de YouTube.
- Cambiar la versión de producción para que use el gateway.
- Desplegar el Worker o cambiar DNS/rutas de producción.

Para probar el transporte se usará un fixture local/propio. Una futura integración con streams de YouTube requerirá una decisión explícita del propietario que revise ADR-005, riesgos contractuales, seguridad, viabilidad técnica y costes. No asumir que un proxy de medios es compatible con ADR-005.

## Alternativas

| Alternativa | Ventaja | Coste o limitación |
|---|---|---|
| Puente MV3 actual | El navegador descarga directamente; no se paga ancho de banda de retransmisión | Requiere instalar extensión |
| Gateway Worker | No exige extensión al usuario; permite controlar CORS y Range desde un origen propio | Todo el tráfico retransmitido consume recursos/egress y añade un salto; compatibilidad con YouTube no demostrada |
| IFrame oficial | Sin extensión ni gateway | No ofrece la interfaz propia de la variante `full` |

## Consecuencias esperadas

- La interfaz web y el reproductor Shaka deben permanecer desacoplados del origen de los bytes.
- La PoC no puede cambiar el comportamiento de producción.
- Deben medirse latencia, streaming real, cancelación, consumo y límites de Cloudflare.
- La PoC no demuestra que YouTube acepte solicitudes desde Workers ni que SABR/BotGuard puedan trasladarse allí.

## Criterio para reconsiderar ADR-005

Solo abrir una nueva decisión si la PoC con fixtures pasa sus pruebas y existe un análisis separado que responda: qué datos se obtienen en el dispositivo, qué datos pasan por el gateway, desde qué IP se solicitan, qué tokens/cookies se usan, qué condiciones contractuales aplican, qué coste tiene y qué límites de Cloudflare afectan. Hasta entonces, ADR-005 permanece aceptado y prevalece.
