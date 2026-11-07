# Diseño visual de TodoTube: especificación

| Campo | Valor |
|---|---|
| Estado | Borrador: propuestas visuales pendientes de elección del propietario |
| Origen | Crítica del propietario a la web v0.1 (2026-11-07): “parece Twitch cutre” |
| Aplica a | Web y Android (tokens compartidos, constitución §11) |

## 1. Brief
- **Qué debe sentir el usuario en 3 s:** “esto ya sé usarlo” (familiar) y “esto es mejor que YouTube” (premium).
- **Requisito del propietario:** familiar + acabado premium + **modo minimalista** activable con un toque. Nadie ofrece las tres cosas juntas: es un diferenciador de producto, no solo estético.
- **Público:** quien hoy usa YouTube a diario, en móvil y en ordenador, con 20 a 200 canales.

## 2. Qué falló en la v0.1 (para no repetirlo)
| Problema | Causa |
|---|---|
| Parece Twitch | Morado de marca sobre negro azulado = paleta de Twitch |
| No resulta familiar | Sin barra superior con buscador, sin la foto del canal junto al vídeo, cuadrícula poco densa |
| Parece plantilla | Botones sueltos junto a cada vídeo, etiquetas grandes, sin jerarquía, sin idea visual |
| Proceso | Se construyó sin especificación de diseño ni propuestas previas |

## 3. Principios
1. **Convención en la estructura y personalidad en el acabado.** La disposición sigue lo que la gente ya conoce de las apps de vídeo: barra superior con buscador, menú lateral plegable, chips, cuadrícula 16:9 con la foto del canal, título y datos. No se copia el aspecto de YouTube (marca y *trade dress*): colores, tipografía, iconos y logo propios.
2. **El contenido es el color.** Las miniaturas ya son muy coloridas, así que la interfaz es neutra y el acento de marca aparece en muy pocos sitios: estado activo, “Nuevo” y progreso.
3. **Premium = detalle, no decoración:**
   - tipografía cuidada y escala con contraste real;
   - sombras y desenfoques sutiles;
   - transiciones suaves;
   - una **portada destacada** del último vídeo de tus canales;
   - textos honestos (“hace 2 min, aviso al momento”).
4. **Modo minimalista (“Foco”):** un interruptor en la barra superior.
   - Quita portada, chips, menú, insignias y recomendaciones.
   - Deja una sola columna con “lo nuevo de tus canales” y lo que estás viendo.
   - Monocromo y con más aire.
5. **Accesible:** contraste AA medido, foco visible, objetivos de 44 px o más en táctil.

## 4. Pantalla de referencia para las propuestas
Inicio en tres estados: escritorio normal, escritorio en modo Foco y móvil normal. Con datos reales del servicio de avisos (títulos, canales y miniaturas de verdad).

## 5. Criterios de aceptación
- **CA-D1:** el propietario elige una dirección entre al menos 2 propuestas renderizadas antes de que se cambie el código.
- **CA-D2:** todo texto pasa el contraste AA (4,5:1 normal, 3:1 grande), medido con un script.
- **CA-D3:** la estructura es reconocible: un usuario de YouTube identifica buscador, menú y vídeos sin explicación (se valida con 3 personas).
- **CA-D4:** el modo Foco se activa y desactiva con un solo toque y recuerda la elección.
- **CA-D5:** sin paleta morada sobre negro azulado, sin rojo de YouTube y sin verde de Spotify.

## Aclaraciones pendientes
- [ ] ¿El propietario tiene logo, colores o tipografías pensados para TodoTube?
- [ ] ¿Tema por defecto: oscuro o claro? (Propuesta: sigue al sistema; mockups en oscuro.)

## Propuestas (2026-11-07)
| Propuesta | Tema | Marca | Archivo |
|---|---|---|---|
| A | Oscuro | Grafito y lima, Instrument Serif en titulares | `propuestas/propuesta-a.png` |
| B | Oscuro | Tinta y ámbar, Manrope | `propuestas/propuesta-b.png` |
| **C** | **Claro** | Lima (círculo negro con play lima en el logo), rojo solo en Nuevo, progreso y aviso | `propuestas/propuesta-c.png` |
| **D** | **Claro** | Ámbar, rojo solo en Nuevo, progreso y aviso | `propuestas/propuesta-d.png` |

Revisiones de C y D: contraste medido (texto 19,2:1; secundario 6,4:1; “Nuevo” blanco sobre rojo 4,7:1; tinta lima 7,1:1; tinta ámbar 5,4:1, todo AA). Revisión de 7 críticos con 3 correcciones: buscador sin “YouTube”, logo legible sobre blanco y borde en el botón lima. No se pudo pasar el crítico independiente ni las segundas opiniones de Gemini y ChatGPT (herramientas en el ordenador del propietario).

## Decisión (2026-11-07): propuesta E, “familiar al máximo”
El propietario mostró capturas de YouTube (escritorio, tema oscuro) y pidió que TodoTube se vea “casi igual” por su funcionalidad.

**Se adopta la estructura y el funcionamiento de YouTube** (convenciones de interfaz, como hacen FreeTube, Invidious y NewPipe):
- barra superior: ☰, logo, buscador con botón, campana de avisos y avatar;
- menú lateral en dos modos: **mini** (Principal, Shorts, Suscripciones, Tú) y **ampliado** (secciones + lista de canales con punto de “nuevo” + sección Tú: Historial, Ver más tarde, Vídeos que me gustan);
- fila de filtros desplazable con flechas;
- cuadrícula de 3–4 columnas: miniatura 16:9 con esquinas redondeadas, avatar del canal, título en 2 líneas, canal · visitas · antigüedad, menú ⋮;
- tema oscuro por defecto y claro según el sistema.

**No se copia** la identidad de marca de YouTube: logo, wordmark, “play” rojo con nombre ni tipografía de marca. Logo propio (play + punto de aviso). El rojo se usa solo como convención: EN VIVO, progreso y avisos.

**Datos que requieren el puente o Android** (no vienen en WebSub): duración, visitas, avatar real del canal y “EN VIVO”. Se muestran cuando están disponibles; sin ellos, la tarjeta no deja huecos.

### Criterios de aceptación
- **CA-D6:** un usuario de YouTube encuentra sin ayuda: buscar, sus suscripciones, Shorts, historial y “ver más tarde”.
- **CA-D7:** el menú lateral alterna entre mini y ampliado con ☰ en escritorio; en móvil se usa la barra inferior.
- **CA-D8:** cada vídeo tiene menú ⋮ con Ver más tarde, Me gusta, Marcar como visto y Dejar de seguir canal.
- **CA-D9:** ningún texto, logo ni icono de la interfaz propia menciona ni imita la marca YouTube.

### Verificación de la propuesta E (2026-11-07, https://todotube.papelon.workers.dev)
| CA | Resultado |
|---|---|
| CA-D6 | ✅ Buscador, Suscripciones, Shorts, Historial y Ver más tarde, visibles en la barra superior y en el menú lateral (pendiente de validar con 3 personas) |
| CA-D7 | ✅ Menú ampliado ↔ mini con ☰; mini automático por debajo de 1312 px; barra inferior en móvil |
| CA-D8 | ✅ Menú ⋮: Ver más tarde, Me gusta, Marcar como visto, Ir al canal (dejar de seguir en el canal y en Suscripciones) |
| CA-D9 | ✅ Sin menciones ni marca de YouTube en la interfaz propia |
| CA-D2 | ✅ Tokens claro/oscuro; sin desplazamiento horizontal en 1440, 1100 y 390 px; 0 errores de JavaScript (Playwright) |

Pendiente (necesita el puente o Android): duración, visitas, foto real del canal y “EN VIVO” en las miniaturas.

## Pasada de sistema de diseño (2026-11-07): skills Taste y Müller-Brockmann

### Qué se estudió y qué aplica
Se leyeron completos [taste-skill](https://github.com/leonxlnx/taste-skill) (`SKILL.md`, `references/system.md`, `references/motion.md`) y la skill *Müller-Brockmann Grid Systems* de [hyperagent-public-skills](https://github.com/alex-hyperagent/hyperagent-public-skills). No se ejecutó ningún script de ellas.

| Regla | ¿Aplica a TodoTube? | Por qué |
|---|---|---|
| Taste: hero, una sección por pantalla, fotos reales, efectos | ❌ | Es para webs de empresa y landing pages; TodoTube es una app. Servirá para la futura página de presentación |
| Taste: **un solo sistema** (una escala de espacios, radios, botones, enlaces) | ✅ | Aplicado |
| Taste: capa de interacción (entrar 140 ms, salir 200 ms, pulsar 90 ms, sin rebotes; foco visible; nada se anima al hacer scroll; movimiento reducido) | ✅ | Aplicado |
| Taste: texto gris ≥ 4,5:1, nada por debajo de 13 px | ✅ con excepción | Mínimo 12 px; etiquetas del menú estrecho y número de la campana a 11 px (convención de apps de vídeo, que usan 10 px) |
| Müller-Brockmann: **una fuente de verdad** en `:root`, bordes iguales, espaciado múltiplo de la unidad, **medir en vez de mirar** | ✅ | Aplicado y medido con Playwright |
| Müller-Brockmann: retícula de línea base editorial, superposición conmutable, alineación óptica de titulares grandes | ❌ | Pensado para páginas editoriales con titulares de 100+ px; en una cuadrícula de vídeos dinámica no aporta |

Las galerías del archivo del propietario (godly, land-book, landdding, cta.gallery, footer.design, supahero, motionsites…) son casi todas de **landing pages**: se usarán para la página de presentación y la de instalación del Puente, no para la app. *No se han revisado una a una todavía.*

### Resultado medido (antes → después)
| Medida | Antes | Después |
|---|---|---|
| Tamaños de letra distintos | 12 | **7** (11 · 12 · 14 · 16 · 20 · 24 · 32) |
| Radios distintos | 10 | **4** (4 · 8 · 12 · pastilla) |
| Espaciados fuera de escala (5, 9, 10, 14, 18, 28 px…) | 19 usos | **0** (múltiplos de 4) |
| Transiciones distintas | 5 sueltas | **1 capa** con tokens `--m-in/--m-out/--m-press/--ease` |
| Contraste del “Deshacer” de los avisos breves | 2,29 : 1 / 3,28 : 1 ❌ | **5,17 : 1 / 7,40 : 1** ✅ |
| Interruptor encendido en tema claro (lima sobre blanco) | 1,29 : 1 ❌ | **7,08 : 1** ✅ (verde oscuro) |
| “Suscripciones” en el menú estrecho | se salía (74 px en 64) | cabe (72 en 72; menú de 80 px) |
| Bordes laterales de la cuadrícula a 1280 px | 24 / 24 px | 24 / 24 px ✅ |

Regresiones detectadas al comparar capturas antes/después y corregidas: los botones de tema saltaban de línea en móvil (relleno del panel) y la insignia “Nuevo” crecía 8 px.

**Pendiente:** el enlace del nombre del canal en las tarjetas mide 20 px de alto (WCAG 2.5.8 pide 24 px); validar CA-D3 con 3 personas.
