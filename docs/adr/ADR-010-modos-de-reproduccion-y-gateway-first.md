# ADR-010 · Interfaz de reproducción propia

- **Estado:** Supersedido en transporte por ADR-011 (2026-11-08); se conserva como registro histórico.
- **Decisión vigente de transporte:** ADR-011.

## Decisión que permanece

1. La interfaz de reproducción pertenece a TodoTube.
2. No se inserta el iframe ni los controles/branding del reproductor oficial de YouTube dentro de la interfaz.
3. Los archivos propios/licenciados se reproducen con el elemento nativo HTML5 `video` y controles propios de TodoTube.
4. El transporte de dichos archivos es el Media Gateway R2.

## Decisión sustituida

La versión anterior mantenía TodoTube Puente como transporte. El propietario decidió retirarlo. La extensión, sus paquetes, el instalador, el prompt y la ruta se han eliminado del producto web.

## Estado real

- YouTube: metadatos y enlace al origen; no hay reproducción interna ni extracción de segmentos.
- Medios propios/licenciados: HTML5 `video` + controles propios + Media Gateway R2.
- Formatos actuales: MP4, WebM y Ogg progresivos. No se declara DASH/HLS ni ABR.
- /medios muestra el catálogo R2; si el Gateway no responde, informa de su indisponibilidad.

## Criterios de cierre operativo

- Provisionar bucket R2 todotube-media.
- Desplegar todotube-media-gateway.
- Configurar secret MEDIA_UPLOAD_TOKEN en Cloudflare.
- Subir archivo autorizado con referencia de titularidad.
- Verificar GET, HEAD, Range/206, seek y privacidad en Chrome y Firefox.
