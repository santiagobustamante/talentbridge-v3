# Auditoría UX/UI del Frontend — TalentBridge V3

Hallazgos detallados de la revisión consultiva del 11/07/2026 (solo lectura, sin cambios de código). Este documento es la evidencia de respaldo del [plan de mejoras](plan-mejoras-frontend-ux.md) — cada tarea de ese plan viene de algo puntual listado acá, con archivo y línea. El resumen ejecutivo (diagnóstico, tipo de interfaz recomendada, fases, preguntas) se armó como artefacto visual en la conversación original y no está versionado; este documento es la versión completa y durable de esa auditoría.

**Método**: dos agentes en paralelo leyeron el código completo (uno el lado candidato, otro el lado empresa + compartidos), más navegación en vivo en el navegador con las credenciales reales del usuario (`bustamantemolinasantiago@gmail.com` / candidato, `empresa001@demo.com` / empresa) para confirmar o descartar lo que el código sugería. Los hallazgos marcados **[confirmado en vivo]** se verificaron navegando la app real con backend corriendo; el resto son hallazgos de lectura de código, correctos como descripción del código pero no siempre verificados visualmente.

---

## Hallazgos confirmados en vivo (evidencia directa)

- **Doble nombre de marca**: landing y paneles dicen "TalentBridge"; los 4 formularios de auth (`login`, `register`, `company-login`, `company-register`) muestran logo "PI" y texto "Portafolio Inteligente". Verificado navegando las 4 pantallas.
- **Placeholder cortado**: el buscador hero de la landing corta el texto en "Buscar talento por profesión, habilidad o ciuc" — reproducible en viewport estable (1280×800), no es un glitch de renderizado.
- **Catálogo de habilidades completo en un perfil real**: `bustamantemolinasantiago@gmail.com` tiene ~150 habilidades cargadas (de Angular a COBOL, Assembly, Solidity, todas en nivel "Básico"), visibles en `/portfolio/santiago-bustamante`. Origen: `BACKEND/prisma/seed-santiago-profile.ts:81`, el array `skills` del propio script de seed.
- **Joaquín por encima de los modales**: con el modal de detalle de oferta abierto (`/app/jobs`), el botón/panel de Joaquín sigue visible y clickeable sobre el fondo oscurecido del modal.
- **Saludo inconsistente en la misma pantalla**: en `/app/inicio`, la barra superior dice "Hola, bustamantemolinasantiago@gmail.com"; la tarjeta de bienvenida, debajo, dice "Bienvenido de vuelta, Santiago Bustamante".
- **Estados de postulación/oferta bien resueltos**: badges "Cerrada" (ámbar), "Publicada" (verde), "Rechazado" (rojo), "Revisado" (azul) se ven correctamente coloreados vía `<app-badge [tone]="statusTone(...)">` tanto en candidato como en empresa — el sistema de badges de estado funciona bien, no es un hallazgo negativo.
- **Modal de detalle de oferta bien organizado**: logo/nombre de empresa, badge de estado si ya se postuló, grilla de ubicación/modalidad/contrato/salario, secciones de descripción/requisitos/responsabilidades — confirmado en vivo, sin problemas.
- Nota: una aparente pantalla de login "rota" (card arriba a la izquierda con espacio vacío) resultó ser un glitch transitorio de la herramienta de captura, no reproducible con viewport estable — **no es un bug real**, se dejó registrado acá para que no se re-investigue.

---

## A. Landing pública (`features/home`)

- Comunica bien la propuesta dual candidato/empresa, con pasos claros en "Cómo funciona" — el contenido es correcto, si algo es demasiado extenso (6+ secciones largas antes del CTA final).
- **Bug funcional**: el buscador hero llama a `onSearch()` (`home.component.ts:34-41`), que navega a `/company/login?q=...`. `CompanyLoginComponent` nunca lee ese parámetro `q` — la búsqueda se pierde en silencio.
- El botón "Iniciar sesión" del navbar no distingue candidato/empresa (asume candidato), mientras que "Crear portafolio" del hero sí diferencia bien con "Soy candidato"/"Soy empresa".

## B. Login y registro (`features/auth`)

- Formularios cortos, validaciones visibles con `mat-error`, botón con estado de carga inline ("Iniciando sesión...") — buen patrón, consistente entre las 4 variantes (candidato/empresa × login/registro).
- Errores de servidor se muestran con fallback genérico (`err.error?.message || 'Error al iniciar sesión'`) — razonable pero no distingue causas (credenciales inválidas vs. servidor caído).
- Branding "Portafolio Inteligente" / "PI" en las 4 pantallas — ver hallazgo confirmado en vivo arriba. Archivos: `login.component.ts:33-35`, `register.component.ts:33-35`, `company-login.component.ts:33-35`, `company-register.component.ts:33-35`.

## C. Dashboard candidato (`features/home-candidate`)

- Ya muestra lo correcto: completitud de perfil, habilidades, proyectos, postulaciones, mensajes sin leer, vistas de perfil — la pantalla más completa de la app.
- Loading: solo ícono + texto, sin skeleton (`home-candidate.component.html:13-17`).
- Error: mensaje genérico sin botón de reintentar, a diferencia de `profile.component.html:26-30` que sí lo tiene.
- Empty states de solo texto plano (sin ícono): "Todavía no hay ofertas disponibles.", "Aún no has aplicado a ofertas.", "Aún no tienes mensajes." (líneas 95, 133, 156) — contrastan con los empty states ricos (ícono+título+subtítulo) de skills/experiences/education/projects/jobs.
- Fechas inconsistentes dentro del mismo componente: postulaciones usan `date:'mediumDate'` (línea 140); ofertas usan `toLocaleDateString('es-CO', {day:'2-digit',...})` manual (`.ts:85-89`).
- Fallback de empresa sin nombre: cae a `'Empresa'` (línea 109) — en `candidate-jobs.component.ts:271` el mismo caso cae a `'Empresa no especificada'`. Dos textos para el mismo dato faltante.
- `statusLabel()` (líneas 73-79) duplica un mapping que se repite también en `candidate-jobs.component.ts` (dos veces) y en `company-jobs`/`company-dashboard`.
- Existe `features/dashboard/dashboard.component.ts` (245 líneas) **sin ruta en ningún lugar** de `app.routes.ts` — código muerto que duplica el propósito de `home-candidate`.

## D. Perfil candidato (`features/profile` + `shared/profile-editor`)

- Datos personales, enlaces y URL pública ya están bien organizados en tarjetas separadas.
- **Duplicación total de componente**: `ProfileEditorComponent` (`shared/profile-editor/`, ~700 líneas entre .ts/.html/.scss) reimplementa casi exactamente `ProfileComponent`, pero **no se usa en ningún lugar del código** (confirmado por grep de `ProfileEditorComponent|app-profile-editor`, solo aparece en su propia definición). Tiene un campo extra "Profesión" que `ProfileComponent` no tiene, y un mecanismo de visibilidad ligeramente distinto.
- **Bug de URL hardcodeada**: `profile.component.html:109` arma la URL pública en modo lectura como texto literal `'localhost:4200/portfolio/' + slug`, sin usar `window.location.origin` — en producción mostraría siempre "localhost" sin importar el dominio real. El getter `publicUrl` (línea 237, usado en modo edición) sí lo hace bien — dos rutas de código para el mismo dato con comportamiento distinto.
- Aviso legal de GitHub duplicado con **redacciones distintas** en `profile.component.html:199` y `profile-editor.component.html:154`, pese a existir `GithubWarningComponent` + constante centralizada `GITHUB_RESPONSIBILITY_WARNING` (`shared/constants/legal-warnings.ts:1-2`) que **no se usa en ningún componente**.
- Fallbacks de texto ("No agregado todavía", "Nombre no agregado", etc., `profile.component.ts:165-168`) están bien resueltos, pero duplicados íntegros en el componente muerto.
- Avatar con iniciales de **2 letras** (`getInitials`, línea 170-174) — inconsistente con el resto de la app (1 letra en home-candidate, jobs, messages, public-preview).

## E. Habilidades (`features/skills`)

- Tarjetas, autocompletado con catálogo y niveles (Básico/Intermedio/Avanzado/Experto) ya funcionan bien.
- Sin loading state mientras resuelve la carga inicial — el empty state puede parpadear un instante.
- **Borrado sin manejo de error**: `remove(id)` (líneas 185-188) no tiene callback `error` — si falla el DELETE, no hay ningún aviso al usuario.
- `levelLabel()` (líneas 190-193) duplicado también en `public-preview.component.ts:74` y `public-portfolio.component.ts:248`.

## F. Experiencia (`features/experiences`)

- Buen patrón: formulario largo pero colapsable (se expande solo al agregar/editar), con secciones claras. Funciones, logros, herramientas y habilidades ya se muestran diferenciados en las tarjetas.
- Mismo problema de borrado sin manejo de error (línea 358).
- Fecha: `date:'MMM y'` (línea 198) — formato distinto al resto de módulos.

## G. Educación (`features/education`)

- Organización ya es clara (tipo de formación, nivel, fechas).
- **Es el módulo con peor cobertura de errores de toda la app**: ni `save()` (línea 225) ni el borrado (línea 243) tienen callback `error` — es el único módulo de los cuatro CRUD (junto a skills/experiences/projects) sin manejo de error también al guardar, no solo al borrar.

## H. Proyectos (`features/projects`)

- `imageUrl` nulo tiene fallback visual correcto (placeholder con ícono, líneas 189-191).
- `statusLabel()` (líneas 360-363) traduce PLANNED/IN_PROGRESS/COMPLETED correctamente en la propia tarjeta.
- Borrado sin manejo de error (línea 357), mismo patrón que skills/experiences.
- Aviso de repositorio con redacción propia otra vez (línea 124) en vez de reusar la constante compartida.
- El campo ya se llama "Repositorio" en la UI (no limitado a GitHub en el texto), aunque el aviso legal está redactado pensando específicamente en GitHub.

## I. CV (`features/cv-analysis`)

- Buen manejo de estados en la subida/análisis: spinner inline en botones, errores vía snackbar con mensaje del backend.
- Fecha: `date:'medium'` (líneas 96, 132) — otro formato más, no usado en ningún otro módulo.
- Sin loading state explícito para la carga inicial de la lista de documentos — el empty state puede parpadear.
- **No existe forma de eliminar un CV ya subido** desde la lista (sin botón de borrar, líneas 88-104) — posible funcionalidad faltante.

## J. Vista pública del candidato (`public-preview` vs. `public-portfolio`)

- El diseño ya se lee como portafolio (hero con nombre/título/resumen, secciones separadas) más que como CV plano.
- `public-portfolio` (el real) respeta bien los switches de visibilidad y traduce correctamente `workMode`/`contractType`/`status` de proyecto (`.ts:259-272`).
- **`public-preview` (la vista previa autenticada) es una segunda implementación paralela**, con lógica de traducción de enums propia y divergente: el binding de `p.status` (`public-preview.component.html:241`) y `e.workMode` (línea 163) no pasan por ningún `statusLabel()`/`workModeLabel()` — con los datos actuales no se nota (el valor guardado ya viene en español), pero el código no lo garantiza si algún dato llega en otro formato.
- Bug de marcado: dentro de `public-portfolio`, el `ng-template #notFoundTmpl` (líneas 38-53) tiene un bloque de advertencia de GitHub y cierres de `</div>` que no corresponden a esa plantilla — residuo de copy-paste, no se activa nunca porque `profile` es `null` ahí, pero la estructura está desprolija.
- Footers distintos: "Portafolio generado con TalentBridge" (`public-preview.component.html:276`) vs. "Portafolio generado con Portafolio Profesional Inteligente" (`public-portfolio.component.ts:210`).

## K. Trabajos / ofertas disponibles (`features/jobs/candidate-jobs`)

- **[confirmado en vivo]**: las tarjetas muestran bien empresa, logo con fallback de inicial, salario en verde, modalidad/contrato/jornada, habilidades como chips, e indicador de coincidencia — de las pantallas mejor resueltas de la app hoy.
- Duplicación interna: `getStatusLabel()` y `appStatusLabel()` (líneas 299-308 y 376-385) son el mapa idéntico, copiado dos veces en el mismo archivo.
- Método muerto: `formatSalary()` (líneas 314-322) nunca se usa (la plantilla llama a `formatSalaryCompact()`/`appSalary()`).
- Tres formatos de fecha distintos dentro del mismo componente.
- Fallback "Empresa no especificada" (línea 271) — distinto al "Empresa" usado en home-candidate/messages.

## L. Mis postulaciones (dentro de `candidate-jobs`)

- Filtros razonables, empty state con ícono+título+subtítulo (de los más completos del grupo).
- No sobra información — el tamaño de la pantalla es el justo.
- Comparte los mismos problemas de formato de fecha y fallback de nombre que el resto del componente (ver K).

## M. Modal de detalle de oferta

- **[confirmado en vivo]**: bien organizado (logo, badge de estado si corresponde, grilla de datos, secciones de texto), y los botones cambian correctamente según si el candidato ya se postuló.
- Único problema real: Joaquín queda visible por encima del fondo oscurecido del modal (ver hallazgos confirmados en vivo).
- El modal duplica buena parte del markup de la tarjeta de la lista con clases distintas (`job-card` vs. `detail-*`) en vez de un sub-componente compartido.

## N. Panel empresa

### `company-shell` (layout)
- El avatar/saludo del topbar usa la inicial y el email del **usuario**, no el `companyName` ni el logo de la empresa (`company-shell.component.ts:79-85`) — inconsistente con `company-dashboard`, que sí resuelve `companyName`.
- El ítem "Mensajes" del nav no muestra contador de no leídos pese a que el dato ya se calcula en el shell.

### `company-dashboard`
- **[confirmado en vivo]**: 6 KPIs con colores distintos, tabla de ofertas recientes con badges de estado correctos, postulaciones recientes — se ve completo y prolijo.
- Loading: ícono + texto, sin skeleton. Error: card genérico sin botón de reintentar (a diferencia de `company-profile`, que sí lo tiene).
- **Sin fallback de logo**: si `logoUrl` es null, la imagen simplemente no aparece (línea 21, sin rama `@else`) — a diferencia de `company-profile`, que resuelve iniciales.
- `statusLabel()` (líneas 63-70) duplica exactamente el mismo diccionario que `company-jobs.component.ts:306-319`.
- CSS muerto: `.quick-grid`/`.quick-card` definidos en el `.scss` (líneas 67-84) sin ningún uso en el HTML.

### `company-profile`
- Es el módulo del lado empresa mejor resuelto: botón de reintentar en error, fallback de logo con iniciales bien implementado, fallbacks de texto en español ("No agregado todavía", etc.), formulario en secciones (Información principal / Contacto / Logo).
- Hallazgo puntual: en modo lectura, el campo "Logo" muestra la URL cruda del logo como texto (`{{ displayValue(summaryProfile.logoUrl) }}`, líneas 69-71) en vez de un link o miniatura.
- Mezcla tres patrones de botón en la misma página: `edit-btn` hecho a mano (violeta, intencional — ver nota abajo), `appButton="danger"`/`"secondary"` para cancelar/reintentar, y `.btn-save` hecho a mano para guardar.
- Sin validación de campos (permite guardar `companyName` vacío sin aviso).

### `company-candidates` (búsqueda)
- **[confirmado en vivo]**: tarjetas de candidato con avatar, botones "Ver"/"Contactar", chips de skills — se ve bien.
- Es el empty state más completo de toda la app: ícono, título, sugerencias accionables ("Prueba con menos habilidades", etc.) y botón "Limpiar filtros" (líneas 119-131).
- No hay mensaje antes de la primera búsqueda (pantalla en blanco hasta que se busca algo).
- **Ninguno de los 8 botones de esta página usa `appButton`** — todos hechos a mano pese a que el módulo sí importa `BadgeComponent` para las skills.

### `company-jobs` (CRUD ofertas + modales)
- Tabla con 9 columnas (Oferta, Ubicación, Modalidad, Contrato, Jornada, Estado, Post., Publicación, Acciones).
- **Bug de responsive concreto**: en el breakpoint `until-desktop`, `grid-template-columns` define solo 8 valores (línea 424) para 9 columnas reales del DOM — falta un track, riesgo de desalineación justo antes de que la tabla mute a tarjetas apiladas.
- En la vista mobile (tarjetas apiladas), el contador de postulaciones aparece como un dígito suelto sin la etiqueta "Post.".
- Dos formatos de fecha distintos dentro del mismo archivo (`formatJobDate()` manual vs. pipe `date:'mediumDate'` en el modal de postulaciones).
- **Confirmaciones nativas**: `closeJob`, `archiveJob`, `deleteJob` usan `confirm()` del navegador en vez del `ConfirmDialogComponent` compartido que sí se usa del lado candidato.
- Modal de nueva oferta: **15 campos en un solo scroll vertical sin secciones**, validación mínima (solo al hacer submit, sin mensajes inline), inputs de salario sin formateo visual de miles.
- Modal de postulaciones recibidas: tarjetas escaneables (avatar, nombre, mensaje, estado), pero el estado se muestra **dos veces** (badge + `<select>` al lado) y los botones "Ver portafolio"/"Contactar" mezclan `appButton` con un botón hecho a mano en el mismo bloque.

### `company-view` (candidato viendo el perfil de una empresa)
- El campo `logoUrl` existe en el modelo pero **nunca se usa** en el template — siempre muestra inicial, aunque la empresa tenga logo cargado.
- Los campos faltantes simplemente no se renderizan (`@if`) en vez de mostrar "No especificado" — evita textos feos, pero puede dejar una ficha muy pobre si la empresa no completó su perfil.
- Botones `btn-primary`/`btn-secondary` hechos completamente a mano.

## O. Chat (`features/messages`, compartido candidato/empresa)

- **Único módulo de toda la app con skeleton loader real** (líneas 17-27 del HTML) — contrasta con el resto, que usa spinner/texto/nada.
- Buen detalle: el spinner de carga de mensajes solo aparece si `messages().length === 0`, evitando parpadeo al cambiar de conversación.
- Empty state de "sin conversaciones" es solo texto (sin ícono), inconsistente con el empty state de la derecha (`empty-chat`) que sí tiene ícono+título+subtítulo.
- **Errores silenciosos**: `openConversation()` no tiene callback `error`.
- `console.error('[MESSAGES] load error', err)` dejado en código de producción (línea 129).
- El diálogo de "Bloquear conversación" está hecho a mano (`block-confirm-overlay`, líneas 239-252) en vez de usar `ConfirmDialogComponent`.

## P. Chatbot Joaquín (`shared/assistant/assistant-chat`)

- Se instancia una sola vez en `app-shell.component.html:100`, fuera del `router-outlet` — visible en **todas** las páginas autenticadas del candidato sin excepción, incluida Mensajes (dos interfaces de chat a la vez).
- **z-index muy por encima de cualquier modal**: launcher `z-index: 10000-10001` (líneas 11-14, 35-38), panel abierto `z-index: 10002` (líneas 108-115) — comparado con `z-index: 1000` de los modales de la app (`candidate-jobs.component.scss:476`, `messages.component.scss:681`). **[confirmado en vivo]** sobre el modal de detalle de oferta.
- Mensajes de error muestran el detalle técnico crudo del backend si este no trae `message` en español (`assistant-chat.component.ts:118-131`).
- Los chips de sugerencia rápida ("Perfil profesional", etc.) solo aparecen en el primer mensaje — si se cierra y reabre el panel, no vuelven a mostrarse (el historial persiste en memoria).

---

## Patrones transversales

1. **No existe un componente de loading/skeleton/empty-state reutilizable.** `.state-card`/`.state-loading`/`.state-error` se redefinen en 6+ archivos SCSS distintos; `.empty-state`/`.empty-icon` en 8+. Solo `messages.component.html` tiene skeleton real.
2. **Al menos 6-7 formatos de fecha distintos**: `date:'mediumDate'`, `toLocaleDateString('es-CO', ...)` manual (con dos prefijos "Publicado el "/"Postulado el "), `date:'MMM y'`, `date:'medium'`, `date:'dd/MM/yyyy'`, `date:'shortDate'`/`date:'shortTime'`, `date:'longDate'`.
3. **Mapas de traducción de estado/nivel duplicados**: existe `statusToTone()` para el color, pero no un equivalente para el texto en español — el mapa PENDING/REVIEWED/PRESELECTED/REJECTED/HIRED se copia a mano en `home-candidate`, dos veces en `candidate-jobs`, y en los equivalentes de empresa. Igual con los niveles de habilidad (BASIC/INTERMEDIATE/ADVANCED/EXPERT), duplicado en 3 archivos.
4. **Manejo de errores inconsistente en CRUD**: crear/editar casi siempre muestra snackbar de error; **borrar** no tiene callback de error en skills, experiences, education y projects. Educación además tampoco lo tiene al guardar.
5. **Aviso legal de GitHub duplicado con redacciones distintas** en 4 lugares, pese a existir `GithubWarningComponent` + constante centralizada sin usar.
6. **Componentes completos sin usar (código muerto)**: `ProfileEditorComponent` (~700 líneas) y `features/dashboard/dashboard.component.ts`, ninguno enrutado ni importado.
7. **Fallback de "empresa sin nombre" con 3 textos distintos**: "Empresa" (home-candidate, messages), "Empresa no especificada" (candidate-jobs).
8. **Branding inconsistente**: "TalentBridge" vs. "Portafolio Inteligente", incluso en los footers de public-preview vs. public-portfolio.
9. **Avatares con iniciales inconsistentes**: 1 letra en la mayoría de la app vs. 2 letras en profile/profile-editor.
10. **"Vista previa" no garantiza fidelidad al portafolio público real** — dos implementaciones independientes del mismo render.
11. **`confirm()` nativo del navegador** en las 3 acciones destructivas de `company-jobs`, en vez del `ConfirmDialogComponent` compartido que sí usa el lado candidato.
12. **Fallback de logo/avatar implementado 3 veces distintas** para el mismo problema (empresa sin logo): bien en `company-profile`, ausente en `company-dashboard`, ignorado por completo en `company-view`.
13. **Mismo patrón visual (hero de dashboard) construido dos veces**: `company-dashboard` y `dashboard` (candidato) comparten las mismas clases CSS (`hero-card`, `hero-badge`, etc.) pero una usa los componentes compartidos (`appButton`, `app-badge`) y la otra los reimplementa a mano — sugiere que la adopción de componentes compartidos se hizo de un solo lado.

## Reutilización de componentes compartidos — resumen

| Componente | Adopción real |
|---|---|
| `ButtonDirective` (`appButton`) | Parcial — convive con botones hechos a mano en casi todos los módulos, de ambos lados. |
| `BadgeComponent` (`app-badge`) | Buena — dashboard, candidates, jobs (ambos lados) lo usan bien. |
| `CardComponent` (`app-card`) | **Nula** — cero usos en toda la aplicación. |
| `ConfirmDialogComponent` | Solo lado candidato (projects, education, experiences, skills). Empresa usa `confirm()` nativo; `messages` implementa el suyo a mano. |
| `GithubWarningComponent` + `GITHUB_RESPONSIBILITY_WARNING` | **Nula** — el aviso está copiado a mano con redacciones distintas en 4 lugares. |

---

*Ver [`plan-mejoras-frontend-ux.md`](plan-mejoras-frontend-ux.md) para las decisiones de producto tomadas sobre estos hallazgos y el plan de fases de implementación.*
