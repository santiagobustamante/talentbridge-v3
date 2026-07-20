# Plan de fases — TalentBridge V3

> **Nota sobre este documento:** la instrucción original que pidió este archivo incluía un ejemplo de fases genérico ("Fase 1: ajustes visuales básicos, Fase 2: contratos y ofertas, Fase 3: postulaciones, Fase 4: habilidades, Fase 5: experiencia, Fase 6: educación, Fase 7: chatbot IA, Fase 8: arquitectura, Fase 9: pruebas finales"). Ese listado **no corresponde al estado real del proyecto**: contratos/ofertas, postulaciones, habilidades, experiencia y educación ya son módulos implementados y funcionando (ver `PROJECT_OVERVIEW.md`), no fases futuras por hacer — y el proyecto ya tenía un plan de fases propio, en curso, documentado en [`plan-mejoras-frontend-ux.md`](./plan-mejoras-frontend-ux.md). Documentar el ejemplo genérico como si fuera el plan real hubiera sido documentación falsa. Este archivo refleja **las fases reales**, con referencia a la fuente original de cada una. Si el usuario quiere además un roadmap de fases *futuras* con esos nombres (ej. una v4 con chatbot con IA real en vez de reglas), se arma como un plan nuevo y separado — no reemplaza a este.

## Plan vigente: Mejoras UX/Producto (`plan-mejoras-frontend-ux.md`)

Basado en una auditoría de código + navegación en vivo del 2026-07-11, más 14 decisiones de producto tomadas ese mismo día. Es un plan más amplio que `plan-consistencia-css.md` (sistema de diseño base, ya completo, y sobre el que este plan se construye).

### Fase 0 — Preparación
**Objetivo:** Fijar los tokens de la paleta nueva antes de tocar código, y marcar qué dato real necesita confirmación antes de borrarse.
**Tareas:** 0.1 pedir confirmación puntual para limpiar ~150 habilidades del perfil demo · 0.2 fijar tokens de la paleta Teal.
**Módulos:** Sistema de diseño, datos de seed.
**Estado:** Completa (0.2 y 0.1). 0.1 cerrada 2026-07-16 — el usuario respondió "sí, autorizo" explícitamente; ver `CHANGELOG.md` y `DECISIONS.md` para el detalle del cambio de datos.
**Criterios de aceptación:** 0.2 — tokens documentados y usados de forma mecánica en Fase 2. 0.1 — el usuario respondió explícitamente sí/no a la pregunta puntual. Cumplido.
**Pruebas:** N/A (preparación). 0.1 verificada por query SQL antes/después.
**Pendientes:** Ninguno.

### Fase 1 — Identidad de marca unificada
**Objetivo:** Un solo nombre de marca ("TalentBridge") en toda la app.
**Tareas:** Reemplazar "Portafolio Inteligente"/logo "PI" en login/register/company-login/company-register, unificar footer del portafolio público.
**Módulos:** Frontend — auth, portafolio público.
**Estado:** Completa.
**Criterios de aceptación:** Cero apariciones de "Portafolio Inteligente" ni de la clase muerta `.brand-letters` (verificado por grep). `ng build` limpio.
**Pruebas:** Grep + build. Confirmación visual pendiente (arrastrada hasta Fase 11).
**Pendientes:** Ninguno propio de esta fase.

### Fase 2 — Paleta Teal profesional
**Objetivo:** Migrar la marca de azul a teal (`#0f766e`).
**Tareas:** Redefinir tokens en `styles.scss`, cambiar tema Material (`$azure-palette` → `$cyan-palette`), corregir mismatch de `mat-checkbox`.
**Módulos:** Frontend — sistema de diseño global.
**Estado:** Completa (en código). Ver decisión completa en `DECISIONS.md`.
**Criterios de aceptación:** `--accent-purple` (identidad empresa) sigue claramente distinguible del nuevo `--primary`. `lint:css` + `ng build` limpios.
**Pruebas:** Lint + build. Confirmación visual pendiente (Fase 11).
**Pendientes:** Ninguno propio de esta fase.

### Fase 3 — Chatbot Joaquín
**Objetivo:** Que el asistente flotante no tape modales ni el chat real.
**Tareas:** Bajar z-index (10000-10002 → 900-902), ocultar en `/app/messages`, mensaje de error genérico sin exponer texto crudo de excepción HTTP.
**Módulos:** Frontend — `shared/assistant/`.
**Estado:** Completa.
**Criterios de aceptación:** Z-index del asistente siempre por debajo de cualquier modal (≥1000). Invisible dentro de Mensajes.
**Pruebas:** Lint + build.
**Pendientes:** Ninguno.

### Fase 4 — Eliminar duplicaciones
**Objetivo:** Un solo componente por responsabilidad, sin implementaciones paralelas.
**Tareas:** 4.1 eliminar `ProfileEditorComponent` (UI muerta, campo "Profesión" nunca se guardaba) · 4.2 eliminar `dashboard.component.ts` sin ruta ni referencias · 4.3 unificar render de portafolio (`public-portfolio`/`public-preview`) en `PortfolioContentComponent`.
**Módulos:** Frontend — perfil, dashboard, portafolio público.
**Estado:** Completa (4.1, 4.2, 4.3).
**Criterios de aceptación:** Cero referencias activas antes de borrar (verificado por grep en 4.1/4.2). Un solo componente de render de portafolio consumido por ambos wrappers (4.3).
**Pruebas:** Grep de referencias + lint + build en cada sub-fase.
**Pendientes:** Ninguno.

### Fase 5 — Bugs funcionales puntuales
**Objetivo:** Corregir 6 bugs concretos del informe de auditoría.
**Tareas:** Ver detalle en `BUGS_AND_FIXES.md` (BUG-001 a BUG-006).
**Módulos:** Landing, company-jobs, messages, profile, company-dashboard, auth.
**Estado:** Completa.
**Criterios de aceptación:** Los 6 bugs verificados por build; BUG-001 resultó tener 2 causas adicionales, ambas corregidas.
**Pruebas:** Lint + build. Confirmación visual pendiente (Fase 11).
**Pendientes:** Ninguno propio de esta fase.

### Fase 6 — Estados y errores consistentes
**Objetivo:** Estados vacíos y errores de red manejados de forma uniforme, sin diálogos nativos del navegador.
**Tareas:** 6.1 `EmptyStateComponent` compartido · 6.2 manejo de error faltante en 5 puntos (BUG-007) · 6.3 reemplazar `confirm()` nativo y diálogo de bloqueo hecho a mano por `ConfirmDialogComponent`.
**Módulos:** Dashboards, mensajes, portafolio (skills/experiencia/educación/proyectos), company-jobs.
**Estado:** Completa.
**Criterios de aceptación:** Cero usos de `confirm()` nativo (verificado por grep). Todo `subscribe()` que muta datos tiene callback `error`.
**Pruebas:** Grep + lint + build.
**Pendientes:** Ninguno.

### Fase 7 — Fecha y traducciones unificadas
**Objetivo:** Un solo formato de fecha y una sola traducción de estado en toda la app.
**Tareas:** Helper único de fecha (`appDate`/`formatAppDate`), helper de traducción estado→texto (`statusToLabel`), reusar `GithubWarningComponent` en las 4 copias del aviso legal.
**Módulos:** Global (`app.config.ts`) + 11 componentes.
**Estado:** Completa. Incluyó un hallazgo no documentado en la auditoría original: `LOCALE_ID` nunca configurado (BUG-002).
**Criterios de aceptación:** Cero usos del pipe `date` nativo o `toLocaleDateString` a mano (verificado por grep). Cero copias del aviso de GitHub fuera del componente compartido.
**Pruebas:** Grep + lint + build.
**Pendientes:** Ninguno.

### Fase 8 — Flujo guiado del candidato (feature nueva)
**Objetivo:** Progreso de perfil y coincidencia de habilidades con señal visual real, no solo texto.
**Tareas:** 8.1 checklist "Completá tu perfil" con anillo de progreso · 8.2 indicador de coincidencia con barra + porcentaje.
**Módulos:** Dashboard candidato, ofertas de trabajo.
**Estado:** Completa.
**Criterios de aceptación:** El checklist refleja la regla real de completitud del backend (no una aproximación). La barra de match usa datos ya devueltos por la API (sin cambios de backend).
**Pruebas:** Lint + build.
**Pendientes:** Ninguno.

### Fase 9 — Logos de empresa realistas
**Objetivo:** Reemplazar iniciales/placeholder por logos ficticios de calidad profesional en el seed.
**Módulos:** Frontend (assets) + Backend (`prisma/`).
**Estado:** **Completa** — corregida dos veces el 2026-07-17. Primera corrección: se encontró que ya existían 11 logos SVG y `logoUrl` poblado en la base (contra el hallazgo previo de "no iniciada"). Segunda corrección, misma fecha, sesión posterior: la primera verificación no notó que esos 11 SVG eran **una sola silueta abstracta genérica repetida sin variación entre las 61 empresas** (5-6 empresas por archivo) — el usuario lo vio en una captura ("una M en un cuadrado morado") y pidió corregirlo de verdad. `generate-company-logos.ts` genera ahora una marca única por empresa (22 siluetas × 22 colores, sin repetir combinación, con preferencia temática por sector cuando aplica). Verificado por conteo: 61 empresas, 61 `logoUrl` distintos.
**Criterios de aceptación:** Logos reales (no iniciales, no `ui-avatars`) y **distintos entre sí** visibles en los puntos de la app donde aparece una empresa. Cumplido, verificado por consulta a la base y por carga real de imagen (`naturalWidth`) en el header y en el perfil empresarial.
**Pruebas:** Ver `CHANGELOG.md` para el detalle completo de ambas rondas.
**Pendientes:** Ninguno para esta fase específica. Nota separada: algunas ofertas de seed tienen `workload: null` (columna "Jornada" vacía) — no es parte de esta fase, ver `NEXT_STEPS.md` #3.
**Lección de proceso:** ver `REUSABLE_SKILLS.md` — "verificar que un dato existe" no es lo mismo que "verificar que el dato es el correcto/distintivo esperado"; una auditoría puede confirmar presencia sin notar que el contenido real no cumple el objetivo original.

### Fase 10 — Adopción final de componentes + limpieza
**Objetivo:** Terminar de migrar botones hechos a mano a `appButton` donde corresponda; evaluar adopción de `Card`.
**Tareas:** Migración de 6 puntos a `appButton` (4 formularios de auth + `company-view` + botón de contacto en `company-candidates`); evaluación (y descarte justificado) de otros puntos; actualización de `styles/README.md`.
**Módulos:** Auth, company-view, company-candidates, sistema de diseño.
**Estado:** Completa (con alcance reducido a propósito — ver `DECISIONS.md`, entrada "Card compartido").
**Criterios de aceptación:** Los 4 formularios de auth sin `!important` de override. Guía de diseño al día con todos los componentes nuevos de las Fases 4-10.
**Pruebas:** Lint + build.
**Pendientes:** `Card` compartido sigue en cero usos (deuda documentada, no bloqueante).

### Fase 11 — Verificación final
**Objetivo:** Confirmar visualmente en navegador real que todo lo de las Fases 1-10 se ve y funciona como se espera.
**Tareas:** `lint:css` + `ng build` limpios (ya verificado en cada fase individual) + revisión visual completa desktop/mobile de los 4 módulos prioritarios (portafolio/perfil público, trabajos/postulaciones, panel empresa, chat/Joaquín) + checklist final contra hallazgos críticos/medios del informe original.
**Módulos:** Todos.
**Estado:** **Parcial** — actualizado 2026-07-17: se consiguió acceso a navegador real (Playwright + Edge local) y se auditaron en vivo landing, login, dashboard candidato, perfil, habilidades, trabajos, mis postulaciones, modal de detalle, CV, mensajes, dashboard empresa, perfil empresa, candidatos, vacantes publicadas, nueva oferta, postulaciones recibidas, registro (candidato/empresa), editar oferta y envío real de un mensaje de chat (WebSocket). Quedan sin auditar en vivo: accesibilidad, tablet, doble postulación (409), rechazo de CV >5MB — ver `NEXT_STEPS.md` #4.
**Criterios de aceptación:** Cada ítem de `TESTING_CHECKLIST.md` marcado `[x]`.
**Pruebas:** Manual, en navegador real. Ver Fase 12 para el detalle de esta ronda.
**Pendientes:** Ver `NEXT_STEPS.md` #4.

---

## Fase 12 — Auditoría en vivo y pulido de presentación (2026-07-17)

**Objetivo:** Ante un pedido de revisar y corregir "todo" en 40 módulos del frontend para dejar el proyecto listo para presentación de grado, verificar en vivo qué de eso realmente estaba roto antes de reescribir a ciegas.
**Tareas:** Levantar la app real (ya estaba corriendo: Docker + 10 microservicios + frontend) y recorrerla con navegador automatizado como candidato y como empresa; corregir solo lo confirmado como bug real. Continuación (mismo día, tras "mantené teal y tomá las decisiones que creas mejores"): backfill de datos de seed incompletos y una segunda ronda de auditoría en vivo (registro, editar oferta, envío real de chat) que encontró un cuarto bug real.
**Módulos:** `AppShellComponent`/`CompanyShellComponent` (sidebar), `company-jobs` (tabla de vacantes), `company-candidates` (búsqueda), `candidate-jobs` (chips de coincidencia), `messages` (duplicación de mensajes), `BACKEND/prisma/` (backfill de jornada).
**Estado:** Completa.
**Criterios de aceptación:** Los 4 bugs confirmados (BUG-009/010/011/012 en `BUGS_AND_FIXES.md`) corregidos y verificados en vivo. Backfill de `workload` aplicado (68 ofertas). `lint:css` + `ng build` limpios en ambas rondas. Conversación demo real limpia de mensajes de prueba al terminar.
**Pruebas:** Captura de pantalla y/o conteo de elementos del DOM antes/después de cada fix contra el servidor de desarrollo real, no solo contra el build. Ver decisión de metodología en `DECISIONS.md` ("Auditar en vivo con navegador automatizado..." y su adenda sobre selectores de verificación incorrectos).
**Pendientes:** Ver `NEXT_STEPS.md` — módulos sin auditar en vivo listados en la Fase 11 (accesibilidad, tablet, doble postulación, rechazo de CV >5MB).

---

## Fase 13 — Rediseño del registro de habilidades + matching por nivel (2026-07-16)

**Objetivo:** Ante el pedido explícito del usuario de cambiar el "sistema en que el candidato registra sus habilidades" (lo encontraba impreciso y feo) y de implementar la dirección de "matching más preciso" ya validada en un mockup previo, rediseñar ambas cosas sin romper compatibilidad con datos existentes.
**Tareas:** Nuevo `LevelMeterComponent` compartido (barra segmentada + descripción de nivel) reemplazando badge+barra+puntos redundantes · catálogo de habilidades cambiado de acordeón a búsqueda + chips de categoría de un nivel · `computeSkillMatch` compartido (`libs/contracts`) con nivel requerido opcional vía convención `"Nombre:NIVEL"` (sin migrar schema) · control de nivel mínimo opcional en el formulario de oferta de la empresa · desglose por habilidad (cumple/nivel insuficiente/falta) en las tarjetas de oferta del candidato.
**Módulos:** Frontend — `skills`, `jobs` (candidato y empresa) · Backend — `jobs-service`, `applications-service`, `libs/contracts`.
**Estado:** Completa.
**Decisiones de producto tomadas con el usuario:** los 4 niveles de habilidad del candidato (Básico/Intermedio/Avanzado/Experto) se mantuvieron sin cambios — solo se rediseñó la presentación; la elegibilidad para postular sigue siendo por presencia de nombre, no por nivel (no bloquea a nadie que hoy podía postularse) — el nivel solo afecta qué tan preciso es el % de coincidencia mostrado. Ver `DECISIONS.md` para el detalle de por qué se evitó una migración de schema.
**Criterios de aceptación:** `ng build` + `lint:css` limpios. `nest build` limpio en los 2 servicios backend tocados y los 5 libs compartidos. Verificado en vivo end-to-end: agregar/editar habilidades como candidato, exigir nivel mínimo como empresa en una oferta real, ver el desglose de coincidencia resultante como candidato — confirmado por inspección de red, no solo visual.
**Pruebas:** Ver `CHANGELOG.md` para el detalle completo, incluido un bug encontrado y corregido en la misma sesión (el string interno `"Nombre:NIVEL"` se filtraba sin parsear en dos vistas de solo lectura).
**Pendientes:** Ninguno.

---

## Fase 14 — Español colombiano + aval de empresas + sugerencias desde el CV (2026-07-17)

**Objetivo:** Corregir un regionalismo de idioma (voseo → tuteo, pedido explícito y permanente del usuario) e implementar las 2 opciones del mockup de habilidades que faltaban por construir de verdad (aval de empresas, sugerencias desde el CV) — la tercera opción (matching más preciso) ya se había implementado en la Fase 13.
**Tareas:** Barrido completo de voseo en frontend y backend (9 instancias, 2 escritas por el propio agente en la misma sesión) · sugerencias de habilidades desde el texto ya extraído del CV, sin cambios de backend, con corrección de un bug de falsos positivos por substring plano · tabla nueva `SkillEndorsement` + endpoints de aval/desaval con regla de negocio (solo empresas con conversación o postulación previa) · UI de "Avalar" en `company-candidates` y badge read-only en `skills.component`.
**Módulos:** Frontend — `skills`, `cv-analysis`, `company-candidates`, `level-meter`, `company-jobs` (copy) · Backend — `portfolio-service`, `company-service`, schema.
**Estado:** Completa.
**Incidente evitado:** `prisma migrate dev` pidió un reset completo de la base al detectar drift preexistente en el historial de migraciones — se usó `db push` en su lugar, cero pérdida de datos (verificado por conteo de filas). Ver `DECISIONS.md` y `REUSABLE_SKILLS.md` #18.
**Criterios de aceptación:** Cero voseo real en el proyecto (verificado por grep curado + regex amplio). Sugerencias del CV sin falsos positivos de substring corto. Aval de empresas respeta la regla de relación previa (403 verificado contra una empresa sin relación). `ng build` + `lint:css` + `nest build` (4 servicios) limpios.
**Pruebas:** Ver `CHANGELOG.md` para el detalle completo de la verificación en vivo (candidato, empresa con relación, empresa sin relación).
**Pendientes:** Ninguno.

---

## Fase 15 — Unificación de tamaño/alineación de campos en todos los formularios (2026-07-17)

**Objetivo:** Corregir el bloque "Periodo" desproporcionado de `experiences` (reportado por el usuario) y, a partir de ahí, unificar altura/radio/espaciado/estados de campo en todos los formularios del frontend — no era una tarea del plan original de `plan-mejoras-frontend-ux.md` (ese plan resolvió colores y componentes compartidos Button/Badge/Card, nunca tamaño de campo), así que se documenta acá como fase nueva.
**Tareas:** Nuevo `styles/_forms.scss` (mixins `control/textarea/grid/field-full/section/section-label/period-row/checkbox-inline`) + tokens `--field-height`/`--field-textarea-min-height` en `styles.scss`, consumidos tanto por el override global de Material como por los mixins custom · rediseño del bloque "Periodo" en `experiences` y `education` (checkbox desprendido → `.period-row` flex alineado) · fix de grilla de 3 campos en `projects` · convergencia de alturas/radios/gaps en `profile`, `company-profile`, `company-jobs`, `company-candidates`, `candidate-jobs`, `skills` sin tocar templates.
**Módulos:** Frontend — `styles.scss` + `styles/_forms.scss` (nuevo) + `experiences`, `education`, `projects`, `profile`, `company-profile`, `company-jobs`, `company-candidates`, `jobs/candidate-jobs`, `skills`.
**Estado:** Completa en código/build. Verificación visual en navegador real pendiente de confirmación del usuario (ver `NEXT_STEPS.md`).
**Criterios de aceptación:** `npm run lint:css` + `ng build` limpios, sin warnings nuevos más allá de la categoría preexistente de presupuesto de bundle (ver `NEXT_STEPS.md`). El checkbox "Trabajo actual"/"Cursando actualmente" queda alineado a la altura del campo y no deja columnas huérfanas al ocultar Fecha Fin. Pendiente: confirmación visual del usuario en desktop/tablet/mobile.
**Pruebas:** Ver `CHANGELOG.md` para el detalle completo. Ver `DECISIONS.md` ("Unificar tamaños de campo con un partial SCSS de mixins...") para por qué se descartó migrar todo a Angular Material/Reactive Forms.
**Pendientes:** Confirmación visual del usuario — este entorno no tiene herramienta de captura de pantalla/navegador y ya había un `ng serve` corriendo en una sesión paralela del usuario, así que no se verificó en vivo desde acá.

---

## Plan vigente: Correcciones de seguridad y bugs reales (`plan-correcciones-seguridad-y-bugs.md`)

**Objetivo:** Cerrar los hallazgos reales (no hipotéticos) de la auditoría técnica completa del 2026-07-18 — 4 críticos de seguridad/funcionalidad, 5 altos, 3 medios. Detalle completo, con archivo/línea y criterio de aceptación por ítem, en [`plan-correcciones-seguridad-y-bugs.md`](./plan-correcciones-seguridad-y-bugs.md).
**Estado:** Planificado, sin implementar — el usuario pidió dejarlo listo para la próxima sesión ("lo haremos mañana").
**Al retomar:** Empezar por la Fase 0 (crítico) del plan, en orden, uno por uno con su propio build/prueba.

---

## Plan previo (ya completo, no vigente): Consistencia de CSS

Ver [`plan-consistencia-css.md`](./plan-consistencia-css.md) — sistema de diseño base (tokens, componentes compartidos Button/Badge/Card). Completo, es la base sobre la que se construye el plan de arriba.
