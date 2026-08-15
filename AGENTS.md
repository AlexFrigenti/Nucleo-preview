# Reglas para agentes de IA

Estas reglas se aplican a cualquier IA que modifique Nucleo-preview.

## Antes de actuar

1. Identifica el repositorio y la rama; nunca modifiques main directamente.
2. Lee README.md y la documentación técnica relevante.
3. Define objetivo, exclusiones y nivel T0, T1 o T2.
4. Comprueba VERSION, version.json, index.html, manifest.webmanifest, service worker y artefactos cuando el cambio los afecte.

## Flujo T0/T1/T2

- T0: cambio trivial sin comportamiento nuevo; requiere alcance breve, diff y validación.
- T1: cambio funcional; requiere spec.md, plan.md, tasks.md, criterios de aceptación y pruebas o validaciones verificables.
- T2: cambio complejo o sensible; añade decisiones, riesgos, invariantes y estrategia de compatibilidad o reversión.

Para T1/T2 usa specs/NNN-feature-name/ y las plantillas comunes de project-quality. No inventes build, cobertura, backend, TypeScript ni E2E. Este repositorio es una preview estática experimental: usa únicamente controles que existan o que puedan comprobarse de forma reproducible, como sintaxis, referencias, invariantes, coherencia de versión, PWA/service worker, caché y artefactos. No instales herramientas o dependencias nuevas sin aprobación.

Mantén Nucleo-preview separado de Nucleo. Conserva la preview estable y la textura de corteza continental aprobada; no reincorpores experimentos visuales que no formen parte del alcance aprobado.

## Validación

Ejecuta los controles reales disponibles en el repositorio y revisa el diff completo. En el estado actual no hay package.json ni validador automatizado propio:

- Build: No aplica.
- Cobertura: No aplica.
- Tipos: No aplica.
- E2E: No aplica.

Si una futura versión incorpora un comando verificable, documenta y ejecuta ese comando. Comprueba la coherencia entre VERSION, version.json y los archivos de despliegue cuando se modifiquen. Los cambios visuales o móviles requieren revisión manual controlada en los tamaños afectados.

## Entrega

La PR debe incluir alcance, exclusiones, especificación cuando corresponda, criterios, pruebas o validaciones, riesgos y cualquier control marcado como No aplica. Fusiona solo tras checks verdes, revisión y confirmación explícita, mediante merge commit; después verifica main y elimina la rama remota.