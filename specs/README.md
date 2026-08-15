# Especificaciones de cambios

Los cambios T1 y T2 deben documentarse antes de implementar en specs/NNN-feature-name/.

- spec.md: problema, objetivo, alcance, requisitos y criterios de aceptación.
- plan.md: diseño, archivos afectados, orden, pruebas y riesgos.
- tasks.md: tareas pequeñas y verificables.

Usa las plantillas comunes de project-quality:

https://github.com/AlexFrigenti/project-quality/tree/main/specs/000-template

Para Nucleo-preview, los criterios deben relacionarse con los controles que realmente puede soportar una preview estática: sintaxis, referencias, invariantes, coherencia entre VERSION y version.json, PWA/service worker, caché, artefactos y revisión visual o móvil cuando correspondan.

Build, cobertura, tipos y E2E son No aplica mientras no existan comandos o infraestructura verificable para ellos. No inventes controles ni mezcles cambios de Nucleo en este repositorio.