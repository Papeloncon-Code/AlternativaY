# ADR-011 · Media Gateway R2 y retirada de TodoTube Puente

- **Estado:** SUPERSEDIDO por ADR-013 (2026-11-08). Se conserva como antecedente histórico y ya no gobierna la reproducción de YouTube.
- **Ámbito que permanece vigente:** Media Gateway R2 para archivos propios/licenciados y prohibición de proxy abierto o redistribución no autorizada.
- **Documento rector actual:** [ADR-013 · Reproducción propia de YouTube con cadena redundante de proveedores](ADR-013-reproduccion-propia-redundante.md).

## Qué queda sustituido

Las decisiones 1, 2, 7 y 8 de esta ADR que retiraban el Bridge, impedían toda reproducción interna de YouTube y excluían el runtime client-side dejan de ser instrucciones vigentes. El propietario del producto ha autorizado implementar el objetivo de reproducción propia y redundante definido en ADR-013.

## Qué permanece vigente

- El Media Gateway sirve únicamente medios propios/licenciados que puedan almacenarse y distribuirse.
- El Gateway usa IDs opacos y objetos R2; no acepta destinos arbitrarios ni funciona como proxy abierto.
- R2 no retransmite ni almacena streams de YouTube por defecto.
- La carga/borrado de objetos se protege con credenciales de administración.
- No se elude DRM ni se distribuye contenido de terceros sin derechos.
- Las credenciales de usuarios no se guardan en infraestructura de TodoTube.

## Registro histórico

La ADR original respondió a una decisión de producto anterior que limitó TodoTube a metadatos de YouTube y archivos propios. La investigación posterior demostró una arquitectura web client-side de referencia con Shaka, googlevideo/SABR, youtubei.js y un bridge de navegador (Kira). El propietario sustituyó la decisión anterior para orientar el producto hacia un reproductor propio. Ver ADR-013 y PR #37.

No copiar esta ADR histórica como base de nuevas tareas de reproducción.
