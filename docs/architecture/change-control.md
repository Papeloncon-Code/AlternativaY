# Control de cambios y protección de arquitectura

## Fuente de autoridad

- Objetivo de reproducción: `docs/adr/ADR-013-reproduccion-propia-redundante.md`.
- Principios rectores: `specs/000-constitucion/constitucion.md`.
- Contratos del broker y runtime: especificaciones 009 y 010.
- El README describe el estado operativo observado; no sustituye las ADR ni convierte una tarea pendiente en una función terminada.

Un cambio que altere el reproductor, el orden de proveedores, el Browser Bridge, los requisitos de derechos o el transporte multimedia debe incluir una ADR nueva o una revisión explícita de la ADR vigente, criterios de aceptación y pruebas. No se aceptan cambios silenciosos de dirección mediante un refactor o una actualización de dependencias.

## CODEOWNERS

`.github/CODEOWNERS` asigna la revisión de arquitectura y del reproductor a `@Papeloncon-Code`. El archivo CODEOWNERS por sí solo **no bloquea merges**.

## Protección que debe habilitarse en GitHub

Para que la revisión sea obligatoria, el propietario debe habilitar una regla de protección para la rama `main` en Settings → Branches o Rulesets:

1. Require a pull request before merging.
2. Require at least one approval.
3. Require review from Code Owners.
4. Require status checks `CI/CD` y `CodeQL`.
5. Require conversation resolution.
6. Block force pushes and branch deletion.
7. No permitir bypass de administradores si se desea que la regla también aplique al propietario.

**Estado:** este repositorio contiene CODEOWNERS y este procedimiento, pero no se declara que la regla de GitHub esté aplicada porque la integración disponible no permite leer ni modificar la configuración de protección del repositorio.

## Regla de publicación

Un PR puede pasar CI y aun así no estar listo para producción. Playback solo se declara logrado cuando un navegador real con el Bridge instalado reproduce audio y vídeo reales, permite seek, completa una prueba de cambio de fuente y se valida el sitio tras el despliegue. Las pruebas con mocks/fixtures no sustituyen esa evidencia.

Cada publicación registra el commit de `main`, la ejecución CI/CD, el estado CodeQL y el resultado del smoke test de producción.
