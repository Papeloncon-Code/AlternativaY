# ADR-008 · Nombre del producto y tamaño del equipo

- **Estado:** Aceptado por el propietario (2026-11-07)

## Decisión
1. **Nombre:** **TodoTube**. El repositorio sigue llamándose AlternativaY.
2. **Equipo:** **una persona** (el propietario). Escenario **E1** del roadmap (`specs/001-plataforma/plan.md` §3).

## Comprobaciones sobre el nombre (2026-11-07)
- **Riesgo de marca de YouTube:** menor que con “YouTube” en el nombre (RL-11). No se encontraron reclamaciones de marca contra clientes con “Tube” en el nombre, como LibreTube, FreeTube o SkyTube, que llevan años publicados [S: búsqueda sin resultados; ausencia de evidencia, no prueba].
- **Productos con nombre parecido** [S]:
  - [ToDoTube para Firefox](https://addons.mozilla.org/firefox/addon/todotube/): extensión que sustituye las recomendaciones de YouTube por tareas;
  - [ToDoTube para iOS](https://apps.apple.com/us/app/id6445890502): planificador de vídeos.
  - Los dos son pequeños y de otra categoría, pero pueden confundir en las búsquedas de las tiendas.
- **Pendiente:**
  - buscar “TodoTube” en los registros de marcas (EUIPO, USPTO y la oficina del país de la empresa);
  - comprobar la disponibilidad del dominio y del identificador del paquete Android (p. ej. `app.todotube`).

## Consecuencias de ser una sola persona
- El MVP completo de `specs/002-mvp/spec.md` se estimó en **36–52 semanas** a tiempo parcial. Para tener algo usable antes, el alcance debe reducirse (propuesta “MVP-solo”, pendiente de aprobación).
- **Bus factor 1** (riesgo R6): especificaciones, ADR y tests son la defensa principal; sin documentación, el proyecto no sobrevive a una pausa.
