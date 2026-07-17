# Prompts importantes — TalentBridge V3

Registro de prompts significativos usados en este proyecto, para reutilizar el enfoque en proyectos futuros. No se guardan prompts triviales ("arreglá esto", preguntas puntuales) — solo los que establecieron un flujo de trabajo, dispararon una fase completa, o vale la pena reusar como plantilla.

---

## Auditoría y corrección integral pre-presentación de grado

**Objetivo del prompt:** Pedir una revisión y corrección exhaustiva de todo el frontend (40 módulos listados explícitamente) más una lista larga de síntomas posibles (undefined visible, logos rotos, fechas en inglés, botones sin acción, tablas mal alineadas, etc.) para dejar el proyecto "listo para presentación de proyecto de grado".
**Fecha:** 2026-07-17
**Prompt usado (resumen):** Rol asignado ("arquitecto senior frontend, auditor de calidad, diseñador UX/UI, desarrollador Angular experto y documentador técnico"), 25 reglas absolutas de seguridad (no Docker version1, no comandos destructivos, no borrar datos/usuarios/empresas/vacantes demo, no commit automático, git status antes/después, build después de cada cambio), objetivo de diseño general (paleta azul, fechas colombianas, estados traducidos, sin textos técnicos), 40 módulos a revisar, comandos `rg` sugeridos para buscar síntomas específicos, y un proceso de 32 pasos terminando en un reporte final con criterios de aceptación explícitos (35 puntos, todos verificables).
**Resultado esperado:** No reescribir 40 módulos a ciegas — levantar la app real, verificar en vivo qué del pedido describe el estado actual (mucho ya estaba resuelto de sesiones previas), y corregir solo lo confirmado como bug real, documentando tanto lo corregido como los falsos positivos descartados.
**Notas:** Este prompt asumía (razonablemente, sin verificarlo) que gran parte de la lista de síntomas estaba presente — la auditoría en vivo mostró que no era así. **Plantilla reusable**: ante un pedido de "arreglar todo" con una lista larga de síntomas hipotéticos, el primer paso correcto no es empezar a corregir la lista ítem por ítem, sino levantar el sistema real y confirmar cuáles de esos síntomas existen hoy — ver skill #15 en `REUSABLE_SKILLS.md`. La paleta "azul" pedida en este prompt específicamente **no se aplicó** porque contradice una decisión de producto ya tomada y documentada (paleta teal, ver `DECISIONS.md`) — se marcó la discrepancia en vez de revertir silenciosamente una decisión previa.

---

## Delegación de decisiones pendientes

**Objetivo del prompt:** Resolver rápido dos puntos que quedaron abiertos al final de la auditoría (paleta de color y una lista de pendientes menores) sin frenar el trabajo esperando respuesta a cada uno por separado.
**Fecha:** 2026-07-17
**Prompt usado (texto completo):** *"manten teal y toma las decisiones que creas mejores"*
**Resultado esperado:** Confirmar la paleta teal (sin acción de código, ya era el estado real) y usar criterio propio para el resto de los pendientes de bajo riesgo — no para los que requerían confirmación explícita puntual ya establecida en otro lado (ver Fase 0.1).
**Notas:** Una delegación general ("tomá las decisiones que creas mejores") **no** se interpretó como cubriendo el borrado/regeneración de datos reales (habilidades del perfil demo) — esa regla específica pide un "sí" puntual a esa pregunta exacta, no una autorización genérica; se dejó sin tocar. Sí se usó la delegación para: decidir no perseguir una mejora cosmética de bajo valor (siglas técnicas en titlecase), ejecutar un backfill de datos seguro (solo `UPDATE`, no destructivo) sin volver a preguntar, y continuar una segunda ronda de auditoría en vivo que encontró un bug real adicional (mensajes de chat duplicados). **Plantilla reusable**: una delegación amplia de decisiones no anula reglas de seguridad ya establecidas con un umbral de confirmación más alto (ej. borrado de datos) — esas siguen necesitando su confirmación específica aunque el resto del trabajo se autorice en bloque.

## Continuar plan de mejoras UX por fases

**Objetivo del prompt:** Retomar un plan de mejoras de frontend ya documentado (con fases numeradas y bitácora) sin tener que re-explicar el contexto completo cada vez.
**Fecha:** 2026-07-16
**Prompt usado (resumen):** *"quiero que continues haciendo la mejora que estaba en curso"* — sin especificar cuál, apoyándose en que el plan ya estaba documentado en `docs/plan-mejoras-frontend-ux.md` con checkboxes de fases completas/pendientes y una bitácora de avance.
**Resultado esperado:** Retomar exactamente en la primera fase con checkbox `[ ]` (no re-hacer fases ya marcadas `[x]`), completar fases en orden, verificar cada una con lint+build, y actualizar el plan (checkbox + bitácora) al cerrar cada fase.
**Notas:** Funciona porque el plan tiene **estado explícito por fase** (`[x]`/`[ ]`) y una bitácora con fecha/resumen/archivo — sin eso, "continuá lo que estabas haciendo" es ambiguo entre sesiones. **Plantilla reusable**: cualquier plan de trabajo largo debería tener este mismo formato (checkbox + bitácora con qué se hizo y cómo se verificó) para poder retomarse así de simple.

---

## Establecer flujo de trabajo permanente + documentación obligatoria

**Objetivo del prompt:** Que el asistente deje de trabajar solo con "cambios sueltos" y pase a operar como en un equipo profesional: documentar, explicar, organizar y dejar trazabilidad en cada tarea, de forma persistente entre sesiones.
**Fecha:** 2026-07-16
**Prompt usado (resumen):** Instrucción extensa estableciendo: (1) reglas generales de seguridad (no destructivo, no tocar Docker version1, no borrar datos/volúmenes, no commit automático, revisar `git status` antes/después, build correspondiente tras cada cambio); (2) 13 documentos obligatorios en `docs/` con contenido específico por archivo (overview, arquitectura, guías frontend/backend, DB, changelog, decisiones, bugs, testing checklist, skills reutilizables, prompts, next steps, fases); (3) `CLAUDE.md` en la raíz con instrucciones para que cualquier agente retome el proyecto; (4) flujo de 9 pasos para cada tarea futura (entender → revisar archivos → `git status` → explicar plan → cambios mínimos → probar → build → documentar → reporte final); (5) plantilla de reporte final de 10 puntos.
**Resultado esperado:** Bootstrap completo de la documentación (esta sesión), y que **todas las tareas futuras** en este proyecto (y proyectos similares) sigan el mismo flujo sin tener que repetir la instrucción.
**Notas:** Esto quedó guardado también como memoria persistente del asistente (no solo en este archivo) para que aplique automáticamente en conversaciones futuras sobre este proyecto. **Plantilla reusable para cualquier proyecto nuevo**: los 13 documentos + `CLAUDE.md` + flujo de 9 pasos es un esqueleto de gobierno de proyecto que vale la pena instanciar temprano, no solo cuando ya hay deuda de documentación acumulada. El listado de fases (`PHASES.md`) que pedía este prompt como ejemplo genérico ("Fase 1: ajustes visuales, Fase 2: contratos y ofertas...") **no coincidía con el estado real del proyecto** (esos módulos ya existen, no son fases futuras) — se adaptó `PHASES.md` a las fases reales en curso (el plan UX de `plan-mejoras-frontend-ux.md`) en vez de copiar el ejemplo literal; ver nota en ese mismo archivo.

---

## Rediseño de UX puntual sin especificar el "cómo"

**Objetivo del prompt:** Pedir una mejora de UX concreta (agregar habilidades) sin prescribir el diseño, dejando la exploración de opciones al asistente.
**Fecha:** 2026-07-17
**Prompt usado (texto completo):** *"quiero que cambies el sistema de habilidades es decir quiero que se pueda poner habilidades de manera distinta algo que funcione muchisimo mejor"*
**Resultado esperado:** No asumir un diseño único y empezar a codear — presentar 2-3 opciones concretas (con mockup/preview) vía `AskUserQuestion`, dejar que el usuario elija, e implementar solo la elegida.
**Notas:** El usuario eligió la opción marcada como recomendada ("Catálogo por categorías + búsqueda rápida") de 3 presentadas. La implementación destapó 2 bugs reales que no eran visibles en el diseño (validación de DTO backend demasiado estricta para el nuevo flujo de edición en línea; bug de flexbox en el nuevo acordeón) — ambos solo aparecieron al **probar el flujo nuevo en vivo**, reforzando por tercera vez en este proyecto (ver skill de auditoría en vivo) que construir sin verificar contra el navegador real deja bugs invisibles hasta el uso real. **Plantilla reusable**: ante un pedido de "mejorá X, no sé cómo pero que funcione mejor", preguntar con opciones concretas y visuales antes de escribir código — evita reescribir si la primera interpretación no era la que el usuario tenía en mente, y deja registro de qué alternativas se descartaron y por qué (ver `DECISIONS.md`).
