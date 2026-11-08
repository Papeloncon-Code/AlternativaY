# Auditoría ampliada de fuentes de reproducción de YouTube

**Fecha:** 8 de noviembre de 2026  
**Repositorio:** `Papeloncon-Code/AlternativaY`  
**Alcance:** investigación de proyectos externos, arquitectura y licencias. No implementa extracción de YouTube ni modifica el reproductor.

## Resumen ejecutivo

La revisión confirma que **Grayjay es la referencia arquitectónica más interesante entre los dos candidatos solicitados**, pero no es un origen de medios independiente: su plugin sigue obteniendo contenido de YouTube. Su configuración pública revela varias modalidades de reproducción y recuperación dentro del mismo plugin. No equivale a tener varios proveedores de contenido independientes.

**Lux tampoco es un extractor independiente de su dependencia principal**: su adaptador de YouTube llama a `github.com/kkdai/youtube/v2`. Por tanto, Lux y esa biblioteca no deben contabilizarse como dos motores separados.

La búsqueda amplió la lista con Pytubefix, innertube-rs, ytgo y YouTubeStreamsExtractor. Ninguno ofrece una tercera infraestructura independiente de YouTube. Algunos tienen limitaciones de licencia, madurez o integración. No se recomienda sumar proyectos solo para aumentar artificialmente el número de proveedores.

## 1. Grayjay: fuente oficial, configuración y limitaciones

### Procedencia comprobada

Se encontró el espejo público de FUTO:

- Repositorio: https://github.com/futo-org/grayjay-plugin-youtube
- Configuración: https://github.com/futo-org/grayjay-plugin-youtube/blob/master/YoutubeConfig.json
- Repositorio principal indicado por FUTO: https://gitlab.futo.org/videostreaming/plugins/youtube
- Configuración distribuida: https://plugins.grayjay.app/Youtube/YoutubeConfig.json
- Licencia del repositorio: AGPL-3.0.

La configuración consultada en el commit `78a84af62be98e21d35e9d3f2cf75c72aa51f2c1` declara versión **367**, autor FUTO y enlaza el proyecto principal de GitLab. GitHub identifica el script `YoutubeScript.js` como un archivo de aproximadamente **4,08 MB** y no permite renderizarlo en el visor web. El conector de repositorio devuelve el hash del blob, pero no entrega el contenido del script.

**Límite de esta auditoría:** se inspeccionaron la configuración oficial, la licencia y la interfaz pública de tipos, pero no se consiguió leer el cuerpo íntegro del script oficial. No se debe presentar esto como una auditoría línea por línea del extractor.

### Qué revela la configuración

La configuración declara, entre otras cosas:

- Una ruta de reproducción asociada a VisionOS.
- Modos de reproducción UMP y una ruta de reproductor nativo SABR/UMP.
- Un modo combinado de audio/vídeo.
- Mecanismos de recuperación de la sesión de reproducción.
- Configuración de autenticación y distintos estados de disponibilidad.

Esto demuestra que Grayjay trabaja con **más de una modalidad de reproducción dentro de su plugin** y que ha invertido en recuperación. No demuestra que tenga proveedores externos independientes: todas esas rutas siguen dependiendo del servicio de YouTube.

### Valor para TodoTube

Grayjay debe tratarse como **referencia de arquitectura**, en particular para estudiar cómo modela descripciones de fuentes, audio/vídeo separados, HLS/DASH y el estado de reproducción.

No es un paquete drop-in para el backend actual. El plugin está acoplado a su runtime y a sus tipos de integración. La licencia AGPL-3.0 requiere una revisión legal antes de reutilizar o adaptar código, especialmente si el software modificado se ofrece como servicio de red. La opción prudente es estudiar conceptos de arquitectura y diseñar una interfaz propia; no copiar código hasta resolver compatibilidad de licencia y procedencia.

No se documentan ni se reproducen técnicas para sortear controles de acceso, verificaciones anti-bot o requisitos de autorización de YouTube.

## 2. Lux y la dependencia real

Código de Lux:

- Extractor: https://github.com/iawia002/lux/blob/master/extractors/youtube/youtube.go
- Dependencias: https://github.com/iawia002/lux/blob/master/go.mod

El adaptador de YouTube de Lux utiliza `github.com/kkdai/youtube/v2`. El `go.mod` consultado fija `v2.10.5`. Lux transforma los resultados de esa biblioteca al modelo de datos de Lux; no constituye una segunda implementación completa independiente de esa biblioteca.

La biblioteca original:

- https://github.com/kkdai/youtube
- Licencia MIT.
- El repositorio consultado declara Go 1.26 en su módulo.
- La publicación v2.10.7 aparece fechada el 4 de noviembre de 2026 en el espejo de distribución consultado.

**Decisión:** si se compara la familia Lux, la unidad de evaluación es `kkdai/youtube`; Lux no cuenta como un proveedor adicional. Es una biblioteca no oficial que sigue dependiendo de YouTube y no constituye una fuente independiente del servicio.

## 3. Nuevos candidatos encontrados

| Proyecto | Lenguaje / licencia declarada | Resultado de auditoría | Decisión |
|---|---|---|---|
| [Pytubefix](https://github.com/JuanBindez/pytubefix) | Python / MIT | Versión 11.2.1 en el manifiesto consultado; proyecto con actividad en 2026. Es una línea de implementación distinta a NewPipe. No es un origen alternativo: sigue dependiendo de YouTube y requiere un servicio Python separado respecto al backend actual. | Candidato de laboratorio; no integrar en el Worker ni implementar rutas que eludan controles de acceso. |
| [innertube-rs](https://github.com/caya8205-2/innertube-rs) | Rust / MIT | Versión 0.10.1. El propio proyecto se describe como port de YouTube.js. | No contar como otra línea independiente respecto a YouTube.js. |
| [ytgo](https://github.com/tituscheng/ytgo) | Go / licencia no verificada en esta revisión | README declara un cliente propio y una API de biblioteca. No se verificó una licencia explícita utilizable. El README describe estrategias para superar limitaciones de entrega/throttling. | No incorporar. Licencia pendiente y prácticas de acceso incompatibles con el alcance de integración permitido. |
| [YouTubeStreamsExtractor](https://github.com/tmk907/YouTubeStreamsExtractor) | .NET 9 / MIT declarada | API de extracción y selección de formatos; el archivo LICENSE conserva un titular placeholder. Exigiría un servicio .NET adicional y revisión de procedencia/licencia. | No priorizar. |
| [rusty_ytdl](https://github.com/Mithronn/rusty_ytdl) | Rust / MIT o Apache-2.0 | Biblioteca de descarga; el README declara limitaciones de disponibilidad y restricciones de formatos. | No priorizar para producción. |

### Observación sobre Pytubefix

Es el candidato adicional más claro por mantenimiento y licencia declarada. Aun así, alojar un servicio Python no crea independencia frente a YouTube: solo cambia la implementación que consulta el mismo origen. No se recomienda montar otro microservicio solo para aumentar el número nominal de extractores.

### Observación sobre innertube-rs

Aunque está escrito en Rust y es un proyecto separado, sus autores lo describen expresamente como port de YouTube.js. Es otra implementación de lenguaje, no una base de extracción independiente de la familia YouTube.js.

## 4. Matriz de independencia

| Candidato | Línea de software distinta | Origen final distinto de YouTube | Compatible directamente con Worker JS |
|---|---:|---:|---:|
| Grayjay plugin | Sí | No | No; runtime propio |
| Lux | Capa distinta, motor delegado | No | No; Go |
| kkdai/youtube | Sí | No | No; Go |
| Pytubefix | Sí | No | No; Python |
| innertube-rs | Port de YouTube.js | No | No; Rust |
| ytgo | Sí | No | No; Go |
| YouTubeStreamsExtractor | Sí | No | No; .NET |
| Archivo maestro autorizado / CDN del titular | Sí | Sí, si el origen de entrega es independiente | Sí, mediante manifest o URL autorizada compatible |

La columna “origen final distinto” es la importante para la resiliencia. Una implementación distinta puede tolerar un defecto de software que otra tenga, pero no garantiza continuidad cuando el servicio de origen impide el acceso a todas.

## 5. Decisión recomendada

1. Mantener **Grayjay como referencia arquitectónica**, no como dependencia integrada por ahora. Completar la inspección del script oficial solo si se obtiene una copia completa desde FUTO y se confirma la licencia aplicable. No tomar el fork archivado como fuente de verdad.
2. No contabilizar **Lux y kkdai/youtube como dos proveedores**. Si se hace una evaluación de laboratorio permitida, evaluar la biblioteca directa una sola vez.
3. Mantener **Pytubefix como candidato de laboratorio** por actividad y licencia MIT declarada, pero no desplegar otro servicio únicamente para tener otra implementación del mismo origen.
4. No adoptar ytgo sin licencia verificable ni incorporar mecanismos de evasión de restricciones de entrega o de acceso.
5. Mantener el trabajo de broker en torno a identidad exacta del asset, posición de reproducción, huella y registro de permisos.
6. Mantener la copia de respaldo en un origen de almacenamiento independiente y con autorización suficiente. No marcarla disponible hasta que la ingestión y las comprobaciones de integridad terminen.
7. No reproducir código ni procedimientos destinados a evadir controles de acceso, verificaciones anti-bot, PoToken/BotGuard, restricciones geográficas o límites impuestos por YouTube.

## 6. Qué falta para declarar el objetivo logrado

- Obtener el script oficial de Grayjay completo desde FUTO; la copia alojada en GitHub es demasiado grande para el visor y el fetch de contenido disponible.
- Revisar formalmente AGPL-3.0 antes de cualquier reutilización.
- Definir la interfaz neutral de proveedor en TodoTube sin acoplarla a una biblioteca concreta.
- Ejecutar pruebas únicamente con medios propios o material cuya reproducción y almacenamiento estén autorizados.
- Confirmar que cada fallback representa exactamente el mismo asset y timeline.
- Probar cambio de origen preservando la posición y sin volver al segundo cero.

## Fuentes principales

- FUTO Grayjay YouTube plugin: https://github.com/futo-org/grayjay-plugin-youtube
- FUTO GitLab plugin: https://gitlab.futo.org/videostreaming/plugins/youtube
- Lux YouTube adapter: https://github.com/iawia002/lux/blob/master/extractors/youtube/youtube.go
- kkdai/youtube: https://github.com/kkdai/youtube
- Pytubefix: https://github.com/JuanBindez/pytubefix
- innertube-rs: https://github.com/caya8205-2/innertube-rs
- ytgo: https://github.com/tituscheng/ytgo
- YouTubeStreamsExtractor: https://github.com/tmk907/YouTubeStreamsExtractor
- YouTube Terms: https://www.youtube.com/t/terms
- YouTube API Developer Policies: https://developers.google.com/youtube/terms/developer-policies
