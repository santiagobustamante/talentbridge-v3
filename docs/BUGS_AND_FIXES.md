# Bugs y fixes — TalentBridge V3

Un ID por bug, formato: ID / Módulo / Descripción / Causa / Archivos afectados / Solución / Prueba realizada / Estado.

---

### BUG-001 — Parámetro `q` del buscador de la landing se perdía antes de llegar a resultados
**Módulo:** Frontend — landing → login empresa → búsqueda de candidatos
**Descripción:** Buscar talento desde el hero de la landing navegaba a `/company/login?q=...`, pero tras loguearse el término de búsqueda desaparecía y `company/candidates` cargaba sin filtro.
**Causa:** Bug con **tres** causas encadenadas (solo la primera estaba en el hallazgo original de auditoría): (1) `CompanyLoginComponent.onSubmit()` nunca leía el `q` de la URL para reenviarlo tras login exitoso; (2) `CompanyCandidatesComponent` nunca leía `q` de su propia ruta en `ngOnInit`; (3) por lo mismo, tampoco disparaba una búsqueda automática al cargar. Arreglar solo (1) no hubiera resuelto nada visible.
**Archivos afectados:** `features/auth/company-login.component.ts`, `features/company/company-candidates.component.ts`
**Solución:** `company-login` lee `route.snapshot.queryParamMap.get('q')` y, si existe, navega post-login a `/company/candidates?q=...` en vez de `/company/dashboard`. `company-candidates` lee ese mismo param en `ngOnInit`, lo carga en `qCtrl` y llama `doSearch()`.
**Prueba realizada:** `ng build` limpio. Como efecto colateral, esto también dejó funcionando los accesos directos por profesión de la landing ("Desarrollador", "Ingeniero", etc. → `company/candidates?q=...`), que ya apuntaban a esa URL pero nunca hacían nada visible.
**Estado:** Corregido. Verificación visual en navegador real pendiente.

---

### BUG-002 — Fechas de toda la app renderizando en inglés
**Módulo:** Frontend — global
**Descripción:** Cualquier fecha mostrada con el pipe `date` nativo de Angular (formatos `longDate`, `medium`, `shortTime`, etc.) aparecía con nombres de mes y formato en inglés, en una aplicación 100% en español.
**Causa:** `LOCALE_ID` de Angular nunca fue configurado en `app.config.ts` — el pipe `date` usa `en-US` por defecto si no se registra explícitamente otro locale. No detectado hasta esta sesión porque visualmente pasa desapercibido en fechas cortas (`16/07/2026` se ve igual en cualquier locale) pero es evidente en formatos largos (`July 16, 2026` en vez de `16 de julio de 2026`).
**Archivos afectados:** `app.config.ts`
**Solución:** `registerLocaleData(localeEsCO)` + `{ provide: LOCALE_ID, useValue: 'es-CO' }`.
**Prueba realizada:** `ng build` limpio. Ver `DECISIONS.md` para la decisión de centralizar además el formato en `appDate`.
**Estado:** Corregido.

---

### BUG-003 — Grid de la tabla de ofertas desalineado en el breakpoint intermedio
**Módulo:** Frontend — `company-jobs` (panel empresa)
**Descripción:** En viewport intermedio (`until-desktop`), las columnas de la tabla de ofertas no correspondían a sus encabezados — el contenido de una columna aparecía bajo el encabezado de otra.
**Causa:** `grid-template-columns` del breakpoint tenía **8 valores** para **9 columnas reales** (Oferta/Ubicación/Modalidad/Contrato/Jornada/Estado/Post./Publicación/Acciones) — probablemente se perdió un valor al escribir la regla responsive, desplazando todo lo posterior en una posición.
**Archivos afectados:** `features/company/company-jobs.component.scss`
**Solución:** Restaurados los 9 valores del breakpoint, proporcionalmente similares al ratio del layout desktop.
**Prueba realizada:** `ng build` limpio. Verificación visual en viewport intermedio pendiente (Fase 11).
**Estado:** Corregido, pendiente de confirmación visual.

---

### BUG-004 — `console.error` de depuración en producción
**Módulo:** Frontend — `messages`
**Descripción:** Cada error al cargar mensajes se logueaba en la consola del navegador con `[MESSAGES] load error`, visible para cualquier usuario final que abriera devtools.
**Causa:** Log de depuración dejado en el código, sin removerlo antes de considerarse "terminado".
**Archivos afectados:** `features/messages/messages.component.ts`
**Solución:** Eliminado — el manejo real del error (snackbar al usuario) ya existía y no dependía del `console.error`.
**Prueba realizada:** `ng build` limpio, grep de `console.error|console.log|console.warn|console.debug` en el resto del frontend confirmó que no quedan otros casos.
**Estado:** Corregido.

---

### BUG-005 — URL pública hardcodeada a `localhost:4200`
**Módulo:** Frontend — `profile`
**Descripción:** El resumen de perfil mostraba la URL pública del portafolio como texto literal `localhost:4200/portfolio/<slug>`, que sería incorrecta en cualquier entorno que no sea desarrollo local.
**Causa:** Valor hardcodeado en vez de usar `window.location.origin`.
**Archivos afectados:** `features/profile/profile.component.html`
**Solución:** Reemplazado por el getter `publicUrl` que ya existía en el propio componente (usa `window.location.origin` correctamente) — no se creó lógica nueva, se eliminó una duplicación que ya tenía la solución correcta al lado.
**Prueba realizada:** `ng build` limpio.
**Estado:** Corregido.

---

### BUG-006 — `company-dashboard` sin fallback de logo
**Módulo:** Frontend — `company-dashboard`
**Descripción:** Si la empresa no tenía `logoUrl`, el hero del dashboard no mostraba nada en su lugar — ni iniciales, ni placeholder. Además, aunque hubiera `logoUrl`, el `<img>` no tenía ningún estilo definido (`.hero-logo` no existía en el SCSS).
**Causa:** El `@if (data()?.logoUrl; as logo)` no tenía rama `@else`, y nadie había agregado el CSS del contenedor cuando se agregó el `<img>`.
**Archivos afectados:** `features/company/company-dashboard.component.{html,ts,scss}`
**Solución:** Agregado `@else` con iniciales de la empresa sobre `--accent-purple` (mismo patrón que `company-profile`), más el CSS faltante de `.hero-logo`.
**Prueba realizada:** `ng build` limpio.
**Estado:** Corregido.

---

### BUG-007 — `remove()`/`save()` sin manejo de error en 5 puntos del portafolio
**Módulo:** Frontend — Habilidades, Experiencia, Educación, Proyectos
**Descripción:** Si el backend fallaba al borrar una habilidad/experiencia/educación/proyecto, o al guardar una educación, no pasaba nada visible — ni error, ni indicación de que la acción no se completó.
**Causa:** `.subscribe(() => this.load())` — callback única (`next`), sin segundo argumento `error`. Educación además tenía el mismo problema en `save()`, y le faltaba directamente el import de `HttpErrorResponse` que los otros 3 componentes ya tenían.
**Archivos afectados:** `features/{skills,experiences,education,projects}/*.component.ts`
**Solución:** Agregado callback `error` con snackbar consistente (`err?.error?.message || err?.message || 'Error al eliminar/guardar'`) en los 5 puntos.
**Prueba realizada:** `ng build` limpio.
**Estado:** Corregido.

---

### BUG-008 — Perfil demo con ~150 habilidades cargadas
**Módulo:** Backend/datos — seed del candidato demo
**Descripción:** El perfil de `bustamantemolinasantiago@gmail.com` tiene prácticamente todo el catálogo de habilidades cargado, no un set realista para una demo o presentación.
**Causa:** `prisma/seed-santiago-profile.ts` (o un script relacionado) cargó el catálogo completo en vez de un subconjunto curado.
**Archivos afectados:** `BACKEND/prisma/seed-santiago-profile.ts` (o los datos ya persistidos en la DB — a confirmar antes de tocar)
**Solución:** **No aplicada todavía.** Requiere confirmación explícita del usuario antes de borrar datos (regla del proyecto: no borrar datos sin autorización puntual).
**Prueba realizada:** N/A.
**Estado:** Abierto — ver `NEXT_STEPS.md`.

---

### BUG-009 — Menú lateral del candidato duplicaba el texto de cada ítem
**Módulo:** Frontend — `AppShellComponent` (sidebar de todas las pantallas `/app/*`)
**Descripción:** Cada ítem del menú mostraba el mismo texto dos veces ("Perfil / Perfil", "Habilidades / Habilidades", etc.) en vez de un título corto + una descripción, como sí tenía el panel de empresa ("Dashboard / Panel de control").
**Causa:** `navItems` de `AppShellComponent` solo definía `label` (usado como texto corto Y como descripción por el mismo template `{{ item.subtitle || item.label }}` / `{{ item.label }}`) — nunca se cargó el campo opcional `subtitle`. `CompanyShellComponent` sí lo tenía desde el principio, por eso el panel de empresa nunca mostró el problema.
**Archivos afectados:** `shared/layout/app-shell.component.ts`
**Solución:** Agregado `subtitle` (texto corto, ej. "Perfil") a los 10 ítems, reusando texto ya existente en los propios encabezados de cada pantalla (ej. "Tu centro profesional", "Análisis inteligente") para que la descripción del menú coincida con lo que el usuario ve al entrar.
**Prueba realizada:** Verificado en vivo con Playwright + captura de pantalla contra el servidor de desarrollo real (no solo build) — confirmado antes y después.
**Estado:** Corregido.

---

### BUG-010 — Columna "Contrato" cortada a la mitad en la tabla de vacantes publicadas
**Módulo:** Frontend — `company-jobs` (tabla "Vacantes laborales")
**Descripción:** Textos como "Término indefinido" o "Prestación de servicios" se veían cortados ("Término indefin...") en la columna Contrato de la tabla, y en el breakpoint intermedio el encabezado "MODALIDAD" también quedaba truncado tras el primer ajuste.
**Causa:** `grid-template-columns` de la tabla asignaba muy poco ancho relativo a la columna Contrato (1.3fr de 10.7fr totales) frente a textos que son, en español, más largos que en la mayoría de plataformas de empleo en inglés.
**Archivos afectados:** `features/company/company-jobs.component.scss`, `features/company/company-jobs.component.html`
**Solución:** Redistribuido el ancho de columnas (Contrato 1.3fr → 1.7fr, compensado achicando Oferta y Ubicación) en desktop y en el breakpoint intermedio. Agregado `[title]` en las celdas de Contrato/Jornada como red de seguridad para que el texto completo se vea en un tooltip nativo si algún viewport aún lo recorta.
**Prueba realizada:** Verificado en vivo, dos iteraciones (la primera corrección truncó el encabezado "Modalidad", se ajustó de nuevo y se re-verificó).
**Estado:** Corregido.

---

### BUG-011 — Chips de habilidades con mayúsculas inconsistentes
**Módulo:** Frontend — búsqueda de candidatos (empresa) y barra de coincidencia de habilidades (candidato)
**Descripción:** Los nombres de habilidades se mostraban tal cual fueron tipeados por cada usuario ("html", "css", "javascript" en minúscula para unos candidatos; "Angular", "NestJS" con mayúscula para otros), dando una sensación poco prolija en pantallas donde se comparan varios candidatos u ofertas a la vez.
**Causa:** El campo `Skill.name` guarda el texto tal como lo escribió el usuario (la normalización a minúsculas solo existe en `normalizedName`, usado para evitar duplicados, no para mostrar). En la barra de coincidencia de ofertas el problema era más notorio porque `matchedSkills` que devuelve `applications-service` son directamente los valores normalizados (siempre en minúscula), no el nombre original.
**Archivos afectados:** `features/company/company-candidates.component.html`, `features/jobs/candidate-jobs.component.html`
**Solución:** Aplicado el pipe `titlecase` de Angular en los 3 puntos donde se muestran estos nombres. No es una capitalización perfecta para siglas (queda "Nestjs" en vez de "NestJS"), pero es consistente y mucho más profesional que el texto crudo — una tabla de excepciones para siglas conocidas quedó fuera de alcance por ser desproporcionada para el beneficio cosmético.
**Prueba realizada:** Verificado en vivo con captura de pantalla antes/después.
**Estado:** Corregido (parcial — ver nota de siglas arriba).

---

---

### BUG-012 — Mensaje propio aparecía duplicado (2-3 veces) al enviarlo en el chat
**Módulo:** Frontend — `messages` (chat candidato y empresa, mismo componente para ambos)
**Descripción:** Al enviar un mensaje, el remitente lo veía aparecer 2-3 veces seguidas en su propia pantalla, aunque el destinatario y la base de datos solo tenían una copia real.
**Causa:** `send()` agregaba el mensaje a `this.messages` de forma optimista con la respuesta REST (`chatService.sendMessage()`), y por separado la suscripción a `chatSocket.message$` **también** lo agregaba cuando el backend hacía eco del mismo mensaje por WebSocket a toda la sala `conversation:${id}` (el propio remitente ya está unido a esa sala). Ninguno de los dos puntos verificaba si el mensaje ya estaba en la lista antes de agregarlo.
**Archivos afectados:** `features/messages/messages.component.ts`
**Solución:** Nuevo método privado `appendMessage(msg)` que solo agrega el mensaje si no existe ya un `msg.id` igual en la lista actual, usado en los dos puntos de entrada (respuesta REST y eco de WebSocket).
**Prueba realizada:** Detectado durante la propia auditoría en vivo (un mensaje de prueba enviado por Playwright apareció triplicado en la captura de pantalla, pese a que en la base de datos había una sola fila — confirmado con `curl` directo al endpoint de mensajes). Corregido y reverificado con una segunda prueba en vivo, contando específicamente los elementos `.message-row` del DOM (no el texto completo de la página, que también incluye la vista previa del último mensaje en la lista de conversaciones) — resultado: 1 fila real para 1 mensaje enviado. Los mensajes de prueba usados para detectar y verificar este bug se borraron de la conversación demo real al terminar (no eran datos originales del seed, eran contaminación introducida por las propias pruebas).
**Estado:** Corregido.

---

### BUG-013 — `PATCH /api/skills/:id` rechazaba con 400 una edición de solo nivel (sin nombre)

**Módulo:** Backend — `portfolio-service` (`SkillDto`, `SkillsService`)
**Descripción:** Al construir la edición de nivel en línea del nuevo catálogo de habilidades (ver Fase de rediseño, `CHANGELOG.md`), un `PATCH` que solo mandaba `{ level: 'EXPERT' }` (sin `name`) devolvía `400 Bad Request`.
**Causa:** `SkillDto.name` estaba declarado como `@IsString()` obligatorio (sin `@IsOptional()`), pensado originalmente solo para el flujo de creación (`POST`). `SkillsService.updateSkill()` ya manejaba `dto.name` opcional en tiempo de ejecución (`dto.name || skill.name`), pero el `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` global rechazaba la petición antes de que ese código se ejecutara — el DTO nunca reflejó que se reutiliza tanto para crear como para actualizar.
**Archivos afectados:** `BACKEND/apps/portfolio-service/src/dto/skill.dto.ts`, `BACKEND/apps/portfolio-service/src/skills.service.ts`
**Solución:** `name` pasado a `@IsOptional() @IsString() name?: string`. Como TypeScript ahora marca `dto.name` como posiblemente `undefined` también en el flujo de creación, se agregó un guard explícito en `addSkill()`: `if (!dto.name?.trim()) throw new BadRequestException('El nombre de la habilidad es requerido')` — mantiene la validación real (nombre obligatorio al crear) pero como regla de negocio explícita en el service, no como restricción ciega del DTO compartido.
**Prueba realizada:** `npm run build:portfolio` limpio. Verificado en vivo con Playwright: click en el badge de nivel de una habilidad existente → cambio de "Básico" a "Experto" vía el nuevo selector en línea → sin error, nivel actualizado y persistido (confirmado recargando la página).
**Estado:** Corregido.

---

### BUG-014 — Filas de categorías colapsadas en el nuevo catálogo de habilidades se veían como franjas vacías de ~14px

**Módulo:** Frontend — `skills` (nuevo catálogo por categorías)
**Descripción:** Al construir el acordeón de categorías del catálogo de habilidades, cada fila de categoría colapsada (ej. "Frontend (23)") se renderizaba como un rectángulo redondeado casi sin alto, sin texto visible — parecía contenido roto o ausente.
**Causa:** `.catalog-groups` (contenedor con `display: flex; flex-direction: column; overflow-y: auto; max-height: 420px`) tenía como hijos `.catalog-group` de 40px de alto cada uno, pero al no fijar `flex-shrink: 0`, Flexbox aplicaba su comportamiento por defecto (`flex-shrink: 1`) y **achicaba las 21 filas** para que todas cupieran dentro del `max-height`, en vez de dejarlas en su tamaño natural y dejar que el contenedor scrollee. El mismo patrón que ya había producido falsos positivos de captura de pantalla en esta sesión (ver `DECISIONS.md`) llevó a sospechar primero de un artefacto de Playwright — pero esta vez `getComputedStyle`/`getBoundingClientRect()` confirmó que el achicamiento era real en el DOM, no solo en la captura.
**Archivos afectados:** `FRONTEND/src/app/features/skills/skills.component.scss`
**Solución:** Agregado `flex-shrink: 0` a `.catalog-group`.
**Prueba realizada:** Verificado en vivo: `getBoundingClientRect()` de las 21 categorías confirmó 40px de alto real (antes: ~14px), más una captura recortada al contenedor (`.catalog-groups.screenshot()`, no `fullPage`) mostrando las filas correctamente dimensionadas y con su texto visible.
**Estado:** Corregido.

---

### Falsos positivos descartados en esta auditoría (documentados para no re-investigarlos)

- **"Landing con huecos enormes de espacio en blanco"**: una captura `fullPage: true` con Playwright mostró la sección "¿A quién está dirigido?" con dos cards vacías seguidas de miles de píxeles en blanco. Inspección del DOM confirmó que el contenido real está completo y correctamente renderizado (texto, íconos, botones) — el problema fue un artefacto de captura de pantalla de página completa combinado con las animaciones de scroll (`animate-fade-in-up`) del home, no un bug de la app. Verificado con una captura de viewport normal tras hacer scroll real a la sección: se ve perfecta.
- **"Joaquín tapa la última card de la lista de trabajos en mobile"**: la misma clase de artefacto — una captura `fullPage: true` en 390px de ancho mostraba el botón flotante superpuesto a una card. Al scrollear el contenedor real hasta el final y capturar solo el viewport, la paginación y el botón "Ver detalle" tienen espacio de sobra por encima de Joaquín. **No era un bug real**, pero de todos modos se agregó `padding-bottom` a `.page-content` en ambos shells (candidato y empresa) como margen de seguridad — no cambia nada visualmente hoy, pero cubre el caso si una pantalla futura tiene contenido que llegue justo al borde inferior.
