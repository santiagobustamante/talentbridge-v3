# Decisiones técnicas — TalentBridge V3

Registro de decisiones que no son obvias mirando el código, o que se descartaron a propósito (para no volver a evaluarlas de cero cada vez). Formato por decisión: Fecha / Contexto / Opciones consideradas / Decisión tomada / Motivo / Impacto / Riesgos / Cómo revertir.

---

## Auditar en vivo con navegador automatizado en vez de reescribir 40 módulos a ciegas

**Fecha:** 2026-07-17
**Contexto:** Se pidió corregir "absolutamente todo" en 40 módulos del frontend, con una lista larga de posibles síntomas (undefined visible, logos rotos, fechas en inglés, botones sin acción, etc.) para dejar el proyecto listo para una presentación de grado.
**Opciones consideradas:** (a) recorrer los 40 módulos línea por línea aplicando cambios "por las dudas" en cada uno; (b) levantar la app real y verificar con un navegador qué de la lista realmente está roto hoy, antes de tocar código.
**Decisión tomada:** (b). Se usó `playwright-core` (instalado solo como paquete, sin descargar binarios de navegador — se apuntó al Microsoft Edge que ya estaba instalado en la máquina) para loguearse como candidato y como empresa y recorrer las pantallas principales con capturas de pantalla y lectura de la consola/red.
**Motivo:** (a) es exactamente el antipatrón que generó parte de la deuda técnica original (código copiado/parcheado sin verificar el resultado real). Gran parte de lo pedido ya estaba resuelto por trabajo de sesiones anteriores — reescribirlo a ciegas hubiera arriesgado romper cosas que funcionaban, además de ser un desperdicio de esfuerzo.
**Impacto:** De ~40 módulos en el pedido, la auditoría en vivo redujo el trabajo real a 3 bugs concretos (ver `BUGS_AND_FIXES.md` BUG-009/010/011) más una nota de datos de seed incompletos. Se descartaron 2 "bugs" que la propia herramienta de auditoría generó como falso positivo (ver nota de artefactos de captura, más abajo).
**Riesgos:** Ninguno para el código — riesgo mitigado precisamente por no aplicar cambios sin verificar. El único costo fue tiempo de investigación, compensado por evitar cambios innecesarios en ~37 módulos que no lo necesitaban.
**Cómo revertir:** No aplica (fue una decisión de metodología, no un cambio de código).

---

## Gotcha descubierto: capturas `fullPage: true` de Playwright con elementos `position: fixed` producen falsos positivos

**Fecha:** 2026-07-17
**Contexto:** Durante la auditoría en vivo, una captura de página completa de la landing mostró un hueco de miles de píxeles en blanco, y otra en la vista de trabajos en mobile mostró el botón flotante de Joaquín "tapando" una card — ambas parecían bugs serios a simple vista.
**Opciones consideradas:** (a) confiar en la captura y arreglar ambos "bugs" directamente; (b) verificar contra el DOM real y con una captura de viewport (no de página completa) tras hacer scroll de verdad antes de tocar código.
**Decisión tomada:** (b).
**Motivo:** Inspeccionar el DOM mostró que el contenido de la landing estaba completo y bien renderizado (texto, íconos, botones, todo con `opacity: 1`), y que el contenedor de scroll real de la lista de trabajos sí tenía espacio de sobra sobre el botón flotante. Las capturas `fullPage: true` de Playwright/Chromium no son confiables cuando hay elementos `position: fixed` combinados con animaciones de scroll — el elemento fijo se renderiza en su posición de la primera pantalla capturada mientras el resto de la página se compone por partes, produciendo superposiciones que un usuario real nunca ve.
**Impacto:** Se evitó "arreglar" dos cosas que no estaban rotas. Se agregó esta lección a `REUSABLE_SKILLS.md` para no repetir el error (ni gastar tiempo) en el futuro.
**Riesgos:** Si en el futuro se confía ciegamente en una captura `fullPage` con elementos flotantes fijos, se puede repetir el falso diagnóstico — de ahí quedar documentado acá y en la skill reutilizable.
**Cómo revertir:** No aplica.

---

## Dar acceso a los candidatos al perfil público de la empresa desde las vacantes

**Fecha:** 2026-07-20
**Contexto:** El usuario pidió agregar un botón "ver perfil empresarial" en las vacantes, pero primero quería saber si convenía al negocio — es decir, si había alguna razón para que las empresas prefirieran que los candidatos NO tuvieran ese acceso.
**Opciones consideradas:** (a) implementar el botón directo; (b) investigar primero si el dato de la empresa ya se trata como público o como restringido en el resto del sistema, antes de decidir.
**Decisión tomada:** (b) primero, y con el hallazgo, sí implementar el botón.
**Motivo:** La investigación encontró que el backend ya expone `GET company/public/:id` **sin ningún guard de autenticación**, y que la pantalla `CompanyViewComponent` (`/app/company-view/:id`) ya existe y ya es de solo lectura — hoy solo enlazada desde Mensajes. O sea, el sistema ya trata el perfil de empresa como dato público; no había ninguna decisión de negocio protegiendo esa información, era simplemente un vínculo que nunca se agregó desde Vacantes por falta de tiempo, no a propósito. Mostrarlo en las vacantes es además el comportamiento esperable en cualquier portal de empleo (LinkedIn, Indeed, Computrabajo).
**Impacto:** `jobs.service.ts` ahora selecciona `company.id` en el listado de vacantes; `candidate-jobs.component` tiene el botón en la tarjeta y en el modal de detalle. Se aprovechó para corregir un bug de paso en `CompanyViewComponent` (el logo de la empresa nunca se renderizaba).
**Riesgos:** Ninguno nuevo — el dato ya era accesible por API directa a cualquiera con el id; esto solo lo hace descubrible desde la UI en vez de requerir conocer el id de antemano.
**Cómo revertir:** Quitar el botón de `candidate-jobs.component.html` y el `id` del `select` en `jobs.service.ts`. El endpoint público seguiría existiendo (no forma parte de este cambio).

**Adenda (mismo día, mismo patrón, esta vez con un bug real de por medio):** Al verificar el fix de BUG-012 (mensaje de chat duplicado), un primer script de verificación con selector CSS `.msg-row` (clase que no existe en `messages.component.html`, es de otro componente — `assistant-chat`) y `[class*="bubble"]` combinado con lectura de `document.body.innerText` completo dio "2 ocurrencias" después de aplicado el fix, sugiriendo que no había funcionado del todo. Un segundo script, contando específicamente `.message-row` (la clase real) y sin mezclar con el texto de la vista previa de la conversación en el sidebar (que legítimamente repite el último mensaje), confirmó "1 ocurrencia" — el fix sí funcionaba, el script de verificación tenía el selector equivocado. Lección reforzada: cuando una verificación automatizada da un resultado ambiguo o sospechoso, revisar primero el propio selector/script contra el HTML real del componente antes de asumir que el código de la app está mal.

---

## Limpieza de habilidades demo: reponer el set del seed en vez de reescribir el script completo

**Fecha:** 2026-07-16
**Contexto:** `NEXT_STEPS.md` #1 pedía confirmación puntual para limpiar las habilidades del perfil demo (`bustamantemolinasantiago@gmail.com`), documentado como "~150 habilidades, todo el catálogo". El usuario autorizó explícitamente ("sí, autorizo") en esta sesión. Antes de tocar nada se verificó el estado real contra la base (`smart_portfolio_db_v3`, proyecto `version3`): el conteo real era 13, no 150 — la documentación estaba desactualizada, probablemente porque sesiones de auditoría posteriores ya habían tocado esas filas sin actualizar `NEXT_STEPS.md`/`DATABASE.md`.
**Opciones consideradas:** (a) correr `npm run seed:santiago` completo, que ya hace `deleteMany`+recreate de habilidades con un set realista; (b) borrar y recrear solo la tabla `skills` de ese perfil con SQL directo, dejando intactos experiencias/educación/proyectos/aplicaciones/chat.
**Decisión tomada:** (b).
**Motivo:** El script completo también resetea experiencias, educación, proyectos y borra/recrea los mensajes de chat de la conversación demo — datos que el usuario no autorizó tocar (la autorización fue puntual, "las habilidades", no "todo el perfil"). Los conteos de experiencias/educación/proyectos ya coincidían con los valores del script (3/2/4), así que correrlo no habría cambiado nada ahí, pero arriesgaba pisar contenido si en algún momento se editaron a mano — y de cualquier forma excede el alcance de lo pedido. Las 6 habilidades insertadas son exactamente las que `BACKEND/prisma/seed-santiago-profile.ts` ya define como el set "realista" para este perfil (coinciden con el `summary` del perfil) — no se inventó una lista nueva, se usó la que el propio proyecto ya había decidido.
**Impacto:** `skills` del perfil 101 pasó de 13 filas (4 del seed original + 7 agregadas en auditorías en vivo + 1 artefacto de prueba explícito) a 6 filas limpias. Cero cambios en experiencias, educación, proyectos, aplicaciones o chat.
**Riesgos:** Bajo — respaldo de las 13 filas originales guardado en `C:\Users\busta\AppData\Local\Temp\claude\...\scratchpad\backup-skills-profile-101-2026-07-16.csv` (ruta de scratchpad de la sesión, no versionada en el repo) antes de borrar.
**Cómo revertir:** Reinsertar las filas del CSV de respaldo (conserva `id`, `name`, `level`, `normalized_name`, `created_at`, `updated_at` originales) o simplemente volver a agregar manualmente las habilidades deseadas desde la UI.

---

## `prisma migrate dev` no es seguro en este proyecto — usar `db push` para cambios de schema aditivos

**Fecha:** 2026-07-17
**Contexto:** Al agregar el modelo `SkillEndorsement` (tabla nueva, aditiva), `npx prisma migrate dev --name add_skill_endorsements` detectó que el historial de migraciones (`prisma/migrations/`, 3 migraciones, la última `20260617053007_improve_candidate_profile_phase1`) está desalineado con el estado real de la base — probablemente porque cambios de schema de sesiones anteriores a esta (columnas como `skills.normalized_name`, `job_offers.customContractType`/`workload`, etc. — visibles como diff sin commitear de `schema.prisma` desde antes de esta sesión) se aplicaron con `db push` o SQL manual en vez de generar una migración formal. `migrate dev` pidió explícitamente un **reset completo de la base** ("We need to reset the public schema... All data will be lost") para poder continuar.
**Opciones consideradas:** (a) aceptar el reset que pedía `migrate dev`; (b) investigar y reconciliar el historial de migraciones a mano (`prisma migrate resolve`) antes de continuar; (c) usar `npx prisma db push`, que sincroniza el schema directo a la base sin pasar por el historial de migraciones.
**Decisión tomada:** (c), sin dudar — nunca se llegó a considerar (a) como opción real dado que implicaba borrar los 162 usuarios/68 ofertas/949 habilidades reales de la base de desarrollo.
**Motivo:** `db push` no necesita que el historial de migraciones esté sano — compara el schema actual contra la base real y aplica solo la diferencia real (acá: crear una tabla nueva). Verificado antes y después con conteos de filas idénticos. `migrate dev`/`migrate reset` son las herramientas correctas cuando el historial de migraciones importa (ej. para reproducir el mismo schema en otro entorno desde cero) — no es el caso de este proyecto académico de una sola base de desarrollo compartida.
**Impacto:** Tabla `skill_endorsements` creada sin pérdida de datos. El historial de migraciones sigue desalineado (deuda preexistente, no introducida ni resuelta por este cambio).
**Riesgos:** Mientras el historial de migraciones siga desalineado, `migrate dev`/`migrate deploy` seguirán fallando o pidiendo reset. Si en algún momento se necesita levantar la base desde cero en otra máquina (ej. para la entrega final), **no alcanza con `migrate deploy`** — hay que usar `db push` contra una base ya poblada por los scripts de seed, o regenerar el historial de migraciones desde el schema actual con `prisma migrate dev` una única vez sobre una base vacía.
**Cómo revertir:** `DROP TABLE skill_endorsements CASCADE;` (o quitar el modelo de `schema.prisma` y volver a correr `db push`).
**Regla para el futuro:** en este proyecto, **cualquier cambio de schema debe aplicarse con `npx prisma db push`, nunca con `npx prisma migrate dev`**, hasta que alguien decida sanear el historial de migraciones a propósito (tarea aparte, no trivial, fuera de alcance de una sesión de features). Ver también `REUSABLE_SKILLS.md`.

---

## Nivel mínimo requerido por habilidad: codificado en el string existente, no una migración de schema

**Fecha:** 2026-07-16
**Contexto:** El usuario aprobó un mockup de "matching más preciso" que compara el nivel requerido de una habilidad (ej. Angular Avanzado) contra el nivel real del candidato. Hoy `JobOffer.skillsRequired` es un solo `String` con nombres separados por coma, sin lugar para guardar un nivel por habilidad.
**Opciones consideradas:** (a) migrar el schema a una tabla/relación `JobOfferSkillRequirement(jobOfferId, name, requiredLevel)`; (b) agregar un campo `Json?` nuevo en paralelo al string existente; (c) reusar el mismo campo `String`, con una convención opcional `"Nombre:NIVEL"` por entrada, parseada en un util compartido.
**Decisión tomada:** (c).
**Motivo:** (a) y (b) son migraciones reales de un campo que hoy tiene ~200 filas de seed pobladas — funcionan, pero agregan riesgo (migración, backfill, dos servicios NestJS separados que tendrían que coordinarse en el nuevo shape) para un beneficio que (c) da sin tocar la base: el string sigue siendo un `String` normal, las ~200 ofertas existentes sin `:NIVEL` siguen funcionando exactamente igual (nivel `null` = "cualquier nivel sirve"), y el parseo/serializado vive en un solo lugar (`libs/contracts/src/skill-match.util.ts`) importado por `jobs-service` y `applications-service`. El frontend de la empresa (Angular) no puede importar un lib de NestJS, así que `company-jobs.component.ts` tiene un espejo minimalista de solo 2 funciones (`parseSkillsRequired`/`stringifySkillRows`) — duplicación aceptada a propósito, documentada en el propio archivo, porque es más simple que exponer el lib al build de Angular.
**Impacto:** Cero migración de Prisma. El campo mantiene su tipo. Las ofertas de seed no necesitaron backfill.
**Riesgos:** Si en el futuro se necesita filtrar/ordenar por nivel requerido a nivel de base de datos (ej. "todas las ofertas que piden Angular Avanzado"), el string no es indexable de forma eficiente — en ese momento sí conviene migrar a (a). No es necesario hoy porque el filtrado ocurre en memoria sobre listas ya paginadas.
**Cómo revertir:** Quitar el parseo de `:NIVEL` en `parseSkillsRequired` (tratar todo como nombre plano) — no rompe nada, ninguna oferta depende de que el nivel se interprete.

---

## Paleta de marca: Teal profesional en vez de azul

**Fecha:** 2026-07-11
**Contexto:** Revisión UX consultiva detectó identidad de marca fragmentada (dos nombres: "Portafolio Inteligente" / "TalentBridge") y quiso alinear la dirección visual con una red profesional tipo LinkedIn.
**Opciones consideradas:** 3 propuestas de paleta comparadas visualmente (no documentadas en detalle acá, ver `plan-mejoras-frontend-ux.md`).
**Decisión tomada:** Opción B — Teal profesional (`--primary: #0f766e`), reemplazando el azul original (`#0a66c2`). `--info*` y `--accent-purple*` (identidad "empresa") quedaron intactos a propósito.
**Motivo:** Diferenciación visual real de LinkedIn (azul) manteniendo la sensación "profesional/corporativo"; el violeta de empresa da separación visual clara entre roles.
**Impacto:** Tokens en `styles.scss`, tema Material cambiado de `mat.$azure-palette` a `mat.$cyan-palette` (más cercano al teal entre las paletas M3 disponibles).
**Riesgos:** Componentes de Material que no pasan por los tokens propios (`mat-raised-button color="primary"`) podían quedar desalineados — de hecho se encontró y corrigió un mismatch preexistente en `mat-checkbox` (apuntaba solo a `.mat-accent`, el código usa `color="primary"`).
**Cómo revertir:** Volver los 5 tokens de marca (`--primary`, `--primary-hover`, `--primary-soft`, `--primary-ghost`, `--border-focus`) a los valores azules originales en `styles.scss`, y el tema Material a `$azure-palette`. Ver tabla exacta en `plan-mejoras-frontend-ux.md`, Fase 0.2.

---

## Unificar `public-portfolio` y `public-preview` en un componente compartido

**Fecha:** 2026-07-16
**Contexto:** Ambos componentes renderizaban el mismo contenido de portafolio con markup y lógica de traducción duplicados (con inconsistencias reales entre copias, no solo repetición).
**Opciones consideradas:** (a) que `public-preview` reuse/envuelva `public-portfolio` en modo autenticado; (b) extraer un componente de render compartido entre ambos.
**Decisión tomada:** (b) — `shared/components/portfolio-content/`, con input `editable` para diferenciar el modo autenticado (links "Editar sección") del público puro.
**Motivo:** (a) hubiera acoplado una vista pública no-autenticada a asumir contexto de sesión; (b) mantiene cada wrapper responsable solo de su propio estado (loading/not-found en uno, header/alerta en el otro) sin duplicar el render.
**Impacto:** Un solo lugar para cambiar cómo se ve una sección del portafolio. Se adoptó el diseño visual de `public-portfolio` (más elaborado: animaciones, `glass-card`) como canónico sobre el de `public-preview`.
**Riesgos:** Ninguno detectado — verificado con build limpio, pendiente confirmación visual del usuario (Fase 11).
**Cómo revertir:** Restaurar los dos componentes standalone desde el historial de git previo a esta fase; no es una migración de datos, solo de código de presentación.

---

## Registrar `LOCALE_ID: 'es-CO'` globalmente en Angular

**Fecha:** 2026-07-16
**Contexto:** Se encontró que Angular nunca tuvo `LOCALE_ID` configurado — el pipe `date` nativo (y cualquier `formatDate`) renderizaba fechas en inglés (`en-US`, default de Angular) pese a que toda la UI es en español. No fue un hallazgo de la auditoría original, apareció al construir el helper unificado de fecha (Fase 7).
**Opciones consideradas:** (a) seguir formateando fecha a mano con `toLocaleDateString('es-CO', ...)` en cada lugar que lo necesite; (b) registrar el locale globalmente y centralizar el formato en un pipe/util único.
**Decisión tomada:** (b) — `registerLocaleData(localeEsCO)` + `{ provide: LOCALE_ID, useValue: 'es-CO' }` en `app.config.ts`, más `appDate`/`formatAppDate` como única fuente de formato.
**Motivo:** (a) es exactamente el patrón que ya había producido 8 formatos de fecha distintos sin criterio; corregir el locale sin centralizar el formato hubiera dejado el bug de fondo resuelto pero el problema de consistencia intacto.
**Impacto:** Todas las fechas de la app (incluidas las que ya usaban `date:'...'` con formatos nombrados como `longDate`/`medium`/`shortTime`) ahora renderizan en español automáticamente. Elegido `es-CO` (no `es` genérico ni `es-AR`) para ser consistente con los `toLocaleDateString('es-CO', ...)` que ya existían en 4 archivos antes de esta fase.
**Riesgos:** Si en el futuro se necesita otro locale (ej. multi-región), este valor está hardcodeado — no hay mecanismo de locale dinámico por usuario.
**Cómo revertir:** Quitar el `provide: LOCALE_ID` y el `registerLocaleData` de `app.config.ts`; el pipe `appDate` seguiría funcionando pero volvería a renderizar en inglés salvo que se le pase `locale` explícito.

---

## `Card` compartido: adopción parcial a propósito, no completa

**Fecha:** 2026-07-16
**Contexto:** El componente `CardComponent` (`shared/components/card/`) existe desde antes de esta sesión con cero usos reales. Hay ~14 componentes con el mismo patrón visual base (fondo+borde+radio+padding) que calzarían.
**Opciones consideradas:** (a) sweep mecánico: envolver el contenido de los ~14 componentes en `<app-card>` y quitar las propiedades de chrome de sus selectores; (b) migrar solo los casos más simples/aislados; (c) no tocar nada, dejar la deuda documentada.
**Decisión tomada:** (c), con documentación explícita del motivo (no equivale a "no se hizo por falta de tiempo" sin más).
**Motivo:** Cada uno de los ~14 componentes mezcla el chrome del contenedor con layout propio (flex/grid interno, hover, overrides de estado) **en el mismo selector CSS** — separar eso bien exige tocar cada archivo con verificación visual real por pantalla, algo que esta sesión no podía garantizar (sin navegador real disponible). Un sweep mecánico (a) arriesgaba regresiones visuales silenciosas en 14 pantallas distintas para un beneficio puramente cosmético/arquitectónico, no funcional.
**Impacto:** `Card` sigue en cero usos. Riesgo de que otro agente/dev intente "terminar" la migración sin leer esta nota y la haga mecánicamente.
**Riesgos:** Deuda técnica documentada pero no resuelta — bajo impacto real (no es un bug, no afecta a usuarios).
**Cómo revertir/continuar:** No aplica revertir (no se tocó nada). Para continuar: encararlo como tanda dedicada, un componente a la vez, con captura de pantalla antes/después de cada uno.

---

## `ConfirmDialogComponent` extendido con `confirmLabel`/`confirmColor` en vez de crear un segundo diálogo

**Fecha:** 2026-07-16
**Contexto:** Se necesitaba reemplazar `confirm()` nativo en acciones no destructivas (cerrar/archivar una oferta, bloquear una conversación) — el diálogo compartido existente tenía el botón de confirmación hardcodeado a "Eliminar" en rojo (`color="warn"`).
**Opciones consideradas:** (a) crear un segundo componente de diálogo genérico; (b) extender el existente con inputs opcionales.
**Decisión tomada:** (b) — `data: { title, message, confirmLabel?, confirmColor? }`, default = comportamiento anterior ("Eliminar"/warn), sin romper los 4 call-sites que ya existían (Habilidades/Experiencia/Educación/Proyectos).
**Motivo:** Un segundo componente para "lo mismo pero con otro texto de botón" hubiera sido la misma clase de duplicación que el resto del plan viene eliminando.
**Impacto:** Mismo componente cubre confirmaciones destructivas y no destructivas.
**Riesgos:** Ninguno — cambio aditivo, retrocompatible.
**Cómo revertir:** Quitar los dos campos opcionales del `data` y hardcodear "Eliminar"/warn de nuevo en el template del diálogo.

---

## Rediseño de habilidades: catálogo por categorías en vez de lista plana o autocompletar libre

**Fecha:** 2026-07-17
**Contexto:** El usuario pidió explícitamente mejorar el flujo de agregar habilidades ("algo que funcione muchísimo mejor" que el formulario de a una por vez). Se presentaron 3 opciones concretas vía pregunta directa al usuario antes de escribir código.
**Opciones consideradas:** (a) Catálogo por categorías + búsqueda rápida — acordeón de 21 categorías, selección múltiple con chips, agregado en batch; (b) lista plana única con filtro de categoría en dropdown, sin agrupación visual; (c) buscador con sugerencias tipo chip-a-medida-que-se-escribe, sin vista de categorías (similar al autocompletar anterior pero con selección múltiple antes de confirmar).
**Decisión tomada:** (a) — elegida directamente por el usuario, no inferida.
**Motivo:** El catálogo tiene 635 entradas en 21 categorías — una lista plana (b) sigue obligando a escanear/filtrar mucho para encontrar habilidades relacionadas entre sí (ej. todo el stack "Backend" junto), y un buscador sin categorías (c) no resuelve el caso de "quiero ver qué hay disponible" sin saber el nombre exacto de antemano. El acordeón por categoría cubre ambos casos: exploración por categoría Y búsqueda directa (el buscador filtra categorías y chips a la vez), más selección múltiple para no repetir el ciclo completo por cada habilidad.
**Impacto:** Reescritura completa de `skills.component.{ts,html,scss}` (pasó de `template` inline a `templateUrl`). Nuevo `groupCatalogByCategory()` en `skill-catalog.ts`, aditivo — `filterCatalog()` (usado también por `experiences` y `projects`) no se tocó a propósito, para no arriesgar el comportamiento de esos dos componentes que dependen de su firma y orden de resultados actuales. Dos bugs reales solo aparecieron al verificar el flujo nuevo en vivo, no en el diseño: ver BUG-013 (validación de DTO backend) y BUG-014 (flexbox) en `BUGS_AND_FIXES.md`.
**Riesgos:** El nuevo flujo de agregado en batch usa `forkJoin` + `catchError(() => of(null))` por ítem — si una habilidad falla al crearse (ej. ya existe, colisión de `normalizedName`), las demás seleccionadas igual se crean; el usuario no recibe un detalle ítem-por-ítem de cuál falló, solo un snackbar agregado. Aceptable para este caso de uso (colisión de nombre ya existente es el único error esperable, y el catálogo ya excluye visualmente las habilidades que el usuario ya tiene vía el estado "owned" del chip, así que en la práctica no debería dispararse desde la UI normal).
**Cómo revertir:** Restaurar `skills.component.ts` con el `template` inline anterior desde el historial de git previo a esta fecha; `groupCatalogByCategory()` puede quedar sin uso sin afectar nada más (es aditivo).

---

## Unificar tamaños de campo con un partial SCSS de mixins, no migrando todo a Angular Material/Reactive Forms

**Fecha:** 2026-07-17
**Contexto:** Se pidió corregir el diseño de todos los formularios del frontend (altura/alineación/estados consistentes), partiendo de un bug puntual en `experiences` (bloque "Periodo" desproporcionado). La investigación mostró 4 sistemas de formulario sin relación entre sí: Material (`mat-form-field`), inputs custom (`.app-input`/`.app-textarea`), inputs nativos con `ngModel` (`company-jobs`/`company-candidates`/`candidate-jobs`), y un composer de chat en BEM aislado (`messages`).
**Opciones consideradas:** (a) migrar todos los inputs nativos/`ngModel` a `mat-form-field`+Reactive Forms para que un solo sistema gobierne todo; (b) crear un partial SCSS de mixins (mismo patrón que `_button.scss`/`_breakpoints.scss`) que cada sistema consuma con `@include` dentro de sus propias clases, sin cambiar de framework; (c) no tocar nada estructural, solo igualar valores sueltos (px) componente por componente sin punto de verdad compartido.
**Decisión tomada:** (b).
**Motivo:** (a) es una migración de framework disfrazada de fix visual — reescribir `company-jobs` (426 líneas de template, formulario de oferta con filas de habilidades dinámicas) y `candidate-jobs`/`company-candidates` (filtros con autocompletado propio) de `ngModel` a Reactive Forms arriesga romper funcionalidad que no fue pedida, sin necesidad: el problema reportado era visual (tamaño/alineación), no de arquitectura de formularios. (c) repite exactamente el patrón que causó el problema — cada archivo con su propio número, nada que impida que se vuelvan a desalinear en el próximo cambio. (b) dio un único punto de verdad (`--field-height`, `--field-textarea-min-height` en `styles.scss`, consumidos tanto por el override global de Material como por el mixin custom) sin tocar ningún template en los componentes que solo necesitaban converger tamaños — el riesgo quedó acotado a las 3 pantallas (`experiences`/`education`/`projects`) donde el bug de layout exigía un cambio real de estructura.
**Impacto:** Nuevo `FRONTEND/src/styles/_forms.scss`. 12 archivos `.scss` de `features/` ahora usan `@include forms.*` en vez de valores propios. 3 templates (`experiences`, `education`, `projects`) cambiaron de grid a un `.period-row` flex para el bloque de fechas+checkbox. `company-profile` mantiene su foco en violeta (`--accent-purple`) sobre el mismo mixin — override explícito en el propio componente, documentado en el comentario del código, para no mezclar la identidad "empresa" con el teal de candidato.
**Riesgos:** Los mixins de Sass duplican su CSS en cada archivo que los `@include` (a diferencia de una clase compartida, que solo referencia el nombre) — esto engordó el `.scss` compilado de varios componentes ya grandes (`company-jobs`, `candidate-jobs`, `skills`, `messages`) y probablemente empujó algunos por encima del presupuesto de 6kB de `angular.json` que ya venían ajustados. Es la misma categoría de warning preexistente y no bloqueante documentada en `NEXT_STEPS.md` ("Warnings de build conocidos") — no se buscó eliminarla en esta pasada, pero si en el futuro se quiere apretar el presupuesto de bundle, migrar `_forms.scss` de mixins a clases compartidas (`.field-control`, `.field-textarea`, etc., aplicadas directo en el template) eliminaría la duplicación a costa de tocar los templates que hoy se evitaron.
**Cómo revertir:** Cada componente puede volver a sus valores propios revirtiendo su `.scss` individual (los mixins no tienen efecto fuera de donde se `@include`n); `_forms.scss` puede borrarse sin romper nada si ningún archivo lo importa más.

---

## Sistema de normalización: separación storage/display, sin Title Case forzado en habilidades, y backfill construido pero no ejecutado

**Fecha:** 2026-07-17
**Contexto:** El usuario pidió un sistema global de normalización de datos con una especificación muy detallada (teléfonos, nombres, NIT, montos, URLs, habilidades) y una restricción explícita: "No quiero soluciones aisladas por pantalla". Antes de escribir código se comunicó el alcance al usuario (formateo en vivo limitado a filtrado seguro de caracteres, dado lo aprendido en BUG-015 momentos antes en la misma sesión; nombres de empresa no se pasarían por Title Case ciego).
**Decisiones tomadas, con su motivo:**
1. **Separación storage/display como arquitectura, no como detalle de implementación.** Para teléfono y NIT existen funciones separadas (`normalizePhoneStorage`/`formatPhoneDisplay`, `normalizeNitStorage`/`formatNitDisplay`) en vez de una sola función que "formatea y ya". Motivo: el propio pedido lo exige explícitamente ("diferenciar entre el valor de almacenamiento... y el valor de presentación"), y guardar el valor puntuado/espaciado directamente (lo que hacía el código viejo de BUG-015, `phone-format.util.ts`, ahora reemplazado) mezclaba ambas responsabilidades — cualquier cambio futuro al formato visual (ej. agrupar distinto, soportar otro país) hubiera exigido migrar datos ya guardados.
2. **Formateo en vivo (mientras se escribe) limitado a filtrado de caracteres, no a reformateo completo.** `filterPhoneChars` bloquea caracteres inválidos sin reordenar nada; el agrupado con espacios ("+57 312 439 2090") se aplica recién en `(blur)`. Motivo: BUG-015 (misma sesión, momentos antes) — `setValue` en cada tecla mueve el cursor al final sin importar `emitEvent: false`. Aplicar la lección recién aprendida al diseño nuevo en vez de repetir el error en otro campo.
3. **`normalizeSkillDisplay` NO aplica Title Case — solo colapsa espacios.** Un nombre de habilidad libre ("aws", "AWS", "Aws") se guarda con la capitalización que trajo (limpia de espacios), no forzada a Title Case. Motivo: mismo problema que ya se había cerrado por decisión para los chips de habilidades existentes (ver la entrada "Titlecase imperfecto en siglas técnicas" en `NEXT_STEPS.md`, fila 10) — un Title Case ciego convierte "AWS"/"CSS"/".NET" en "Aws"/"Css"/".net", peor que dejar la capitalización original. `titleCaseText` (usado para nombres/ciudades/cargos) sí tiene reglas anti-sigla (todo mayúsculas, con dígitos, con puntos), pero una habilidad de una sola palabra en mayúsculas ("AWS") caería justo en esa excepción de cualquier forma — se decidió no aplicar la función en absoluto para habilidades, para no depender de ese caso límite.
4. **`titleCaseText` no tiene lista de excepciones para preposiciones/artículos en español.** "Desarrollo de Software" queda con "De" en mayúscula tras normalizar, lo cual no es 100% correcto según las reglas de capitalización del español (preposiciones cortas van en minúscula). Se evaluó no aplicar `titleCaseText` a campos que puedan contener frases con preposiciones (sector, descripción de puesto), pero eso hubiera dejado esos campos sin ninguna limpieza de mayúsculas/espacios — se priorizó consistencia y cobertura sobre precisión gramatical perfecta, dado que el pedido original enfatizaba "sANTIAGO bustamante molina" (nombres propios, sin preposiciones) como el caso guía. Ver fila nueva en `NEXT_STEPS.md`.
5. **El backfill de datos existentes se construyó pero no se ejecutó, y corre en dry-run por defecto.** `prisma/normalize-existing-data.ts` requiere el flag `--apply` para escribir, y ante cualquier colisión (dos emails o dos habilidades del mismo perfil que normalizarían al mismo valor) la reporta aparte sin tocar esas filas — nunca fusiona ni borra automáticamente. Motivo: regla explícita de `CLAUDE.md` ("si una tarea requiere borrar/regenerar datos reales... pedir confirmación explícita y puntual") y la propia promesa hecha al usuario antes de empezar la tarea. Una colisión de email en particular es un caso real y no hipotético: el propio bug de email sin normalizar en registro/login (corregido en `auth.service.ts` en esta misma tarea) es la razón por la que podrían existir hoy dos cuentas que difieren solo en mayúsculas — fusionarlas automáticamente sería una decisión de producto (¿cuál cuenta prevalece?, ¿qué pasa con su historial?), no una normalización de formato.
**Impacto:** Nuevos `FRONTEND/src/app/shared/utils/normalize/*` (8 archivos) y su espejo `BACKEND/libs/common/src/normalize/*` (7 archivos, fechas excluidas). Eliminado `FRONTEND/src/app/shared/utils/phone-format.util.ts` (superseded, sin más referencias tras la migración). Nuevo `AppCurrencyPipe`. `BACKEND/prisma/normalize-existing-data.ts` construido, tipo-chequeado, no ejecutado contra la base real.
**Riesgos:** Si se corre el backfill sin revisar antes el reporte de colisiones, filas con datos potencialmente correctos pero ambiguos (dos habilidades que colisionan) quedan igual sin normalizar hasta que alguien decida manualmente qué hacer — es una limitación aceptada, no un bug.
**Cómo revertir:** Cada punto de integración (service/component) puede revertirse independientemente restaurando el archivo desde el historial de git anterior a esta fecha — la arquitectura núcleo (`normalize/*`) es aditiva y no rompe nada si deja de usarse. El backfill nunca se ejecutó, así que no hay nada que revertir en la base de datos.

---

## IA real para Joaquín y análisis de CV: DeepSeek en vez de Claude, JSON estructurado en vez de tool-calling completo

**Fecha:** 2026-07-17
**Contexto:** `NEXT_STEPS.md` #13 dejó documentado que retomar esto requería una API key de Anthropic. Al retomarlo, el usuario dio en cambio una API key de **DeepSeek**.
**Decisión 1 — proveedor:** Usar DeepSeek, no Claude, honrando lo que el usuario proveyó en vez de forzar el proveedor originalmente planeado.
**Motivo:** La clave real que el usuario tiene y quiere usar es de DeepSeek. La API de DeepSeek es compatible con el formato de OpenAI (mismo shape de `chat.completions.create`), así que se pudo reusar el SDK `openai` ya maduro apuntándolo a `https://api.deepseek.com` en vez de escribir un cliente HTTP a mano — cero código de bajo nivel nuevo para hablar con la API.
**Decisión 2 — diseño de Joaquín (antes de escribir código, se le preguntó al usuario y eligió el diseño híbrido):** en vez de una arquitectura de *tool use*/function-calling completa (donde el modelo llama funciones, se ejecutan, y se le devuelve el resultado en un segundo turno), se optó por pedirle al modelo un **JSON estructurado en una sola llamada**: `{reply, actions?, showProfileCard?}`. El modelo redacta la respuesta en lenguaje natural y decide si sugerir hasta 2 botones de navegación (de una lista blanca de rutas reales, nunca inventadas) y si mostrar la tarjeta-resumen del perfil — pero el backend sigue siendo quien calcula los datos reales (`getCandidateStats`/`getCompanyStats`, reusados sin cambios de la versión anterior) y quien valida cada acción contra la lista blanca antes de devolverla al frontend.
**Motivo:** Una arquitectura de tool-calling completa (multi-turno: pedir al modelo qué función llamar, ejecutarla, devolverle el resultado, pedir la respuesta final) es más fiel al patrón "function calling" de manual, pero agrega una capa de complejidad y puntos de falla (parseo de `tool_calls`, loop de ejecución, reintentos) para un beneficio marginal acá: los "resultados" que hoy expone Joaquín son en la práctica un solo tipo de tarjeta (resumen de perfil candidato) — no justifica el costo de esa complejidad. El diseño de JSON estructurado en una sola llamada logra el mismo objetivo (el modelo decide, no un `if` fijo, cuándo mostrar qué) con una sola llamada HTTP, sin loop, y sin que el modelo pueda alucinar datos reales (los números siempre vienen de Prisma, nunca del modelo).
**Decisión 3 — memoria de conversación sin persistir en BD:** el frontend manda los últimos 8 turnos de la conversación en cada request; el backend no guarda nada en la base de datos.
**Motivo:** Dar memoria conversacional real (antes no existía, cada mensaje era stateless) sin la complejidad de un modelo de "sesión de chat" persistente en Prisma — el historial ya vive en el array `messages` del componente Angular, que se pierde naturalmente al cerrar el chat o recargar la página. Es una limitación aceptada (no hay historial entre sesiones), coherente con que Joaquín es un asistente de ayuda puntual, no un sistema de mensajería que necesite persistencia (eso ya existe, separado, para chat candidato↔empresa).
**Impacto:** Nuevo `BACKEND/libs/common/src/ai/deepseek.service.ts` + registro en `CommonModule` (global, sin wiring adicional por servicio). Nuevas variables de entorno `DEEPSEEK_API_KEY`/`DEEPSEEK_BASE_URL`/`DEEPSEEK_MODEL`. Reescritos `assistant.service.ts` (Joaquín) y la función `performAnalysis` de `cv.service.ts`. Nuevo DTO `assistant-message.dto.ts` con historial opcional.
**Riesgos:** Sin rate-limiting ni control de costo por usuario — aceptable para un proyecto académico de bajo tráfico, pero si el uso creciera sin control podría generar un costo de API inesperado. Si DeepSeek cambia su formato de respuesta o dejara de ser compatible con el SDK de OpenAI, `DeepSeekService` es el único punto a actualizar (aislado en `libs/common`).
**Cómo revertir:** Revertir `assistant.service.ts`/`cv.service.ts` a la versión anterior (reglas fijas / scoring por keywords) restaurándolos desde el historial de git. `DeepSeekService` puede quedar sin uso sin romper nada más (es aditivo).

---

## Backend público: Render (URLs públicas entre servicios) en vez de Railway o networking privado

> **Nota (2026-07-25):** el diagnóstico de 502 de Railway de esta entrada quedó **corregido** — no era un problema de la plataforma, sino 4 bugs de configuración (falta de `PORT` explícito, `dockerfilePath`/`rootDirectory` sin persistir por servicio, entre otros). Ver la entrada "Migración del backend de Render a Railway" más abajo y [`CHANGELOG.md`](./CHANGELOG.md#2026-07-25--migración-del-backend-de-render-a-railway) para el detalle completo. Esta entrada se deja intacta como registro histórico de lo que se sabía en ese momento.

**Fecha:** 2026-07-18
**Contexto:** Se necesitaba desplegar el backend públicamente para una demo puntual. Railway fue la primera opción, pero devolvía `502 Application failed to respond` en los 10 servicios de forma persistente y reproducible incluso tras recrear el proyecto entero desde cero con una cuenta ya en plan pago — ver el ticket de soporte redactado para el detalle completo de lo probado. Se descartó Google Cloud Run por requerir prepago con activación de crédito de hasta 24h, incompatible con la urgencia del pedido ("necesito activarlo solo para mostrar que funciona").
**Opciones consideradas para el networking entre los 10 servicios:** (a) replicar en Render el patrón de Railway (`http://<nombre-servicio>:<puerto>`, resolución DNS interna); (b) usar las URLs públicas HTTPS de cada servicio para las llamadas gateway→servicio.
**Decisión tomada:** (b). Confirmado en vivo que (a) falla en Render para servicios `web_service` creados directo por API (`fetch failed` en los logs — el hostname interno no resuelve), mientras que el plan free de Render de por sí no soporta `pserv` (servicios 100% privados), así que los 10 servicios ya son públicos de todas formas — no hay downside real de seguridad en usar la URL pública en este caso concreto.
**Motivo:** Con tiempo limitado, diagnosticar a fondo por qué el DNS interno de Render no resuelve (¿requiere agrupación explícita en un "Environment"? ¿solo funciona para servicios creados vía Blueprint, no por API cruda?) no valía la pena frente a un fix de 5 minutos que ya está probado funcionando end-to-end.
**Impacto:** `render.yaml` y las variables reales de `api-gateway` en Render usan `https://<servicio>-<sufijo>.onrender.com` en vez de `http://<servicio>:<puerto>`. Cualquier servicio nuevo que se agregue tiene que seguir el mismo patrón (o investigar la causa real del DNS interno si se quiere volver a intentar (a), fuera de alcance de esta sesión).
**Riesgos:** Cada llamada gateway→servicio ahora sale a internet y vuelve a entrar (en vez de quedarse en la red privada) — latencia extra despreciable para el volumen de esta demo, pero no es el patrón ideal si el proyecto creciera a tráfico real. Sin `ipAllowList` restrictivo, cada servicio interno queda alcanzable directamente por cualquiera que adivine su URL (mismo riesgo que ya existía en Railway con dominios públicos por servicio).
**Cómo revertir:** Volver a `http://<nombre-servicio>:<puerto>` en las variables `*_SERVICE_URL` del gateway si se resuelve la causa del DNS interno (ej. agrupando los servicios en un "Environment" de Render, o recreándolos vía Blueprint en vez de API cruda) — no requiere cambios de código, solo de configuración.

---

## Migración del backend de Render a Railway

**Fecha:** 2026-07-25
**Contexto:** A pedido del usuario, se retomó Railway (abandonado el 2026-07-18 por 502 persistentes, ver entrada arriba) para reemplazar Render como backend, manteniendo Supabase y Vercel sin cambios. Esta vez sí se diagnosticó el 502 hasta la causa raíz en vez de descartar la plataforma.
**Diagnóstico:** El 502 no era de la plataforma — eran 4 bugs de configuración acumulados: (1) ningún servicio leía ni tenía seteada la variable `PORT` que el proxy de borde de Railway usa para enrutar (cada uno solo tenía su propia `<SERVICIO>_PORT`); (2) `api-gateway` nunca tuvo `DATABASE_URL` configurada; (3) `DEEPSEEK_MODEL` desactualizado (mismo bug ya visto en Render); (4) la causa raíz real del 502 original — los 10 servicios tenían `builder: RAILPACK` persistido con `rootDirectory`/`dockerfilePath` vacíos, así que Railway nunca supo usar el Dockerfile propio de cada servicio (`docker/<nombre>.Dockerfile`); sin esa config, según cómo se subiera el código, Railway o fallaba el autodetect (Railpack) o construía el `Dockerfile` genérico multi-stage de desarrollo local sin `--target`, lo que arma el **último stage del archivo** (`dashboard-service`) — los 10 servicios corrían literalmente el mismo build de `dashboard-service` bajo nombres distintos.
**Decisión tomada:** Migrar a Railway como backend primario. Corregir los 4 puntos vía CLI (`railway variables --set`) y API GraphQL (`serviceInstanceUpdate` para `rootDirectory`/`dockerfilePath` — el campo `builder` de esa mutación no acepta `"DOCKERFILE"` como enum válido; basta con setear `dockerfilePath` no-nulo y Railway lo detecta solo), en vez de recrear el proyecto de cero otra vez.
**Motivo:** El diagnóstico anterior (2026-07-18) se hizo bajo presión de tiempo y nunca llegó a mirar los logs de build reales — solo se vio el síntoma (502) y se lo atribuyó a la plataforma. Esta vez, con margen para probar 1 servicio antes de comprometer los 10, los logs de build (`railway logs --build`) mostraron el error real (`Railpack could not determine how to build the app`) en el primer intento fallido, lo que llevó directo a la causa.
**Impacto:** `FRONTEND/src/environments/environment.prod.ts` apunta a `*.up.railway.app` en vez de `*.onrender.com`. `render.yaml` y los 10 servicios de Render se dejan desplegados e intactos (no se desmantelaron) como respaldo — no cuestan nada extra en el plan free si no reciben tráfico.
**Riesgos:** Railway Hobby es un plan pago (a diferencia del free tier de Render) — el usuario ya lo había aprobado en la sesión del 2026-07-18 (ver [[project-local-dev-only]] en memoria). Si en el futuro se agrega un servicio nuevo, hay que acordarse de configurar `PORT` + `rootDirectory`/`dockerfilePath` a mano (no hay default sensato en Railway como sí lo hay en Render con `render.yaml`).
**Cómo revertir:** `environment.prod.ts` vuelve a las URLs de Render (siguen activas) y redeploy de Vercel — no requiere tocar Railway ni Render.

---

## `--accent-purple` recalibrado: el valor "matemáticamente púrpura" se percibía como azul

**Fecha:** 2026-07-18
**Contexto:** La decisión "Paleta de marca: Teal profesional en vez de azul" (2026-07-11, más arriba) ya había fijado `--accent-purple: #4338ca` como identidad visual de "empresa", separada a propósito del teal de candidato. El usuario probó la app recién desplegada y señaló, sin saber el valor hex, que ese color "sigue viéndose azul oscuro" y "no es para nada armónico" — dos veces, incluso después de un primer fix que corrigió un mismatch real (dos usos sueltos de `var(--accent)`, el azul viejo, en `home.component.scss`).
**Opciones consideradas:** (a) asumir que el reclamo ya estaba resuelto tras el primer fix (los únicos usos de `var(--accent)` restante eran cero) y pedirle al usuario que señale la pantalla exacta; (b) reconsiderar el valor de `--accent-purple` en sí — `#4338ca` tiene hue ≈ 244° (círculo cromático: azul puro ≈ 240°, violeta ≈ 270-290°), matemáticamente "púrpura" pero perceptualmente muy cerca del límite con el azul, sobre todo en superficies grandes (íconos, barras de cabecera) donde el ojo pondera más el canal azul dominante que la mezcla exacta.
**Decisión tomada:** (b). Cambiado el token en la raíz (`styles.scss`) de `#4338ca`/`#3730a3`/`#e0e7ff` a `#7c3aed`/`#6d28d9`/`#ede9fe` (hue ≈ 262°, violeta franco, escala equivalente a "violet-600" de Tailwind, bien alejada del rango de azul).
**Motivo:** Confiar en la palabra del usuario sobre su propia percepción del color por encima de la clasificación matemática del hue — "se ve azul" es una observación válida aunque el valor no sea azul en sentido estricto, y la decisión original de 2026-07-11 nunca pretendió un violeta que leyera como azul, todo lo contrario ("el violeta de empresa da separación visual clara"). Cambiar el token en la raíz, en vez de tocar cada `.scss` que lo usa, propaga el fix a las 5+ pantallas que ya dependían de esa variable (home, company-profile, company-dashboard, company-candidates) sin volver a auditarlas una por una.
**Impacto:** Ningún archivo de componente cambió — solo 3 líneas en `styles.scss`. Efecto visual inmediato en toda pantalla que use `--accent-purple`/`--accent-purple-hover`/`--accent-purple-soft`.
**Riesgos:** Ninguno funcional (es una variable de solo color, sin lógica). Si en el futuro se agrega una nueva pantalla con esta variable, hereda el violeta corregido automáticamente — no hace falta ninguna acción adicional.
**Cómo revertir:** Volver los 3 valores a `#4338ca`/`#3730a3`/`#e0e7ff` en `styles.scss` si se prefiere el tono original.

---

## Marca monocromática: se abandona el segundo color de "empresa" (violeta) — todo el mismo teal + blanco

**Fecha:** 2026-07-18
**Contexto:** Esta es la **tercera** iteración del mismo reclamo del usuario en la misma sesión: primero un mismatch real de azul viejo en la landing (corregido), después un recalibre de `--accent-purple` de índigo a violeta franco (entrada anterior, más arriba) — y el usuario lo siguió viendo como "morado/azul" y pidió explícitamente, señalando un swatch de color exacto: *"toda la página debe llevar este color y blanco excepto los logos claramente"*. Esto reemplaza, no complementa, la decisión original del 2026-07-11 ("Paleta de marca: Teal profesional") que había fijado el violeta como identidad deliberada de "empresa" para diferenciarla visualmente del candidato.
**Opciones consideradas:** (a) seguir iterando sobre qué tono de violeta/morado podría no leerse como tal (ya van dos intentos fallidos); (b) preguntarle al usuario qué color prefiere en vez de adivinar un tercero (se preguntó vía `AskUserQuestion`, la pregunta fue descartada sin responder); (c) tomar el pedido explícito literal: un solo color de marca (el teal ya existente, `--primary: #0f766e`) + blanco, sin ningún segundo acento decorativo, en toda la aplicación.
**Decisión tomada:** (c).
**Motivo:** Después de dos correcciones de tono que igual se percibieron como "azul/morado", seguir ajustando el hue del violeta era repetir el mismo riesgo por tercera vez. El usuario fue explícito y literal ("excepto los logos claramente" — la única excepción reconocida es contenido con identidad propia, como los logos de empresas generados o el ícono de marca de GitHub, no un segundo color de marca propio de la app). Se prefirió la instrucción explícita y repetida del usuario por sobre la intención original de "diferenciar roles por color" de la decisión de 2026-07-11, que quedó superada.
**Impacto:** `--accent-purple`/`--accent-purple-hover`/`--accent-purple-soft` en `styles.scss` ahora son **idénticos** a `--primary`/`--primary-hover`/`--primary-soft` (`#0f766e`/`#0b5a53`/`#e1f2ef`) — se mantienen como variables separadas (no se eliminó el token) solo para no tener que retocar cada componente si en el futuro se decide diferenciar de nuevo. También se corrigió `--accent-on-dark` (color del botón de acción del snackbar sobre fondo oscuro), que era azul claro (`#93c5fd`) y pasó a un teal claro (`#5eead4`) por la misma razón. El tema de Angular Material tenía `tertiary: mat.$blue-palette` sin ningún uso real en el código (`color="tertiary"` no aparece en ningún componente) — cambiado a `mat.$cyan-palette` de todas formas, para no dejar ningún residuo azul en la configuración del tema. Ningún archivo de componente `.scss` individual cambió — todo pasa por los 4 tokens de `styles.scss`. Colores semánticos (`--success`/`--warning`/`--danger`/`--info`, usados para estados como "aprobado"/"pendiente"/"error", no para identidad de marca) **no se tocaron** — no son parte del reclamo (no son decorativos, comunican estado) y quitarlos habría dañado la legibilidad de esas señales; si el usuario también los quiere alineados al teal, es una decisión aparte a confirmar explícitamente.
**Riesgos:** Ninguno funcional. Semánticamente, las pantallas de "empresa" y "candidato" ya no tienen ninguna diferenciación visual por color — si en algún momento se vuelve confuso de qué lado de la app está el usuario, considerar diferenciar por otro medio (ej. un badge de texto, un ícono, en vez de un color).
**Cómo revertir:** Volver `--accent-purple*` a los valores de la entrada anterior (`#7c3aed`/`#6d28d9`/`#ede9fe`) o a los originales de 2026-07-11 (`#4338ca`/`#3730a3`/`#e0e7ff`) si se decide reintroducir un segundo color de marca.

---

## Sesión con cookie + JWT en localStorage en paralelo, no cookie sola ni JWT solo

**Fecha:** 2026-07-18
**Contexto:** El usuario no podía loguearse desde su propio navegador ("Otro", sin especificar cuál) pese a que el login funcionaba perfecto en el navegador usado para verificar en esta sesión. Causa raíz: la cookie `SameSite=None` (necesaria porque frontend y backend viven en dominios distintos — Vercel y Render) queda sujeta a bloqueo de cookies de terceros, silencioso y sin error visible, en varios navegadores/configuraciones (Safari ITP, Chrome/Firefox con protección estricta).
**Opciones consideradas:** (a) migrar por completo de cookie a JWT en `localStorage` + header `Authorization`, quitando la cookie; (b) mantener solo la cookie e intentar mitigar el bloqueo con configuración adicional (ej. `Partitioned` cookies, CHIPS) — soporte de navegador todavía desigual y no soluciona Safari ITP; (c) los dos mecanismos en paralelo — cookie HttpOnly + JWT en localStorage, cualquiera de los dos alcanza para autenticar (el backend ya aceptaba ambos desde antes, ver más abajo).
**Decisión tomada:** (c).
**Motivo:** (a) hubiera sido más "limpio" pero descarta sin necesidad la ventaja de seguridad de la cookie HttpOnly (no accesible por JS, protegida contra robo vía XSS) para los navegadores donde sí funciona. (b) no resuelve el caso real que reportó el usuario. (c) da lo mejor de ambos con el menor cambio posible: en el path feliz (cookie no bloqueada) la sesión sigue viajando por la vía más segura; en el navegador que bloquea la cookie, el JWT en localStorage la reemplaza en silencio sin que el usuario note diferencia. Al revisar el código antes de escribir nada se encontró que la infraestructura para (c) **ya existía a medias**: `JwtStrategy` (backend, `libs/auth/src/jwt.strategy.ts`) ya tenía `ExtractJwt.fromAuthHeaderAsBearerToken()` como extractor de respaldo junto al de cookie, el proxy del gateway (`http-client.service.ts`) ya reenviaba el header `Authorization` a los servicios internos, y los 10 `main.ts` ya tenían `Authorization` en `allowedHeaders` de CORS — trabajo de una sesión anterior (probablemente hecho "por las dudas" al construir la API, o copiado de un ejemplo estándar de NestJS+Passport) que quedó sin conectar del lado del frontend hasta este bug. Solo hizo falta: devolver el token en el body de la respuesta de login (antes solo iba en la cookie), guardarlo en `localStorage`, y mandarlo por header desde el interceptor — sin tocar CORS, sin tocar la estrategia JWT, sin migrar nada.
**Impacto:** `auth.controller.ts` (backend) devuelve `token` en el body de las 4 rutas de login/registro. `auth.service.ts` (frontend) guarda/lee el token de `localStorage` (`talentbridge_token`). `auth.interceptor.ts` agrega `Authorization: Bearer` a cada request si hay token. Mismo patrón aplicado al WebSocket de chat (`chat.gateway.ts` lee `handshake.auth.token` como respaldo de la cookie del handshake; `chat-socket.service.ts` lo manda al conectar) porque tenía el mismo problema y hubiera quedado roto para los mismos usuarios.
**Riesgos:** El JWT en `localStorage` es accesible por cualquier script que corra en la página (a diferencia de la cookie HttpOnly) — si en algún momento hay una vulnerabilidad XSS en el frontend, un token robado de `localStorage` es más grave que una cookie HttpOnly robada. Es un trade-off aceptado conscientemente frente al bug real de "la app no funciona en X navegador" — un demo académico que nadie puede usar no es más seguro que uno con esta superficie de ataque adicional. Si en el futuro se agrega un dominio propio compartido entre frontend/backend (ver Pendientes del Changelog de este mismo fix), se podría volver a depender solo de la cookie y quitar el token de `localStorage`.
**Cómo revertir:** Quitar `token` del body de respuesta en `auth.controller.ts`, quitar `setToken`/`getToken` de `auth.service.ts`, y el header `Authorization` del interceptor — la cookie sigue funcionando sola para los navegadores que no la bloqueen (que son la mayoría).

---

## Toggle de privacidad de teléfono en `CompanyProfile`: se deja pendiente en vez de agregarlo dentro del barrido de bugs

**Fecha:** 2026-07-25
**Contexto:** El barrido de 77 hallazgos marcó "el teléfono de la empresa es siempre público" como inconsistencia — `Profile` (candidato) tiene `showPhone`/`showCity`/etc., pero `CompanyProfile` no tiene ningún campo de visibilidad, así que su teléfono (si está cargado) se expone siempre en la vista pública de empresa, sin que la empresa pueda ocultarlo.
**Opciones consideradas:** (a) agregarlo en la misma pasada que el resto del barrido — una migración chica (`showPhone Boolean @default(true)` en `CompanyProfile`), un campo nuevo en el DTO, un condicional en el service público, y el toggle en el formulario de edición (reusando el patrón `visibility-switch` que ya existe en `profile.component.html`); (b) dejarlo fuera de esta pasada y anotarlo como pendiente explícito.
**Decisión tomada:** (b).
**Motivo:** El resto del barrido de esta sesión (todos los hallazgos Crítico/Alto/Medio, y la mayoría de los Bajo) son correcciones de algo que ya existe y se comporta mal — sin tocar el schema. Esta es la única excepción: es una **feature nueva** (una capacidad que la empresa nunca tuvo) que además requiere una migración de base de datos. Mezclar una migración de schema con un barrido de bugs de alcance ya grande (90+ items entre el listado original y los nuevos de la captura) aumentaba el riesgo de la sesión completa por un ítem que el propio barrido clasificó como el de menor severidad. Se prefirió terminar el barrido completo con el schema intacto y dejar esta feature chica y bien acotada para una sesión aparte, donde se pueda tratar con el mismo cuidado que cualquier otro cambio de schema (`prisma validate` + `generate` + evaluar `migrate dev`, seguido de su propia verificación en vivo).
**Impacto:** Ninguno todavía — el comportamiento actual (teléfono de empresa siempre visible si está cargado) no cambió. Queda documentado acá y en el Changelog de esta misma fecha para que la próxima sesión no tenga que releer las 77+ notas del barrido para encontrarlo.
**Riesgos:** Ninguno nuevo — es el mismo comportamiento que ya tenía el proyecto antes de este barrido, ahora con nombre y ubicación conocida en vez de ser un hallazgo suelto.
**Cómo revertir:** No aplica (no se implementó nada que revertir). Para implementarlo: replicar el patrón exacto de `Profile.showPhone` (migración, DTO, `public-portfolio.service.ts`, template) en `CompanyProfile`/`company-profile.dto.ts`/`company-profile.service.ts` (método público)/`company-profile.component.html`.

---

## Transiciones de estado de oferta laboral: se codifican explícitamente en el backend, calcadas de lo que ya permitía la UI

**Fecha:** 2026-07-25
**Contexto:** Ninguno de los 4 métodos de cambio de estado de oferta (`publishJob`/`closeJob`/`archiveJob`/`restoreJob`) validaba que la oferta estuviera en un estado de partida válido para esa acción — se podía, por ejemplo, "publicar" directo una oferta archivada (saltándose "restaurar" a borrador primero) llamando a la API sin pasar por el botón que la UI nunca mostraba para ese caso. El backend no tenía ninguna regla propia sobre qué transición es válida; solo existía implícitamente en qué botón mostraba `company-jobs.component.html` para cada estado.
**Opciones consideradas:** (a) diseñar una máquina de estados nueva "desde cero", pensando qué transiciones deberían ser válidas en abstracto; (b) leer exactamente qué transiciones expone hoy la UI real (`@if (job.status === 'X')` alrededor de cada botón en el template) y codificar esas mismas siete reglas en el backend, sin agregar ni quitar ninguna.
**Decisión tomada:** (b).
**Motivo:** Diseñar una máquina de estados nueva sin un pedido explícito del usuario sobre qué transiciones debería permitir el negocio es inventar reglas de producto no pedidas — exactamente lo que las instrucciones de este proyecto piden evitar. La UI ya materializa, de forma implícita pero completa, cuáles son las transiciones que el producto considera válidas hoy (alguien ya tomó esas decisiones al construir esas pantallas); replicarlas en el backend cierra el hueco de autorización sin cambiar el comportamiento que un usuario real experimenta a través de la UI.
**Impacto:** `jobs.service.ts`: `publishJob` ahora exige DRAFT o CLOSED (no ARCHIVED); `closeJob` exige PUBLISHED; `archiveJob` exige DRAFT; `restoreJob` exige ARCHIVED. De paso, republicar una oferta CLOSED ahora limpia `closedAt` (quedaba con la fecha del cierre anterior, aunque la oferta ya estuviera publicada de nuevo — otro hallazgo del mismo barrido, mismo método).
**Riesgos:** Si en el futuro la UI agrega una transición nueva (ej. archivar directo una oferta publicada) sin que alguien actualice el backend en paralelo, quedaría bloqueada por este chequeo con un 400 — hay que recordar tocar los dos lados juntos.
**Cómo revertir:** Quitar los 4 `if` de validación de estado en `jobs.service.ts` (`publishJob`/`closeJob`/`archiveJob`/`restoreJob`) — vuelve al comportamiento sin restricción de antes.

---

## Conectar Vercel y Railway a GitHub para auto-deploy; Supabase se investigó y se descartó a propósito

**Fecha:** 2026-07-25
**Contexto:** El usuario pidió conectar el repo de GitHub con Vercel, Supabase y Railway "en caso de no estar". Los tres estaban, hasta este momento, enlazados solo por CLI (`vercel --prod`, `railway up`) — sección 5 de `DEPLOYMENT.md` documentaba explícitamente "no hay auto-deploy" para ambos.
**Opciones consideradas (Vercel/Railway):** (a) conectar Git tal cual, dejando que cada plataforma reconstruya su config de build desde cero; (b) verificar primero `Root Directory`/`Dockerfile Path` de cada servicio/proyecto y confirmar que conectar Git no los resetea, antes de disparar ningún build real.
**Decisión tomada (Vercel/Railway):** (b), y conectar los dos.
**Motivo:** Este proyecto ya tiene un historial documentado (`BUG-019`) de Railway construyendo el Dockerfile equivocado por una config de build mal resuelta — conectar Git a ciegas arriesgaba repetir exactamente ese bug en los 10 servicios a la vez. Se verificó por captura de pantalla (no solo lectura de texto de la página, que dio un falso positivo ambiguo al menos dos veces) el `Root Directory`/`Dockerfile Path` de cada servicio antes y después de conectar, y se revisó el diff exacto ("Details" → solo `Branch`+`Repo` como cambios) antes de cada "Deploy Changes". Un primer intento con `dashboard-service` y con `api-gateway` confirmó por logs de build reales que Railway usa el Dockerfile correcto vía Git — recién ahí se repitió el mismo procedimiento para los 8 servicios restantes. Para Vercel, no existe `package.json` en la raíz del repo (es un monorepo `BACKEND`/`FRONTEND`), así que hizo falta fijar **Root Directory = `FRONTEND`** en Settings antes de conectar Git, o el primer build hubiera fallado inmediatamente.
**Opciones consideradas (Supabase):** (a) conectar igual la integración nativa de GitHub de Supabase (Project Settings → Integrations → GitHub), ya que el pedido la mencionaba explícitamente; (b) investigar primero qué hace exactamente esa integración y si aplica al workflow real de este proyecto.
**Decisión tomada (Supabase):** (b), y **no conectarla**.
**Motivo:** La integración de Supabase aplica migraciones en su propio formato (`supabase/migrations/*.sql`, vía Supabase CLI) al mergear a producción. Este repo no tiene ninguna carpeta `supabase/` — las migraciones son 100% Prisma (`BACKEND/prisma/migrations/`), aplicadas a mano contra el pooler de sesión (puerto 5432) exactamente como describe la sección 6 de `DEPLOYMENT.md`, por la limitación conocida del pooler de transacciones con el advisory lock de `prisma migrate deploy`. Conectar la integración no tendría ningún efecto (no hay migraciones en el formato que busca) y además dejaría el dashboard de Supabase sugiriendo un flujo de auto-deploy que no existe en la práctica — más confuso que no tenerla conectada.
**Impacto:** Los 10 servicios de Railway y el proyecto de Vercel ahora reconstruyen y redespliegan automáticamente en cada `git push` a `master` que toque sus archivos. `DEPLOYMENT.md` sección 5 actualizada para reflejar esto (el método CLI queda documentado como alternativa manual, no como el único camino). Supabase sigue exactamente como estaba — sin integración de GitHub, migraciones manuales.
**Riesgos:** Un push a `master` con un bug ahora dispara un rebuild+redeploy real en los 10 servicios de Railway y en Vercel sin ningún paso de confirmación intermedio (a diferencia del flujo CLI anterior, que era un comando explícito por servicio) — un `git push` descuidado tiene más alcance ahora que antes. Ninguno de los cambios sin commitear de esta sesión se pusheó como parte de esta tarea (`CLAUDE.md` prohíbe commit/push automático sin pedido explícito puntual), así que el primer auto-deploy real todavía no se ejecutó de punta a punta al momento de escribir esto.

---

## Rigor de validación de teléfono/NIT: solo longitud, sin dígito de verificación DIAN ni indicativo internacional completo

**Fecha:** 2026-07-26
**Contexto:** El barrido de validadores (`docs/plan-barrido-validaciones-y-datos-2026-07-26.md` ítems 0.1/0.2) encontró que `phone`/`nit` no tenían ningún chequeo de formato. El usuario autorizó ejecutar el barrido completo tomando las decisiones de diseño abiertas de forma autónoma, sin quedar disponible para consultarlas en el momento.
**Opciones consideradas (teléfono):** (a) exigir exactamente 10 dígitos (solo números locales colombianos sin indicativo); (b) aceptar un rango de 10-12 dígitos (cubre local sin indicativo Y local con "57" antepuesto, que es lo que un usuario real puede llegar a escribir); (c) implementar detección real de indicativos internacionales arbitrarios (librería tipo `libphonenumber`).
**Decisión tomada (teléfono):** (b).
**Motivo:** (a) hubiera rechazado un caso legítimo común (usuario que escribe "+57 300 123 4567"); (c) es sobre-ingeniería para un campo de contacto de un portafolio profesional colombiano — no hace falta soportar el mundo entero. El rango 10-12 cubre los casos reales sin agregar una dependencia nueva.
**Opciones consideradas (NIT):** (a) validar solo longitud (9-10 dígitos: cuerpo + dígito de verificación); (b) implementar el algoritmo real de cálculo del dígito de verificación (módulo 11 con tabla de pesos oficial de la DIAN) y rechazar NITs con el dígito incorrecto.
**Decisión tomada (NIT):** (a).
**Motivo:** (b) es la validación "correcta" en un sistema tributario real, pero acá el NIT es un dato de una empresa demo en un proyecto de seminario — el esfuerzo de implementar y probar el algoritmo completo no se justifica frente a lo que se gana (rechazar un NIT de longitud correcta pero dígito verificador inventado, que ya de por sí no es un caso que vaya a aparecer con datos de prueba tipo "5" o "123").
**Impacto:** `IsValidPhone()`/`IsValidNit()` nuevos en `BACKEND/libs/common/src/validators/`, espejados en frontend. Rechazan los casos obvios (1-8 dígitos) que motivaron el hallazgo, sin bloquear ningún dato real ya guardado (verificado contra las cuentas demo).
**Riesgos:** Un NIT con longitud correcta pero dígito de verificación matemáticamente inválido pasa la validación igual — aceptado a propósito, ver Motivo.
**Cómo revertir:** Quitar `@IsValidPhone()`/`@IsValidNit()` de los DTOs y `validPhone`/`validNit` de los formularios — vuelve al estado sin validación de antes.

---

## Password: agregar requisito de complejidad mínima (letra + número) a los registros, no a login

**Fecha:** 2026-07-26
**Contexto:** Mismo barrido, ítem 0.5 — `RegisterDto`/`RegisterCompanyDto` solo exigían longitud mínima (8 caracteres), sin ningún otro requisito. El plan original marcaba esto explícitamente como "preguntar al usuario, no asumir" (podía ser una decisión consciente de baja fricción para una demo académica), pero el usuario autorizó decidir de forma autónoma sin estar disponible para consultar.
**Opciones consideradas:** (a) dejarlo como estaba (solo longitud) y documentar como decisión aceptada; (b) agregar un requisito mínimo de complejidad (al menos 1 letra + 1 número); (c) exigir complejidad alta (mayúscula+minúscula+número+símbolo).
**Decisión tomada:** (b).
**Motivo:** (a) dejaba pasar contraseñas como "11111111" o "aaaaaaaa", que no cuesta nada evitar y sí mejora la calidad de los datos de la demo sin fricción real de UX. (c) es fricción innecesaria para un proyecto de seminario sin usuarios reales en riesgo — el objetivo es evitar lo obviamente débil, no cumplir un estándar corporativo. Se aplicó solo a `RegisterDto`/`RegisterCompanyDto`, nunca a `LoginDto`, siguiendo el mismo criterio que ya usaba el comentario existente sobre el `@MaxLength` de login (no romper el acceso a cuentas ya creadas con una regla nueva).
**Impacto:** `@Matches(/(?=.*[A-Za-z])(?=.*\d)/)` en el `password` de ambos DTOs de registro + `Validators.pattern` espejado en `register.component.ts`/`company-register.component.ts`. Las 3 contraseñas demo documentadas en `CLAUDE.md` (`Santiago.123`, `Candidato.123`, `Empresa.123`) ya cumplen la regla — ningún login existente se ve afectado.
**Riesgos:** Ninguno real — la regla es intencionalmente laxa (cualquier letra + cualquier número, sin exigir posición ni tipo de carácter especial).
**Cómo revertir:** Quitar el `@Matches()` del DTO y el `Validators.pattern` del formulario — vuelve a exigir solo longitud.
**Cómo revertir:** Railway: Settings → Source → Disconnect en cada servicio (vuelve a requerir `railway up` manual). Vercel: Settings → Git → Disconnect. Ninguno de los dos borra `Root Directory`/`Dockerfile Path` al desconectar.

---

## Correo transaccional: Resend como proveedor, con remitente de pruebas por defecto

**Fecha:** 2026-07-28
**Contexto:** El acta de seguimiento del asesor de tesis pidió recuperar contraseña (compromiso) y verificación de correo (recomendación) — ninguno de los dos existía, ni tampoco ninguna infraestructura de envío de correo en todo el proyecto. Se le preguntó al usuario directamente qué proveedor usar.
**Opciones consideradas:** (a) Resend (API moderna, nivel gratuito ~3000 correos/mes sin tarjeta); (b) Nodemailer + SMTP propio (Gmail/institucional, sin crear cuenta nueva pero con más riesgo de spam/bloqueo); (c) SendGrid (muy usado, pero pide verificación de dominio más estricta).
**Decisión tomada:** (a), elegida explícitamente por el usuario.
**Motivo:** Nivel gratuito suficiente para un proyecto académico de bajo tráfico, sin necesidad de tarjeta de crédito, SDK de Node simple. El remitente por defecto (`onboarding@resend.dev`) funciona sin verificar un dominio propio — suficiente para desarrollo/demo; un dominio propio verificado lo reemplaza después solo cambiando la variable de entorno `RESEND_FROM_EMAIL`, sin tocar código.
**Impacto:** `EmailService` nuevo en `BACKEND/libs/common/src/email/email.service.ts` (mismo patrón de cliente perezoso que `DeepSeekService` — ver ese archivo para el motivo de por qué es perezoso). Nueva variable de entorno `RESEND_API_KEY` (+ `RESEND_FROM_EMAIL` opcional), agregada a `.env`/`.env.example` local; **falta agregarla a Railway y Render antes de que el correo funcione en producción**.
**Riesgos:** El remitente `onboarding@resend.dev` de Resend, en cuentas sin dominio verificado, solo puede enviar al correo con el que se creó la cuenta de Resend (restricción de su modo sandbox) — suficiente para probar, pero si se necesita enviar a cualquier destinatario real en producción hace falta verificar un dominio propio en el dashboard de Resend.
**Cómo revertir:** Quitar `EmailService` de `CommonModule`, revertir los cambios de `auth.service.ts` que lo usan (`forgotPassword`/`resetPassword`/verificación de correo dejan de existir), quitar `resend` de `package.json`.

---

## Verificación de correo al registrarse: no bloquea el login

**Estado: SUPERSEDIDA el mismo día (2026-07-28) — ver la decisión siguiente ("Verificación de correo: cambio a bloqueante").** Se deja esta entrada como registro histórico de por qué se tomó la decisión original, tal como pide la política de documentación del proyecto; no refleja el comportamiento actual.

**Fecha:** 2026-07-28
**Contexto:** Misma acta, recomendación 7 ("enviar un correo con un token que permita validar que el correo es válido"). No especificaba si debía impedir el uso de la cuenta hasta verificar. Se le preguntó al usuario directamente.
**Opciones consideradas:** (a) no bloquear — la cuenta funciona igual desde el registro, con un aviso descartable/reenviable; (b) bloquear el login hasta que el correo esté confirmado.
**Decisión tomada:** (a), elegida explícitamente por el usuario.
**Motivo:** (b) es más estricto y más parecido a otras plataformas serias, pero si el envío de correo falla por cualquier motivo (proveedor caído, correo en spam, typo del usuario) deja a alguien sin poder entrar a una cuenta que sí es suya — un riesgo real de romper el registro para ganar poco en un proyecto académico sin usuarios en riesgo real. (a) prioriza el requisito explícito de la tarea ("sin romper nada").
**Impacto:** `register()`/`registerCompany()` envían el correo de verificación pero nunca esperan ni exigen su confirmación para completar el registro o permitir login. `EmailVerificationBannerComponent` (nuevo, en ambos shells) muestra un aviso no bloqueante con botón "Reenviar correo" mientras `user.emailVerified === false`.
**Riesgos:** Una cuenta puede quedar sin verificar indefinidamente sin ninguna consecuencia — aceptado a propósito, no es el objetivo de esta implementación forzar la verificación.
**Cómo revertir:** Envolver las rutas protegidas (o el login mismo) con un chequeo de `emailVerified`, devolviendo 403 si es `false` — el resto de la infraestructura (tokens, envío, endpoints) ya soporta ese cambio sin modificarse.

---

## Verificación de correo: cambio a bloqueante (supersede la decisión anterior)

**Fecha:** 2026-07-28 (mismo día que la decisión original — el usuario probó el registro no bloqueante, vio que se podía crear una cuenta con un correo sin validar, y pidió explícitamente el cambio: "necesito que antes de crearse envíe un correo y que el cliente tenga que validarlo para crear la cuenta").
**Contexto:** La decisión anterior priorizó "no romper nada" sobre exigir verificación estricta. En la práctica, el usuario consideró que permitir usar la cuenta con un correo sin confirmar era en sí mismo un problema (cualquiera puede registrarse con un correo ajeno o inventado y usar la plataforma con normalidad) — más grave que el riesgo original de dejar a alguien afuera por un fallo de envío.
**Opciones consideradas:** (a) mantener no bloqueante; (b) bloquear el login hasta confirmar el correo, usando la infraestructura ya construida (Resend, `VerificationToken`, tokens de un solo uso) sin cambios de esquema.
**Decisión tomada:** (b).
**Motivo:** Instrucción explícita y puntual del usuario, revirtiendo la decisión previa con el mismo criterio que ya se aplicó en otras partes del proyecto (priorizar lo que pide el usuario cuando prueba el comportamiento en vivo y lo objeta).
**Impacto:**
- `register()`/`registerCompany()` (`BACKEND/apps/auth-service/src/auth.service.ts`) ya no emiten cookie ni token JWT — la cuenta se crea (con `emailVerified: false`, sin cambios de esquema) pero queda inutilizable hasta confirmar el correo. Responden `{ message, email }` en vez de `{ user, token }`.
- `login()`/`loginCompany()` rechazan con 403 si `user.emailVerified === false`, con un mensaje reconocible (`"...correo todavía no fue confirmado..."`) que el frontend usa para decidir si ofrece "Reenviar correo" en el error, en vez de tratarlo como una contraseña incorrecta genérica.
- `resendVerification()` deja de requerir sesión (antes usaba el JWT del usuario autenticado) — ahora identifica la cuenta por correo en el body, con el mismo mensaje genérico anti-enumeración que ya usa `forgotPassword` (exista o no la cuenta, o ya esté verificada, la respuesta es idéntica).
- Frontend: `register`/`company-register` ya no navegan a la app tras el submit — muestran una pantalla de "revisa tu correo" con botón "Reenviar correo" (mismo componente, nuevo estado). `login`/`company-login` detectan el 403 específico y ofrecen "Reenviar correo" como acción del snackbar en vez del mensaje de error genérico.
- `EmailVerificationBannerComponent` (shells) se deja intacto como red de seguridad para sesiones que ya estaban activas antes de este cambio (JWTs ya emitidos no se invalidan retroactivamente por este cambio, solo el siguiente login los bloquearía) — ya no debería ser alcanzable para una sesión nueva.
- El backfill de cuentas existentes (ver decisión siguiente) sigue vigente y es lo que evita que las ~100 cuentas demo y cualquier cuenta real ya creada queden bloqueadas por este cambio.
**Riesgos:** Si el envío de Resend falla justo al registrarse (proveedor caído, typo en el correo), la cuenta queda creada pero inaccesible hasta reenviar el correo manualmente desde el login — el mismo riesgo que la decisión anterior evitaba a propósito. Se acepta porque el usuario lo pidió explícitamente tras evaluar el trade-off en la práctica.
**Cómo revertir:** Quitar los dos `if (!user.emailVerified) throw new ForbiddenException(...)` de `login()`/`loginCompany()`, y volver a emitir cookie/token desde `register()`/`registerCompany()` — el resto de la infraestructura no necesita cambios para volver al modo no bloqueante.

---

## Verificación de correo: cuentas ya existentes se marcan como verificadas por backfill (no empiezan en falso)

**Fecha:** 2026-07-28
**Contexto:** La columna nueva `User.emailVerified` es `NOT NULL DEFAULT false` a nivel de schema de Prisma (para que las cuentas *nuevas* creadas por la app, de acá en adelante, empiecen sin verificar). Pero la migración que agrega la columna necesita darle algún valor a las ~100 cuentas demo y cualquier cuenta real ya creada antes de este cambio.
**Opciones consideradas:** (a) dejar que todas las cuentas existentes también empiecen en `false` (mismo default); (b) backfill explícito a `true` para las cuentas ya existentes al momento de la migración, vía una migración separada de solo datos.
**Decisión tomada:** (b).
**Motivo:** (a) hubiera hecho aparecer el aviso de "verificá tu correo" de la nada en cuentas que llevan usándose con normalidad desde antes de que esta función existiera — confuso y no tiene sentido exigirles retroactivamente un paso que no existía cuando se registraron. Es el mismo criterio que usan la mayoría de productos reales al agregar verificación de correo a una base de usuarios ya existente ("grandfathering").
**Impacto:** Migración separada `20260728140000_backfill_existing_users_verified` (`UPDATE "users" SET "email_verified" = true`), aplicada una sola vez, después de la migración que agrega la columna (que sí respeta el default `false` del schema, sin drift entre Prisma y la base). Verificado en vivo: la cuenta demo del candidato principal no muestra el aviso; una cuenta registrada después sí lo muestra hasta confirmar.
**Riesgos:** Ninguno — es una migración de datos de un solo uso, no afecta el comportamiento de cuentas nuevas.
**Cómo revertir:** No aplica (backfill histórico, no hay "revertir" sin perder la distinción entre cuentas viejas/nuevas — si hiciera falta, se podría correr `UPDATE "users" SET "email_verified" = false WHERE created_at > '2026-07-28'` para deshacer solo el efecto en cuentas nuevas).

---

## Cambio de proveedor de correo: Resend → Brevo

**Fecha:** 2026-07-28 (mismo día que el cambio a verificación bloqueante — el límite de Resend se detectó al probarla en vivo).
**Contexto:** El riesgo de Resend ya estaba anotado desde la Fase D ("El remitente `onboarding@resend.dev`... solo puede enviar al correo con el que se creó la cuenta de Resend"). Mientras la verificación era no bloqueante, ese riesgo era tolerable. Al pasar a bloqueante (ver decisión anterior), dejó de serlo: cualquier cuenta registrada con un correo que no fuera el del dueño de la cuenta de Resend quedaba inutilizable para siempre — confirmado en vivo con una prueba real (`santifuturo888@gmail.com` nunca recibió el correo, ver `BUG-043`).
**Opciones consideradas:** (a) verificar un dominio propio en Resend — requiere que el usuario tenga un dominio registrado con acceso a su DNS; (b) comprar un dominio nuevo solo para esto; (c) cambiar a un proveedor que permita verificar un remitente individual (un correo, no un dominio) en su plan gratuito.
**Decisión tomada:** (c), con **Brevo** como proveedor.
**Motivo:** El usuario no tiene un dominio propio registrado — (a) no era viable sin (b), y comprar un dominio solo para desbloquear el envío de correos es gasto innecesario para un proyecto académico. Brevo (y otros proveedores similares, ej. SendGrid) resuelven exactamente este caso: verificás un correo tuyo con un clic de confirmación (sin DNS, sin dominio) y desde ahí podés enviar a cualquier destinatario real, gratis (300 correos/día en el plan gratuito de Brevo).
**Impacto:** `EmailService` (`BACKEND/libs/common/src/email/email.service.ts`) reescrito para llamar directo a la API REST de Brevo vía `fetch` nativo (sin agregar el SDK completo — es un solo endpoint). Mismo contrato público (`sendMail({to, subject, html})`), así que `auth.service.ts` no cambió. Variables de entorno `RESEND_API_KEY`/`RESEND_FROM_EMAIL` reemplazadas por `BREVO_API_KEY`/`BREVO_FROM_EMAIL` en `.env`/`.env.example` y en Railway (`auth-service`). Se quitó la dependencia `resend` de `package.json` (ya no se usa). Se encontró y resolvió de paso una segunda traba propia de Brevo: su restricción de "IPs autorizadas" bloqueaba la API key desde IPs no reconocidas (incluida la de Railway) hasta que el usuario la desactivó para claves API en `app.brevo.com/security/authorised_ips`.
**Riesgos:** El plan gratuito de Brevo tiene un límite de 300 correos/día — de sobra para el volumen de este proyecto (candidato único real + demos), pero a tener en cuenta si el uso creciera mucho. Ninguna otra funcionalidad depende de Resend, así que no queda ningún cabo suelto de la migración.
**Cómo revertir:** Reinstalar `resend`, revertir `email.service.ts` a la versión anterior (usaba el SDK de Resend), y volver a poner `RESEND_API_KEY`/`RESEND_FROM_EMAIL` — pero no tendría sentido sin resolver primero la limitación de destinatarios que motivó este cambio.
