# Source Provider Broker · arquitectura de reproducción

Estado: diseño aprobado como dirección técnica; adaptadores externos pendientes de evaluación y autorización.

## Problema que resuelve

No confundir el sistema que descubre un vídeo con el sistema que entrega sus bytes. Un extractor de metadatos no es automáticamente un proveedor de reproducción, y varios extractores que dependen de la misma plataforma no son dominios de fallo independientes.

TodoTube separa:
1. **Discovery adapters:** obtienen título, canal, miniatura, duración y disponibilidad de metadatos.
2. **Media source providers:** entregan un archivo o manifiesto HLS/DASH que el reproductor TodoTube puede consumir y cuya distribución está autorizada.
3. **Playback broker:** elige una fuente compatible, observa su salud y cambia de proveedor cuando hay un fallo recuperable.
4. **Player:** conserva interfaz y controles propios; no conoce ni implementa lógica específica de cada proveedor.

## Fuentes candidatas compatibles con un reproductor propio

| Provider | Qué entrega | Estado |
|---|---|---|
| R2 primary | Archivo propio/licenciado, Range | Implementado en Gateway |
| R2 replica | Copia idéntica del archivo, Range | Código de failover en PR #26; bucket por provisionar |
| Creator-origin | URL firmada o manifiesto HLS/DASH entregado por el titular | Adaptador pendiente |
| Cloudflare Stream | HLS/DASH para player externo; también VOD y Live Inputs | Candidato documentado; cuenta/configuración pendientes |
| Otras plataformas abiertas o CDN del titular | API o manifiesto de reproducción permitido por el proveedor y el titular | Evaluar servicio por servicio |

Cloudflare Stream documenta HLS/DASH para usar reproductores propios. Sus manifiestos son dinámicos y se deben consultar directamente, no cachear ni retransmitir desde un proxy genérico. Las URL firmadas y Allowed Origins sirven para restringir el acceso.

## Contrato de un proveedor

Cada adaptador futuro debe implementar un contrato equivalente a:

```ts
type PlaybackProtocol = 'file' | 'hls' | 'dash';

type PlaybackSource = {
  providerId: string;
  assetId: string;
  protocol: PlaybackProtocol;
  url: string;                 // URL HTTPS validada y de corta duración si es firmada
  mimeType: string;
  codecs?: string[];
  durationMs?: number;
  expiresAt?: string;
  assetFingerprint: string;    // Identidad del contenido, no solo el ID del vídeo
  timelineFingerprint?: string; // Necesario para continuidad de HLS/DASH/live
  authorizationRef: string;    // Referencia a derechos/permiso en el registro interno
};

interface MediaSourceProvider {
  readonly id: string;
  canServe(assetId: string): Promise<boolean>;
  resolve(assetId: string): Promise<PlaybackSource | null>;
  healthCheck(): Promise<{ ok: boolean; latencyMs: number }>;
}
```

Este es un contrato de diseño, no una API ya integrada. Ningún adaptador debe aceptar URLs arbitrarias introducidas por usuarios. El host, protocolo, identidad del asset, permiso y vencimiento del enlace se validan en servidor. Tokens y URLs firmadas no se escriben en logs.

## Selección y failover

1. El catálogo resuelve un asset canónico, no un videoId externo como si fuera una URL de stream.
2. El broker obtiene fuentes elegibles en orden de preferencia y valida autorización, fingerprint, protocolo y vencimiento.
3. Para la primera reproducción se prueban proveedores en paralelo con timeout corto; el primer origen compatible y sano gana.
4. Se considera fallo recuperable un timeout de conexión, respuesta 408/425/429/5xx o error de lectura de segmentos. No se oculta un 401/403 por falta de autorización: se registra como fallo de permiso y se excluye esa fuente.
5. Un circuito por provider + asset se abre tras fallos consecutivos y pasa a half-open después de un backoff. El estado debe residir en Durable Object/D1/KV, no solo en memoria de un Worker, para coordinar varios isolates.
6. Si un manifiesto o segmento HLS/DASH falla, se resuelve otra fuente compatible y se reanuda por currentTime/segment timeline.
7. Una fuente alternativa solo es apta para continuidad sin saltos cuando comparte assetFingerprint y timelineFingerprint/segment alignment. Si no, el player debe reanudar en el timestamp más cercano y comunicar buffering; no prometer continuidad invisible.
8. Para archivos idénticos, el Gateway puede reanudar por byte offset, pero exige mediaVersion común o ETag coincidente y tamaño idéntico.

## Independencia real

Piped declara que su backend usa NewPipeExtractor. Invidious es una implementación propia y Grayjay utiliza plugins. Estos proyectos prueban que hay arquitecturas distintas, pero no constituyen cuatro réplicas independientes del contenido de YouTube. Si los candidatos siguen consultando YouTube para el mismo asset, comparten el mismo proveedor último y pueden fallar por una modificación o restricción del origen.

NewPipeExtractor también declara soporte para varias plataformas (YouTube, PeerTube, Bandcamp, SoundCloud y media.ccc.de). Esa capacidad multi-sitio puede servir para descubrimiento/adaptadores de otras plataformas, previa revisión de términos y permisos de distribución; no crea derechos de redistribución ni garantiza que YouTube permita entregar sus segmentos a un player propio.

## Contenido de YouTube

Un ID de YouTube o sus metadatos no constituyen una fuente de medios. La reproducción con player propio requiere una fuente de entrega autorizada por YouTube y/o por el titular de derechos y compatible con ese reproductor. La documentación pública del API de YouTube no ofrece un endpoint general para que un tercero descargue los segmentos y los entregue desde su propia infraestructura. Los Términos de YouTube restringen el uso automatizado, la copia/transmisión no autorizada y la evasión de medidas de seguridad.

No se integrarán adaptadores que evadan controles anti-bot, tokens de integridad, límites geográficos, restricciones de IP o mecanismos de acceso. La arquitectura permite múltiples proveedores autorizados; no convierte los extractores no oficiales en proveedores contratados ni estables.

## Telemetría y SLO

Registrar por provider:
- resolución y latencia hasta primer byte;
- porcentaje de éxito, errores por código y timeout;
- cambios de origen por sesión;
- rebuffering, tiempo recuperado y errores terminales;
- porcentaje de assets con dos o más copias válidas.

No registrar tokens, cookies, URLs firmadas ni datos personales. Alertar si un asset público queda con una sola copia o si una fuente supera el umbral de errores.

## Fases

- **Fase A (PR #26):** R2 primario/réplica, GET/HEAD/Range y recuperación de stream truncado.
- **Fase B:** almacenamiento de estado de salud/circuit breaker y reconciliación de réplicas incompletas.
- **Fase C:** adaptador de URLs/manifiestos suministrados por titulares y/o Cloudflare Stream.
- **Fase D:** integración de otras plataformas abiertas con APIs y derechos de distribución confirmados.
- **Fase E:** pruebas de caos, medición de SLO y failover de extremo a extremo en staging y producción.

No declarar continuidad multi-proveedor hasta que existan al menos dos proveedores de entrega independientes y pruebas en los que el usuario mantenga su posición de reproducción.
