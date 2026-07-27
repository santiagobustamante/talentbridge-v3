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
