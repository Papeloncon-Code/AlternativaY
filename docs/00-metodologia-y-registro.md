# 00 · Metodología, registro de consultas y limitaciones

**Proyecto:** AlternativaY (nombre de trabajo: “YouTube Killer”)
**Metodología:** SDD, Desarrollo Guiado por Especificaciones (*Spec-Driven Development*)
**Fecha de consulta de todas las fuentes:** 2026-11-06, salvo que se indique otra.

## 1. Cómo se aplica SDD en este repositorio

SDD significa que **la especificación es el artefacto principal**: el código se deriva de ella y no al revés. Cada fase produce un documento revisable antes de pasar a la siguiente.

| Paso SDD | Artefacto | Ubicación |
|---|---|---|
| 0. Principios no negociables | Constitución | `specs/000-constitucion/constitucion.md` |
| 1. Investigación (evidencia) | Catálogo, fichas, comparativa, usuarios, legal | `docs/research/01…05` |
| 2. Especificación (qué y por qué) | Requisitos, funcionalidades, prioridades | `specs/001-plataforma/spec.md` |
| 3. Plan técnico (cómo) | Arquitectura, stack, módulos, UX, roadmap, riesgos | `specs/001-plataforma/*.md` |
| 4. Especificación del MVP | Alcance cerrado y criterios de aceptación | `specs/002-mvp/spec.md` |
| 5. Tareas | Lista ordenada y trazable a requisitos | `specs/002-mvp/tasks.md` |
| 6. Implementación | Código (fuera del alcance de esta entrega) | `apps/`, `packages/` (futuro) |

Reglas de trazabilidad:
- Cada requisito tiene un ID (`RF-xxx` funcional, `RNF-xxx` no funcional, `RL-xxx` legal).
- Cada tarea del MVP referencia uno o más IDs.
- Ningún requisito entra en el MVP si contradice la constitución, sobre todo sus principios legales.

## 2. Niveles de evidencia usados en todos los documentos

| Etiqueta | Significado |
|---|---|
| **[V-código]** | Verificado en el código o los ficheros de build del repositorio oficial (clon superficial del 2026-11-06). |
| **[V-repo]** | Verificado en metadatos git: último commit, etiquetas o licencia. |
| **[V-doc]** | Documentación oficial del proyecto (README, docs, wiki). Es lo que el proyecto *anuncia*, no algo que yo haya probado. |
| **[S]** | Fuente secundaria: prensa, foros, Reddit/Lemmy, buscadores. |
| **[I]** | Inferencia razonada a partir de lo anterior. |
| **[NV]** | No verificado. Pendiente. |

> “Presente en el código” **no** significa “funciona bien hoy”. Ninguna aplicación se instaló ni se probó en un dispositivo (ver §5).

## 3. Procedimiento seguido

1. **Identificación de repositorios oficiales**, con búsqueda web y comprobación del README y la cadena de forks.
2. **Clon superficial** (`git clone --depth 1 --filter=blob:limit=200k`) de 43 repositorios públicos para obtener:
   - la fecha del último commit de la rama por defecto,
   - la etiqueta más alta (`git ls-remote --tags`, ordenada por versión),
   - la licencia, leída del fichero LICENSE/COPYING.
3. **Inspección de dependencias** en `build.gradle(.kts)`, `libs.versions.toml` y `package.json`.
4. **Matriz de evidencia en código**: búsqueda de palabras clave por funcionalidad (PiP, cast, SponsorBlock, PoToken, SABR…) en ficheros `.kt`, `.java` y `.xml`. Es un indicio, no una prueba (ver §5).
5. **Búsqueda web** de estado, incidencias, opiniones de usuarios y marco legal (16 búsquedas).
6. **Intento de lectura directa** de los Términos de YouTube, las Developer Policies de la API y la política de Google Play. **Falló**: la red de esta sesión no resuelve `www.youtube.com`, `developers.google.com` ni `support.google.com`. Las citas legales proceden de extractos de buscador de esas páginas oficiales y se marcan así.

Los datos en bruto están en `docs/research/evidencia/`.

## 4. Registro de consultas

| # | Consulta / acción | Resultado clave |
|---|---|---|
| 1 | Clon de 43 repositorios (GitHub, Codeberg) | 37 correctos, 6 fallidos (revanced-patches, VueTube, NouTube, libtube, GitLab de FUTO; ver catálogo). |
| 2 | Búsqueda “Flow” cliente YouTube | Proyecto exacto: **Flow-Tube/Flow** (originalmente A-EDev/Flow). Decenas de forks homónimos. |
| 3 | PipePipe: ubicación | GitHub InfinityLoop1308 (repo principal y cliente) y espejo en Codeberg NullPointerException. |
| 4 | SABR y PoToken 2025–2026 | YouTube impone SABR por cliente; el PoToken está ligado al ID de vídeo (wiki de yt-dlp). |
| 5 | Estado de Piped 2026 | Backend con poca actividad (último commit 2026-05-30); hay incidencias del tipo “Is Piped dead?”. |
| 6 | ReVanced 2026 | Retirada por DMCA de Morphe (fork); se trasladó a GitLab. |
| 7 | Grayjay: licencia | *Source First License 1.1*: solo uso no comercial. No es software libre. |
| 8 | Términos de YouTube | Prohíben descargar salvo enlace autorizado y el acceso automatizado sin permiso (extracto). |
| 9 | Developer Policies de la API | Prohíben reproducción en segundo plano, bloquear anuncios, separar audio y vídeo, y descargar o almacenar en caché. |
| 10 | Caso youtube-dl / Uberspace | OLG Hamburgo, 5 U 54/23 (21-11-2024): el *rolling cipher* es una medida técnica eficaz de protección. |
| 11 | Google Play | Las retiradas se justifican con la política *Device and Network Abuse*. |
| 12 | Cuota de la YouTube Data API | 10 000 unidades/día por proyecto y 100 llamadas `search.list`; para ampliar hace falta una auditoría. |
| 13 | Compose Multiplatform web | Beta (CMP 1.9, sept. 2025). No es estable a la fecha de consulta [S]. |
| 14 | Quejas de usuarios | “Sign in to confirm you’re not a bot”, errores 403, roturas tras cambios de YouTube, sincronización. |

## 5. Limitaciones de esta investigación (leer antes de decidir)

1. **No se probó ninguna app en un dispositivo.** Las puntuaciones de UX, batería, memoria y estabilidad se basan en documentación e informes de usuarios, no en mediciones. Son **provisionales**.
2. **No pude usar la API de GitHub** para repositorios ajenos (la sesión la bloquea). Por eso no hay estrellas, número de issues ni fechas de creación exactas. Las fechas de creación salen de fuentes secundarias o quedan como [NV].
3. **Clon con filtro de 200 KB**: los ficheros más grandes no se descargaron. La matriz de palabras clave puede infravalorar algunas funcionalidades.
4. **En Grayjay, las fuentes son plugins JS en repositorios aparte**: su código de YouTube, PeerTube, etc. no se analizó.
5. **Las fuentes legales primarias no se leyeron directamente** (bloqueo de red). Antes de cualquier lanzamiento comercial es obligatorio que las lea un abogado.
6. **Reddit no es accesible directamente.** Las opiniones de usuarios proceden de espejos, Lemmy, foros de GrapheneOS/F-Droid/Privacy Guides y de issues citadas por buscadores. La muestra es pequeña y la investigación cualitativa es limitada.
7. **Las fechas de 2026 de los repositorios proceden del propio git.** Son datos, no estimaciones.

## 6. Pendientes de verificación (para la siguiente iteración)

- [ ] Leer íntegramente los Términos de YouTube, las Developer Policies y los Required Minimum Functionality (RMF) de la API, una vez habilitados esos dominios en la red.
- [ ] Instalar y medir (batería, RAM, arranque) NewPipe, PipePipe, LibreTube, Grayjay y Flow en un dispositivo de referencia.
- [ ] Revisar las issues más votadas de cada repositorio, con la API de GitHub o en el navegador.
- [ ] Confirmar si `captions.download` de la Data API permite descargar subtítulos de vídeos ajenos (hipótesis: no).
