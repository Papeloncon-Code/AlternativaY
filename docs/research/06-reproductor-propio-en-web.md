# 06 · ¿Se puede tener un reproductor propio (sin marca de YouTube) en la web?

Consulta: 2026-11-07. **Ampliado y corregido por el doc 07.** Origen: el propietario no acepta que aparezca “YouTube” en TodoTube (logo, “Más vídeos”, “Abrir en YouTube”).

## Conclusión
**En una web pura no es viable.** Hace falta extraer el vídeo, y en el navegador eso exige un servidor intermediario que YouTube bloquea, que tendría que retransmitir el vídeo y que concentra el riesgo legal. La experiencia sin marca de YouTube se consigue en **apps instaladas** (Android y escritorio), que extraen con la IP del usuario.

## Evidencia
| Hecho | Fuente | Nivel |
|---|---|---|
| YouTube.js en el navegador requiere pasar las peticiones por un servidor propio (CORS) | README de `examples/browser` de [YouTube.js](https://github.com/LuanRT/YouTube.js) (clon del 2026-11-06) | V-doc |
| El cliente web de referencia del mismo autor (kira) usa YouTube.js + googlevideo (SABR) | [ytjs.dev](https://ytjs.dev/), [googlevideo](https://www.ytjs.dev/googlevideo/) | S |
| YouTube bloquea servidores: el RSS falla desde IP de servidor; Piped e Invidious, en declive | ADR-006 enmienda 1; doc 02 | V |
| Cloudflare limita servir vídeo sin su producto de pago | [Delivering videos with Cloudflare](https://developers.cloudflare.com/fundamentals/reference/policies-compliances/delivering-videos-with-cloudflare/) | S-oficial |
| Chrome Web Store rechaza extensiones con funciones relacionadas con YouTube | [hilo de Chromium](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/K17UE-7Bjgs) | S |
| Los enlaces de vídeo de YouTube van ligados a la IP de quien los pidió | Comportamiento conocido en Invidious y Piped (motivo de su proxy de vídeo) | I |
| Tapar el reproductor oficial incumple sus condiciones (“must not modify or block the player”) | Developer Policies (extracto, doc 05 §1.2) | S-oficial |

## Opciones
| Opción | Viable | Nota |
|---|---|---|
| App Android (extracción en el dispositivo) | ✅ | Especificada (010) |
| **App de escritorio** (extracción local, como FreeTube) | ✅ | **Propuesta: funcionalidad nueva** |
| Extensión de navegador “TodoTube Companion” | 🟡 | Experimental; empezar por Firefox; Chrome probablemente la rechace |
| Servidor intermediario con proxy de vídeo | ❌ | Bloqueos, coste, riesgo legal y contraria a la constitución §I.2 |
| Tapar el logo del reproductor oficial | ❌ | Incumple condiciones; los anuncios y “Más vídeos” siguen ahí |

## Aplicado ya en la web (2026-11-07)
Se han quitado todas las menciones a YouTube de la interfaz propia: botón “Abrir en YouTube”, enlaces a youtube.com y textos. El reproductor oficial queda como único elemento con marca de YouTube, hasta que existan las apps.
