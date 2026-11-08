# ADR-010 · Interfaz de reproducción propia

- **Estado:** Supersedido en transporte por ADR-011 (2026-11-08); se conserva como registro de la decisión de interfaz.
- **Decisión vigente de transporte:** ADR-011.

## Decisión que permanece

1. La interfaz de reproducción pertenece a TodoTube.
2. TodoTube no inserta el iframe ni los controles/branding del reproductor oficial de YouTube dentro de su interfaz.
3. La reproducción de medios propios/licenciados usa el reproductor Shaka de TodoTube.

## Decisión sustituida

La versión anterior mantenía TodoTube Puente como transporte y mostraba un CTA para instalarlo. El propietario decidió retirar ese componente. El código, los paquetes, el instalador, el prompt y la ruta se han eliminado del producto web.

## Estado real

- Enlaces de YouTube: metadatos públicos y enlace al origen; no se reproducen dentro de TodoTube.
- Medios propios/licenciados: Shaka + Media Gateway R2.
- El Gateway no obtiene, descarga, transforma ni retransmite segmentos de YouTube.
- La sección /medios muestra el catálogo que entrega R2. Si R2/Gateway no está provisionado, informa que no está disponible; no finge tener contenido.

## Criterios de cierre operativo

- Provisionar bucket R2 todotube-media.
- Desplegar todotube-media-gateway.
- Configurar secret MEDIA_UPLOAD_TOKEN en Cloudflare Worker Settings.
- Subir un fixture propio con metadatos de titularidad.
- Verificar GET, HEAD, Range/206, seek y objetos privados desde Chrome y Firefox.
