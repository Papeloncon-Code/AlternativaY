# Grayjay: auditoría de arquitectura reutilizable para TodoTube

**Fecha:** 8 de noviembre de 2026  
**Fuente primaria:** repositorios públicos de FUTO en GitHub.  
**Alcance:** arquitectura de plugins, modelo de fuentes y estado del reproductor. No es una guía para replicar mecanismos privados de acceso a YouTube ni una auditoría completa del extractor del plugin.

## Hallazgo nuevo: el código del motor sí se pudo inspeccionar

Aunque GitHub no entregó el archivo de 4,08 MB `YoutubeScript.js`, sí fue posible recuperar y revisar código fuente del motor Grayjay que define el contrato que ese script debe implementar:

- `futo-org/Grayjay.Engine/Grayjay.Engine/Models/Video/VideoDescriptor.cs`
- `.../Models/Video/Sources/IVideoSource.cs`
- `.../Models/Video/Sources/IAudioSource.cs`
- `.../Models/Video/Sources/VideoSourceDescription.cs`
- `.../Models/Video/Sources/VideoUrlSource.cs`
- `.../Models/Video/Sources/UMPSource.cs`
- `.../ScriptDeps/source.js`
- `futo-org/Grayjay.Desktop/Grayjay.Desktop.Web/src/contexts/VideoProvider.tsx`

Esto permite auditar de forma verificable el diseño de la plataforma, aunque no el cuerpo completo del extractor oficial.

## 1. Modelo de fuentes: separar el vídeo lógico de sus representaciones

Grayjay no reduce la reproducción a una sola URL. Su modelo `VideoDescriptor` contiene una colección de fuentes de vídeo. Para medios no multiplexados usa `UnMuxedVideoDescriptor`, que separa `videoSources` y `audioSources`.

Las interfaces tipadas de fuentes describen atributos como:
- tipo de fuente;
- resolución, contenedor y códec;
- duración, prioridad e idioma;
- representación de vídeo o audio separada;
- variantes de entrega tipadas, como URL, HLS, DASH y fuentes locales.

La selección concreta de una fuente queda separada de los metadatos generales del vídeo. El motor resuelve los tipos polimórficos mediante un discriminador, en lugar de asumir que todas las fuentes tienen el mismo formato.

**Lección para TodoTube:** nuestro contrato de proveedor debe devolver una lista de representaciones tipadas, no un campo `url` único. El reproductor debe seleccionar una representación compatible con el navegador y conservar una identidad de asset común entre todas ellas.

## 2. Modelo de vídeo y audio separados

Grayjay contempla explícitamente el caso en que vídeo y audio llegan como fuentes distintas. La existencia de `UnMuxedVideoDescriptor` y de interfaces `IVideoSource` / `IAudioSource` demuestra que el reproductor no puede asumir siempre un archivo MP4 con audio y vídeo multiplexados.

**Lección para TodoTube:** distinguir:
- fuente multiplexada (audio + vídeo);
- fuente de vídeo sin audio;
- fuente de audio;
- manifiesto adaptativo HLS/DASH;
- archivo local de respaldo.

No implementar combinación de pistas ni soporte de protocolos hasta que exista una fuente autorizada y pruebas de compatibilidad del navegador.

## 3. El reproductor conserva el estado fuera del adaptador

En `Grayjay.Desktop.Web/src/contexts/VideoProvider.tsx`, el estado de reproducción incluye cola, índice actual, vídeo seleccionado, modo de visualización, volumen y `startTime`. Las acciones de abrir vídeo aceptan un tiempo de inicio; la carga por URL también recibe ese tiempo y gestiona cargas concurrentes para no aplicar resultados obsoletos.

**Lección para TodoTube:** el broker no debe ser dueño de la UI ni reiniciar el reproductor. Debe emitir un cambio de fuente para el mismo asset y el player debe conservar:
- `currentTime`;
- estado play/pause;
- volumen y mute;
- selección de subtítulos;
- velocidad;
- modo de pantalla;
- identidad del vídeo y sesión.

La conmutación debe ser una operación explícita y transaccional: capturar estado, resolver la fuente alternativa ya autorizada, comprobar identidad/timeline, cargarla, restaurar posición y reanudar solo si antes estaba reproduciéndose. Si la nueva fuente no se valida, volver a la fuente anterior o mostrar error; nunca abrir otro vídeo por coincidencia de título.

## 4. Aislamiento del runtime de plugins

`GrayjayPlugin.cs` ejecuta scripts en un runtime V8 aislado mediante ClearScript, inyecta dependencias y mantiene clientes HTTP y estado del plugin. Esto desacopla el código específico de una plataforma del modelo de dominio del reproductor.

**Lección para TodoTube:** si se incorporan adaptadores de proveedores autorizados, mantenerlos detrás de una interfaz neutral y aislarlos del player. No acoplar componentes React al formato de respuesta de un extractor concreto. Cada adaptador debe tener límites de tiempo, cancelación, telemetría y validación de salida.

## 5. Qué NO se debe copiar ni inferir

- Este análisis del motor no demuestra que Grayjay tenga varios orígenes independientes: su plugin de YouTube sigue dependiendo de YouTube.
- Las clases UMP y sus campos específicos no son un contrato genérico de TodoTube. No se adoptarán como mecanismo de acceso.
- No se implementarán ni documentarán procedimientos para eludir verificaciones anti-bot, tokens de integridad, controles de acceso o restricciones de YouTube.
- La licencia AGPL-3.0 del plugin requiere revisión antes de reutilizar o adaptar su código. Esta nota toma ideas de arquitectura y describe interfaces observadas; no copia implementación del plugin.
- El archivo oficial `YoutubeScript.js` sigue sin haberse leído íntegramente. No afirmar que se completó su auditoría línea por línea.

## 6. Contrato neutral propuesto para TodoTube

Este contrato es una propuesta propia de TodoTube inspirada en la separación de responsabilidades observada en Grayjay; no es código copiado:

```ts
type MediaKind = "muxed" | "video" | "audio";
type DeliveryProtocol = "file" | "hls" | "dash";

type MediaRepresentation = {
  representationId: string;
  kind: MediaKind;
  protocol: DeliveryProtocol;
  mimeType: string;
  codecs?: string[];
  width?: number;
  height?: number;
  bitrate?: number;
  language?: string;
  durationMs: number;
  assetFingerprint: string;
  timelineFingerprint: string;
  authorizationRef: string;
  expiresAt?: string;
  url: string;
};

type ResolvedMediaAsset = {
  canonicalVideoId: string;
  contentFingerprint: string;
  durationMs: number;
  representations: MediaRepresentation[];
};

interface AuthorizedMediaProvider {
  readonly providerId: string;
  resolve(canonicalVideoId: string): Promise<ResolvedMediaAsset | null>;
  healthCheck(): Promise<{ ok: boolean; latencyMs: number }>;
}
```

No añadir adaptadores hasta que se verifiquen autorización, protocolo, identidad y compatibilidad del reproductor.

## 7. Próximas tareas de ingeniería

1. Incorporar este contrato neutral en la especificación del broker, sin implementar extracción no autorizada.
2. Auditar el componente TodoTube OwnPlayer actual y diseñar la restauración transaccional de estado para un cambio entre fuentes autorizadas.
3. Añadir pruebas unitarias de cambio de fuente con el mismo asset: error de red, timeout, expiración de URL, fingerprint incompatible y restauración de `currentTime`.
4. Mantener separado el pipeline de backup: archivo maestro proporcionado por el titular o con autorización suficiente, carga reanudable, checksum y registro de derechos.
5. No declarar el objetivo completo hasta que haya pruebas end-to-end en staging y una fuente de respaldo independiente.

## Referencias primarias

- [Grayjay Engine: VideoDescriptor.cs](https://github.com/futo-org/Grayjay.Engine/blob/cae7f87bc998c98001193c9d4e7c1e8470775cc8/Grayjay.Engine/Models/Video/VideoDescriptor.cs)
- [Grayjay Engine: IVideoSource.cs](https://github.com/futo-org/Grayjay.Engine/blob/cae7f87bc998c98001193c9d4e7c1e8470775cc8/Grayjay.Engine/Models/Video/Sources/IVideoSource.cs)
- [Grayjay Engine: IAudioSource.cs](https://github.com/futo-org/Grayjay.Engine/blob/cae7f87bc998c98001193c9d4e7c1e8470775cc8/Grayjay.Engine/Models/Video/Sources/IAudioSource.cs)
- [Grayjay Engine: VideoUrlSource.cs](https://github.com/futo-org/Grayjay.Engine/blob/cae7f87bc998c98001193c9d4e7c1e8470775cc8/Grayjay.Engine/Models/Video/Sources/VideoUrlSource.cs)
- [Grayjay Engine: UMPSource.cs](https://github.com/futo-org/Grayjay.Engine/blob/cae7f87bc998c98001193c9d4e7c1e8470775cc8/Grayjay.Engine/Models/Video/Sources/UMPSource.cs)
- [Grayjay Engine: source.js](https://github.com/futo-org/Grayjay.Engine/blob/cae7f87bc998c98001193c9d4e7c1e8470775cc8/Grayjay.Engine/ScriptDeps/source.js)
- [Grayjay Desktop: VideoProvider.tsx](https://github.com/futo-org/Grayjay.Desktop/blob/b865bb00773710e155461e1412e215a27aa5d9dc/Grayjay.Desktop.Web/src/contexts/VideoProvider.tsx)
- [Grayjay Engine: GrayjayPlugin.cs](https://github.com/futo-org/Grayjay.Engine/blob/cae7f87bc998c98001193c9d4e7c1e8470775cc8/Grayjay.Engine/GrayjayPlugin.cs)
