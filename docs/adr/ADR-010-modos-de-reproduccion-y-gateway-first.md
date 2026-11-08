# ADR-010 · Modos de reproducción, fallback y propuesta «Gateway-first»

- **Estado:** Aceptado en parte (2026-11-08). La parte «el servidor obtiene y retransmite los vídeos de YouTube» queda **rechazada**: no se construye.
- **Relacionado con:** ADR-005 (la extracción se hace en el dispositivo), ADR-009 (PoC del gateway con vídeos propios), revisión del PR #2 (2026-11-08), triage `docs/research/11` (PB-02).

## Contexto
El propietario pide que el gateway multimedia sea la ruta principal de la web y que TodoTube Puente quede como segunda opción. La revisión del PR #2 enumera bien los bloqueos del código: `PlayerHost` solo usa el reproductor propio con Puente, `innertube.ts`/`bridgeFetch.ts` y `BotguardService.ts` dependen del Puente, y Shaka necesita las semánticas SABR/UMP. También pide: «Si no es viable, reportarlo; no ocultar la contradicción».

## Qué haría falta para «Gateway-first» con vídeos de YouTube
Para que el servidor entregue un vídeo de YouTube, alguien tiene que pedirle a YouTube el vídeo y sus segmentos:

1. **Si lo pide el servidor** (InnerTube + BotGuard/PoToken + segmentos de googlevideo desde Cloudflare): YouTube responde a las IP de centros de datos con controles anti-bots («confirma que no eres un bot»). Pasarlos exige **generar o falsificar en el servidor la prueba anti-bots (BotGuard/PoToken)**, es decir, eludir una medida técnica de control de acceso de YouTube.
2. **Si lo pide el navegador y el servidor solo retransmite**: el navegador no puede hablar con youtube.com sin el Puente (CORS), y las direcciones de los segmentos van **ligadas a la IP que las pidió**. Usar la prueba anti-bots generada en el navegador del usuario para que las peticiones del servidor parezcan legítimas es la misma elusión, por otro camino.

## Decisión
- **No se construye** la obtención ni la retransmisión de vídeos de YouTube desde el servidor, en ninguna de las dos variantes: ambas dependen de eludir los controles anti-bots de YouTube. Tampoco se construyen rotación de IP ni suplantación de clientes. ADR-005 sigue vigente sin cambios.
- **Se mantiene** el gateway como lo que demostró ser: transporte con Range/206, CORS, streaming y cancelación **para contenido propio o con licencia** (PoC de ADR-009, 36 pruebas en verde). Sigue sin desplegarse.
- **Modo sin Puente y límites del embed oficial:** el fallback permanece en `youtube-nocookie.com`; se conservan sus controles y atribuciones. No se deben cubrir sus controles/atribuciones con capas transparentes. La configuración del embed puede habilitar `controls=1`, pero no convierte el iframe en un flujo HTML5 independiente ni permite retirar la marca de YouTube. El minirreproductor móvil conserva un viewport mínimo de 200 × 200 px.
- **Modos de reproducción (PB-02):**
  1. **Puente instalado** → reproductor propio, sin anuncios.
  2. **Sin Puente** → reproductor oficial (youtube-nocookie), como hoy. La propuesta de aviso o botón visible sigue pendiente de decisión del propietario.
- **Lo que de verdad acerca «sin instalar nada a mano»**: que instalar el Puente cueste un clic.
  - Firefox: `.xpi` firmado por Mozilla, a la espera de que el propietario active su verificación en dos pasos.
  - Chrome: ficha en la Chrome Web Store, que necesita la cuenta de desarrollador del propietario.

## Lo que sí se hace de la revisión
- CI: el trabajo `gateway` no usa `hashFiles()` en `jobs.<id>.if`; se ejecuta siempre y cada paso comprueba si existe el paquete. `desplegar` depende también de `gateway`.
- PR #2 conserva la PoC aislada; sus pruebas verifican streaming de fixtures propios, no reproducción de YouTube.
- La suite web Playwright usa fixtures locales deterministas en CI; el smoke de producción está separado de la suite de interacción.
- D1: `migrations-008-indices.sql` existe y sus índices son idempotentes, pero **no hay prueba de que se hayan aplicado en la D1 remota**. Se añadió `.github/workflows/d1-indexes.yml`, una acción manual con confirmación explícita; no corre durante el despliegue normal. La ejecución remota sigue pendiente y requiere credenciales Cloudflare.

## Consecuencias
- Sin Puente no hay reproductor propio. La web sigue funcionando con el reproductor oficial, y con datos públicos leídos del feed RSS/WebSub y el respaldo cuando D1 falla.
- Si en el futuro YouTube ofrece un acceso autorizado a sus vídeos, o el contenido es propio o con licencia, el gateway ya probado será la base. Se revisaría en un ADR nuevo.
