# Paridad funcional con YouTube web (ingeniería inversa del funcionamiento): especificación

| Campo | Valor |
|---|---|
| Estado | Borrador · 2026-11-07 |
| Origen | Crítica del propietario: “copiaste la imagen pero no las funciones” |
| Método | Inventario pantalla por pantalla de lo que hace YouTube web (capturas del propietario + conocimiento del producto [I]), más lo que aportan las alternativas (FreeTube, Grayjay, Invidious, PipePipe; doc 02). Cada fila es un criterio verificable. |
| Leyenda | ✅ hecho y verificado · 🟡 parcial · ❌ falta · 🔌 requiere TodoTube Puente o Android (datos que el aviso oficial no trae) · 🚫 no se copia (marca, o contra la constitución) |

## 1. Barra superior
| # | Función en YouTube | TodoTube | Nota |
|---|---|---|---|
| P1 | ☰ alterna el menú lateral | ✅ | |
| P2 | Logo → Principal | ✅ | Marca propia 🚫 YouTube |
| P3 | Buscador con botón; Enter busca | ✅ | Con el Puente busca en todo (vídeos y canales con foto y Seguir); sin él, en tus canales y lo explica |
| P4 | Sugerencias mientras escribes | ✅ | Canales y títulos de tus canales, por comienzo de palabra (“chin” no encuentra “Tou**chin**g”); ↑/↓, Enter, Esc. Global 🔌 |
| P5 | Búsquedas recientes (con borrar) | ✅ | Quitar una o borrar todas |
| P6 | Atajo `/` para enfocar el buscador | ✅ | |
| P7 | Búsqueda por voz | ❌ | Web Speech API (Chrome); baja prioridad |
| P8 | Campana con contador de no vistos | ✅ | Se pone a cero al abrir (arreglado 2026-11-07) |
| P9 | Panel de avisos: miniatura, “X ha subido: …”, hace cuánto, ⋮ por aviso | ✅ | ⋮: ocultar aviso (con Deshacer), desactivar avisos del canal, ir al canal |
| P10 | Avatar → menú de cuenta (tema, ajustes) | ✅ | Aspecto, Modo Foco, combinaciones de teclas, ajustes, datos, Puente |
| P11 | Botón “Crear” | 🚫 | No somos plataforma de subida |

## 2. Menú lateral
| # | Función | TodoTube | Nota |
|---|---|---|---|
| L1 | Ampliado ↔ mini con ☰; mini automático en pantallas medianas | ✅ | |
| L2 | Principal, Shorts, Suscripciones | ✅ | |
| L3 | Lista de suscripciones con avatar y punto de “nuevo” | ✅ | Foto real: con el Puente se obtiene en el navegador y se comparte vía servidor; sin él, iniciales 🔌 |
| L4 | Indicador de directo (ondas rojas) junto al canal | ❌ 🔌 | |
| L5 | “Mostrar más” | ✅ | |
| L6 | Sección Tú: Historial, Ver más tarde, Me gusta | ✅ | |
| L7 | Playlists propias | ✅ | Guardar en…, página de lista, reordenar, reproducir en orden, en el menú lateral |
| L8 | En la página del vídeo, el menú se oculta y abre como panel superpuesto | ✅ | |

## 3. Principal (inicio)
| # | Función | TodoTube | Nota |
|---|---|---|---|
| H1 | Fila de filtros desplazable con flechas | ✅ | Corregido 2026-11-07: los filtros que daban lo mismo que «Todos» parecían rotos; ahora solo aparecen si cambian algo y se confirma con «N vídeos · filtro» |
| H2 | Cuadrícula que se adapta (3–6 columnas según el ancho) | ✅ | Corregido tras QA: 2 col. a 600 px, 3 a 1024, 5 a 1920 (por ancho real del contenido) |
| H3 | Tarjeta: miniatura, avatar, título 2 líneas, canal, visitas, antigüedad | 🟡 | Visitas 🔌 |
| H4 | Duración en la esquina de la miniatura | ❌ 🔌 | |
| H5 | “EN VIVO” con contador de espectadores | ❌ 🔌 | |
| H6 | Barra roja de progreso en lo ya visto | ✅ | |
| H7 | Vista previa al pasar el ratón (el vídeo se reproduce sin sonido) | ❌ 🔌 | |
| H8 | ⋮: Ver más tarde, Guardar en playlist, No me interesa, Compartir | 🟡 | Compartir y No me interesa (con Deshacer) ✅; playlists pendientes (L7) |
| H9 | **Shorts NUNCA mezclados** con los vídeos: fila propia de Shorts | ✅ | Detección corregida (URL `/shorts/`); verificada con casos de CNN/NBC |
| H10 | Carga continua al bajar (scroll infinito) | ✅ | 24 cada vez + páginas del servidor (`?before=`) |

## 4. Página del vídeo
| # | Función | TodoTube | Nota |
|---|---|---|---|
| W1 | Reproductor grande + columna “A continuación” a la derecha | ✅ | |
| W2 | Título, canal con avatar y botón **Suscrito 🔔** | ✅ | |
| W3 | Me gusta, Compartir (copiar enlace), Guardar | ✅ | |
| W4 | Visitas, fecha y **descripción** desplegable | 🟡 🔌 | Se muestran con el reproductor propio; sin puente, invitación a instalarlo |
| W5 | **Reproducción automática del siguiente** (cuenta atrás, cancelable) | ✅ | 8 s, interruptor en el reproductor |
| W6 | Atajos de teclado: K/espacio, J/L ±10 s, F, M, flechas, `<`/`>` velocidad | ✅ | También 0–9, T (cine) y Mayús+N (siguiente) |
| W7 | Modo cine (reproductor a todo el ancho) | ✅ | |
| W8 | Mini reproductor al navegar fuera del vídeo | ✅ | Reproductor único; no se recarga (probado con una marca en el iframe) |
| W9 | Reanudar donde lo dejaste | ✅ | |
| W10 | Capítulos en la barra | ❌ 🔌 | |
| W11 | Comentarios | ❌ 🔌 | |
| W12 | Sin anuncios ni marca de YouTube | 🔌 | Con el puente (pendiente de prueba del propietario) |

## 5. Shorts
| # | Función | TodoTube | Nota |
|---|---|---|---|
| S1 | Reproductor vertical a pantalla completa | ✅ | `/shorts/:id`; “Shorts” del menú abre directamente el reproductor (2026-11-07) |
| S2 | **Deslizar arriba/abajo** para pasar al siguiente Short (teclas ↑/↓) | ✅ | Teclas, rueda, deslizar y flechas. Capa de gestos sobre el vídeo (el iframe se tragaba la rueda y los toques). Verificado con Playwright en escritorio e iPhone 13 |
| S3 | Bucle automático al terminar | ✅ | En los dos reproductores; comprobación de reproducción real pendiente del propietario |
| S4 | Botones laterales: Me gusta, Compartir, canal | ✅ | Más tocar para pausar y botón de sonido propio |
| S5 | Página Shorts con todos los de tus canales | 🟡 | «Shorts» abre directamente el reproductor (como el original); los Shorts de un canal están en su pestaña |

## 6. Canal
| # | Función | TodoTube | Nota |
|---|---|---|---|
| C1 | Cabecera: avatar, nombre, suscrito 🔔 | ✅ | Banner y avatar reales 🔌 |
| C2 | Pestañas Inicio / Vídeos / Shorts / En directo | 🟡 | Vídeos y Shorts separados con contador ✅; “En directo” 🔌 |
| C3 | Orden: más recientes / populares | ❌ 🔌 | |

## 7. Suscripciones (pantalla)
| # | Función | TodoTube | Nota |
|---|---|---|---|
| U1 | Lista de canales con campanita (Todas / Personalizadas / Ninguna) y dejar de seguir | ✅ | “Sin Shorts” en lugar de “Personalizadas” |
| U2 | Importar todas tus suscripciones | ❌ | ADR-007; en la web con permiso opcional del puente (doc 08 §4). Pendiente de aprobación del propietario |

## 8. Lo que aportan las alternativas (y YouTube no tiene)
| # | Función | Origen | TodoTube |
|---|---|---|---|
| A1 | SponsorBlock (saltar patrocinios) | PipePipe, LibreTube, FreeTube | ✅ En los dos reproductores (no requiere puente). Salto automático de patrocinio, autopromoción y “suscríbete” con Deshacer; une tramos solapados. Lógica probada (`test/skip.test.mjs`, 4/4); salto en reproducción real pendiente de comprobar por el propietario |
| A2 | DeArrow (títulos y miniaturas sin clickbait) | FreeTube, LibreTube | ✅ Opcional (apagado por defecto). Misma regla que la extensión; título original al pasar el ratón; solo consulta las tarjetas visibles |
| A3 | Perfiles o grupos de suscripciones | FreeTube | ✅ Grupos en Suscripciones → filtros en Principal |
| A4 | Filtros por palabra o duración, ocultar Shorts | PipePipe, SkyTube | ✅ por palabra (Ajustes); 🟡 por duración 🔌 |
| A5 | Modo sin distracciones | FreeTube | ✅ Modo Foco: botón en la barra, una columna, sin menú, filtros, Shorts ni “A continuación”, sin reproducción automática, miniaturas en gris hasta pasar el ratón; se recuerda |
| A6 | Avisos al momento (WebSub) | **Solo TodoTube** | ✅ |
| A7 | Exportar e importar datos | NewPipe, FreeTube | ✅ Copia JSON sin la clave de propietario; valida el archivo y pide confirmación |

## 9. Orden de construcción propuesto (impacto ÷ esfuerzo)
1. **W5** siguiente automático · **W6** atajos · **P6** `/` · **W3** compartir · **W2** campanita en el vídeo · **H8** compartir y no me interesa.
2. **S2–S4** Shorts deslizables.
3. **P4–P5** sugerencias y búsquedas recientes · **P9** ⋮ en avisos · **P10** menú de cuenta.
4. **W4** descripción, visitas y duración cuando haya puente 🔌; **H4/H5** duración y EN VIVO 🔌.
5. **A5** modo Foco · **A3** grupos · **A2** DeArrow · **C2** pestañas de canal.

Cada punto se marca ✅ solo tras verificarlo en la web publicada (Playwright + revisión del propietario).

## 10. Datos de la comunidad: verificación y licencia (2026-11-07)
- **API verificada con peticiones reales:** `sponsor.ajay.app/api/skipSegments/<prefijo>` y `/api/branding/<prefijo>` responden con `access-control-allow-origin: *`, así que funcionan desde la web sin puente. Se consulta por los 4 primeros caracteres del SHA-256 del ID: el servicio no sabe qué vídeo ves. Respuesta de DeArrow por prefijo: ~5 KB comprimida.
- **Cobertura en el feed real:** de 120 vídeos, 34 tienen tramos de SponsorBlock y 19 tienen título de DeArrow.
- **Regla de DeArrow** leída en el código de la extensión ([`src/dataFetching.ts`](https://github.com/ajayyy/DeArrow/blob/master/src/dataFetching.ts), [`src/titles/titleFormatter.ts`](https://github.com/ajayyy/DeArrow/blob/master/src/titles/titleFormatter.ts)): primer título o miniatura si `locked` o `votes >= 0`; `original` = se deja el de YouTube; se quitan las marcas `>`.
- **Licencia [V]:** “The API and database follow CC BY-NC-SA 4.0 unless you have explicit permission” ([wiki de SponsorBlock](https://github.com/ajayyy/SponsorBlock/wiki/Database-and-API-License)). Exige atribución (puesta en Ajustes, según la [plantilla oficial](https://gist.github.com/ajayyy/4b27dfc66e33941a45aeaadccb51de71)) y **uso no comercial**.
  - **Riesgo para el propietario:** si TodoTube se monetiza, hay que pedir permiso al autor o quitar la función. Afecta a la decisión de licencia y modelo (ADR-004, pendiente).
  - **No verificado:** si DeArrow tiene la misma licencia (su wiki no era accesible desde este entorno). Se supone la misma [I].

## 11. Errores que encontró el propietario y no las pruebas (2026-11-07)
| Reporte | Causa real | Arreglo |
|---|---|---|
| “Los filtros no funcionan al presionarlos” | Funcionaban, pero «Sin ver» daba lo mismo que «Todos» (nada visto) y «Hoy» enseñaba la misma primera pantalla | Solo se muestran filtros que cambian algo; línea «N vídeos · filtro» |
| “No sirve el buscador” («fern») | Solo buscaba en los 14 canales seguidos, sin decirlo | Búsqueda global con el Puente; sin él, aviso claro y botón Instalar |
| “No están las fotos de los canales” | Sin Puente no hay forma permitida de obtenerlas; además la pantalla Suscripciones dibujaba sus propias iniciales | Fotos vía Puente compartidas por el servidor; Suscripciones usa el avatar común |

**Proceso nuevo:** pruebas de aceptación en `apps/web/e2e` (una por función ✅), obligatorias antes de desplegar (`npm run deploy`), y revisión por un agente de QA independiente que no ve el razonamiento del desarrollo.

## 12. ¿Instalar el Puente con un “Aceptar”, como el permiso de avisos?
- **No es posible** en los navegadores actuales. Chrome eliminó la instalación de extensiones desde webs (`chrome.webstore.install`) en 2018 y desde Chrome 71 la llamada falla; la web solo puede llevar a la ficha de la Chrome Web Store [S: [Help Net Security](https://www.helpnetsecurity.com/2018/06/13/chrome-extensions-inline-installation/), [FAQ de Google](https://developer.chrome.com/docs/extensions/mv2/inline-faq)]. Firefox está retirando `InstallTrigger` [S: [Bugzilla 1754441](https://bugzilla.mozilla.org/show_bug.cgi?id=1754441)]. Las páginas oficiales no se pudieron abrir desde este entorno: hay que comprobarlas.
- **Lo más parecido posible** (ya construido): tarjeta propia al llegar («Ve los vídeos sin anuncios · Instalar») → ficha de la tienda → «Añadir» → confirmación del navegador. Requiere **publicar el Puente** en Chrome Web Store / Firefox Add-ons / Edge.
- **Decisión del propietario:** publicar en tiendas (cuenta de desarrollador; riesgo de rechazo por políticas sobre YouTube y bloqueo de anuncios [I, NV]) o seguir con la instalación manual (modo desarrollador).

## 13. Revisión independiente (QA, 2026-11-07)
Un agente sin acceso al razonamiento del desarrollo probó la web publicada como un usuario (escritorio 1024–1920, iPhone 13, claro y oscuro). Encontró 26 fallos y 15 leves. Todos los graves y medios se verificaron con medidas antes de corregirlos y cada uno tiene ahora una prueba de regresión en `apps/web/e2e/qa.spec.ts` (43 pruebas en total, también contra la web publicada).

| # | Hallazgo | Estado |
|---|---|---|
| 1 | 700 px vacíos entre el vídeo y su título (la columna lateral estiraba la fila) | ✅ |
| 2, 3 | Suscripciones y avisos se salían de la pantalla en el móvil | ✅ |
| 4 | Un Short compartido fuera de tus canales no se podía ver | ✅ (título por oEmbed) |
| 5 | Shorts con la interfaz del reproductor de reserva y la nuestra superpuestas | ✅ (sin duplicados; acciones debajo en móvil) |
| 6 | Controles de suscripción que fallaban sin clave | ✅ (se explica en el propio menú) |
| 7 | Dos canales mal etiquetados (CNET como «Lofi Girl», Android Developers como «Android Authority») | ✅ corregido y contrastado con el feed oficial de los 14 |
| 8 | Shorts mezclados en la búsqueda | ✅ fila propia; resultados en lista |
| 9–13, 15–17 | Hora de avisos cortada, huecos antes de Shorts, columnas, modo cine, reproductor en móvil, foco del buscador, menú ⋮ bajo la barra, botón Crear | ✅ |
| 18–21 | Gesto del panel táctil pasaba varios Shorts; ↓ del buscador cambiaba de Short; «Atrás» en Shorts; filtro perdido al volver | ✅ |
| 22 | «Hoy» y «Esta semana» no cambiaban la primera pantalla | ✅ quitados (en una lista por fecha nunca la cambian) |
| 23, 24 | Título de la pestaña; vídeo por enlace sin título | ✅ |
| 25 | Suscripciones parece un formulario de gestión; jerga interna visible | 🟡 jerga quitada; rediseño pendiente |
| 26 | Búsqueda limitada sin Puente | 🔌 explicado en pantalla |
| Leves | Mención de la marca en un error, 404 sin salida, flechas que no rellenaban el buscador, importar con error técnico, Escape en el menú lateral, toasts que faltaban | ✅ |
| Leves pendientes | Pestaña Inicio y banner del canal 🔌, fecha en las listas de Tú, interruptor de reproducción automática, tamaño táctil del nombre del canal | ❌ |

**Lección:** las pruebas propias comprueban lo que el desarrollador ya pensó. Por eso la revisión independiente pasa a ser obligatoria tras cada bloque grande.
