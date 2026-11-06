# Diseño de experiencia e interfaces

Estado: **Borrador** · 2026-11-06.

## 1. Principios
1. **Biblioteca primero, feed después.** La pantalla de inicio es *lo tuyo* (seguir viendo, novedades de tus suscripciones), no un algoritmo infinito.
2. **Tres toques como máximo** para cualquier acción frecuente: reproducir, guardar o seguir.
3. **Una sola acción primaria por pantalla.** El resto va en menús contextuales.
4. **Mismo modelo mental en Android y en la web.** Los nombres, la jerarquía y los iconos coinciden y solo cambia el layout.
5. **Accesible por defecto:**
   - objetivos táctiles ≥ 48 dp;
   - contraste AA;
   - todo operable con TalkBack o teclado;
   - sin información transmitida solo por color.
6. **Honestidad de fuente.** Cada elemento muestra un distintivo con su fuente, y las limitaciones (“YouTube: reproductor oficial, sin segundo plano”) se explican en la UI, no se esconden.

Patrones de referencia:
- **Material 3** (Android) para navegación adaptable: `NavigationBar` en móvil y `NavigationRail` en tablet.
- **Mini-player persistente** al estilo de las apps de música y podcasts, presente en Flow [V-doc].

## 2. Navegación

| Móvil (barra inferior) | Tablet / escritorio (rail o lateral) |
|---|---|
| Inicio · Buscar · Biblioteca · Descargas · (avatar → Perfil/Ajustes) | Igual + panel secundario (detalle o cola) a la derecha si el ancho es ≥ 840 dp |

El mini-player queda fijo sobre la barra inferior. Al deslizarlo hacia arriba se abre el reproductor completo.

Breakpoints (Material 3 window size classes):
- Compact < 600 dp: 1 columna.
- Medium 600–839 dp: 2 columnas en las listas.
- Expanded ≥ 840 dp: lista + detalle.

## 3. Pantallas

### 3.1 Inicio
- **Componentes:**
  - *Seguir viendo/escuchando* (carrusel con barra de progreso);
  - *Novedades* (lista agrupada por día, con filtros en chips: Todo · Vídeo · Audio · Sin ver · < 20 min · por grupo);
  - *De tus colecciones* (opcional).
- **Acciones:** reproducir, añadir a la cola (deslizar a la derecha), marcar como visto (deslizar a la izquierda), menú (guardar en colección, ir a la fuente, descargar si se permite).
- **Estado vacío:** ilustración + “Añade tu primera fuente” con tres botones grandes: Podcast · PeerTube · Archivos locales, y un enlace a “Importar desde NewPipe/FreeTube/OPML”.
- **Errores:**
  - si una fuente falla, aparece un banner discreto: “2 fuentes no se pudieron actualizar”, que lleva a Gestión de fuentes;
  - nunca se bloquea toda la pantalla.
- **Modo sin distracciones:** oculta Novedades y deja solo *Seguir viendo* y la cola.

### 3.2 Buscador
- **Componentes:**
  - campo con sugerencias del historial local;
  - selector de ámbito: **Mi biblioteca** (por defecto, offline) | **Descubrir** (APIs de las fuentes);
  - en la fase 4, el chip “**Dentro del contenido**”, que busca en las transcripciones.
- **Acciones:** buscar, filtrar por fuente, tipo y duración, y borrar el historial de búsqueda.
- **Estado vacío:** búsquedas recientes y sugerencias de qué se puede buscar.
- **Errores:** si una fuente no responde, sus resultados se marcan como “no disponible” y los demás se muestran igual.

### 3.3 Resultados
- Lista agrupada por fuente, cada grupo con “ver más”.
- Cada fila incluye miniatura, título, autor, duración, distintivo de fuente y estado (visto, descargado).
- Resultado de transcripción (fase 4): una fila por coincidencia con la frase resaltada y la marca de tiempo. Al tocarla, el reproductor salta a ese segundo.
- **Estado sin resultados:** “Nada en tu biblioteca. ¿Buscar en Descubrir?”

### 3.4 Reproductor
- **Componentes (vídeo):**
  - superficie con gestos: doble toque para ±10 s configurable; deslizar verticalmente para brillo y volumen; pellizcar para zoom/recorte;
  - barra con capítulos marcados;
  - controles de velocidad, subtítulos, calidad (perfil Auto/Ahorro/Máxima), cola, temporizador, cast y PiP.
- **Debajo:** título, fuente, descripción plegable, capítulos, **marcadores** (botón “+ marcador aquí”) y panel de IA (fase 4).
- **Audio:** carátula grande, recorte de silencios, normalización y velocidad.
- **Contenido de YouTube:** reproductor oficial incrustado con un aviso no intrusivo, “Reproducción oficial de YouTube: sin segundo plano ni descargas”. Se mantienen nuestros controles de *guardar, marcador y nota*.
- **Errores:**
  - “No se puede reproducir”, con el motivo legible (sin red, fuente caída, formato no soportado) y acciones (reintentar, abrir en el navegador, informar);
  - si cae la red, se pasa automáticamente a la copia descargada.
- **Responsive:** en el modo expandido, la cola o el panel de IA aparecen a la derecha. En la web hay atajos de teclado (espacio, J/K/L, F, M, C, `,` y `.` para ±1 fotograma en pausa).

### 3.5 Biblioteca
- **Pestañas:** Colecciones · Favoritos · Etiquetas · Marcadores · Historial.
- **Acciones:** crear colección, ordenar (manual, fecha o duración), compartir colección (exportar JSON o enlace, fase 3) y edición múltiple.
- **Estado vacío:** “Guarda cualquier cosa con ☆ para verla aquí.”

### 3.6 Suscripciones
- Lista de feeds agrupables (**grupos**, como los perfiles de FreeTube), con su última actualización y un indicador de error.
- **Acciones:** añadir (URL, búsqueda, QR o importar), mover a grupo, silenciar, filtros por feed (palabras clave y duración mínima o máxima) y eliminar.
- **Estado vacío:** igual que el Inicio, con las opciones de importación destacadas.

### 3.7 Historial
- Línea temporal por día, con buscador y filtro por fuente.
- **Acciones:** reanudar, quitar entrada, pausar el historial y borrar un rango.
- **Privacidad:** interruptor visible de “Pausar historial”.

### 3.8 Descargas
- Secciones: En curso (progreso, pausar y cancelar) · Completadas (espacio ocupado) · Políticas (solo wifi, límite de GB y autoborrado de lo visto).
- **Errores:** sin espacio, la fuente no permite descargar (explicado) o el enlace ha caducado (reintentar).
- **Estado vacío:** explica qué fuentes admiten descarga.

### 3.9 Configuración
- Secciones:
  - Reproducción;
  - Descargas;
  - Apariencia (tema claro/oscuro/AMOLED, color dinámico, tamaño de texto, densidad);
  - Modos (minimalista, cine, productividad, sin distracciones);
  - Privacidad (historial, telemetría opt-in, IA opt-in);
  - Copias e importación/exportación;
  - Accesibilidad (subtítulos, reducir movimiento);
  - Acerca de (licencias y base legal por conector).
- **Patrón:** búsqueda dentro de los ajustes y valores por defecto sensatos. Las opciones avanzadas van dentro de “Avanzado”.

### 3.10 Perfil
- **Sin cuenta:** botón “Sincronizar entre dispositivos (opcional)”.
- **Con cuenta:** dispositivos vinculados (renombrar o revocar), estado de la sincronización, exportar o borrar la cuenta y, en la fase 2, perfiles familiares con PIN.
- **Errores:** si la sincronización está en pausa por un conflicto de versión, la app indica que hay que actualizarla.

### 3.11 Gestión de fuentes
- Lista de conectores instalados con estado (OK, error, desactivado), permisos (hosts a los que accede), base legal (enlace a RL-xx) y capacidades (segundo plano, descarga, búsqueda).
- **Acciones:** añadir fuente, reautenticar (Jellyfin), ver el log de errores y, en la fase 3, instalar un conector de terceros (con aviso de permisos, como `allowUrls` en Grayjay).

### 3.12 Panel de IA (fase 4)
- **Opt-in explícito** con explicación del procesamiento local frente al servidor y de su coste en batería o datos.
- **Pestañas para un elemento:** Transcripción (sincronizada con el reproductor; tocar una frase lleva a ese momento) · Resumen · Capítulos sugeridos · Preguntas.
- **Estados:**
  - no disponible para esta fuente (YouTube): se explica el motivo;
  - generando (progreso y cancelar);
  - error (reintentar, cambiar a servidor o a local).
- Siempre muestra la marca “Generado automáticamente” y el enlace a la fuente original.

## 4. Estados globales
| Estado | Comportamiento |
|---|---|
| Sin red | Banner “Sin conexión: mostrando tu biblioteca”; todo lo local sigue funcionando |
| Sincronización con conflicto | Se resuelve sin preguntar (doc de arquitectura §6); solo se avisa si cambia la versión del protocolo |
| Primera ejecución | 3 pantallas como máximo: valor · añadir fuente o importar · permisos (notificaciones). Sin registro obligatorio. |
