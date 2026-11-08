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
| Creator-origin / CDN del titular | URL firmada o manifiesto del mismo vídeo, con permiso documentado | Adaptador pendiente |

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

## Registro por vídeo y orden de recuperación

TodoTube no debe descubrir un vídeo diferente al intentar recuperar una reproducción. Cada ficha de vídeo necesita un registro canónico:
- `canonicalVideoId`: el identificador interno estable; puede conservar el YouTube video ID como referencia de metadatos.
- `contentFingerprint`: prueba de identidad de la misma copia/contenido; el título o thumbnail no bastan.
- `durationMs` y `timelineFingerprint`: impiden saltar a otra edición o a una línea temporal incompatible.
- `sources[]`: solamente endpoints/proveedores que entregan exactamente ese asset y cuyo uso está autorizado.
- `backupAssetId`: la copia de respaldo propia/licenciada guardada en R2/replica o en otro storage autorizado.
- `authorizationRef`: evidencia del permiso de almacenamiento y distribución.

Orden por vídeo:
1. Mantener la fuente activa.
2. Si hay error recuperable o el body deja de entregar bytes durante 2 segundos, probar otra fuente registrada del mismo asset.
3. Si ninguna fuente alternativa sirve, abrir `backupAssetId` en el Gateway y reanudar desde el timestamp/byte equivalente.
4. Si no existe fuente alternativa ni respaldo autorizado, reportar el error; jamás cambiar silenciosamente a otro vídeo.

El broker obtiene fuentes elegibles en orden de preferencia y valida autorización, fingerprint, protocolo y vencimiento. Para la primera selección puede probar candidates en paralelo con timeout corto.

Se considera fallo recuperable un timeout, error de red, 408/425/429/5xx o body estancado. No se oculta un 401/403 por falta de autorización: se registra como fallo de permiso y se excluye esa fuente.

Un circuito por provider + asset se abre tras fallos consecutivos y pasa a half-open después de un backoff. El estado debe residir en Durable Object/D1/KV, no solo en memoria de un Worker.

Una fuente alternativa solo es apta para continuidad cuando comparte assetFingerprint y timelineFingerprint/segment alignment. Para archivos idénticos, el Gateway reanuda por byte offset si coinciden mediaVersion (o ETag) y tamaño.

## Independencia real

Piped declara que su backend usa NewPipeExtractor. Invidious es una implementación propia y Grayjay utiliza plugins. Estos proyectos prueban que hay arquitecturas distintas, pero no constituyen cuatro réplicas independientes del contenido de YouTube. Si los candidatos siguen consultando YouTube para el mismo asset, comparten el mismo proveedor último y pueden fallar por una modificación o restricción del origen.

No se cuentan como redundancia los conectores que solo presentan otra interfaz sobre YouTube. La fuente final sigue siendo YouTube; un cambio en la entrega o en las reglas de acceso de YouTube puede afectar a todos esos conectores. Tampoco se consideran respaldo las búsquedas de otro vídeo con el mismo título.

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
- **Fase B:** registro de fuentes por vídeo, backupAssetId y circuit breaker persistente.
- **Fase C:** fallback de fuente alternativa a backupAssetId, con recuperación de posición y validación de identidad.
- **Fase D:** adaptadores de entrega autorizados (creator-origin/CDN o Cloudflare Stream) solo cuando distribuyen exactamente el mismo asset.
- **Fase E:** pruebas de caos, medición de SLO y failover de extremo a extremo en staging y producción.

No declarar continuidad multi-proveedor hasta que existan al menos dos proveedores de entrega independientes y pruebas en los que el usuario mantenga su posición de reproducción.
