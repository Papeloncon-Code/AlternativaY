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
| P3 | Buscador con botón; Enter busca | ✅ | Busca en tus canales; búsqueda global 🔌 |
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
| L3 | Lista de suscripciones con avatar y punto de “nuevo” | ✅ | Avatar real 🔌 |
| L4 | Indicador de directo (ondas rojas) junto al canal | ❌ 🔌 | |
| L5 | “Mostrar más” | ✅ | |
| L6 | Sección Tú: Historial, Ver más tarde, Me gusta | ✅ | |
| L7 | Playlists propias | ❌ | Colecciones (RF-006) |
| L8 | En la página del vídeo, el menú se oculta y abre como panel superpuesto | ✅ | |

## 3. Principal (inicio)
| # | Función | TodoTube | Nota |
|---|---|---|---|
| H1 | Fila de filtros desplazable con flechas | ✅ | |
| H2 | Cuadrícula que se adapta (3–6 columnas según el ancho) | ✅ | |
| H3 | Tarjeta: miniatura, avatar, título 2 líneas, canal, visitas, antigüedad | 🟡 | Visitas 🔌 |
| H4 | Duración en la esquina de la miniatura | ❌ 🔌 | |
| H5 | “EN VIVO” con contador de espectadores | ❌ 🔌 | |
| H6 | Barra roja de progreso en lo ya visto | ✅ | |
| H7 | Vista previa al pasar el ratón (el vídeo se reproduce sin sonido) | ❌ 🔌 | |
| H8 | ⋮: Ver más tarde, Guardar en playlist, No me interesa, Compartir | 🟡 | Compartir y No me interesa (con Deshacer) ✅; playlists pendientes (L7) |
| H9 | **Shorts NUNCA mezclados** con los vídeos: fila propia de Shorts | ✅ | Detección corregida (URL `/shorts/`); verificada con casos de CNN/NBC |
| H10 | Carga continua al bajar (scroll infinito) | 🟡 | 200 elementos de una vez; paginación pendiente |

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
| W8 | Mini reproductor al navegar fuera del vídeo | ❌ | |
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
| S5 | Página Shorts con todos los de tus canales | ✅ | |

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
| U2 | Importar todas tus suscripciones | ❌ | ADR-007; en la web con permiso opcional del puente (doc 08 §4) |

## 8. Lo que aportan las alternativas (y YouTube no tiene)
| # | Función | Origen | TodoTube |
|---|---|---|---|
| A1 | SponsorBlock (saltar patrocinios) | PipePipe, LibreTube, FreeTube | ❌ 🔌 |
| A2 | DeArrow (títulos y miniaturas sin clickbait) | FreeTube, LibreTube | ❌ |
| A3 | Perfiles o grupos de suscripciones | FreeTube | ❌ |
| A4 | Filtros por palabra o duración, ocultar Shorts | PipePipe, SkyTube | 🟡 (Shorts aparte, filtros por canal) |
| A5 | Modo sin distracciones | FreeTube | ❌ (modo Foco diseñado, sin construir) |
| A6 | Avisos al momento (WebSub) | **Solo TodoTube** | ✅ |
| A7 | Exportar e importar datos | NewPipe, FreeTube | ❌ |

## 9. Orden de construcción propuesto (impacto ÷ esfuerzo)
1. **W5** siguiente automático · **W6** atajos · **P6** `/` · **W3** compartir · **W2** campanita en el vídeo · **H8** compartir y no me interesa.
2. **S2–S4** Shorts deslizables.
3. **P4–P5** sugerencias y búsquedas recientes · **P9** ⋮ en avisos · **P10** menú de cuenta.
4. **W4** descripción, visitas y duración cuando haya puente 🔌; **H4/H5** duración y EN VIVO 🔌.
5. **A5** modo Foco · **A3** grupos · **A2** DeArrow · **C2** pestañas de canal.

Cada punto se marca ✅ solo tras verificarlo en la web publicada (Playwright + revisión del propietario).
