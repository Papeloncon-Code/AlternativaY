# 04 · Investigación de usuarios

Consulta: 2026-11-06.

**Limitación importante:** Reddit no es accesible directamente desde esta sesión. La evidencia procede de:
- espejos de Reddit;
- Lemmy;
- foros de GrapheneOS, F-Droid y Privacy Guides;
- Hacker News;
- issues de GitHub citadas por buscadores;
- READMEs (lo que los propios proyectos destacan como reclamo).

La muestra es **pequeña y cualitativa**. Las conclusiones son hipótesis priorizadas que hay que validar con una encuesta o entrevistas (ver §5).

## 1. Respuestas a las preguntas de investigación

| Pregunta | Respuesta (evidencia) |
|---|---|
| ¿Por qué abandonan la app oficial de YouTube? | (1) Anuncios; (2) segundo plano de pago; (3) rastreo; (4) distracciones (Shorts, recomendaciones adictivas); (5) descargas limitadas. Evidencia: todos los clientes anuncian estos puntos como reclamo principal, por ejemplo FreeTube (“without Google tracking you”) y SkyTube (“no adverts”) [V-doc]. Los ajustes “distraction free” de FreeTube y el bloqueo de Shorts de PipePipe [V-doc] muestran demanda de control. |
| ¿Por qué usan PipePipe o NewPipe? | NewPipe: privacidad, sin cuenta, ligereza, popup y cola [S: AlternativeTo, HN]. PipePipe: “NewPipe con más funciones” (SB, RYD, filtros, BiliBili, danmaku) [V-doc]. |
| ¿Qué les gusta de Grayjay? | Una sola app para muchas plataformas; los plugins se arreglan solos en horas cuando YouTube rompe algo [S: [GrapheneOS](https://discuss.grapheneos.org/d/14346-issues-with-newpipe-due-to-changes-from-youtube?page=2)]; cast; escritorio. |
| ¿Qué problemas tienen con LibreTube? | Dependencia de instancias Piped que caen [S: Piped #4270]; errores “not a bot” [S: LibreTube #6116]; frustración de usuarios que dicen que ni NewPipe ni LibreTube funcionan [S: [libretechni.ca](https://libretechni.ca/post/37752)]. |
| ¿Qué echan de menos? | Chromecast en NewPipe (issue [#668](https://github.com/TeamNewPipe/NewPipe/issues/668), abierta desde 2017 [S]); sincronización entre dispositivos (Grayjay sync con incidencias, historial que no se sincroniza [S]); comentarios propios (no se puede comentar en NewPipe [S]). |
| ¿Qué llevan años pidiendo? | Chromecast (desde 2017), sincronización e integraciones de terceros (SB/RYD), que provocaron forks como Tubular y PipePipe [V-repo]. |
| ¿Cómo sería la app ideal? | [I] Lo que funciona hoy en varias apps a la vez: interfaz moderna (Flow/LibreTube) + estabilidad (NewPipe) + multiplataforma (Grayjay) + sincronización + cast + filtros. |
| ¿Qué les impediría cambiarse? | (1) **Perder suscripciones e historial**, de ahí que la importación sea obligatoria [I]; (2) que la nueva app “se rompa” más; (3) que pida cuenta o recoja datos; (4) que no tenga YouTube (barrera crítica para nuestra estrategia legal, ver doc 05). |

## 2. Separación: problemas recurrentes frente a opiniones aisladas

| Necesidad / problema | Fuentes independientes | Clasificación |
|---|---|---|
| Que funcione sin romperse (bloqueos de YouTube) | 6 o más (GrapheneOS, Privacy Guides, Lemmy, issues de Grayjay y LibreTube, F-Droid) | **Recurrente, crítico** |
| Sin anuncios | Todas las apps la anuncian | **Recurrente** (prerrequisito) |
| Segundo plano | Todas | **Recurrente** |
| Descargas | La mayoría | **Recurrente** |
| SponsorBlock | 7 de 9 apps Android lo implementan; existen forks motivados por ello | **Recurrente** |
| Sincronización entre dispositivos | Grayjay (issues), LibreTube (vía Piped), ausencias señaladas | **Recurrente, mal resuelto** |
| Chromecast | Issue de NewPipe desde 2017 y comentarios en HN y gHacks | **Recurrente, mal resuelto** |
| Multiplataforma (varias fuentes) | Grayjay, PipePipe | Recurrente (segmento) |
| Interfaz moderna | Recomendaciones de LibreTube y Flow | Recurrente (segmento) |
| Sin distracciones / control | FreeTube, PipePipe, SkyTube | Recurrente (segmento) |
| Comentar o interactuar | NewPipe (no se puede) | Moderado |
| Danmaku | PipePipe | **Aislado / nicho** |
| Música con letras | Flow, familia InnerTune | Segmento separado (YT Music) |
| Funciones de IA | **0 fuentes** de usuarios en esta investigación | **Hipótesis no validada** |

## 3. Listado priorizado de necesidades reales

1. **Fiabilidad**: que reproduzca siempre.
2. **No perder mis datos**: importación, exportación y sincronización.
3. **Sin anuncios, rastreo ni cuenta obligatoria.**
4. **Segundo plano, PiP y descargas.**
5. **Control del feed**: filtros, sin Shorts, grupos de suscripciones.
6. **Cast a la TV.**
7. **Interfaz moderna y rápida.**
8. **Varias plataformas en una sola app.**
9. **Saltar patrocinios.**
10. *(Hipótesis)* IA: resúmenes y búsqueda dentro del vídeo.

## 4. Implicación para la estrategia (anticipo del doc 05)

Las necesidades 1, 3 y 4 son exactamente las que **los Términos de YouTube y las políticas de su API prohíben** cuando el contenido es de YouTube: sin anuncios, segundo plano y descargas. Esto genera una **tensión irreconciliable**:

- **Opción A:** competir en el mismo terreno que NewPipe, PipePipe y Flow. Requiere eludir controles técnicos, algo que el propio encargo prohíbe y que es frágil.
- **Opción B:** competir con **otra propuesta de valor**, donde YouTube es una fuente más, integrada de forma oficial y con sus limitaciones, y el valor diferencial está en lo que se hace sobre **todo el contenido legítimo**.

La necesidad 10 (IA) no está validada con usuarios. **No debe ser el pilar del MVP** hasta validarla.

## 5. Validación pendiente (antes de la fase 2 de desarrollo)
- Encuesta (n ≥ 200) en r/fossdroid, r/degoogle, Lemmy y el Matrix de F-Droid. Preguntas clave:
  1. ¿Usarías una app sin YouTube integrado sin anuncios?
  2. ¿Qué fuentes, aparte de YouTube, consumes (podcasts, PeerTube, Nebula, Jellyfin, ficheros locales)?
  3. ¿Pagarías por la sincronización o la IA?
- 10 entrevistas a usuarios de Grayjay y FreeTube, que ya aceptan que el producto vaya más allá de YouTube.
