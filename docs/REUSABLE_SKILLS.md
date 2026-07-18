# Skills reutilizables — para TalentBridge y futuros proyectos

Aprendizajes que valen para cualquier proyecto similar (Angular + NestJS + Prisma + microservicios), no solo para TalentBridge. Cada skill: Nombre / Cuándo usarla / Pasos / Errores comunes / Checklist / Ejemplo aplicado en TalentBridge. Agregar una entrada nueva cada vez que se detecte un patrón repetible — no dejar que el aprendizaje se pierda en un changelog puntual.

---

## 1. Cómo organizar un frontend Angular profesional

**Cuándo usarla:** Al arrancar un proyecto Angular nuevo, o al evaluar si uno existente está creciendo de forma sostenible.
**Pasos:**
1. Separar `core/` (guards, interceptors, servicios HTTP, modelos — cosas que se instancian una vez) de `features/` (una carpeta por pantalla/dominio) de `shared/` (componentes/pipes/utils reusables entre features).
2. Standalone components + lazy loading por ruta (`loadComponent`) desde el día uno — evita el problema de migrar de `NgModule` después.
3. Un servicio HTTP por dominio de backend, no un servicio gigante "ApiService" con todos los endpoints.
4. Sistema de diseño (tokens de color/espaciado/tipografía como CSS custom properties) definido *antes* de que el primer componente hardcodee un color — es mucho más caro migrar 20 componentes a tokens que empezar con ellos.
**Errores comunes:** Mezclar lógica de negocio en el componente cuando debería vivir en el servicio (dificulta reusar/testear). Duplicar un componente "parecido" en vez de parametrizar el existente (ver skill #2).
**Checklist:** ¿Un nuevo dev entiende dónde va cada archivo nuevo sin preguntar? ¿Hay un solo lugar para cada color/espaciado? ¿Los servicios HTTP están separados por dominio?
**Ejemplo en TalentBridge:** `core/`+`features/`+`shared/` tal cual arriba. Sistema de tokens documentado en `FRONTEND/src/styles/README.md`.

---

## 2. Cómo diseñar cards limpias

**Cuándo usarla:** Cualquier pantalla con listado de ítems (ofertas, candidatos, conversaciones, skills).
**Pasos:**
1. Definir el patrón base UNA vez como tokens: fondo + borde + radio + sombra + padding (ej. `var(--bg-surface)` + `var(--border-soft)` + `var(--radius-lg)` + `var(--shadow-xs)`).
2. Estructura interna consistente: header (avatar/ícono + título + acción rápida) → body (contenido variable) → footer (acciones secundarias), no cada card con su propio orden.
3. Badges de estado con tono semántico consistente (mismo color = mismo significado en toda la app), nunca hardcodeado por pantalla.
4. Si dos cards se parecen "casi igual", extraer el patrón a un componente compartido — no copiar y ajustar (ver skill #1).
**Errores comunes:** Badges superpuestos con el texto en pantallas angostas (probar en mobile desde el principio, no al final). Sombra + borde a la vez sin necesidad (recargado visualmente — usar una u otra según variante, no ambas por default).
**Checklist:** ¿La card se ve bien con contenido mínimo y con contenido máximo (texto largo, muchos badges)? ¿El hover/focus es consistente con el resto de la app? ¿Los badges no se superponen en mobile?
**Ejemplo en TalentBridge:** `CardComponent` (`shared/components/card/`) define el patrón — hoy sin adopción completa (ver `DECISIONS.md`, entrada "Card compartido"), pero el patrón de tokens sí está establecido y replicado a mano en ~14 lugares.

---

## 3. Cómo diseñar modales sin que se vean desordenados

**Cuándo usarla:** Confirmaciones, formularios cortos, detalle expandido de un ítem.
**Pasos:**
1. Un solo componente de confirmación genérico (título+mensaje+acción) reusado con inputs, no uno nuevo por pantalla.
2. `z-index` en una escala documentada y respetada — si hay un widget flotante (chatbot, notificaciones), el modal SIEMPRE va por encima.
3. Overlay de fondo con opacidad/color desde un token (`--overlay-scrim`), no un `rgba()` inventado por componente.
4. Botón de confirmación con texto que describe la acción real ("Eliminar", "Cerrar oferta", "Archivar") — nunca un genérico "Confirmar" cuando la acción es destructiva o poco obvia.
**Errores comunes:** Reimplementar el mismo modal de confirmación a mano en cada pantalla (deriva en textos/estilos inconsistentes — pasó en TalentBridge, ver BUG relacionado). Modal tapado por un widget flotante por descuido de z-index.
**Checklist:** ¿Existe ya un componente de confirmación genérico antes de escribir uno nuevo? ¿El z-index está documentado en algún lado? ¿El texto del botón de confirmación es específico a la acción?
**Ejemplo en TalentBridge:** `ConfirmDialogComponent` con `confirmLabel`/`confirmColor` opcionales (ver `DECISIONS.md`). Escala de z-index: asistente flotante 900-902, modales ≥1000.

---

## 4. Cómo manejar logos con fallback

**Cuándo usarla:** Cualquier entidad con imagen opcional (empresa, usuario, marca externa).
**Pasos:**
1. Nunca asumir que la URL de imagen existe o carga bien — siempre rama `@else`/fallback, tanto en el markup como en el CSS del contenedor (un `<img>` sin estilos propios se ve roto aunque el fallback lógico esté bien).
2. Fallback = iniciales calculadas del nombre (`split(/\s+/).slice(0,2).map(p => p[0].toUpperCase()).join('')`), sobre un color de fondo consistente con la identidad de esa entidad (ej. color distinto para "empresa" vs "candidato" si el producto separa esos roles visualmente).
3. Si el `<img>` puede fallar en runtime (URL rota, no solo ausente), agregar `(error)` handler que oculte la imagen o dispare el mismo fallback — un `@if (logoUrl)` no protege contra una URL presente pero rota.
**Errores comunes:** Agregar el `<img>` sin el CSS del contenedor (queda con tamaño natural de la imagen, rompe el layout). Fallback sin color de fondo (iniciales invisibles sobre fondo transparente).
**Checklist:** ¿Hay rama `@else`? ¿El contenedor tiene tamaño/border-radius propio (no depende de que la imagen cargue)? ¿Se probó con `logoUrl` ausente y con `logoUrl` inválida?
**Ejemplo en TalentBridge:** BUG-006 — `company-dashboard` no tenía ninguna de las dos cosas. Patrón correcto ya existía en `company-profile` (`getInitials` + `--accent-purple`), se replicó desde ahí.

---

## 5. Cómo manejar filtros y paginación

**Cuándo usarla:** Cualquier listado con más resultados de los que caben en una pantalla, o con búsqueda entre pantallas.
**Pasos:**
1. Estado de filtros en `FormControl`s independientes + botón "Limpiar filtros" que resetea todo y vacía resultados (no solo el input visual).
2. Si el filtro puede llegar por query param desde otra pantalla (ej. landing → resultados), verificar **ambos lados de la cadena**: quién lo manda (¿arma bien el `queryParams`?) y quién lo recibe (¿lo lee en `ngOnInit` y dispara la búsqueda, o solo lo deja en la URL sin usarlo?).
3. Paginación: estado `page`/`limit`/`total`/`totalPages`, validar rango antes de refetchear (`1 <= p <= totalPages`), y volver al scroll top al cambiar de página.
**Errores comunes:** Mandar un query param desde una pantalla y no leerlo nunca del otro lado — el bug se manifiesta como "el link no hace nada" y es fácil no notarlo porque no tira error, simplemente no filtra.
**Checklist:** ¿Se probó el flujo completo origen→destino, no solo cada pantalla aislada? ¿"Limpiar filtros" deja el estado exactamente como recién llegado a la pantalla?
**Ejemplo en TalentBridge:** BUG-001 — el param `q` se mandaba bien pero no se leía en dos lugares distintos de la cadena. Se encontró recién al probar el flujo completo, no mirando cada componente por separado.

---

## 6. Cómo documentar bugs

**Cuándo usarla:** Cada vez que se corrige algo que no era "una feature nueva" sino un comportamiento incorrecto.
**Pasos:** Ver plantilla en `BUGS_AND_FIXES.md`. Clave: **causa real, no síntoma** — si un bug tiene varias causas encadenadas, documentarlas todas (arreglar solo la primera que se encuentra suele no resolver el síntoma visible).
**Errores comunes:** Documentar "se arregló X" sin decir por qué pasaba — inútil para no repetirlo. Cerrar el bug como resuelto sin haber verificado el flujo completo (solo el punto donde se hizo el cambio).
**Checklist:** ¿Queda claro *por qué* pasaba, no solo *qué* se cambió? ¿Se buscaron causas hermanas (mismo patrón de bug en otro lugar del código)?
**Ejemplo en TalentBridge:** `BUGS_AND_FIXES.md`, BUG-001 (causa triple) y BUG-007 (mismo patrón de bug — falta de manejo de error — repetido en 5 lugares, documentado como una sola entrada porque es un único patrón, no 5 bugs distintos).

---

## 7. Cómo trabajar con microservicios (NestJS monorepo)

**Cuándo usarla:** Proyectos donde el dominio se separa en servicios independientes detrás de un gateway.
**Pasos:**
1. Un Gateway como única puerta de entrada del frontend — nunca el frontend hablando directo con un microservicio interno (excepción justificada y documentada si hace falta, ej. WebSocket).
2. Cada servicio dueño de su propio dominio de datos por convención, aunque la DB física sea compartida en una fase temprana — documentar la intención de separación futura para no perderla.
3. Autenticación centralizada (un servicio emite el JWT, todos los demás lo validan igual) — no reimplementar la validación por servicio.
4. Compilar/levantar el servicio puntual que se tocó, no todo el monorepo, para iterar rápido y aislar errores.
**Errores comunes:** Lógica de negocio duplicada entre dos servicios que "casi" comparten dominio (señal de que la separación de dominios está mal trazada). Gateway con lógica de negocio propia (debería ser solo proxy/routing/CORS).
**Checklist:** ¿El frontend conoce algún microservicio interno además del Gateway (y esa excepción está documentada)? ¿La validación de auth es la misma en todos los servicios?
**Ejemplo en TalentBridge:** 10 servicios, Gateway con proxy vía `fetch` nativo (`http-client.service.ts`), única excepción documentada: WebSocket del chat va directo al `chat-service`.

---

## 8. Cómo validar cambios sin romper el proyecto

**Cuándo usarla:** Antes de dar por terminada cualquier tarea de código.
**Pasos:**
1. `git status` antes de tocar nada (saber qué ya estaba modificado y no es tuyo).
2. Cambios mínimos y acotados al problema — no aprovechar para refactorizar algo no pedido.
3. Build del alcance real: frontend tocado → `ng build`; servicio backend tocado → `build:<servicio>`; schema Prisma tocado → `prisma validate` + `prisma generate`.
4. Comparar warnings del build contra una lista conocida (ver `NEXT_STEPS.md`) — un warning nuevo es señal de algo, uno preexistente no bloquea.
5. `git status` de nuevo al final — confirmar que los archivos modificados son los esperados, nada de "sorpresa" tocado sin querer.
**Errores comunes:** Dar por bueno un cambio solo porque "compila" sin probar el flujo real que se tocó. No revisar si el build tiene warnings nuevos por asumir que "siempre hay warnings".
**Checklist:** ¿Corriste el build correspondiente? ¿Comparaste warnings antes/después? ¿`git status` final coincide con lo que creés que cambiaste?
**Ejemplo en TalentBridge:** Cada fase del plan UX (`plan-mejoras-frontend-ux.md`) termina con `npm run lint:css` + `ng build` antes de marcarse completa — nunca se dio una fase por terminada solo por edición de código.

---

## 9. Cómo crear seeds idempotentes

**Cuándo usarla:** Cualquier script que puebla datos de prueba/demo.
**Pasos:**
1. `findUnique`/`upsert` por una clave natural (email, slug) — nunca `create` a ciegas si el script se puede volver a correr.
2. Si el seed genera datos random (para volumen, ej. "100 candidatos"), decidir explícitamente si re-correrlo debe (a) no tocar los que ya existen, o (b) regenerar sus datos random — y que el comportamiento sea el mismo cada vez que se corre, no ambiguo.
3. Separar seeds "base" (usuarios/empresas core) de seeds "de volumen" (cientos de registros aleatorios) en scripts distintos — permite correr solo lo que hace falta.
4. Documentar qué seed depende de qué otro (orden de ejecución) si existe esa dependencia.
**Errores comunes:** Seed que hace `deleteMany` + `createMany` sin avisar — destructivo para cualquiera que ya tenga datos reales/de trabajo en esa base. Datos random sin semilla fija cuando se necesita reproducibilidad para debug.
**Checklist:** ¿Correr el script dos veces seguidas produce el mismo resultado (o un resultado documentado como esperado)? ¿Está claro en qué orden correr los seeds si hay dependencias?
**Ejemplo en TalentBridge:** Ver tabla completa en `DATABASE.md` sección 9 — todos los seeds actuales son `findUnique`-then-skip o `upsert`, ninguno borra datos existentes.

---

## 10. Cómo manejar DTOs y contratos frontend/backend

**Cuándo usarla:** Cualquier endpoint que recibe body — especialmente con NestJS + `class-validator`.
**Pasos:**
1. Si el backend usa `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`, **todo** campo que mande el frontend tiene que estar declarado en el DTO — agregar el campo al DTO *antes* de agregarlo al formulario del frontend, no al revés.
2. Mantener el nombre del campo idéntico entre frontend (interface TS) y backend (DTO) — un typo entre `contractType` y `contract_type` produce el mismo error de "property should not exist" mal diagnosticado como bug de UI.
3. Campos opcionales: `@IsOptional()` en el DTO Y `?` en la interface TS — si uno lo tiene y el otro no, hay desincronización silenciosa.
**Errores comunes:** Frontend mandando un campo extra "por las dudas" (ej. un campo que el form tiene pero el backend no pidió) → 400 con mensaje `property X should not exist`, fácil de confundir con un bug de red o de CORS si no se lee el mensaje completo.
**Checklist:** ¿El campo nuevo está en el DTO del backend? ¿El nombre coincide exactamente (case incluido)? ¿Es opcional en ambos lados o requerido en ambos?
**Ejemplo en TalentBridge:** Los 10 servicios backend tienen `whitelist: true` + `forbidNonWhitelisted: true` (verificado en cada `*.module.ts`) — ver `BACKEND_GUIDE.md` sección 4.

---

## 11. Cómo revisar errores de pantalla blanca (Angular)

**Cuándo usarla:** La app carga en blanco sin renderizar nada, sin (o con) error visible.
**Pasos:**
1. Abrir devtools → consola, antes que nada — un error de compilación de template o un import roto suele aparecer ahí, aunque la terminal de `ng serve` no muestre nada.
2. Si el error es `NG0304`/`NullInjectorError` → falta un provider o un import de módulo en un componente standalone.
3. Si el error aparece solo en una ruta → revisar el `loadComponent` de esa ruta y el propio componente, no el resto de la app.
4. Si compila pero no renderiza nada → revisar guards de la ruta (un guard que nunca resuelve su Observable deja la navegación colgada sin error visible).
5. Verificar que el `AppComponent` raíz tenga `<router-outlet>` y que no haya un `*ngIf`/`@if` global tapando todo por un estado mal inicializado (ej. `loading` que nunca pasa a `false`).
**Errores comunes:** Asumir que es un bug de backend cuando el error está en el propio bundle del frontend (revisar consola del navegador SIEMPRE antes de sospechar de la API).
**Checklist:** ¿Revisaste la consola del navegador? ¿El error es de compilación (build falla) o de runtime (build pasa, algo tira excepción al ejecutar)? ¿Es una ruta específica o toda la app?
**Ejemplo en TalentBridge:** Los guards (`CandidateGuard`/`CompanyGuard`) resuelven siempre a un valor (`true` o un `UrlTree`, nunca quedan colgados) — patrón a mantener si se agregan guards nuevos.

---

## 12. Cómo trabajar con Git de forma segura

**Cuándo usarla:** Siempre, pero especialmente en un proyecto con trabajo en curso de otra persona/sesión.
**Pasos:**
1. `git status` antes de cualquier operación que pueda descartar cambios (`checkout`, `restore`, `reset`, `clean`).
2. Si hay cambios sin commitear que no son tuyos (de otra sesión/persona), no asumas que podés pisarlos — preguntá o dejalos intactos.
3. Nunca `git commit` automático sin que te lo pidan explícitamente — un commit "sorpresa" rompe el flujo de quien está revisando el trabajo.
4. Nunca force-push ni operaciones destructivas sin confirmación explícita puntual (no alcanza una autorización general de "andá avanzando").
**Errores comunes:** Commitear archivos generados (`dist/`, `node_modules/`, `.env` con secretos reales) por un `git add -A` sin revisar qué quedó staged.
**Checklist:** ¿Corriste `git status` antes de empezar? ¿Sabés qué cambios eran preexistentes vs. los tuyos? ¿Alguien pidió explícitamente el commit?
**Ejemplo en TalentBridge:** Al momento de escribir esto, el repo tiene ~104 archivos modificados sin commitear de sesiones previas y de esta sesión — **ningún commit se hizo todavía**, esperando instrucción explícita del usuario (regla del proyecto: "no hacer commit automático").

---

## 13. Cómo hacer auditorías visuales

**Cuándo usarla:** Antes de una entrega/presentación, o al retomar un proyecto con UI ya avanzada.
**Pasos:**
1. Recorrer pantalla por pantalla con una checklist escrita (no "a ojo") — ver `TESTING_CHECKLIST.md` como plantilla.
2. Priorizar por lo que un usuario real ve primero: landing → registro/login → flujo principal del rol → pantallas secundarias.
3. Probar estados límite: sin datos (vacío), con un dato, con muchos datos (overflow/scroll), con datos largos (nombres/textos que rompen layout).
4. Responsive en al menos 3 anchos: desktop, tablet, mobile — no asumir que "si anda en desktop, anda en todos lados".
5. Documentar cada hallazgo con archivo:línea si es posible, no una descripción vaga ("se ve raro").
**Errores comunes:** Auditar solo el happy path (datos perfectos) y no los estados vacío/error/overflow, que es donde más aparecen los bugs visuales reales.
**Checklist:** ¿Se probaron los 3 anchos de viewport? ¿Se probó con 0 datos y con datos largos? ¿Cada hallazgo tiene ubicación exacta en el código?
**Ejemplo en TalentBridge:** `auditoria-frontend-ux.md` (auditoría original, con archivo:línea por hallazgo) y `TESTING_CHECKLIST.md` (checklist operativa de esta sesión).

---

## 14. Cómo preparar un proyecto para presentación académica

**Cuándo usarla:** Semanas/días antes de defender el proyecto.
**Pasos:**
1. Datos demo curados, no aleatorios sin revisar — un evaluador va a hacer click en el primer perfil/oferta que vea, que sea representativo (ver ejemplo de TalentBridge abajo: es exactamente lo contrario de lo que hay que tener).
2. Un script de arranque de un solo comando (o casi) — nada de recordar 10 pasos manuales el día de la defensa.
3. Credenciales demo documentadas y fáciles de decir en voz alta (no un email/password generado al azar).
4. Un recorrido ensayado de los flujos principales, cronometrado — sin depender de que todo salga bien a la primera vez frente al evaluador.
5. Documentación (`docs/`) al día — un evaluador que pregunta "¿por qué eligieron X?" se responde mejor con `DECISIONS.md` a mano que improvisando.
**Errores comunes:** Dejar para el final la limpieza de datos de prueba obviamente falsos/rotos (ver BUG-008: perfil demo con ~150 habilidades, nada realista).
**Checklist:** ¿El arranque funciona en una máquina limpia siguiendo solo `PROJECT_OVERVIEW.md`? ¿Los datos demo se ven bien, no solo "existen"? ¿Podés explicar cualquier decisión técnica sin tener que adivinar por qué se hizo así?
**Ejemplo en TalentBridge:** `iniciar-talentbridge.bat` cubre el arranque de un comando. Pendiente antes de defender: BUG-008 (limpieza del perfil demo) — ver `NEXT_STEPS.md`. Los logos de empresa (Fase 9) ya están resueltos, no hace falta tocarlos.

---

## 15. Cómo verificar en vivo antes de asumir que algo está roto (y evitar falsos positivos de las propias herramientas)

**Cuándo usarla:** Cuando te piden "arreglar todo" en base a una lista larga de síntomas posibles, o cuando una captura de pantalla automatizada muestra algo que parece un bug grave.
**Pasos:**
1. Si la app se puede levantar, levantala y navegala de verdad (o con un navegador automatizado) antes de tocar código — comparar contra el pedido real, no asumir que la lista de síntomas describe el estado actual.
2. Cuando una captura automatizada muestra algo raro (huecos en blanco, contenido tapado), no lo tomes como prueba definitiva — inspeccioná el DOM (`innerText`, `getBoundingClientRect`, `getComputedStyle`) para confirmar que el contenido realmente no está, antes de "arreglarlo".
3. **Gotcha específico de Playwright/Chromium**: las capturas `page.screenshot({ fullPage: true })` con elementos `position: fixed` (botones flotantes, headers pegajosos) pueden mostrar el elemento fijo superpuesto a contenido que en un scroll real nunca toca — el elemento se renderiza en su posición de la primera pantalla mientras el resto de la página se compone por partes. Para verificar de verdad: scrollear el contenedor real (`element.scrollTop = element.scrollHeight`) y capturar solo el viewport (sin `fullPage`), no una captura de página completa.
4. Si el bug reportado tiene una causa de varios pasos (ej. un dato que viaja por 3 componentes), probá el flujo end-to-end real, no cada componente aislado — un fix parcial que no se prueba de punta a punta puede parecer completo y no serlo (ver BUG-001 de este proyecto).
5. Verificá el endpoint real con `curl` antes de asumir que el problema es del backend — muchas veces el dato ya está bien ahí y el bug es puramente de renderizado en el frontend (o al revés).
**Errores comunes:** "Arreglar" algo que no estaba roto porque la herramienta de verificación mintió — desperdicia tiempo y puede introducir un bug nuevo en código que funcionaba. Confiar en un selector de test ambiguo (ej. `text=Buscar` matcheando un título en vez del botón) y concluir que una feature no funciona cuando el problema era el propio script de prueba.
**Checklist:** ¿Verificaste con el DOM real, no solo con la imagen? ¿Probaste el flujo completo, no solo el punto donde se manifestó el síntoma? ¿El endpoint del backend ya devuelve el dato correcto (`curl`) antes de tocar el frontend?
**Ejemplo en TalentBridge:** Auditoría del 2026-07-17 (ver `DECISIONS.md`, "Auditar en vivo..." y "Gotcha descubierto...") — dos supuestos bugs graves (landing con huecos en blanco, Joaquín tapando contenido en mobile) resultaron ser artefactos de captura `fullPage`, verificados y descartados con inspección de DOM + scroll real antes de tocar código. Un tercer caso (búsqueda de candidatos "sin resultados") resultó ser un selector de Playwright mal escrito en el propio script de auditoría, no un bug de la app.
**Adenda (BUG-014, 2026-07-17):** No todo lo que parece el mismo artefacto lo es — un acordeón nuevo con filas colapsadas a ~14px se sospechó primero como el mismo falso positivo de `fullPage`, pero `getComputedStyle`/`getBoundingClientRect()` confirmó que el achicamiento era real en el DOM (causa: `flex-shrink` por defecto en un contenedor `overflow-y: auto` con `max-height`, ver skill #16). Moraleja: el gotcha de capturas es una hipótesis a verificar, no una conclusión automática — a veces el contenido sí está roto de verdad.

---

## 16. Cómo diseñar selectores de catálogo grande (categorías + búsqueda + selección múltiple)

**Cuándo usarla:** Cuando el usuario tiene que elegir varios ítems de un catálogo grande (cientos de opciones) agrupable por categoría — habilidades, tags, permisos, intereses.
**Actualizado 2026-07-17:** el usuario encontró el acordeón (versión original de este skill) "impreciso y feo visualmente" — el problema real no era el agrupado por categoría en sí, sino forzar a expandir/colapsar cada categoría para ver sus opciones. La versión que reemplazó al acordeón (ver `skills.component.ts`) es más simple y se sostiene mejor.
**Pasos:**
1. Buscador de texto libre que filtra TODO el catálogo de una (sin restricción de categoría) — gana siempre sobre el filtro de categoría cuando el usuario está escribiendo. Capar resultados (ej. 60) con una nota de "seguí escribiendo para afinar" si se corta, en vez de renderizar cientos de chips de una.
2. Chips de categoría de selección única (no acordeón) que, al hacer click, muestran la grilla plana de esa categoría — sin anidar expand/collapse. Sin búsqueda activa ni categoría elegida, mostrar un mensaje ("elegí una categoría o escribí para buscar") en vez de la lista completa sin filtrar.
3. Selección múltiple con estado visual claro por chip: normal / ya-agregado (deshabilitado o marcado, no ausente) / seleccionado-para-agregar — el usuario nunca debería poder seleccionar algo que ya tiene.
4. Agregado en batch (una acción, N ítems) en vez de un ciclo de "elegir uno → confirmar → repetir" — usar `forkJoin`/`Promise.all` con manejo de error por ítem individual (`catchError` que no aborte el batch completo) para que un fallo puntual (ej. colisión de nombre) no bloquee el resto.
5. Si cada ítem tiene un atributo secundario redundante (ej. nivel/prioridad) mostrado de más de una forma a la vez (badge de texto + barra + puntos), consolidar en un solo control reusable — la redundancia visual se percibe como "feo", no como más informativo.
6. Fallback de "no está en el catálogo" (entrada personalizada) para no bloquear al usuario si su caso no está contemplado.
**Errores comunes:** Contenedor scrolleable con hijos de tamaño fijo sin `flex-shrink: 0` — el bug es sutil porque en pantallas con pocos ítems (que caben sin comprimirse) nunca se manifiesta, solo aparece con overflow real. DTO de backend compartido entre creación y edición sin campos opcionales marcados como tales (ver skill #10) — la edición parcial (ej. "solo cambiar el nivel") falla con 400 si el campo "nombre" sigue siendo obligatorio en el DTO aunque el service ya lo trate como opcional.
**Checklist:** ¿Se probó con el contenedor lleno (scroll real, no solo con pocos ítems)? ¿Los ítems ya agregados se distinguen visualmente de los disponibles? ¿El agregado en batch maneja el fallo de un ítem individual sin abortar los demás? ¿El backend acepta una edición parcial sin exigir todos los campos de creación? ¿Cada atributo del ítem se muestra una sola vez, no duplicado en 2-3 widgets distintos?
**Ejemplo en TalentBridge:** Rediseño de `features/skills/` (2026-07-17) — catálogo de 635 habilidades en 21 categorías. Ver `CHANGELOG.md` y BUG-013/BUG-014 en `BUGS_AND_FIXES.md`.

---

## 17. Cómo barrer un proyecto en busca de un regionalismo de idioma (y no reintroducirlo sin darse cuenta)

**Cuándo usarla:** El usuario pide corregir/evitar una variante regional del idioma en todo el copy de la app (ej. voseo rioplatense vs. tuteo estándar en español).
**Pasos:**
1. No confiar en un solo regex genérico (ej. "palabras que terminan en tilde+s") — da muchísimos falsos positivos (más, país, además, inglés) que hacen perder tiempo revisando basura. Armar una lista curada de verbos/conjugaciones reales de la variante a evitar (para voseo: imperativos como "elegí"/"escribí"/"agregá", presente como "tenés"/"podés"/"sos") y buscar esas formas puntuales primero.
2. Igual, complementar con un regex más amplio pero acotado a patrones reales de la conjugación (ej. `\w+ás\b`, `\w+ís\b` para voseo) para no depender 100% de la lista curada — la lista curada encuentra lo esperado, el regex amplio encuentra lo que no se te ocurrió buscar.
3. Barrer TODO el proyecto (frontend + backend), no solo el archivo que motivó el pedido — un mensaje de error de backend ("¿Estás seguro...?") es tan user-facing como un label de UI.
4. **Revisar el propio código que se escribe en la MISMA sesión, después de guardar la regla.** Es fácil corregir el archivo original y después escribir código nuevo (ej. un componente compartido, un mensaje de error nuevo) con el mismo regionalismo por hábito, sin darse cuenta — pasó en esta misma tarea dos veces (un mensaje de error de `ForbiddenException` y los textos de ayuda de un nuevo componente).
5. Guardar la corrección como memoria de tipo *feedback*, no solo aplicarla una vez — es una preferencia permanente, no una tarea puntual.
**Errores comunes:** Confiar en que "ya lo revisé" sin repetir el barrido después de escribir código nuevo en la misma sesión. Dar por resueltas palabras ambiguas sin mirar el contexto real (ej. "más" no es voseo, "avalás" sí lo sería).
**Checklist:** ¿Se buscó con lista curada Y con regex amplio? ¿Se barrió frontend y backend? ¿Se revisó el código escrito en la propia sesión después de la corrección original, no solo el código preexistente? ¿Quedó guardado como preferencia permanente en memoria?
**Ejemplo en TalentBridge:** Corrección de voseo → tuteo (2026-07-17), 9 instancias reales encontradas y corregidas, 2 de ellas escritas por el propio agente en esta sesión. Ver `CHANGELOG.md` Fase 14 y memoria `feedback_colombian_spanish.md`.

---

## 18. `prisma migrate dev` puede pedir un reset completo si el historial de migraciones no coincide con la base real — usar `db push` para cambios aditivos cuando eso pase

**Cuándo usarla:** Al agregar/modificar un modelo en `schema.prisma` en un proyecto donde no se está 100% seguro de que el historial de migraciones (`prisma/migrations/`) refleje fielmente el estado real de la base (ej. si hubo cambios de schema aplicados a mano o con `db push` en sesiones anteriores sin generar una migración formal).
**Pasos:**
1. Antes de correr `prisma migrate dev`, si hay cualquier duda sobre si el historial de migraciones está al día, preferir directamente `npx prisma db push` para cambios puramente aditivos (tabla nueva, columna nueva nullable) — sincroniza el schema a la base sin pasar por el historial de migraciones, y con cambios aditivos no debería pedir ninguna confirmación destructiva.
2. Si igual se corre `migrate dev` y pide un **reset** ("All data will be lost" / "reset the public schema") — **parar ahí, no confirmar nunca el reset** sin verificar primero si el drift es esperable (ej. cambios de schema previos sin migración formal) o es algo más serio.
3. Verificar con conteos de filas de las tablas principales (`SELECT count(*) FROM ...`) antes y después de cualquier operación de sincronización de schema, incluso una que se asume no-destructiva — es gratis y da certeza real, no supuesta.
4. Documentar el drift como decisión conocida (`DECISIONS.md`) para que la próxima sesión no vuelva a asustarse con el mismo mensaje ni intente resolverlo con un reset por impaciencia.
**Errores comunes:** Asumir que como `migrate dev` es "la forma correcta" de Prisma, hay que seguir sus instrucciones al pie de la letra incluso cuando piden borrar todo — la herramienta no sabe que la base tiene datos reales que importan, el criterio de cuándo un reset es aceptable es del operador, no de la CLI.
**Checklist:** ¿Se verificaron conteos de filas antes/después? ¿Se evitó `migrate reset` sin excepción? ¿Quedó documentado el drift para la próxima sesión?
**Ejemplo en TalentBridge:** Alta de `SkillEndorsement` (2026-07-17) — `migrate dev` pidió reset, se usó `db push` en su lugar, verificado con conteos (162 usuarios/68 ofertas/949 habilidades sin cambios). Ver `DECISIONS.md`.

---

## 19. Verificar que un dato "existe" no es lo mismo que verificar que es el dato correcto

**Cuándo usarla:** Al auditar si una feature/dato ya está resuelto antes de reabrir una tarea — especialmente cuando la auditoría anterior la cerró como "completa" pero no se revisó el *contenido*, solo la *presencia*.
**Pasos:**
1. Distinguir explícitamente dos preguntas distintas: "¿el campo tiene un valor?" (presencia) vs. "¿ese valor cumple el objetivo original de la tarea?" (correctitud/calidad). Una auditoría que solo responde la primera puede cerrar como completo algo que sigue roto en la práctica.
2. Cuando el objetivo original incluía una palabra de calidad ("realista", "profesional", "distintivo", "único") — no alcanza con confirmar que el campo no es `null`; hay que mirar el contenido real (abrir el archivo, no solo confirmar que existe) y, si aplica a varias filas, verificar variedad/distribución (`GROUP BY` + `count(*)`), no solo una muestra de una fila.
3. Si el usuario reporta con una captura de pantalla que algo "se ve mal" después de que una sesión anterior lo dio por resuelto, confiar en la observación directa del usuario sobre el registro documental — investigar de cero en vez de asumir que el reporte está desactualizado.
**Errores comunes:** Cerrar una tarea de "calidad de contenido" verificando solo un campo booleano/no-nulo. Auditar una sola fila de muestra cuando el problema real era de distribución (61 filas, 11 valores distintos — la muestra de una sola fila no lo revela).
**Checklist:** ¿La verificación miró el contenido real, no solo si el campo estaba poblado? ¿Se revisó la distribución completa cuando hay muchas filas, no una sola muestra? ¿Se le dio más peso a la observación directa del usuario que al registro de una auditoría anterior?
**Ejemplo en TalentBridge:** Fase 9 (logos de empresa) se cerró dos veces como "completa" en el mismo día — la primera vez verificando que `logoUrl` no era `null` y que el archivo SVG existía; recién la segunda vez (a partir de una captura del usuario) se notó que los 11 archivos eran la misma silueta genérica repartida entre 61 empresas. Ver `PHASES.md` Fase 9 y `CHANGELOG.md`.

---

## 20. `nest start --watch` en un proceso de fondo no siempre recompila solo — verificar, no asumir

**Cuándo usarla:** Al editar código de un microservicio NestJS que ya está corriendo en modo watch (lanzado en una sesión anterior o por el propio agente en segundo plano), antes de dar por hecho que el cambio ya está "en vivo".
**Pasos:**
1. Después de editar un archivo de un servicio que ya está corriendo, no asumir que el proceso en `--watch` lo recompiló — **revisar el log del proceso buscando un evento de recompilación posterior al momento de la edición** (ej. "Webpack is building your sources..." con timestamp reciente). Si el log no tiene actividad nueva desde antes de la edición, el proceso no se enteró del cambio.
2. Si hay dudas, lo más simple y confiable es matar el proceso por su puerto (`Get-NetTCPConnection -LocalPort <puerto> | Stop-Process`) y volver a levantarlo — más rápido que investigar por qué el watcher no disparó.
3. Un síntoma indirecto de este problema: un fix que debería cambiar el comportamiento observado (ej. un endpoint que debería empezar a hacer algo nuevo) sigue comportándose exactamente igual que antes del cambio, sin ningún error de compilación visible — eso es señal de estar viendo el binario viejo, no un bug en el código nuevo.
4. Este problema parece afectar específicamente a procesos lanzados con `nohup <comando> &` en un shell no interactivo (común al automatizar desde un agente) — el watcher de webpack/chokidar puede no recibir eventos de filesystem de forma confiable en ese contexto, aunque el proceso siga vivo y sirviendo peticiones con normalidad.
**Errores comunes:** Pasar tiempo depurando "por qué mi fix no funciona" revisando el código una y otra vez, cuando el código está bien pero el proceso que responde a las requests es una versión anterior. Confundir "el build manual (`npm run build:X`) salió limpio" con "el proceso que está corriendo ahora mismo tiene ese build" — son cosas distintas; un build manual solo valida que compila, no actualiza el proceso en memoria que sigue corriendo con `nest start --watch`.
**Checklist:** ¿El log del servicio muestra una recompilación con timestamp posterior a la última edición? ¿El comportamiento observado cambió, o sigue idéntico al de antes del fix? Ante la duda, ¿se reinició el proceso en vez de asumir?
**Ejemplo en TalentBridge:** Fix de registro de `ProfileView` (2026-07-17) — el primer intento (agregar `OptionalJwtAuthGuard` + lógica de registro) pareció no funcionar en vivo; el log de `portfolio-service` no mostraba ninguna recompilación desde antes del cambio. Reiniciar el proceso reveló que en realidad SÍ había otro bug real (uso incorrecto de `@CurrentUser()`), pero la primera vuelta de verificación fue inconclusa hasta confirmar que el proceso corría el código correcto.

---

## 21. Nunca reformatear un `<input>` en vivo (`valueChanges`/`input`) sin manejar la posición del cursor — o mejor, formatear en `blur`

**Cuándo usarla:** Al implementar una máscara de formato para un campo de texto (teléfono, NIT, tarjeta, fecha escrita a mano) en un formulario reactivo de Angular.
**Pasos:**
1. Saber que `FormControl.setValue()` reescribe el valor del `<input>` en el DOM (vía `writeValue` del `ControlValueAccessor`) **sin preservar la posición del cursor**, sin importar si se pasa `{ emitEvent: false }` — ese flag solo evita que el propio `valueChanges.subscribe()` se dispare de nuevo (evita el loop infinito), pero no tiene ningún efecto sobre si Angular reescribe el valor visible del input ni sobre dónde queda el cursor después.
2. Si se reformatea en cada tecla (`valueChanges` o `(input)`) sin restaurar manualmente `selectionStart`/`selectionEnd` en el elemento nativo después de reescribir el valor, el cursor salta al final del texto en cada pulsación — haciendo imposible editar cualquier posición que no sea la última letra de un valor ya cargado (cada tecla adicional se inserta al final, no donde el usuario apunta).
3. La alternativa simple y robusta: formatear en `(blur)`, no en cada tecla. Mientras el campo tiene foco el usuario edita el texto crudo sin ninguna interferencia; al salir del campo se reordena una sola vez, momento en el que la posición del cursor ya no importa. Cubre el objetivo real ("que quede bien formateado") sin el riesgo de la opción 1.
4. Si de verdad hace falta el formateo en vivo (por ejemplo, mostrar los separadores mientras se escribe un número de tarjeta), hay que calcular explícitamente la nueva posición del cursor contando cuántos caracteres "de datos" (dígitos) había antes del cursor en el valor crudo, encontrar esa misma cantidad de dígitos en el valor ya formateado, y restaurar `input.setSelectionRange(...)` en el input nativo — nunca confiar en que el cursor "se queda solo" después de un `setValue`.
**Errores comunes:** Asumir que `{ emitEvent: false }` evita efectos secundarios visuales — solo evita el re-disparo del observable, nada más. Probar el formateo solo escribiendo en un campo vacío de principio a fin (ahí el cursor siempre está al final, así que el bug no se manifiesta) en vez de probar editando un valor ya cargado, que es el caso real que rompe.
**Checklist:** ¿Se probó editando (no solo escribiendo de cero) un valor ya cargado, insertando/borrando en el medio del texto? ¿El cursor se queda donde el usuario espera después de cada tecla? Si se reformatea en vivo, ¿se restaura explícitamente la posición del cursor?
**Ejemplo en TalentBridge:** BUG-015 — formateo en vivo del teléfono/NIT en `profile.component`/`company-profile.component` (2026-07-17) hacía que el cursor saltara al final en cada tecla, reportado por el usuario como "no me deja cambiarlo". Corregido moviendo el formateo a `(blur)`. Ver `BUGS_AND_FIXES.md` y `CHANGELOG.md`.

---

## 22. `git status` puede revelar trabajo concurrente de otra sesión sobre el mismo repo — no asumir que el árbol de trabajo es estático mientras se trabaja

**Cuándo usarla:** En cualquier tarea larga (varios minutos, varios archivos) donde se corre `git status` más de una vez, o donde ya se corrió al principio y se vuelve a necesitar contexto del árbol de trabajo más adelante.
**Pasos:**
1. Un `git status` limpio (o con un set conocido de archivos) al empezar una tarea **no garantiza que siga así** — si la tarea toma varios minutos, otra sesión (el usuario en un editor, u otro agente) puede estar escribiendo al mismo repo en paralelo. Volver a correr `git status` antes de un build/commit/reporte final, no confiar en la foto del inicio.
2. Si aparecen archivos modificados/nuevos que la sesión actual no tocó, **no asumir que es un error propio** — usar `git diff --stat`/`git diff <archivo>` (solo lectura) para entender qué cambió antes de decidir nada. Si el diff no se solapa con los archivos que la sesión sí está editando (nombres de clase, funciones, símbolos distintos), lo más seguro es dejarlo intacto y seguir, mencionándolo en el reporte final.
3. Señal fuerte de trabajo concurrente real (no un descuido propio): un puerto de desarrollo (`netstat`/`Get-NetTCPConnection`) con conexiones `ESTABLISHED` activas — indica que alguien ya tiene el servidor corriendo y probablemente un navegador abierto en vivo. No lanzar un segundo servidor en el mismo puerto ni asumir que hace falta levantar uno propio para verificar visualmente.
4. En ese escenario, **no usar `git stash`** para comparar un build "antes/después" limpio, aunque sea tentador para aislar el efecto de los propios cambios — un stash puede chocar con un guardado concurrente de la otra sesión justo en ese momento. Preferir métodos no destructivos (leer warnings conocidos en `NEXT_STEPS.md`, razonar sobre el diff propio) en vez de manipular el índice de git mientras hay indicios de edición simultánea.
**Errores comunes:** Correr `git status` una sola vez al principio de una tarea larga y no volver a chequearlo antes del reporte final. Entrar en pánico o intentar "arreglar" cambios ajenos no reconocidos. Usar `git stash`/`git checkout`/`git reset` para investigar mientras hay señales de que otra sesión está escribiendo al mismo árbol de trabajo.
**Checklist:** ¿Se corrió `git status` de nuevo cerca del final de la tarea, no solo al principio? ¿Los archivos inesperados se investigaron con `diff` de solo lectura antes de decidir dejarlos intactos? ¿Hay un puerto de dev server con conexiones activas que sugiera una sesión en vivo? Si sí, ¿se evitaron operaciones destructivas/de stash sobre el árbol de trabajo?
**Ejemplo en TalentBridge:** Durante la Fase 15 (unificación de campos de formulario, 2026-07-17), `git status` al final de la tarea mostró `profile.component.html/ts`, `company-profile.component.html/ts`, `auth/login.component.ts`, `auth/register.component.ts`, dos archivos de `BACKEND/`, y una carpeta nueva `shared/utils/normalize/` modificados/creados — ninguno tocado por esta sesión. El puerto 4200 tenía conexiones `ESTABLISHED` activas (un `ng serve` ya corriendo). Se investigó con `git diff` de solo lectura (confirmó que era la feature de formateo de teléfono/NIT, sin solaparse con los nombres de clase CSS usados en este cambio), se dejó intacto, no se abrió un segundo dev server ni se usó `git stash` para comparar tamaños de bundle antes/después, y se documentó explícitamente en el reporte final.

---

## 23. Separar valor de "almacenamiento" (limpio) de valor de "presentación" (formateado) como dos funciones puras, nunca una sola función que hace ambas cosas

**Cuándo usarla:** Al normalizar cualquier campo que se escribe de una forma pero se muestra de otra — teléfonos, documentos/NIT, montos con separador de miles, porcentajes. En general, cualquier vez que "lo que el usuario ve" y "lo que conviene guardar/enviar a una API" no son literalmente el mismo string.
**Pasos:**
1. Escribir dos funciones puras separadas por campo: `normalizeXStorage(raw) → string/number limpio` (sin símbolos, sin separadores — lo que se persiste y se manda a la API) y `formatXDisplay(stored) → string legible` (con espacios/puntos/símbolo — lo que se muestra en pantalla). Nunca una sola función que devuelve el string puntuado y ese mismo string es lo que se guarda — eso acopla la regla de negocio (el dato) con la regla visual (cómo se ve hoy), y cualquier cambio futuro al formato visual exige migrar datos ya guardados.
2. En el formulario, el mismo `<input>` puede mostrar el valor formateado (vía `formatXDisplay` en `(blur)` o al cargar los datos) sin que el payload que se envía al backend use ese mismo string — al armar el objeto a enviar, pasar el valor del control por `normalizeXStorage` explícitamente, no asumir que "lo que se ve en el campo" es lo que hay que mandar.
3. El backend vuelve a aplicar `normalizeXStorage` (o su espejo en ese lenguaje) antes de persistir, sin importar lo que ya mandó el frontend — nunca confiar en que el cliente ya normalizó.
4. Cualquier otra pantalla que muestre ese mismo dato (una vista pública, un resumen de solo lectura, otra pantalla del mismo módulo) debe pasar el valor guardado por el mismo `formatXDisplay` compartido, no reimplementar su propio formateo ad hoc — si aparece un `.toLocaleString()` o un template string armando el formato a mano en un componente nuevo, es una señal de que se está por duplicar la lógica en vez de reusar la utilidad.
**Errores comunes:** Guardar directamente el string ya formateado (lo que hacía el `phone-format.util.ts` original, ver BUG-015) — funciona hasta que hace falta cambiar el formato visual o consultar el dato desde otro idioma/país. Reimplementar el formateo de presentación en cada pantalla nueva en vez de importar la función compartida (exactamente el patrón `.toLocaleString()` disperso que se encontró y reemplazó en esta misma tarea).
**Checklist:** ¿Existen dos funciones (storage/display) en vez de una sola? ¿El payload que se envía al backend pasa por `normalizeXStorage` antes de armarse, no solo el valor visual del campo? ¿El backend vuelve a normalizar por su cuenta? ¿Toda pantalla que muestra el dato usa la misma función de display, sin reimplementarla?
**Ejemplo en TalentBridge:** Sistema de normalización global (2026-07-17) — `phone.util.ts`/`nit.util.ts` (frontend y su espejo en `libs/common`) con `normalizePhoneStorage`/`formatPhoneDisplay` y `normalizeNitStorage`/`formatNitDisplay` separados. El campo de teléfono en `profile.component` muestra "+57 312 439 2090" pero el valor efectivamente guardado y enviado es "+573124392090". Al reemplazar 5 llamadas sueltas a `.toLocaleString()` (sin locale fijo) por `formatNumberDisplay` compartido se encontró y corrigió BUG-016 (un bug real en la utilidad de parseo que ninguna de las 5 pantallas había expuesto individualmente, porque ninguna probó un monto con más de un punto de miles). Ver `CHANGELOG.md`, `DECISIONS.md` y `BUGS_AND_FIXES.md`.

---

## 24. Integrar un proveedor de LLM compatible con OpenAI (DeepSeek, Groq, etc.) reusando el SDK `openai`, y pedir JSON estructurado en vez de armar tool-calling completo cuando el caso de uso es simple

**Cuándo usarla:** Al integrar un modelo de lenguaje a un backend para reemplazar lógica de reglas fijas (chatbots, scoring, clasificación) — especialmente cuando el proveedor no es OpenAI/Anthropic directamente, pero expone una API "compatible" con el formato de chat completions de OpenAI (DeepSeek, Groq, Together, Mistral, muchos otros la ofrecen así).
**Pasos:**
1. Antes de escribir un cliente HTTP a mano, revisar si el proveedor documenta compatibilidad con el SDK de OpenAI — la mayoría de proveedores "OpenAI-compatible" solo requieren instanciar `new OpenAI({ apiKey, baseURL: '<url-del-proveedor>' })` y todo lo demás (`chat.completions.create`, streaming, `response_format`) funciona igual. Evita escribir y mantener un cliente HTTP propio con sus propios tipos.
2. Centralizar el cliente en un único servicio compartido (en un monorepo de microservicios, en la lib común — `@Global()` para no repetir el wiring de DI en cada servicio que lo necesite), no instanciarlo por separado en cada lugar que lo use.
3. Cuando la respuesta necesita un shape estructurado (no solo texto libre para mostrar), pedir `response_format: { type: 'json_object' }` (soportado por el formato OpenAI-compatible) y que el prompt de sistema especifique EXACTAMENTE la forma del JSON esperado. Esto evita tener que parsear texto libre con regex/heurísticas para extraer la respuesta.
4. Para casos donde el modelo debe "decidir" entre unas pocas acciones predefinidas (mostrar un botón, sugerir una ruta, activar una tarjeta de datos), no es necesario implementar tool-calling/function-calling completo (que requiere un loop de: pedir qué función llamar → ejecutarla → devolver el resultado → pedir la respuesta final). Alcanza con incluir esos campos opcionales en el mismo JSON de una sola llamada, y que el backend valide/sanitice esos campos contra una lista blanca antes de usarlos (nunca confiar en que el modelo solo devuelva rutas/IDs válidos) — mismo principio que nunca confiar en que el frontend ya validó, aplicado a la salida de un modelo.
5. Nunca dejar que el modelo "sepa" datos reales del usuario por su cuenta — pasarlos como contexto explícito en el prompt de sistema (ya calculados por el backend con la fuente de verdad real, ej. una consulta a la base de datos), y que el modelo solo redacte texto y decida acciones a partir de esos datos, nunca que él mismo "recuerde" o infiera números que en realidad vienen de otro lado.
6. Envolver la llamada al modelo en un `try/catch` con una respuesta de fallback amigable — un proveedor de IA externo puede fallar (red, rate limit, clave inválida) y el fallo no debería tumbar la funcionalidad completa, solo degradarla con un mensaje claro.
**Errores comunes:** Asumir que hace falta escribir un cliente HTTP nuevo para "otro proveedor de IA" sin revisar primero si ya es compatible con un SDK existente. Diseñar un loop de tool-calling completo para un caso de uso que en realidad solo necesita 2-3 campos de salida estructurada. Dejar que el modelo devuelva rutas/acciones sin validarlas contra una lista blanca del lado del servidor.
**Checklist:** ¿Se revisó si el proveedor es compatible con un SDK ya instalado antes de escribir un cliente propio? ¿El cliente vive en un único lugar compartido, no duplicado por servicio? ¿Se usó JSON estructurado en vez de parsear texto libre cuando la respuesta tiene un shape fijo? ¿Las acciones/rutas que devuelve el modelo se validan contra una lista blanca antes de usarlas? ¿Hay un fallback si la llamada al modelo falla?
**Ejemplo en TalentBridge:** Integración de IA real en Joaquín y el análisis de CV (2026-07-17) — `DeepSeekService` en `libs/common` reusa el SDK `openai` apuntado a `https://api.deepseek.com` (DeepSeek es compatible con el formato OpenAI). Joaquín pide `{reply, actions?, showProfileCard?}` en una sola llamada JSON en vez de tool-calling completo; las rutas de `actions` se validan contra una lista blanca fija por rol antes de devolverlas al frontend; los datos reales (`getCandidateStats`/`getCompanyStats`) se calculan con Prisma y se pasan como contexto, nunca los "sabe" el modelo por su cuenta. Ver `CHANGELOG.md` y `DECISIONS.md`.
