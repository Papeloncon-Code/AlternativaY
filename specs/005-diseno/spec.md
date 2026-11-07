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
