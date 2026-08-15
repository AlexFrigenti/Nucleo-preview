# Contribuir a Nucleo-preview

## Flujo obligatorio

1. Parte de main actualizada y trabaja en una rama independiente.
2. Lee README.md y la documentación técnica relacionada.
3. Define objetivo, exclusiones y nivel T0, T1 o T2.
4. Para T1/T2 crea specs/NNN-feature-name/spec.md, plan.md y tasks.md.
5. Implementa solo el alcance aprobado y añade pruebas de regresión o validaciones de integridad que sean reproducibles.
6. Ejecuta únicamente los controles reales disponibles en el repositorio.
7. Revisa VERSION, version.json, index.html, manifest.webmanifest, service worker, caché y artefactos si se ven afectados.
8. Abre una Pull Request hacia main.
9. Fusiona solo tras checks verdes, revisión y confirmación explícita, usando merge commit.
10. Verifica main y elimina la rama remota después del merge.

## Controles aplicables

Nucleo-preview es una preview estática experimental sin package.json ni validador automatizado propio. Son aplicables los controles de sintaxis, referencias, invariantes, coherencia de versión, PWA/service worker, caché, artefactos y revisión visual o móvil cuando el cambio los afecte.

En el estado actual, build, cobertura, tipos y E2E son No aplica. No se crean comandos ficticios ni se instalan dependencias para aparentar controles. La preview se mantiene independiente de Nucleo y debe conservar la textura de corteza continental aprobada, salvo que el alcance aprobado indique otra cosa.

## Plantillas comunes

https://github.com/AlexFrigenti/project-quality/tree/main/specs/000-template

https://github.com/AlexFrigenti/project-quality/blob/main/docs/superpowers/specs/2026-08-15-official-ai-development-flow-design.md