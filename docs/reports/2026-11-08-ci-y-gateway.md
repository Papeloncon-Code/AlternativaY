# Informe de correcciones de CI y estado del gateway — 2026-11-08

## Diagnóstico del fallo anterior

La ejecución `42502889229` no falló en la compilación ni en TypeScript. Ambos pasos terminaron correctamente. Falló el conjunto Playwright: 48 casos fallidos y 17 aprobados. En el log, la primera causa repetida fue `TypeError: feed is not iterable` en `apps/web/e2e/canal.spec.ts`, después de leer `/api/feed?limit=1000`. La web recibía una respuesta de error en vez del contrato `{ items: [...] }`; al no llegar datos, las pruebas posteriores tampoco encontraban tarjetas o Shorts.

Esto era un problema de dependencia ambiental: la suite usaba datos de la API/D1 publicada, cuyo límite diario de lecturas se había agotado. No era evidencia de 48 defectos independientes de interfaz.

## Cambios que aporta esta rama

- Añade `scripts/e2e-api.mjs`: API local con datos sintéticos repetibles para feed, canales, descripciones y clave pública de avisos.
- Permite configurar `E2E_API_TARGET` en Vite Preview; el destino predeterminado sigue siendo la API real de producción.
- Ejecuta Playwright contra la API local determinista en CI, sin consumir D1 ni depender del contenido cambiante de YouTube.
- Separa el smoke de producción: comprueba que la portada sirve HTML y que `/api/feed?limit=1` devuelve HTTP correcto y un array `items`.
- El workflow informa explícitamente cuando CI pasó pero no hay credenciales de Cloudflare y por tanto no se despliega.

## Estado verificado antes de esta rama

El commit `a2785f31` de `main` incorporó un fallback RSS para cuando D1 no responde. Su ejecución `42505485510` terminó con CI en verde: avisos, compilación, TypeScript, Playwright y job de gateway (este último no encontró paquete de gateway en main). El job de despliegue terminó sin desplegar: `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID` estaban vacíos. Por tanto no se debe interpretar ese job verde como una publicación nueva.

## Límites funcionales del gateway

Esta rama no cambia el reproductor, no elimina Puente ni activa el gateway. La PoC de `apps/media-gateway` solo verifica streaming de archivos de prueba propios. La arquitectura actual conserva `ADR-005` (extracción de YouTube en el cliente) y `ADR-010` rechaza obtener y retransmitir vídeos de YouTube desde Cloudflare porque la ruta propuesta depende de controles anti-bot/PoToken y de restricciones de IP. Las pruebas de fixtures no demuestran reproducción real de YouTube.

El gateway puede evolucionar para contenido propio o con licencia, mediante Service Binding y transporte con Range/streaming. Para convertirlo en ruta de vídeo de YouTube sería necesario sustituir la decisión arquitectónica vigente por una vía autorizada y demostrable; esta rama no implementa evasión de medidas técnicas.

## Pendiente

- Confirmar que la suite Playwright determinista pasa en esta rama.
- Añadir pruebas unitarias de contrato para el servidor fixture si el primer CI detecta carencias.
- Verificar y, con aprobación operativa, aplicar la migración D1 008; no se aplicó desde esta rama.
- Configurar los secretos Cloudflare en GitHub Actions si se desea que el workflow despliegue.
- Para gateway YouTube: no marcar como completado hasta tener una integración autorizada y reproducción manual real sin Puente más fallback demostrado.
