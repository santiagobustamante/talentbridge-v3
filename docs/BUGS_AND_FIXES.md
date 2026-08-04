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

---

### BUG-015 — El campo de teléfono/NIT no dejaba editar un valor ya cargado (el cursor saltaba al final en cada tecla)

**Módulo:** Frontend — `profile.component`, `company-profile.component`
**Descripción:** Al agregar formateo en vivo del teléfono ("+57 300 123 4567") y el NIT ("900.123.456-7") en la misma sesión, cada pulsación disparaba `valueChanges` → `setValue(formatted)`. `setValue` reescribe el `<input>` del DOM (vía `writeValue` del `ControlValueAccessor`) sin preservar la posición del cursor, sin importar que se pasara `emitEvent: false` (ese flag solo evita que el propio listener se dispare de nuevo — no tiene ningún efecto sobre si Angular reescribe el valor visible del campo). Resultado: escribir o borrar un carácter en cualquier posición que no fuera la última hacía que el cursor saltara al final del texto inmediatamente después de esa tecla, haciendo prácticamente imposible editar un número ya cargado (cada tecla adicional terminaba insertándose al final, no donde el usuario apuntaba).
**Archivos afectados:** `FRONTEND/src/app/features/profile/profile.component.ts`, `FRONTEND/src/app/features/company/company-profile.component.ts`
**Solución:** Se reemplazó el listener de `valueChanges` (formateo en cada tecla) por un handler en el evento `(blur)` de cada campo — el valor se reformatea recién al salir del campo, no mientras se escribe. Mientras el campo tiene foco no hay ninguna interferencia con la posición del cursor.
**Prueba realizada:** Reproducido el bug exacto contra el código anterior (insertar un carácter en la posición 5 de "+57 312 439 2090" → el cursor terminaba en la posición 16, el final) y confirmado que con el fix el cursor se queda en la posición correcta (6) durante la edición, reformateando recién al disparar `blur`.
**Estado:** Corregido.

---

### BUG-016 — `parseNumericInput` interpretaba mal un monto con puntos de miles cuando no había ninguna coma ("$2.500.000" → 3)

**Módulo:** Frontend/Backend — `shared/utils/normalize/currency.util.ts` (frontend) y su espejo `libs/common/src/normalize/currency.util.ts` (backend)
**Descripción:** Al crear una oferta laboral con salario mínimo `$2.500.000` y máximo `$4.000.000`, la tabla de ofertas mostraba "$3 – $4 COP" en vez de "$2.500.000 – $4.000.000 COP" — descubierto durante la verificación en vivo del sistema de normalización (no en el diseño original).
**Causa:** La lógica original de `parseNumericInput` solo distinguía coma-decimal vs. punto-miles cuando **ambos** separadores estaban presentes en el valor ("2.500,75" vs "2,500.75"). Si solo había puntos (caso real: formato es-CO sin coma, "$2.500.000"), el código no los eliminaba — pasaba directo a `parseFloat("2.500.000")`, que en JavaScript se detiene en el segundo punto (no es un número válido más allá de ahí) y devuelve `2.5`. `Math.round(2.5)` en el componente que llama a esta función redondea a `3`. Mismo problema con "4.000.000" → `4.0` → `4`.
**Archivos afectados:** `FRONTEND/src/app/shared/utils/normalize/currency.util.ts`, `BACKEND/libs/common/src/normalize/currency.util.ts`
**Solución:** Reescrita la lógica para manejar los 3 casos por separado: (a) coma y punto presentes → el que aparece último es el separador decimal (comportamiento anterior, sin cambios); (b) un solo tipo de separador con el último grupo de exactamente 3 dígitos, o más de un grupo → se trata como separador de miles y se elimina por completo ("2.500.000" → 2500000, "2.500" → 2500); (c) un solo separador con 1-2 dígitos en el último grupo → se trata como decimal ("2.50" → 2.5).
**Prueba realizada:** Reproducido el bug exacto en vivo (oferta creada con `$2.500.000`/`$4.000.000` mostrando "$3 – $4 COP" en la tabla), corregida la utilidad, editada la misma oferta reingresando los mismos valores, y confirmado que la tabla ahora muestra "$2.500.000 – $4.000.000 COP". `ng build` y `nest build` (`common-lib`) limpios tras el fix.
**Estado:** Corregido.

---

### BUG-017 — `normalizeUrl` rompía rutas relativas de logo ("/assets/logo.svg" → "https:///assets/logo.svg"), reportado por el usuario con captura de pantalla

**Módulo:** Frontend/Backend — `shared/utils/normalize/url.util.ts` (frontend) y su espejo `libs/common/src/normalize/url.util.ts` (backend) · Dato afectado: `company_profiles.logo_url` de `empresa001@demo.com` (Talento Llanero S.A.S.)
**Descripción:** El usuario compartió una captura del dashboard de empresa mostrando el logo roto (ícono de imagen no cargada + texto alternativo "Taler..." desbordado) tanto en el header como en el hero del dashboard.
**Causa:** `company-profile.component.ts` pasa el campo `logoUrl` del formulario por el mismo `cleanUrl()` que `websiteUrl` antes de guardar. `normalizeUrl` anteponía `https://` a cualquier valor sin protocolo — pero el valor real de `logoUrl` para los datos demo es una ruta relativa (`/assets/company-logos/logo-1.svg`), no una URL externa. Al guardar el perfil de esta empresa durante la verificación en vivo de esta misma tarea, el valor quedó corrompido a `https:///assets/company-logos/logo-1.svg` (con triple slash), una URL inválida que el navegador no puede resolver — de ahí el ícono roto y el `alt` desbordado.
**Archivos afectados:** `FRONTEND/src/app/shared/utils/normalize/url.util.ts`, `BACKEND/libs/common/src/normalize/url.util.ts`
**Solución:** `normalizeUrl` ahora deja intacto cualquier valor que ya empiece con `/` (ruta relativa válida tal cual), sin anteponerle protocolo. Se corrigió además el dato ya corrompido de `empresa001@demo.com` (único registro afectado — el único guardado de perfil de empresa hecho durante esta sesión) de vuelta a `/assets/company-logos/logo-1.svg`.
**Prueba realizada:** Confirmado por consulta directa al endpoint (`GET /api/company/profile`) que el valor corrupto tenía el triple slash antes del fix. Tras corregir la utilidad y el dato, verificado en vivo que el logo (ícono de circuito azul) vuelve a renderizar correctamente en el header y en el hero del dashboard. `nest build` (`common-lib` + `company-service`) limpio.
**Estado:** Corregido.

---

### BUG-018 — El gateway devolvía 502 ("Error al iniciar sesión" / "No se pudo cargar el perfil") cuando un microservicio recién se despertaba, reportado por el usuario con captura de pantalla

**Módulo:** Backend — `api-gateway` (`http-client.service.ts`)
**Descripción:** El usuario reportó (con dos capturas de pantalla en momentos distintos) errores de login y de carga de perfil ("Http failure response ... 502") navegando la app recién desplegada, sin relación aparente con ningún cambio de código de la sesión.
**Causa:** Los 10 microservicios corren en el plan free de Render, que duerme cualquier servicio sin tráfico en ~15 min. El primer pedido después lo despierta, pero el contenedor tarda hasta 25-30 segundos en volver a estar listo (confirmado midiendo una llamada directa a `candidate-service`: 25188ms). La capa de borde de Render corta la conexión gateway→servicio antes de que ese arranque termine y devuelve 502 — el servicio en sí nunca estuvo roto, solo no llegó a tiempo. El gateway (`HttpClient.proxy()`) no tenía timeout ni reintento: el primer 502 se lo pasaba directo al usuario sin darle al servicio la chance de terminar de despertar.
**Archivos afectados:** `BACKEND/apps/api-gateway/src/http-client.service.ts`
**Solución:** Reintento automático cuando la respuesta del servicio destino es 502/503/504 (o falla la conexión) — hasta 2 reintentos con 4s de espera entre cada uno. Limitado a peticiones `GET`, las únicas seguras de repetir sin riesgo de duplicar un efecto (ej. crear una postulación dos veces) si la petición original ya había llegado a procesarse del otro lado y solo se cortó la respuesta.
**Prueba realizada:** Diagnóstico: pegándole directo a cada servicio (bypaseando el gateway) todos respondían bien — confirmó que el problema estaba en el hop gateway→servicio, no en los servicios en sí. `npm run build:gateway` limpio. `npx jest` → 44/44 (sin tests nuevos — el fix depende de latencia/red real, no se presta a mockear). Verificación en vivo pendiente de confirmar tras el redeploy.
**Estado:** Corregido, verificación en vivo pendiente.

---

### BUG-019 — El 502 de Railway que motivó abandonarlo por Render (2026-07-18) era config propia, no la plataforma

**Módulo:** Infraestructura — proyecto Railway `renewed-enchantment` (los 10 servicios)
**Descripción:** El diagnóstico original (ver `DECISIONS.md`, entrada "Backend público: Render... en vez de Railway") atribuyó un 502 persistente y reproducible (hasta con un servidor mínimo de prueba) a la plataforma Railway. Al retomar Railway para reemplazar Render, se volvió a probar 1 servicio primero (`chat-service`) antes de comprometer los 10, y esta vez sí se llegó a la causa real mirando `railway logs --build`.
**Causa (4 bugs de configuración, no de plataforma):**
1. Ningún servicio tenía seteada la variable `PORT` — el proxy de borde de Railway la usa para saber a qué puerto interno enrutar, y ninguno de los 10 servicios la lee ni la tenía configurada (solo su propia `<NOMBRE>_SERVICE_PORT`).
2. `api-gateway` nunca tuvo `DATABASE_URL` configurada (los otros 9 sí).
3. `DEEPSEEK_MODEL` seguía en el valor deprecado `deepseek-chat` (mismo bug ya corregido en Render, nunca replicado acá).
4. **La causa raíz real del 502 original:** los 10 servicios tenían persistido `builder: RAILPACK` con `rootDirectory`/`dockerfilePath` vacíos — nunca se guardó la config para que cada uno use su Dockerfile propio. Sin eso, según cómo se subiera el código, Railway fallaba el autodetect o construía el `Dockerfile` genérico multi-stage de `BACKEND/` sin `--target`, lo que arma el último stage del archivo (`dashboard-service`) — los 10 servicios corrían el mismo build bajo nombres distintos, sin error visible en build/deploy.
**Archivos afectados:** Ninguno en el repo — todo config de Railway (env vars + `rootDirectory`/`dockerfilePath` por servicio, vía CLI y API GraphQL). `FRONTEND/src/environments/environment.prod.ts` sí cambió, para apuntar a Railway.
**Solución:** Detalle completo del diagnóstico y la corrección en [`CHANGELOG.md`](./CHANGELOG.md#2026-07-25--migración-del-backend-de-render-a-railway) y [`DEPLOYMENT.md`](./DEPLOYMENT.md#7-problemas-conocidos--comportamiento-esperado) (sección de la trampa de `--path-as-root`).
**Prueba realizada:** Barrido de scripts contra el gateway de Railway (login candidato/empresa, dashboard, portafolio, Joaquín, chat, vacantes, postulaciones, analítica, notificaciones, búsqueda) — todos `200`/`201` con datos reales. Verificado además en el navegador real tras el deploy a Vercel: login, dashboard con datos correctos, tráfico de red confirmado contra `*.up.railway.app`.
**Estado:** Corregido y en producción. Render queda desplegado intacto como respaldo (ver `DEPLOYMENT.md` sección 5, "Revertir a Render si Railway falla").

---

### BUG-020 — [CRÍTICO] El gateway confiaba en el `X-Forwarded-For` que mandaba el propio cliente, permitiendo saltarse el rate-limit de login rotando un IP falso

**Módulo:** Backend — `api-gateway` (`main.ts`, `http-client.service.ts`)
**Descripción:** El rate-limit de intentos de login/registro (en `auth-service`) decide a quién limitar mirando el IP del request entrante. El gateway reenviaba ese IP a los servicios internos vía el header `X-Forwarded-For` — pero lo armaba a partir de `req.headers['x-forwarded-for']`, el mismo header que **cualquier cliente puede mandar con el valor que quiera** (trivial con curl/Postman: `curl -H "X-Forwarded-For: 1.2.3.4" ...`). Cualquiera podía rotar un IP inventado en cada intento y saltarse el límite de intentos de login por completo, habilitando fuerza bruta de contraseñas sin fricción.
**Causa:** Express no confía en `X-Forwarded-For` por defecto (`trust proxy` sin configurar) — pero el gateway tampoco necesitaba esa confianza porque nunca usaba `req.ip`: leía el header entrante directo y lo reenviaba tal cual, sin validar que viniera realmente del proxy de la plataforma (Render/Railway) y no del cliente final.
**Archivos afectados:** `BACKEND/apps/api-gateway/src/main.ts`, `BACKEND/apps/api-gateway/src/http-client.service.ts`
**Solución:** `app.set('trust proxy', 1)` en `main.ts` — le dice a Express que hay exactamente un proxy propio (el de Render/Railway) delante del gateway, y que por lo tanto debe confiar solo en el **último** hop de la cadena `X-Forwarded-For` (el que agrega ese proxy) e ignorar cualquier valor que el cliente haya mandado antes. `http-client.service.ts` dejó de reenviar el header entrante crudo y pasó a usar `req.ip` (ya resuelto de forma segura por Express con la config de arriba) como única fuente al armar el header hacia los servicios internos.
**Prueba realizada:** `npm run build:gateway` limpio. Revisado en conjunto con una auditoría de seguridad independiente (2 fuentes coincidieron en el mismo hallazgo).
**Estado:** Corregido.

---

### BUG-021 — [CRÍTICO] Path traversal en la subida de CV vía el nombre de archivo original

**Módulo:** Backend — `portfolio-service` (`cv.service.ts`, `cv.controller.ts`)
**Descripción:** Al subir un CV, el nombre del archivo guardado en disco se armaba concatenando `Date.now()` + un número aleatorio + `file.originalname` — el nombre original que manda el navegador en el `multipart/form-data`, **100% controlado por quien sube el archivo**. Un nombre armado a mano como `../../../etc/passwd` (o el equivalente en el servidor real) podía escribir fuera de `uploads/cv/`, en cualquier ruta que el proceso Node tuviera permiso de escribir.
**Causa:** Ningún saneamiento del nombre de archivo antes de usarlo para construir la ruta de destino con `path.join()` — `path.join()` respeta `../` en sus argumentos, no protege contra traversal por sí solo.
**Archivos afectados:** `BACKEND/apps/portfolio-service/src/cv.service.ts`, `BACKEND/apps/portfolio-service/src/cv.controller.ts`
**Solución:** `path.basename(file.originalname)` descarta cualquier componente de directorio del nombre (incluida una secuencia `../` armada a mano) antes de usarlo para construir la ruta — más una verificación explícita de que la ruta final resuelta siga dentro de `uploads/cv/` antes de escribir, como segunda capa. De paso, `cv.controller.ts` sumó un límite de tamaño a nivel de Multer (`limits: { fileSize }`) para que un archivo por encima del máximo se rechace antes de bufferearse entero en memoria, no después.
**Prueba realizada:** `npm run build:portfolio` limpio. Revisado en conjunto con una auditoría de seguridad independiente (2 fuentes coincidieron en el mismo hallazgo).
**Estado:** Corregido.

---

### BUG-022 — Joaquín anunciaba ofertas compatibles pero no podía mostrarlas: solo existía el mecanismo de tarjetas para candidatos, nunca para ofertas

**Módulo:** Backend — `assistant-service` (`assistant.service.ts`) · Frontend — `assistant-chat.component.html`
**Descripción:** El usuario reportó que Joaquín decía tener ofertas con buen match ("Ingeniero de Software Senior... 75% de compatibilidad") pero, al pedirle "muéstramelas", solo respondía derivando a "la sección de empleos de tu cuenta" sin mostrar nada concreto en el chat.
**Causa:** `AssistantLlmOutput` tenía `showCandidateMatches` (para que una EMPRESA vea tarjetas de candidatos) pero ningún equivalente `showJobMatches` para que un CANDIDATO vea tarjetas de ofertas — el matching candidato→ofertas ya se calculaba con datos reales (`getCandidateJobMatchesText`), pero solo se pasaba como texto plano al prompt del modelo, nunca como datos estructurados (`results`) que el frontend pudiera renderizar. El modelo no tenía ninguna forma de "activar" algo que no existía.
**Archivos afectados:** `BACKEND/apps/assistant-service/src/assistant.service.ts`, `FRONTEND/src/app/shared/assistant/assistant-chat.component.html`
**Solución:** Nueva bandera `showJobMatches` (mismo patrón que `showCandidateMatches`), documentada en el system prompt. `getCandidateJobMatchesText` pasó a `getCandidateJobMatches`, devolviendo además `topJobs` (id/título/empresa/ciudad/% match reales, misma lógica `computeSkillMatch` de siempre — nunca un número inventado). El frontend distingue tarjetas de candidato vs. de oferta por un campo `type` nuevo en ambos shapes, reusando el mismo `.result-mini` ya estilado.
**Prueba realizada:** `npm run build:assistant` limpio. Verificado en vivo contra DeepSeek real: pedirle a Joaquín "muéstrame las ofertas que mejor coinciden con mi perfil" devolvió `showJobMatches: true` y 5 tarjetas reales (`type: "job"`) ordenadas por `matchPercent` descendente, con el `reply` mencionándolas por nombre.
**Estado:** Corregido.

---

### BUG-023 — Puntaje de análisis de CV muy inconsistente entre corridas (ej. 30 vs 55 sobre el mismo PDF)

**Módulo:** Backend — `portfolio-service` (`cv.service.ts`)
**Descripción:** Analizar el mismo CV varias veces daba puntajes con hasta 25 puntos de diferencia entre corridas.
**Causa:** `performAnalysis` llamaba a DeepSeek pidiendo un "score de 0 a 100" como juicio holístico único, sin rúbrica, y sin pasar `temperature` (quedaba en el default de `chatJson`, 0.4) — exactamente el escenario donde un LLM varía más de una llamada a otra: sin criterios concretos que sumar, cada corrida "improvisa" el número desde cero.
**Archivos afectados:** `BACKEND/apps/portfolio-service/src/cv.service.ts`
**Solución:** Rúbrica explícita de 5 criterios con puntaje fijo cada uno (contacto/estructura 15, experiencia 30, habilidades 25, formación 15, proyectos 15 — suman 100), instruyendo al modelo a sumarlos en vez de dar una impresión general. `temperature: 0` en esa llamada puntual (Joaquín y otros usos conversacionales de `chatJson` quedan con su 0.4 de siempre — acá es una tarea de evaluación, no una conversación).
**Prueba realizada:** `npm run build:portfolio` limpio.
**Estado:** Corregido — reduce la varianza esperada entre corridas; con LLMs no hay garantía de determinismo absoluto incluso a `temperature: 0`, pero el margen debería quedar muy por debajo del observado (25 puntos).

---

### BUG-024 — Teléfono, NIT, rango de salario y moneda de ofertas sin ninguna validación de formato real

**Módulo:** Backend — `candidate-service`, `company-service`, `jobs-service`, `libs/common` · Frontend — `profile`, `company-profile`
**Descripción:** Encontrado durante el barrido de validadores del 2026-07-26 (disparado por el bug de `isValidUrl`, ver entrada de `CHANGELOG.md` del mismo día). `phone`/`nit` solo tenían `@MaxLength(30)` — un teléfono de "1" dígito o un NIT de "5" se guardaban igual que uno real. `salaryMax`/`salaryMin` en ofertas de trabajo no tenían ningún chequeo cruzado (a diferencia de las fechas, que sí lo tenían) — se podía guardar un rango invertido. `currency` aceptaba cualquier string de hasta 10 caracteres en vez de restringirse a las monedas reales que la app soporta.
**Causa:** Estos campos nunca tuvieron un validador de formato desde que se crearon los DTOs — solo `@IsString()`/`@MaxLength()` genéricos, sin que nadie los cuestionara hasta que el barrido de `isValidUrl` motivó revisar el resto de validadores del proyecto en busca del mismo patrón.
**Archivos afectados:** `BACKEND/libs/common/src/validators/is-valid-phone.validator.ts` (nuevo), `is-valid-nit.validator.ts` (nuevo), `number-range.validator.ts` (nuevo), `profile.dto.ts`, `company-profile.dto.ts`, `create-job-offer.dto.ts`, `FRONTEND/src/app/shared/utils/validators/valid-phone.validator.ts` (nuevo), `valid-nit.validator.ts` (nuevo), `profile.component.ts/.html`, `company-profile.component.ts/.html`.
**Solución:** `IsValidPhone()`/`validPhone` (10-12 dígitos), `IsValidNit()`/`validNit` (9-10 dígitos, sin dígito de verificación DIAN — ver `DECISIONS.md`), `IsGreaterOrEqual()` (mismo patrón que `IsAfterOrEqualDateString`) para `salaryMax`, `@IsIn(['COP'])` para `currency`. `company-jobs.component.ts` ya validaba el rango salarial del lado cliente — no hizo falta tocarlo.
**Prueba realizada:** `npm run build` (backend completo) + `ng build`/`lint:css` limpios. Verificado en vivo contra backend local real: teléfono "123" inválido / "3001234567" válido; NIT "5" inválido / "900123456" válido, en los formularios reales de perfil de candidato y empresa.
**Estado:** Corregido. Pendiente de alcance mayor (no un bug, una limitación conocida y documentada): no se implementó el algoritmo real de dígito de verificación DIAN para NIT, decisión consciente por el bajo valor frente al esfuerzo en un dato de empresa demo.

---

### BUG-025 — El registro de candidato no pedía nombre, así que el saludo mostraba el correo en vez del nombre real

**Módulo:** Backend — `auth-service` · Frontend — `register.component.ts`
**Descripción:** El usuario reportó: "al crear un perfil no me pide mi nombre, solo correo y contraseña pero al iniciar quiero que en el saludo de arriba... me dé el nombre real no el correo".
**Causa:** `RegisterDto` solo tenía `email`/`password`/`confirmPassword` — `auth.service.ts` creaba el `Profile` del candidato nuevo con únicamente el `slug`, sin `fullName`. El saludo del shell (`app-shell.component.ts`) ya tenía el fallback correcto (`profile?.fullName || userEmail`), pero como `fullName` nunca se guardaba en el registro, ese fallback al correo era la única opción hasta que el candidato entrara a editar su perfil manualmente.
**Archivos afectados:** `BACKEND/apps/auth-service/src/dto/auth.dto.ts`, `auth.service.ts`, `auth.service.spec.ts`, `FRONTEND/src/app/features/auth/register.component.ts`, `FRONTEND/src/app/core/auth/auth.service.ts`.
**Solución:** `fullName` obligatorio (`@IsNotEmpty() @MaxLength(150)`) en `RegisterDto`; `register.component.ts` lo pide con el mismo patrón de validación que `companyName` en el registro de empresa (`Validators.required` + `notBlank`); `auth.service.ts` guarda `titleCaseText(fullName)` en el `Profile` creado.
**Prueba realizada:** `npm run build:auth` + `npx jest auth-service` (9/9) limpios. Verificado en vivo end-to-end: registro nuevo con nombre → saludo "Hola, {nombre real}" inmediato, sin pasar por editar el perfil.
**Estado:** Corregido.

---

### BUG-026 — El límite de intentos por IP solo protegía `auth-service`, los otros 9 servicios no tenían ninguno

**Módulo:** Backend — `libs/common`, los 9 servicios sin `auth-service`
**Descripción:** Ya documentado desde el 2026-07-18 (`plan-correcciones-seguridad-y-bugs.md` ítem 1.1) como "evaluar si extenderlo al resto de servicios" — quedó pendiente hasta que salió listado en el reporte de inspección del barrido del 2026-07-26 y el usuario pidió arreglarlo.
**Causa:** `IpThrottlerGuard` + `ThrottlerModule` solo se habían instalado en `auth-service` (login/registro, el de mayor riesgo original) — nunca se replicó al resto, incluido el `api-gateway`, el punto de entrada real de toda la app.
**Archivos afectados:** `BACKEND/libs/common/src/guards/ip-throttler.guard.ts` (movido desde `auth-service`), `BACKEND/libs/common/src/index.ts`, y los `*.module.ts` de los 9 servicios restantes.
**Solución:** Guard compartido vía `libs/common`; `ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 300 }])` + `APP_GUARD` en cada uno de los 9 módulos — 300 req/min por IP, más laxo que el límite de login (10/min) a propósito.
**Prueba realizada:** `npm run build` completo limpio. Carga concurrente real (`xargs -P 40`, 320 requests) contra el gateway local y contra producción real (`https://api-gateway-production-47f0.up.railway.app`): exactamente 300 pasan, 20 devuelven 429 en ambos casos.
**Estado:** Corregido.

---

### BUG-027 — No se podía descartar un CV ya seleccionado antes de subirlo

**Módulo:** Frontend — `cv-analysis.component.ts`
**Descripción:** El usuario reportó: "una vez carga una cv antes de darle en subir, no me deja descartar".
**Causa:** `onFileSelected()` guardaba el archivo en `selectedFile`, pero no existía ningún botón ni método para volver a `null` sin subirlo — la única forma de "salir" de un archivo elegido por error era subirlo igual.
**Archivos afectados:** `FRONTEND/src/app/features/cv-analysis/cv-analysis.component.ts`, `cv-analysis.component.scss`.
**Solución:** Botón "Descartar" (ícono `close`) en la esquina de la zona de carga cuando hay un archivo seleccionado, con `clearSelectedFile()` que limpia `selectedFile` y resetea el `value` del input nativo (necesario para poder re-elegir el mismo archivo después).
**Prueba realizada:** `ng build` + `lint:css` limpios. Verificado en vivo: archivo seleccionado → botón "Descartar" visible → click → vuelve a la zona de carga vacía.
**Estado:** Corregido.

---

### BUG-028 — Los filtros de Modalidad y Tipo de contrato en "Trabajos" no hacían nada

**Módulo:** Backend — `jobs-service` · Frontend — `candidate-jobs.component.ts`
**Descripción:** El usuario reportó, con una captura de los filtros: "arreglar filtros, no funcionan".
**Causa:** `JobsService.getCandidateJobs()` construía el `where` de Prisma leyendo solo `query.q` y `query.city` — `query.modality` y `query.contractType` (que el frontend sí mandaba desde hace tiempo) nunca se leían ni se aplicaban al filtro.
**Archivos afectados:** `BACKEND/apps/jobs-service/src/jobs.service.ts`.
**Solución:** Agregados `where.modality`/`where.contractType` cuando vienen en el query.
**Prueba realizada:** `npm run build:jobs` limpio. Verificado en vivo: filtro "Remoto" → todos los resultados remotos; combinado con "Término indefinido" → ambos aplican a la vez.
**Estado:** Corregido.

---

### BUG-029 — El campo de Municipio en los filtros de búsqueda borraba lo que se escribía

**Módulo:** Frontend — `municipio-input.component.ts`, usado en `candidate-jobs.component.html` y `company-candidates.component.html`
**Descripción:** El usuario reportó, en la misma captura de los filtros: "este campo de municipio esta malo".
**Causa:** `MunicipioInputComponent` exige siempre un match exacto contra el catálogo DIVIPOLA al perder el foco — diseño correcto para datos que se guardan (perfil, experiencia), pero los 2 filtros de búsqueda donde se reusó el mismo componente esperaban texto libre (el backend ya filtra con `contains`, coincidencia parcial). Si el usuario no alcanzaba a hacer click en una sugerencia antes de que el campo perdiera el foco, el texto tipeado se borraba solo — el campo "no funcionaba" desde la perspectiva del usuario.
**Archivos afectados:** `FRONTEND/src/app/shared/components/municipio-input/municipio-input.component.ts`, `FRONTEND/src/app/features/jobs/candidate-jobs.component.html`, `FRONTEND/src/app/features/company/company-candidates.component.html`.
**Solución:** Nuevo `@Input() strict` (default `true`, sin cambio de comportamiento en los demás usos del componente). En `strict=false`: el valor se emite en cada tecla (no solo al perder el foco, para evitar que un click directo en "Filtrar" se procese antes que el `setTimeout` de validación) y nunca se descarta. Aplicado `[strict]="false"` en los 2 filtros de búsqueda.
**Prueba realizada:** `ng build` + `lint:css` limpios. Verificado en vivo: tipear "Medellín" sin elegir sugerencia + click inmediato en "Filtrar" → todos los resultados son de Medellín (antes se hubiera borrado el campo).
**Estado:** Corregido.

---

### BUG-030 — Se podían crear proyectos con un solo campo lleno (solo el nombre)

**Módulo:** Backend — `portfolio-service` · Frontend — `projects.component.ts`
**Descripción:** El usuario reportó: "me deja agregar proyectos donde solo tienen un campo lleno, debe tener toda la información".
**Causa:** Tanto el formulario (`projects.component.ts`) como el DTO del backend (`ProjectDto`) solo exigían `name` — el resto de los campos (incluidos descripción, rol, tipo y estado del proyecto) eran opcionales desde que se crearon, sin que nadie lo cuestionara.
**Archivos afectados:** `FRONTEND/src/app/features/projects/projects.component.ts`, `BACKEND/apps/portfolio-service/src/dto/project.dto.ts`.
**Solución:** `Validators.required` (+ `notBlank` en los de texto) agregado a `description`, `role`, `projectType`, `status` y `startDate` en el frontend; espejado en el backend quitando `@IsOptional()` de esos mismos campos (con `@IsNotEmpty()` donde aplica). `responsibilities`, las 3 URLs y `endDate` siguen opcionales a propósito.
**Prueba realizada:** `npm run build:portfolio` + `ng build`/`lint:css` limpios. Verificado en vivo: formulario con solo `name` lleno → `form.invalid: true`, botón "Agregar proyecto" deshabilitado.
**Estado:** Corregido.

---

### BUG-031 — El análisis de CV fallaba las primeras 2-3 veces y funcionaba a la 4ta, sin ningún reintento

**Módulo:** Backend — `libs/common` (`DeepSeekService`)
**Descripción:** El usuario reportó: "me pasa que las primeras veces que hago análisis me sale este mensaje unas 2 o 3 veces a la 4 ya funciona".
**Causa:** `CvService.performAnalysis()` llama a `DeepSeekService.chatJson()` una sola vez — cualquier error transitorio de la API (timeout, 429, 5xx) se propagaba directo como `BadRequestException` al usuario, sin ningún reintento automático. El patrón "falla un par de veces, después funciona solo" es la firma típica de un error transitorio de red/API sin retry.
**Archivos afectados:** `BACKEND/libs/common/src/ai/deepseek.service.ts`.
**Solución:** Nuevo método privado `withRetry()` (hasta 3 intentos, pausa corta entre cada uno) envolviendo la llamada real a la API en `chatJson` y `chatText` — beneficia también al asistente Joaquín, mismo problema de fondo. No reintenta fallos de parseo de JSON (deterministas).
**Prueba realizada:** `npm run build` (`common-lib`, `portfolio-service`, `assistant-service`) limpio. No se pudo forzar un fallo real de la API para probar el camino de reintento exacto — verificado por revisión de código que el `withRetry` envuelve correctamente la llamada sin cambiar el comportamiento del camino feliz (mismo resultado en éxito).
**Estado:** Corregido.

---

### BUG-032 — El campo de Municipio en los filtros de "Trabajos" se veía cortado/superpuesto

**Módulo:** Frontend — `candidate-jobs.component.scss`
**Descripción:** El usuario reportó, con captura: "en trabajos los filtros salen así, está como superpuesto en otro campo".
**Causa:** La clase `.filter-select` (diseñada para `<input>`/`<select>` simples) le aplicaba la mixin completa `forms.control` (borde, padding, alto, fondo) al *host* de `app-municipio-input` — pero ese componente ya tiene su propio `<input>` interno con la misma mixin aplicada, generando una caja duplicada dentro de otra y dejando muy poco espacio visible dentro del `min-width: 140px`.
**Archivos afectados:** `FRONTEND/src/app/features/jobs/candidate-jobs.component.scss`.
**Solución:** Selector específico `app-municipio-input.filter-select` que resetea los estilos de caja duplicados (borde, fondo, padding, alto) y solo controla el ancho dentro de la barra de filtros.
**Prueba realizada:** `lint:css` limpio. Verificado en vivo: el campo Municipio ahora tiene el mismo alto/proporción que Modalidad y Tipo de contrato, sin superposición.
**Estado:** Corregido.

---

### BUG-033 — Dropdown de sugerencias de Municipio se renderizaba detrás de las tarjetas de resultados

**Módulo:** Frontend — `candidate-jobs.component.scss`, `company-candidates.component.scss`
**Descripción:** El usuario reportó, con captura: "cuando se despliega esta especie de log no se superpone, sino que se pone atrás". El texto del placeholder ("Municipio") también generaba confusión porque el campo filtra tanto por ciudad como por municipio.
**Causa:** `.suggestions-dropdown` (dentro de `MunicipioInputComponent`) tiene `position: absolute; z-index: 20`, pero sus contenedores directos — `.filters-bar` en `candidate-jobs` y `.filter-row` en `company-candidates` — no tenían `position`/`z-index` propios, así que no formaban su propio contexto de apilamiento. Sin eso, el dropdown perdía la comparación de stacking contra el `.jobs-grid`/`.results-grid` de más abajo (más adelante en el DOM), quedando tapado a medias.
**Archivos afectados:** `FRONTEND/src/app/features/jobs/candidate-jobs.component.{html,scss}`, `FRONTEND/src/app/features/company/company-candidates.component.{html,scss}`.
**Solución:** `position: relative; z-index: 30;` en `.filters-bar`/`.filter-row`, para que junto con sus descendientes formen un único grupo de apilamiento por encima del contenido siguiente. Además, `placeholder`/`label` cambiados de "Municipio" a "Ciudad o municipio".
**Prueba realizada:** `lint:css` + `ng build` limpios. Verificado en vivo por inspección de DOM (`elementFromPoint` en varios puntos del área del dropdown en ambas páginas): el dropdown renderiza por encima de las tarjetas de resultados.
**Estado:** Corregido.

---

### BUG-034 — El análisis de CV a veces respondía en inglés en vez de español

**Módulo:** Backend — `libs/common` (`DeepSeekService`), `portfolio-service` (`cv.service.ts`)
**Descripción:** El usuario reportó: "en el analisis de CV aveces me da el resultado en ingles, necesito que SIEMPRE sea en español".
**Causa:** El prompt de sistema de `CvService.performAnalysis()` está en español pero nunca le indica explícitamente al modelo en qué idioma responder — DeepSeek a veces elegía inglés. Un primer intento de fix (una sola línea "Respondé SIEMPRE en español") se probó aislado contra la API real y **no fue suficiente**, el modelo lo ignoraba. Al verificar en vivo la versión reforzada del fix aparecieron dos bugs adicionales, no reportados por el usuario: (1) `DeepSeekService.chatJson()` solo reintenta (`withRetry`) la llamada HTTP en sí — si la API devuelve 200 con `content` vacío no lanza excepción, así que ese caso nunca se reintentaba; (2) con el prompt más largo, la respuesta a veces se truncaba a mitad del JSON porque `maxTokens: 800` se quedaba corto.
**Archivos afectados:** `BACKEND/apps/portfolio-service/src/cv.service.ts`, `BACKEND/libs/common/src/ai/deepseek.service.ts`.
**Solución:** Prompt reforzado con instrucción de idioma repetida (al inicio como "regla inquebrantable" y de nuevo junto a cada campo del JSON) — verificado aislado que esta versión sí es consistente. Chequeo de "contenido vacío" movido DENTRO de la función que reintenta `withRetry` (antes vivía después, fuera del ciclo de reintentos). `maxTokens` subido de 800 a 1200.
**Prueba realizada:** `npm run build` completo + `npx jest` (mismos 39/44 de siempre) limpios. Verificado en vivo contra el servicio real: 4 corridas consecutivas de análisis con las 2 CVs reales de la cuenta demo, las 4 devolvieron JSON completo 100% en español, sin truncamiento.
**Estado:** Corregido.

---

### BUG-035 — Proyectos: "Fecha fin" seguía visible aunque el estado fuera "En progreso"

**Módulo:** Frontend — `projects.component.ts`
**Descripción:** El usuario señaló, con captura: "aquí también hace falta el check de en curso" — Experiencia y Educación ya ocultan "Fecha fin" cuando el ítem sigue en curso; Proyectos no.
**Causa:** A diferencia de Experiencia/Educación (que usan una casilla `isCurrent`), Proyectos ya tenía un campo `status` obligatorio con la opción "En progreso" cumpliendo el mismo rol semántico, pero nada ataba la visibilidad de "Fecha fin" a ese valor.
**Archivos afectados:** `FRONTEND/src/app/features/projects/projects.component.ts`.
**Solución (v1):** `*ngIf="form.get('status')?.value !== 'IN_PROGRESS'"` en el campo "Fecha fin", y `endDate: v.status === 'IN_PROGRESS' ? undefined : ...` en `save()` — mismo patrón que Experiencia/Educación pero reusando el campo `status` ya existente en vez de agregar una casilla redundante.
**Ajuste pedido por el usuario tras ver el v1:** "pon la casilla de en proceso o en curso... como anteriormente se ha hecho" — quería la misma casilla literal (`mat-checkbox`) que Experiencia/Educación, no solo el efecto derivado del select de Estado. Se agregó `<mat-checkbox class="period-checkbox">Aún en curso</mat-checkbox>` junto a las fechas (mismo `period-row`/`checkbox-inline` mixin de `_forms.scss` que ya usa Experiencia), pero en vez de guardar un booleano nuevo (que podría desincronizarse del `status` que ya existe y alimenta el badge de la tarjeta), la casilla lee/escribe ese mismo campo: `[checked]="status === 'IN_PROGRESS'"` + `(change)="onOngoingChange($event.checked)"` que hace `status.setValue(checked ? 'IN_PROGRESS' : '')`. Cambiar el Estado desde el select también actualiza la casilla (una sola fuente de verdad, dos formas de tocarla).
**Archivos afectados (ajuste):** + `FRONTEND/src/app/features/projects/projects.component.scss` (estilos `period-row`/`period-checkbox`, reusando mixins ya existentes).
**Prueba realizada:** `lint:css` + `ng build` limpios, mismos 18 warnings de budget de siempre. Verificado en vivo por inspección de DOM: marcar la casilla oculta "Fecha fin" y pone el Estado en "En progreso"; desmarcarla la vuelve a mostrar y resetea Estado a "—"; elegir "En progreso" directo desde el select también marca la casilla sola.
**Estado:** Corregido.

---

### BUG-036 — Experiencia: sin campo de texto libre para "Otro" tipo de contrato

**Módulo:** Backend — `portfolio-service` · Frontend — `experiences.component.ts`, `portfolio-content.component.ts`
**Descripción:** Reportado en el acta de seguimiento del 27/07/2026 (asesor de tesis): "en experiencia en tipo de contrato falta el campo otro donde se especifique el tipo de contrato".
**Causa:** `Experience` solo tenía `contractType` (con "Otro" como opción de catálogo) pero ningún campo para especificar cuál — a diferencia de `JobOffer`, que ya resuelve exactamente este mismo caso con un campo `customContractType` desde antes.
**Archivos afectados:** `BACKEND/prisma/schema.prisma`, `BACKEND/apps/portfolio-service/src/dto/experience.dto.ts`, `BACKEND/apps/portfolio-service/src/experiences.service.ts`, `FRONTEND/src/app/core/auth/auth.models.ts`, `FRONTEND/src/app/features/experiences/experiences.component.ts`, `FRONTEND/src/app/shared/components/portfolio-content/portfolio-content.component.{ts,html}`.
**Solución:** Replicado el patrón de `JobOffer` — `customContractType` opcional en Prisma/DTO/service, campo de texto condicional (`*ngIf="contractType === 'OTHER'"`) en el formulario, y la función de label (tanto la privada en `experiences.component.ts` como la del portafolio público en `portfolio-content.component.ts`, que tenía su propia copia) devuelve el texto custom en vez de la palabra "Otro" cuando corresponde.
**Prueba realizada:** `npm run build:portfolio` + `ng build`/`lint:css` limpios. Verificado en vivo: experiencia creada con "Otro" + texto custom → se guarda, y se muestra el texto (no "Otro") tanto en la página privada de Experiencia como en el portafolio público.
**Estado:** Corregido.

---

### BUG-037 — Colores de nivel de habilidad Avanzado/Experto invertidos (+ bug de fondo en el portafolio público)

**Módulo:** Frontend — `styles.scss`, `portfolio-content.component.ts`
**Descripción:** Reportado en el acta de seguimiento: "cambiar el color del avanzado a azul y el de experto a color verde". Estaban al revés: Avanzado en verde, Experto en azul.
**Causa:** Valores de `--level-advanced`/`--level-expert` en `styles.scss` con los colores cruzados respecto a lo pedido. Además, un bug no reportado por el asesor: `portfolio-content.component.ts` juntaba Avanzado y Experto en una sola clase CSS (`level-high`) que usaba un único color — ahí ambos niveles ya se veían idénticos entre sí, y hubieran seguido igual (solo que del otro color) si solo se intercambiaban las variables.
**Archivos afectados:** `FRONTEND/src/styles.scss`, `FRONTEND/src/app/shared/components/portfolio-content/portfolio-content.component.{ts,scss}`.
**Solución:** Intercambiados los valores hex de las 2 variables. Separada la clase `level-high` en `level-advanced`/`level-expert` con su regla CSS propia cada una, replicando el patrón que ya existía para `level-mid`/`level-low` en el mismo archivo.
**Prueba realizada:** `ng build`/`lint:css` limpios. Verificado en vivo con `getComputedStyle`: `--level-advanced` = `#3b82f6` (azul), `--level-expert` = `#22c55e` (verde), en la página de Habilidades y en el portafolio público con habilidades de ambos niveles mostrando colores distintos entre sí.
**Estado:** Corregido.

---

### BUG-038 — Faltaba aviso de nivel Básico al importar habilidades desde el análisis de CV, y notificaciones sin enlace a la oferta específica

**Módulo:** Frontend — `cv-analysis.component.ts`, `candidate-jobs.component.{ts,html,scss}`, `company-jobs.component.{ts,html,scss}` · Backend — `applications.service.ts`, `jobs.service.ts`
**Descripción:** Acta de seguimiento: "añadir pop-up donde se mencione que todas las habilidades son añadidas en nivel básico..." y "en las notificaciones mejorar el mensaje de cambio de estado y llevar a la oferta u opción mencionada en la notificación".
**Causa:** (1) El alta en lote de habilidades detectadas en el CV ya funcionaba (mismo endpoint que Habilidades) y ya usaba nivel Básico por defecto — solo faltaba avisarlo. (2) El clic en una notificación ya navegaba (`link` ya existía en el modelo `Notification` y se usaba), pero siempre apuntaba a la lista genérica de ofertas, nunca a la oferta puntual — no había ningún mecanismo de deep-link por id en ninguno de los dos componentes de listado de ofertas.
**Archivos afectados:** `FRONTEND/src/app/features/cv-analysis/cv-analysis.component.ts`, `BACKEND/apps/applications-service/src/applications.service.ts`, `BACKEND/apps/jobs-service/src/jobs.service.ts`, `FRONTEND/src/app/features/jobs/candidate-jobs.component.{ts,html,scss}`, `FRONTEND/src/app/features/company/company-jobs.component.{ts,html,scss}`.
**Solución:** (1) Diálogo de confirmación (`ConfirmDialogComponent`) antepuesto al alta en lote, sin tocar la lógica existente. (2) `link` de las 3 notificaciones (cambio de estado, nueva postulación, coincidencia) ahora incluye `?jobId=<id>`; construido de cero en el frontend el soporte de ese query param — lee `ActivatedRoute`, si la oferta no está en la página actual la busca puntualmente (candidato) o salta a su página (empresa, paginación client-side), resalta la tarjeta/fila y hace scroll automático.
**Prueba realizada:** `npm run build` completo + `ng build`/`lint:css` limpios, `npx jest` sin cambios (39/44 de siempre). Verificado en vivo end-to-end: cambio real de estado de una postulación (FinSoft Colombia) generó la notificación esperada en la base de datos (mensaje + link correctos), y visitar ese link resaltó y centró la oferta correcta en `/app/jobs` (ambas pestañas) y en `/company/jobs`.
**Estado:** Corregido.

---

### BUG-039 — Notificación de cambio de estado llevaba a "Ofertas disponibles" en vez de a la postulación

**Módulo:** Backend — `applications.service.ts`
**Descripción:** El usuario pidió, tras probar el fix de BUG-038: "quiero que los mensajes de mis postulaciones me lleven a mis postulaciones", con un texto de ejemplo ("tu estado en tu postulación... ha cambiado a...."), y que el clic en ese tipo de notificación lleve a la postulación en cuestión, no a ver ofertas de trabajo.
**Causa:** BUG-038 ya agregaba `?jobId=<id>` al `link`, pero `/app/jobs?jobId=X` cae por defecto en la pestaña "Ofertas disponibles" — la oferta buscada puntualmente no siempre aparece ahí (una vez que la postulación pasa a un estado como Contratado/Rechazado, la oferta puede seguir publicada y visible en esa pestaña, pero conceptualmente lo que el usuario quiere ver tras un cambio de estado es su propia postulación, no la oferta genérica). Además el texto seguía siendo genérico ("ahora está: X. Toca para ver la oferta.") en vez de nombrar explícitamente el cambio de estado.
**Archivos afectados:** `BACKEND/apps/applications-service/src/applications.service.ts` (método que actualiza el estado de una postulación y crea la notificación `APPLICATION_STATUS_CHANGED`).
**Solución:** Mensaje cambiado a `Tu estado en tu postulación a "<oferta>" ha cambiado a <estado>.` (calca casi textual el ejemplo que dio el usuario). `link` cambiado de `/app/jobs?jobId=<id>` a `/app/jobs?tab=my-applications&jobId=<id>` — reutiliza el mismo manejo de query params de pestaña que ya soporta `candidate-jobs.component.ts` desde antes de esta sesión, sin necesidad de tocar el frontend.
**Prueba realizada:** Verificado en la base de datos tras un cambio de estado real (FinSoft Colombia → Analista QA Junior → Contratado): `link` guardado como `/app/jobs?tab=my-applications&jobId=65`, `body` como se esperaba. Verificado además en vivo haciendo clic real sobre la notificación en el dropdown de la campana: navega directo a `/app/jobs?tab=my-applications&jobId=65` con la pestaña "Mis postulaciones" ya activa y la postulación correspondiente visible.
**Estado:** Corregido.

---

### BUG-040 — Perfil (y su vista previa pública) de un usuario mostraba los datos de OTRA cuenta ya logueada antes en la misma pestaña

**Módulo:** Frontend — `ProfileService` (y, en menor medida, `ChatService`/`ChatSocketService`)
**Descripción:** Reportado por el usuario tras crear una cuenta de prueba nueva ("Diana"): las pestañas "Perfil" y "Vista pública" mostraban el nombre, teléfono, resumen y habilidades de una cuenta completamente distinta ya usada antes en la misma pestaña del navegador (Santiago), en vez de los datos vacíos/propios de la cuenta recién creada. Bug de exposición de datos entre sesiones/usuarios — severidad alta, aunque limitado a compartir la misma pestaña sin recargar entre sesión y sesión.
**Causa:** `ProfileService.getProfile()` envolvía la petición HTTP en `shareReplay(1)` y guardaba el Observable resultante en un campo de instancia (`profileCache$`). Como `ProfileService` es `providedIn: 'root'` (singleton para toda la vida de la pestaña) y Angular nunca hace un reload completo al loguear/desloguear/registrar dentro de una SPA, ese caché sobrevivía al cambio de sesión: la única función que lo invalidaba era `updateProfile()`, nunca `login()`/`logout()`/`register()`. Se encontraron además dos instancias menores de la misma clase de bug: `ChatService` mantenía el contador de mensajes no leídos en un `BehaviorSubject` nunca reseteado al desloguear, y `ChatSocketService` (también singleton) nunca desconectaba el socket de chat al cerrar sesión — su propio `connect()` no vuelve a conectar si ya hay un socket activo (`if (this.socket?.connected) return;`), así que una sesión nueva en la misma pestaña podía seguir usando el socket (y el token) de la sesión anterior.
**Archivos afectados:** `FRONTEND/src/app/core/auth/auth.service.ts`.
**Solución:** Agregado un método privado `clearCrossSessionState()` en `AuthService`, invocado en `logout()` y en el `tap` de éxito de `login()`/`loginCompany()`/`register()`/`registerCompany()`. Llama a `ProfileService.invalidateCache()` (inyectado directo, sin dependencia circular), y resuelve `ChatSocketService`/`ChatService` de forma perezosa vía `Injector.get(...)` (no por constructor, porque ambos dependen indirectamente de `AuthService` — inyectarlos por constructor sí hubiera creado una dependencia circular real) para llamar `disconnect()` y `setUnreadCount(0)` respectivamente.
**Prueba realizada:** `ng build`/`lint:css` limpios (sin warnings nuevos; sin error de dependencia circular de Angular en tiempo de ejecución, verificado por consola limpia). Reproducido el escenario exacto reportado en el navegador real: login como Santiago (con datos reales) → Perfil visitado para poblar el caché → logout → registro de una cuenta nueva ("Diana Cache Test") en la MISMA pestaña, sin recargar → Perfil y Vista pública mostraron correctamente los datos vacíos/propios de Diana, no los de Santiago. Cuenta de prueba eliminada de la base de datos al terminar.
**Estado:** Corregido.

---

### BUG-041 — El registro dejaba usar la cuenta sin validar que el correo fuera real (cambio de decisión sobre BUG anterior de verificación)

**Módulo:** Backend — `auth-service` (`auth.service.ts`, `auth.controller.ts`, `dto/auth.dto.ts`) · Frontend — `auth.service.ts`, `register`/`company-register`/`login`/`company-login`/`email-verification-banner`
**Descripción:** Reportado junto con BUG-040, en la misma cuenta de prueba: "me dejo crear el perfil sin validar que el correo fuera real, necesito que antes de crearse envíe un correo y que el cliente tenga que validarlo para crear la cuenta". La verificación de correo (agregada esta misma sesión, ver entrada "Fases D-F" más abajo) se había implementado deliberadamente como **no bloqueante** — la cuenta funcionaba con normalidad desde el registro, con un aviso descartable. El usuario probó ese comportamiento en vivo y pidió explícitamente revertirlo a bloqueante.
**Causa:** Decisión de diseño original (ver `docs/DECISIONS.md`, entrada ahora marcada como superseded) que priorizaba "no dejar a nadie afuera de su cuenta si el envío de correo fallaba" por sobre exigir la validación. El usuario, al ver el comportamiento real, consideró más grave permitir usar la plataforma con un correo sin confirmar.
**Archivos afectados:** `BACKEND/apps/auth-service/src/{auth.service.ts,auth.controller.ts,dto/auth.dto.ts,auth.service.spec.ts}`, `FRONTEND/src/app/core/auth/auth.service.ts`, `FRONTEND/src/app/features/auth/{register,company-register,login,company-login}.component.{ts,scss}`, `FRONTEND/src/app/shared/components/email-verification-banner/email-verification-banner.component.ts`.
**Solución:** `register()`/`registerCompany()` ya no emiten cookie/token — la cuenta queda creada pero inutilizable hasta confirmar el correo, y responden `{ message, email }` en vez de `{ user, token }`. `login()`/`loginCompany()` rechazan con 403 (mensaje reconocible por el frontend) si `emailVerified === false`. `resendVerification()` pasó de requerir sesión (JWT) a identificar la cuenta por correo en el body, con el mismo mensaje genérico anti-enumeración que `forgotPassword`. En el frontend: las pantallas de registro muestran un aviso de "revisa tu correo" con botón de reenvío en vez de entrar a la app; las de login detectan el 403 específico y ofrecen "Reenviar correo" como acción del snackbar. El banner no bloqueante existente se dejó intacto como red de seguridad para sesiones ya activas antes de este cambio (no alcanzable para sesiones nuevas). El backfill de cuentas ya existentes (de la implementación original) se mantiene sin cambios — sigue evitando que las cuentas demo/reales previas a esta función queden bloqueadas.
**Prueba realizada:** `npm run build:auth` y `npx jest apps/auth-service` limpios (10/10, incluyendo un test nuevo para el rechazo por correo sin confirmar); `ng build`/`lint:css` limpios, mismos 18 warnings de siempre. Verificado en vivo de punta a punta: registro de una cuenta nueva → no entra a la app, muestra "revisa tu correo" → intento de login inmediato → rechazado con el mensaje esperado y opción de reenviar → confirmación de correo (token generado igual que en producción, sin depender de leer una bandeja real) → login exitoso después de confirmar, con los datos propios (vacíos) de la cuenta nueva, no de ninguna otra. Confirmado además que la cuenta demo real (`bustamantemolinasantiago@gmail.com`, ya verificada por el backfill) sigue pudiendo iniciar sesión con normalidad. Cuentas de prueba eliminadas al terminar.
**Estado:** Corregido.

---

### BUG-042 — Banner de "confirma tu correo" seguía mostrándose (y "Reenviar correo" no hacía nada) en una cuenta ya verificada

**Módulo:** Frontend — `email-verification-banner.component.ts`
**Descripción:** Reportado por el usuario contra producción, sobre su propia cuenta demo real (`bustamantemolinasantiago@gmail.com`): el banner amarillo de correo sin confirmar seguía visible en el shell del candidato, y el botón "Reenviar correo" no parecía hacer nada.
**Causa:** Se confirmó por consulta directa (solo lectura) a la base de producción que la cuenta ya tenía `emailVerified: true` (por el backfill de la Fase D-F) y cero `VerificationToken` pendientes — es decir, el backend siempre tuvo el estado correcto. El bug es puramente de frontend: `AuthService.currentUser()` se carga UNA sola vez al arrancar la app (`APP_INITIALIZER` → `/auth/me`) y nunca se refresca sola mientras la pestaña sigue abierta. Si la pestaña del usuario llevaba abierta desde antes de que su cuenta quedara marcada como verificada (ej. desde antes del backfill), el signal en memoria se quedó con el valor viejo (`false`) indefinidamente — el banner seguía mostrando ese dato viejo aunque el backend ya dijera lo contrario. El botón "Reenviar correo" en sí funcionaba (llamaba al endpoint correctamente), pero como el backend YA sabía que la cuenta estaba verificada, no había nada que reenviar — desde la perspectiva del usuario, eso se ve idéntico a "no hace nada".
**Archivos afectados:** `FRONTEND/src/app/shared/components/email-verification-banner/email-verification-banner.component.ts`.
**Solución:** Al montar el banner (`ngOnInit`), si el estado en memoria dice `emailVerified === false`, se llama una vez a `AuthService.fetchMe()` para refrescar `currentUser()` contra el backend antes de confiar en el dato cacheado. Si el backend ya lo tiene como verificado, el banner desaparece solo, sin que el usuario tenga que recargar la página ni hacer nada. No se agregó lógica nueva de reintento al botón de reenviar — el problema no era el botón, era que el banner no debía estar visible desde el principio.
**Prueba realizada:** `ng build`/`lint:css` limpios, sin warnings nuevos. Confirmado por lectura directa (solo lectura, sin escritura) contra la base de producción que la cuenta del usuario ya estaba `emailVerified: true` con cero tokens pendientes, confirmando que el bug era exclusivamente de estado en memoria del frontend, no del backend. Verificado en local que el banner sigue sin mostrarse (ni se dispara el refresco innecesario) para una cuenta ya verificada desde el arranque de la sesión. Incluido en el commit `50b0221` (junto con BUG-041), desplegado y verificado en los 10 servicios de Railway + Vercel.
**Estado:** Corregido y desplegado.

---

### BUG-043 — Resend bloqueaba el envío de correos a cualquier destinatario que no fuera el dueño de la cuenta (rompía la verificación bloqueante para todos los demás)

**Módulo:** Backend — `libs/common/src/email/email.service.ts`
**Descripción:** Tras desplegar la verificación de correo bloqueante (BUG-041), el usuario probó registrar una cuenta con un segundo correo propio (`santifuturo888@gmail.com`, distinto al de la cuenta de Resend) y nunca recibió el correo de confirmación — la cuenta quedó registrada pero permanentemente inutilizable, sin ninguna forma de desbloquearla.
**Causa:** Confirmado por los logs de producción de `auth-service` (`railway logs`): Resend, sin un dominio propio verificado, opera en modo sandbox y **solo permite enviar al correo con el que se creó la cuenta de Resend** (error `"You can only send testing emails to your own email address..."`). Esta limitación ya estaba documentada como riesgo conocido desde la Fase D (ver `DECISIONS.md`), pero mientras la verificación era no bloqueante no tenía consecuencias reales — con la verificación bloqueante, cualquier cuenta que no fuera la del dueño de Resend quedaba inaccesible para siempre, sin ninguna forma de recuperarla desde la app.
**Archivos afectados:** `BACKEND/libs/common/src/email/email.service.ts` (reescrito completo), `BACKEND/package.json` (se quita la dependencia `resend`, ya no se usa), `BACKEND/.env`/`.env.example` (variables `RESEND_API_KEY`/`RESEND_FROM_EMAIL` → `BREVO_API_KEY`/`BREVO_FROM_EMAIL`).
**Solución:** Cambio de proveedor de Resend a **Brevo**, que permite verificar un remitente individual (un correo propio, sin necesitar un dominio) y enviar desde ahí a cualquier destinatario real, gratis. `EmailService` se reescribió para llamar directo a la API REST de Brevo (`POST https://api.brevo.com/v3/smtp/email`) vía `fetch` nativo, sin agregar una dependencia nueva — mismo contrato público (`sendMail({to, subject, html})`) que antes, así que `auth.service.ts` no necesitó ningún cambio. Se encontró y resolvió además una segunda traba de Brevo en el camino: su restricción de "IPs autorizadas" (bloqueaba la API key desde IPs no reconocidas, incluida la de Railway) — el usuario la desactivó para claves API desde `app.brevo.com/security/authorised_ips`.
**Prueba realizada:** `npm run build`/`npx jest` completos, sin regresiones (mismos 40/45 de siempre). Verificado en vivo con un envío real: registro local con el correo `santifuturo888@gmail.com` (no es el dueño de la cuenta de Brevo) → el correo de confirmación llegó realmente a esa bandeja → el usuario lo confirmó desde el link real → login exitoso. Cuenta de prueba eliminada al terminar.
**Estado:** Corregido.

---

### BUG-044 — No existía ninguna forma de publicar el portafolio: la "URL pública" nunca funcionaba para una cuenta nueva

**Módulo:** Frontend — `profile.component.ts`/`.html`/`.scss`
**Descripción:** El usuario pidió revisar "el tema de la URL pública en el perfil" tras notar algo raro. Al investigar: cualquier cuenta recién registrada mostraba su "URL pública" en la pantalla de Perfil con toda normalidad, pero al visitarla siempre devolvía "Portafolio no encontrado".
**Causa:** `Profile.isPublished` (Prisma) tiene `@default(false)`, y el backend (`PATCH /profile`, `candidate-service`) siempre soportó recibirlo y guardarlo correctamente — el bug era que **no existía ningún control en todo el frontend** para que un candidato pasara ese valor a `true`. Se buscó en toda la app (`grep -i "publish"`) y no había ningún botón, toggle ni llamada que tocara `isPublished` — solo quedaba en `false` para siempre. Pasó desapercibido porque las cuentas demo (`seed.ts`, `seed-santiago-profile.ts`) se crean con `isPublished: true` desde el arranque, así que ningún flujo de prueba anterior pasó por un registro nuevo de punta a punta hasta llegar a mirar su propia URL pública.
**Archivos afectados:** `FRONTEND/src/app/features/profile/profile.component.ts`, `profile.component.html`, `profile.component.scss`.
**Solución:** Nuevo método `togglePublish()` (mismo patrón optimista de `toggleSummaryVisibility`: aplica el cambio ya mismo, lo revierte si el backend falla) y un control visual junto a "URL pública" — tanto en modo lectura como en modo edición — que muestra claramente si el portafolio está publicado o no, con un botón para publicar/despublicar en el momento, sin tener que entrar a "Editar perfil" ni guardar el formulario completo.
**Prueba realizada:** `ng build`/`lint:css` limpios, mismos 19 warnings de presupuesto de siempre (uno de los archivos tocados creció unos bytes dentro del mismo bucket ya conocido, no es un warning nuevo). Verificado en vivo: cuenta nueva sin publicar → visitar su URL pública da "Portafolio no encontrado" → clic en "Publicar portafolio" → la misma URL ahora muestra el portafolio completo correctamente.
**Estado:** Corregido.

---

### BUG-045 — Notificaciones: mensaje de cambio de estado sonaba forzado, y el clic solo resaltaba una tarjeta en vez de mostrar la información puntual

**Módulo:** Backend — `applications.service.ts`, `jobs.service.ts` · Frontend — `candidate-jobs.component.ts`, `company-jobs.component.ts`/`.html`/`.scss`
**Descripción:** El usuario pidió mejorar el mensaje de la notificación de cambio de estado (el texto anterior, "Tu estado en tu postulación a X ha cambiado a Y", sonaba forzado) y que el clic sobre cualquier notificación mostrara la información exacta que avisa — no solo resaltar/hacer scroll hasta una tarjeta en una lista larga.
**Causa:** Ya existían paneles de detalle específicos para cada caso (`openDetail`/`openDetailFromApp` del lado candidato, `viewApplications` del lado empresa), pero el flujo de llegada desde una notificación nunca los abría automáticamente — solo resaltaba la tarjeta/fila correspondiente, dejando al usuario un paso manual ("Ver detalle") para ver lo que la notificación ya le estaba anunciando. Además, la notificación de nueva postulación (lado empresa) no traía el id de la postulación puntual en su `link`, así que aunque se hubiera abierto el panel de postulantes, no había forma de saber cuál era la que generó la notificación si la oferta tenía varias.
**Archivos afectados:** `BACKEND/apps/applications-service/src/applications.service.ts` (mensaje + `link` con `applicationId`), `BACKEND/apps/jobs-service/src/jobs.service.ts` (mensaje, corrige de paso un voseo colado: "revisala" → "Revísala"), `FRONTEND/src/app/features/jobs/candidate-jobs.component.ts` (abre `openDetail`/`openDetailFromApp` automáticamente al llegar resaltado), `FRONTEND/src/app/features/company/company-jobs.component.{ts,html,scss}` (nuevo `highlightedApplicationId`, abre `viewApplications` automáticamente y resalta la fila puntual dentro del panel).
**Solución:** Mensaje de cambio de estado reescrito a `Tu postulación a "X" pasó a estado "Y".` (más directo, sin el "ha cambiado a" repetitivo con el título de la notificación). Mensaje de nueva postulación sin el "Toca para ver la oferta." redundante. En ambos lados (candidato/empresa), al llegar desde el link de una notificación, además de resaltar/hacer scroll a la tarjeta correspondiente, se abre automáticamente el panel de detalle específico — la postulación puntual (candidato) o el panel de postulantes de la oferta con el candidato puntual resaltado (empresa).
**Prueba realizada:** `npm run build`/`npx jest` completos sin regresiones (40/45 de siempre). `ng build`/`lint:css` limpios. Verificado en vivo de punta a punta en ambos lados: cambio real de estado de una postulación → notificación con el mensaje nuevo → clic → aterriza en "Mis postulaciones" con el panel de esa postulación puntual ya abierto. Postulación nueva real (Santiago → FinSoft Colombia) → notificación → clic → aterriza en la oferta correcta con el panel de postulantes ya abierto mostrando el candidato correspondiente.
**Estado:** Corregido.

---

### BUG-046 — Notificaciones viejas nunca se actualizaban (mensaje/link quedan grabados al crearse) + faltaba manejar paginación al abrir el detalle

**Módulo:** Backend — `applications.service.ts` (solo el texto) + script de backfill de datos (uno de uso único, no forma parte del código) · Frontend — `candidate-jobs.component.ts`
**Descripción:** Después de BUG-045, el usuario seguía viendo la notificación vieja de siempre ("Tu postulación a "Ingeniero de Software Junior" ahora está: Contratado", del 20/07) sin ningún cambio, y pidió además una redacción distinta ("tu postulación en X cambió su estado a Y"). Al investigar: el `body`/`link` de una notificación se graban como texto fijo en la base **en el momento en que se crea** — corregir el código de generación (BUG-039/BUG-045) solo afecta notificaciones *nuevas*, nunca reescribe las que ya existían. Encontrado además un segundo bug real al verificar el clic en producción: la postulación resaltada podía estar en una página distinta a la que carga por defecto "Mis postulaciones" (paginado), y el código nuevo de BUG-045 solo buscaba en la página ya cargada — si no aparecía ahí, no pasaba nada visible (el usuario quedaba en la pestaña correcta, pero sin el panel de detalle abierto).
**Causa:** Ninguna columna de `Notification` referencia de vuelta a la oferta/postulación que la originó (solo `body`/`link` como texto plano) — no hay forma de "recalcular" el texto viejo sin releerlo. Y `candidate-jobs.component.ts` únicamente buscaba la postulación resaltada dentro de `this.applications` (la página ya cargada), sin contemplar que podía estar en otra página.
**Archivos afectados:** `BACKEND/apps/applications-service/src/applications.service.ts` (redacción final del mensaje), `FRONTEND/src/app/features/jobs/candidate-jobs.component.ts` (`openHighlightedApplication` ahora busca en el listado completo si no está en la página actual). Además, un script de backfill de un solo uso (no versionado, se corrió y se borró) que reescribió las notificaciones **ya existentes** tanto en local como en producción, reconstruyendo `jobId`/`applicationId` a partir del texto/link viejo (y, para las más antiguas que ni siquiera tenían un id en el link, cruzando por candidato+título de oferta contra `JobApplication`/`JobOffer`).
**Solución:** Mensaje final: `Tu postulación en "X" cambió su estado a Y.` (redacción exacta pedida por el usuario). `openHighlightedApplication()` ahora, si no encuentra la postulación resaltada en la página ya cargada, pide el listado completo (`limit=1000`) antes de rendirse — el candidato nunca tiene tantas postulaciones como para que esto sea costoso. Backfill aplicado a las 3 notificaciones de local y las 16 de producción — todas, sin excepción, terminaron con mensaje y link en el formato actual.
**Prueba realizada:** `npm run build`/`npx jest` sin regresiones. `ng build`/`lint:css` limpios. Verificado en vivo contra producción real: la notificación original del 20/07 (la misma que el usuario mostró en su primer reporte) ahora muestra el mensaje nuevo y, al hacer clic, aterriza en "Mis postulaciones" con el detalle de esa postulación específica abierto — aunque estuviera en la segunda página de resultados.
**Estado:** Corregido.

**Nota — corrección posterior del propio backfill (mismo día):** al verificar el clic en producción, el panel abierto no coincidía con la notificación (mostraba una postulación "Pendiente" en vez de "Contratado"). Causa: el candidato tenía **dos postulaciones distintas con el mismo título de oferta en la misma empresa** ("Ingeniero de Software Junior" en "Talento Llanero S.A.S."), y la reconstrucción de `jobId` del backfill (`findFirst` sin desempate) eligió la incorrecta para 2 de las 16 notificaciones de producción. Corregido con un segundo script (también de uso único) que, ante múltiples postulaciones candidatas para el mismo título, prioriza primero la que tenga el estado ACTUAL igual al mencionado en la notificación, y si sigue empatado, la actualizada más recientemente. Verificado que no había casos ambiguos en local. Este es el motivo por el que un backfill de datos reales, aunque sea cosmético, conviene revisar con una prueba de clic real después de aplicarlo — no alcanza con confirmar que el texto cambió.

---

### BUG-047 — Voseo colado en un mensaje de la app, y en varios lugares más nunca revisados (prompts de IA, tooltips, docs internas)

**Módulo:** Backend — `assistant-service/src/assistant.service.ts` (system prompt de Joaquín), `portfolio-service/src/cv.service.ts` (prompt de análisis de CV) · Frontend — `cv-analysis.component.ts`, `reset-password.component.ts`, `company-candidates.component.html`, `company-jobs.component.html`, `portfolio-content.component.html`, `profile-checklist.component.ts` (comentario), `styles/README.md` (doc interna)
**Descripción:** El usuario reportó, muy molesto, un mensaje de confirmación en voseo ("Si querés otro nivel, andá a la sección Habilidades y editalo ahí", al importar habilidades del CV) y pidió tratar esto como regla permanente y barrer **todo** el proyecto, no solo el caso puntual reportado.
**Causa:** Un barrido amplio (`grep` de patrones de voseo — pronombres, imperativos con tilde en la última sílaba, formas conjugadas "-és/-ás") encontró instancias en lugares que nunca se habían revisado antes: **los system prompts que se le mandan a DeepSeek** (el de Joaquín, irónicamente en la misma sección que le ordena "NUNCA voseo"; y el del análisis de CV, con "Calculá"/"Basate"/"Respondé"/"TRADUCÍ"), tooltips de avalar habilidades duplicados en dos componentes, un empty-state, un título de `reset-password`, y hasta la documentación interna de estilos (`styles/README.md`) — ninguno de estos había sido tocado por los barridos anteriores (2026-07-17, 2026-07-25), que se habían concentrado en templates de componentes.
**Archivos afectados:** ver la lista de "Módulo" arriba — 9 archivos en total.
**Solución:** Reescritos todos a tuteo estándar. Se corrió un `grep` final de confirmación sobre `FRONTEND/src` completo (con y sin `-i`) y no quedó ningún resultado.
**Prueba realizada:** `npm run build`/`ng build`/`lint:css` limpios. Grep de verificación final sin resultados sobre `FRONTEND/src`; los prompts de IA no tienen una prueba automatizada posible (dependen de la respuesta de DeepSeek), pero el texto que se les envía ya no contiene voseo, verificado leyendo el string final construido.
**Estado:** Corregido. Guardado en memoria como regla permanente de máxima prioridad — cualquier texto en español que se toque o genere en este proyecto (UI, prompts de IA, correos, comentarios/docs) debe revisarse contra voseo antes de dar la tarea por terminada, no solo cuando se edita un template de componente.

---

### BUG-048 — El detalle abierto por una notificación quedaba pegado al navegar manualmente después (Trabajos/Mis postulaciones)

**Módulo:** Frontend — `candidate-jobs.component.ts`, `company-jobs.component.ts`
**Descripción:** El usuario reportó que, tras hacer clic en una notificación, si después navegaba manualmente (ej. clic en "Trabajos" o "Mis postulaciones" del menú lateral) sin volver a pasar por una notificación, seguía viendo abierta la oferta/postulación específica de la notificación anterior — cuando lo esperado es que la navegación manual muestre siempre la lista completa, sin nada preseleccionado, y que **solo** el clic en una notificación abra el detalle puntual.
**Causa:** `ngOnInit()` leía los query params (`jobId`, `tab`, `applicationId`) una sola vez con `route.snapshot`, en el momento en que Angular crea la instancia del componente. Pero Angular **reutiliza la misma instancia** al navegar entre la misma ruta con distintos query params (ej. de `/app/jobs?tab=my-applications&jobId=69` a `/app/jobs` al clickear el link del menú) — no la destruye ni la vuelve a crear, así que `ngOnInit` nunca se volvía a ejecutar, y el estado resaltado/el panel abierto de la visita anterior (originada en una notificación) se quedaba pegado indefinidamente en cualquier navegación posterior dentro de esa misma ruta.
**Archivos afectados:** `FRONTEND/src/app/features/jobs/candidate-jobs.component.ts`, `FRONTEND/src/app/features/company/company-jobs.component.ts`.
**Solución:** Reemplazado el `route.snapshot.queryParamMap` (lectura única) por una suscripción a `route.queryParamMap` (observable, se re-emite cada vez que cambian los query params aunque la instancia del componente se reutilice). Regla explícita agregada: si la URL **no trae `jobId`**, se interpreta como navegación manual (no viene de una notificación) y se cierra cualquier panel de detalle/postulaciones que hubiera quedado abierto (`closeDetail()`/`closeApplications()`). Si **sí** trae `jobId` (venga de la primera carga o de una navegación posterior dentro de la misma instancia), se abre el detalle puntual como ya hacían BUG-045/046.
**Prueba realizada:** `ng build`/`lint:css` limpios, sin warnings nuevos. Verificado en vivo en ambos lados: clic real en una notificación (candidato y empresa) → detalle/panel se abre correctamente (regresión sin romper) → clic manual en el link "Trabajos"/"Mis postulaciones"/"Vacantes publicadas" del menú lateral (sin pasar por otra notificación) → el panel se cierra y la lista se ve completa, sin nada preseleccionado — confirmado inspeccionando el DOM directamente (`.overlay`/`.detail-modal`/`.applications-modal` ausentes), ya que estos paneles se renderizan fuera de `<main>` y no aparecen en una lectura de solo texto.
**Estado:** Corregido — **insuficiente, ver BUG-049.** La prueba de este bug solo cubrió navegación de ruta completa (link del menú lateral hacia una URL sin `jobId`). No cubrió recargas internas dentro de la misma ruta (cambiar de pestaña "Ofertas disponibles"/"Mis postulaciones", aplicar un filtro), que es exactamente donde el bug seguía apareciendo.

---

### BUG-049 — (continuación de BUG-048) El detalle de una notificación seguía reabriéndose en cada cambio de pestaña o filtro, aunque la navegación de ruta completa ya estuviera arreglada

**Módulo:** Frontend — `candidate-jobs.component.ts`, `company-jobs.component.ts`
**Descripción:** El usuario reportó, con bastante frustración, que el fix de BUG-048 no alcanzaba: "cada vez que yo entro a mis postulaciones manualmente, también me botas la misma oferta, y cuando entro a ofertas disponibles, también me botas la misma oferta". Pidió explícitamente el estándar de Facebook: un clic en una notificación debe llevar exactamente al contenido que menciona; entrar de cualquier otra forma (navegación manual, cambiar de pestaña) nunca debe reabrir nada.
**Causa:** BUG-048 arregló la reactividad (`route.queryParamMap` en vez de `route.snapshot`), pero nunca **limpiaba** `jobId`/`tab`/`applicationId` de la URL después de abrir el panel — quedaban ahí indefinidamente. `jobId` en la URL se trataba como si fuera un dato de estado a preservar, cuando en realidad es una instrucción de una sola vez ("mostrame esto puntual, una vez"). Mientras el parámetro seguía en la URL, **cualquier recarga interna de datos** (cambiar de pestaña con `setTab()`, que llama a `loadJobs()`/`loadMyApplications()`; aplicar un filtro; paginar) volvía a leerlo y reabría el mismo panel — sin que el usuario hubiera pasado por ninguna notificación esta vez. Esto es un bug distinto (y más profundo) al de BUG-048: ese cubría "la URL ya no trae `jobId`", este cubre "la URL sigue trayendo el mismo `jobId` de hace rato, y no debería".
**Archivos afectados:** `FRONTEND/src/app/features/jobs/candidate-jobs.component.ts`, `FRONTEND/src/app/features/company/company-jobs.component.ts`.
**Solución:** Nuevo método privado `clearNotificationParams()` en ambos componentes: apenas se consume el parámetro (justo después de abrir el panel/detalle correspondiente), llama a `router.navigate([], { relativeTo: route, queryParams: {}, replaceUrl: true })` para borrarlo de la URL de inmediato — así ninguna recarga posterior puede volver a leerlo. Como esa misma limpieza dispara una nueva emisión de `queryParamMap` (ahora sin `jobId`), se agregó un flag booleano (`consumedByThisComponent`) que distingue "esta emisión sin `jobId` la generé yo mismo al limpiar, no cerrar nada" de "el usuario genuinamente navegó sin `jobId`, sí cerrar cualquier panel abierto".
**Prueba realizada:** `ng build` limpio (mismos warnings de presupuesto de siempre, ninguno nuevo). Verificado en vivo, de punta a punta, en ambos lados, reproduciendo el escenario exacto que el usuario reportó (no solo el de BUG-048):
- **Candidato:** clic en notificación de cambio de estado ("Analista QA Junior") → abre el detalle correcto → URL confirmada limpia (`/app/jobs`, sin query params) inmediatamente después. Cerrado el panel, se alternó "Ofertas disponibles" ↔ "Mis postulaciones" varias veces seguidas: nunca se reabrió. Aplicado un filtro en "Ofertas disponibles" (recarga interna vía `loadJobs()`): sin reapertura. Recarga completa de página (F5) en "Mis postulaciones": sin reapertura. Navegación de ruta completa (Inicio → Trabajos por el menú lateral): sin reapertura. Simulado también el otro tipo de notificación (oferta nueva, `jobId` sin `tab=my-applications`) navegando directo a `/app/jobs?jobId=65`: abre el detalle de esa oferta puntual, limpia la URL, y cerrar el panel deja la lista navegable con normalidad.
- **Empresa (Talento Llanero S.A.S., la misma empresa del reporte original del usuario):** simulado el link exacto que genera una notificación de nueva postulación (`/company/jobs?jobId=12&applicationId=1`) → abre el panel de postulantes de esa oferta puntual → URL confirmada limpia inmediatamente después → cerrado el panel, recarga completa de página: lista limpia, sin nada preseleccionado.
**Estado:** Corregido. Esta vez la prueba cubrió explícitamente los mismos caminos de recarga que el usuario señaló como rotos (cambio de pestaña, filtro, recarga completa), no solo la navegación de ruta completa que cubrió (insuficientemente) BUG-048.

---

### BUG-050 — `JWT_EXPIRES_IN` era config muerta: declarada en `.env` desde el principio del proyecto, pero nunca leída

**Módulo:** Backend — `auth-service` (`auth.module.ts`)
**Descripción:** Encontrado durante la Fase 5 del panel de administración (auditoría de qué parámetros de seguridad podían parametrizarse). `JWT_EXPIRES_IN=1d` está en `.env`/`.env.example` desde hace tiempo, dando la impresión de ser una configuración real y ajustable.
**Causa:** `auth.module.ts` configuraba `JwtModule.register({ signOptions: { expiresIn: '1d' as StringValue } })` con el valor hardcodeado — la variable de entorno nunca se leía en ningún punto del código. Cambiar `JWT_EXPIRES_IN` en `.env` no tenía ningún efecto, silenciosamente.
**Archivos afectados:** `BACKEND/apps/auth-service/src/auth.module.ts`.
**Solución:** `expiresIn` ahora se arma con `process.env['JWT_EXPIRES_IN'] || '1d'` — mismo valor por defecto que antes (`.env` ya tenía `1d`), así que no cambia el comportamiento actual, pero la variable ahora sí tiene efecto real si se edita. De paso (Fase 5, no un bug sino un endurecimiento nuevo): las cuentas ADMIN firman con una sesión de 2 horas en vez del `JWT_EXPIRES_IN` general, dado el poder de ese rol.
**Prueba realizada:** `npm run build:auth` limpio. `npx jest apps/auth-service` (10/10, tras corregir un test que esperaba `jwtService.sign` con una firma de un solo argumento). Verificado en vivo decodificando el JWT real emitido: cuenta ADMIN → 2 horas de validez; cuenta CANDIDATE → 24 horas (sin cambio respecto a antes).
**Estado:** Corregido.

---

### BUG-051 — Catálogos (admin): fila "Agregar valor" inalcanzable en mobile

**Módulo:** Frontend — `admin-catalogs.component.ts`
**Descripción:** Encontrado durante el barrido de verificación del panel administrativo (2026-08-03), revisando las 6 pantallas admin a 375px de ancho. La fila para agregar un valor nuevo a un catálogo (input "Nuevo valor" + input "Texto a mostrar" + botón "Agregar") no era usable en mobile.
**Causa:** `.add-entry` era `display: flex` sin `flex-wrap`, con dos inputs a `flex: 1` — su ancho de contenido combinado (460px) excedía el contenedor (246px a 375px de viewport). El `.page-content` padre tiene `overflow-x: hidden` (para evitar que la página entera scrollee horizontalmente por otros motivos), así que el excedente no generaba una barra de scroll visible ni un gesto táctil descubrible: simplemente se cortaba. El botón "Agregar" quedaba renderizado 147px fuera del borde derecho de la pantalla.
**Archivos afectados:** `FRONTEND/src/app/features/admin/admin-catalogs.component.ts`.
**Solución:** `flex-wrap: wrap` en `.add-entry`, y los inputs pasan de `flex: 1` a `flex: 1 1 140px; min-width: 0` — en mobile se apilan en 1-2 filas en vez de desbordar; en desktop siguen en una sola fila como antes.
**Prueba realizada:** `ng build`/`lint:css` limpios. Medido con `getBoundingClientRect()` a 375px: antes, el botón "Agregar" terminaba en `right: 522px`; después, el contenedor completo termina en `right: 308px`, dentro de los 375px del viewport, sin overflow de página.
**Estado:** Corregido.

---

### BUG-052 — Usuarios (admin): fila de filtros inalcanzable en mobile

**Módulo:** Frontend — `admin-users.component.ts`
**Descripción:** Mismo tipo de hallazgo que BUG-051, encontrado en la misma revisión, en la pantalla `/admin/users`. La fila de filtros (select de rol + input de búsqueda por correo + botón "Buscar") no era usable en mobile.
**Causa:** Igual que BUG-051 — `.filters` era `display: flex` sin `flex-wrap`, contenido combinado de 401px en un contenedor de 294px, cortado silenciosamente por el `overflow-x: hidden` de `.page-content`. El botón "Buscar" quedaba casi totalmente fuera de pantalla (`right: 439px` sobre 375px de viewport).
**Archivos afectados:** `FRONTEND/src/app/features/admin/admin-users.component.ts`.
**Solución:** `flex-wrap: wrap` en `.filters`, `min-width: 0` en `select`/`input`, e input de búsqueda de `flex: 1` a `flex: 1 1 160px`.
**Prueba realizada:** `ng build`/`lint:css` limpios. Medido con `getBoundingClientRect()` a 375px: después del fix, el botón "Buscar" queda en `right: 332px`, dentro del viewport.
**Estado:** Corregido.

---

### BUG-053 — Oferta laboral: el `<select>` de moneda ofrecía USD/EUR pero el backend solo aceptaba COP

**Módulo:** Backend — `jobs-service` (`dto/create-job-offer.dto.ts`)
**Descripción:** Encontrado durante la Fase 10 del panel administrativo (migración de `currency` a `SystemCatalog`), al probar el catálogo nuevo contra el formulario real de oferta laboral. `company-jobs.component.html` ya tenía un `<select formData.currency>` con 3 opciones (COP/USD/EUR) desde antes de esta fase — pero el DTO del backend tenía `@IsIn(['COP'])`, una lista de un solo valor. Cualquier empresa que intentara publicar una oferta en USD o EUR recibía un 400 ("currency must be one of the following values: COP") sin ninguna explicación visible de por qué, ya que el frontend nunca impedía elegir esas opciones. No relacionado a los cambios de esta fase — ya estaba así antes, se encontró al verificar el catálogo nuevo de punta a punta contra el formulario real en vez de solo contra el backend.
**Causa:** Desincronización entre frontend y backend — el `<select>` se construyó (o se amplió) sin actualizar la validación del DTO que lo respalda.
**Archivos afectados:** `BACKEND/apps/jobs-service/src/dto/create-job-offer.dto.ts`.
**Solución:** Igual que el resto de Fase 10 — `@IsIn(['COP'])` reemplazado por `@IsString() @MaxLength(10)`, con la validación real movida a `JobsService.assertValidCatalogValue()` contra el catálogo `CURRENCY` (COP/USD/EUR) recién creado.
**Prueba realizada:** `build:jobs` limpio. Verificado en vivo: crear una oferta con `currency: "MONEDA_FALSA"` (14 caracteres) rechazada por longitud; `currency: "XXX"` (pasa longitud, no existe en el catálogo) rechazada con "La moneda no es un valor válido"; `currency: "USD"` — antes rechazada, ahora aceptada y creada correctamente — verificada y luego eliminada (no quedó dato de prueba).
**Estado:** Corregido.
