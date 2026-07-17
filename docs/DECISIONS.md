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
