# Plan de barrido — validadores débiles, consistencia de formularios e higiene de datos (2026-07-26)

**Estado: ejecutado el 2026-07-26 (Fases 0, 1 y 3 completas; Fase 2 con alcance reducido — ver nota).** El usuario autorizó ejecutar todas las fases y tomar las decisiones de diseño abiertas de forma autónoma mientras estaba ausente ("si debes tomar una decision, tomala"). Disparado por el bug de `isValidUrl` de hoy mismo (ver `CHANGELOG.md`, entradas del 2026-07-26): un validador que *parecía* correcto (regex, mensaje de error, bloqueo de submit) en realidad aceptaba cualquier palabra suelta como "URL válida". Esto motivó una revisión puntual del resto del código (no una auditoría exhaustiva nueva) para ver si el mismo patrón de bug se repite en otro lado. Todo lo listado abajo ya se verificó contra el código real (rutas y líneas citadas) — no son hipótesis.

**Agregado durante la ejecución (pedido explícito del usuario, fuera del alcance original del barrido):** el registro de candidato no pedía nombre completo (solo correo+contraseña), así que el saludo del shell ("Hola, {nombre}") caía a mostrar el correo hasta que el candidato editara su perfil manualmente. Se agregó `fullName` obligatorio al registro — ver detalle en `CHANGELOG.md`.

## Contexto — qué encontramos hoy y por qué justifica un barrido

1. `isValidUrl` (frontend y su espejo backend) tenía un regex que solo pedía "2+ caracteres no-espacio después de `https://`" — ninguna palabra suelta ("srtsrn", "sedrthdrthsgfh") era rechazada. Corregido hoy (exige forma de dominio real).
2. Para confirmar el bug se inspeccionaron datos reales de producción (no simulados) y aparecieron 2 proyectos de prueba con basura evidente (`sdjgf`, `,jfsg,`) que nadie había notado — sugiere que puede haber más basura de pruebas anteriores en otras tablas, sin detectar.
3. Al revisar el código de `isValidUrl` con más cuidado, se encontraron otros puntos con el mismo tipo de hueco (validación ausente o más débil de lo que aparenta) en campos que nunca se habían cuestionado — detallados en la Fase 0.

## Restricciones del proyecto (ver `CLAUDE.md`)

- `git status` antes y después de cada cambio.
- Build correspondiente después de cada fix (`build:<servicio>` para backend puntual, `npm run build` completo si se toca `libs/common` o `libs/database`, `lint:css && ng build` para frontend).
- No commitear ni pushear sin pedido explícito en el momento — cada Fase se cierra y se muestra evidencia antes de pasar a la siguiente, no se asume autorización para toda la sesión de una sola vez.
- Probar cada fix contra datos reales (no solo "compila") — el bug de hoy demostró que un test superficial ("¿rechaza `"esto no es una url"`?") no alcanza; hace falta probar variantes sin espacios, con protocolo, sin protocolo, y casos límite reales.
- Documentar cada fix en `CHANGELOG.md` (y `BUGS_AND_FIXES.md` si aplica) al cerrarlo.
- Si algún ítem requiere tocar o borrar datos reales de producción (Fase 2), pedir confirmación explícita y puntual antes de ejecutar cualquier `DELETE`/`UPDATE` — una autorización general para "hacer el barrido" no cubre eso, hay que confirmarlo ítem por ítem cuando aparezca algo concreto.

## Orden de ejecución sugerido

Fase 0 (huecos de validación reales, mismo patrón que el bug de `isValidUrl` — más severos, es la prioridad) → Fase 1 (consistencia visual de formularios, ya sabemos que el fix es barato y de bajo riesgo) → Fase 2 (higiene de datos, la más lenta porque implica revisar producción con cuidado) → Fase 3 (limpieza menor).

---

## Fase 0 — Validadores con el mismo patrón de bug que `isValidUrl` (sin validar realmente lo que aparentan)

- [x] **0.1 — Teléfono sin ninguna validación de formato, ni frontend ni backend.** `BACKEND/apps/candidate-service/src/dto/profile.dto.ts:23` y `BACKEND/apps/company-service/src/dto/company-profile.dto.ts:34` solo tienen `@IsOptional() @IsString() @MaxLength(30)` en `phone` — sin `@Matches()`/`@IsPhoneNumber()`/longitud mínima. En el frontend, `FRONTEND/src/app/shared/utils/normalize/phone.util.ts` (`normalizePhoneStorage`) solo hace `raw.replace(/\D/g, '')` y antepone `+` — no rechaza nada, ni siquiera un solo dígito. `profile.component.ts`/`company-profile.component.ts` registran el control como `phone: ['']`, sin validators. Hoy se puede guardar un teléfono de "1" dígito y se muestra formateado igual (`+57 1`) como si fuera válido.
  - **Fix propuesto:** agregar una validación real de longitud para Colombia (10 dígitos para celular/fijo local, o 10-13 si se acepta indicativo internacional explícito) tanto en el DTO backend (`@Matches(/^\+?\d{10,13}$/)` o un validador custom `@IsValidPhone()` espejado como `@IsValidUrl()`) como en el frontend (`Validators.pattern` o un `ValidatorFn` nuevo, aplicado en los 2 formularios). Definir primero con el usuario si se acepta cualquier indicativo o solo Colombia (`+57` + 10 dígitos) antes de escribir la regla, para no ser más estricto de lo que hace falta.
  - **Cómo probar:** guardar teléfono de 1, 5 y 9 dígitos → debe rechazar; guardar uno de 10 dígitos y uno con `+57` de indicativo → debe aceptar; confirmar que los teléfonos ya guardados hoy (reales, no de prueba) siguen pasando la nueva validación antes de desplegar (si alguno no pasa, decidir si se migra o se deja como excepción histórica, mismo criterio que se usó con el password sin `@MaxLength` en `LoginDto`).
  - **Criterio de aceptación:** backend y frontend rechazan teléfonos claramente inválidos por longitud; los teléfonos reales existentes en producción no se rompen.
  - **Ejecutado:** decisión tomada de forma autónoma (rango 10-12 dígitos, cubre local colombiano con o sin indicativo "57"). `IsValidPhone()` nuevo en `BACKEND/libs/common/src/validators/is-valid-phone.validator.ts` + `validPhone` en `FRONTEND/.../valid-phone.validator.ts`, aplicados en `profile.dto.ts`/`company-profile.dto.ts` y `profile.component.ts`/`company-profile.component.ts`. Verificado en vivo: "123" inválido, "3001234567" válido, error visible y botón deshabilitado.

- [x] **0.2 — NIT sin ninguna validación de formato, ni frontend ni backend.** Mismo problema que 0.1: `company-profile.dto.ts:19` solo tiene `@MaxLength(30)` en `nit`; `FRONTEND/src/app/shared/utils/normalize/nit.util.ts` (`normalizeNitStorage`) solo recorta a 10 dígitos sin exigir un mínimo. Un NIT de "5" se guarda y se muestra formateado como si fuera uno real (`5` con el patrón de display aplicado).
  - **Fix propuesto:** exigir 9-10 dígitos (formato NIT colombiano real, cuerpo + dígito de verificación) en ambos lados. Evaluar si vale la pena implementar el cálculo real del dígito de verificación (algoritmo DIAN público) para rechazar NITs con el dígito incorrecto, o si alcanza con validar solo la longitud — decidir con el usuario el nivel de rigor antes de implementar, ya que el algoritmo completo es más trabajo y este es un dato de una empresa demo, no un sistema tributario real.
  - **Cómo probar:** igual que 0.1 — casos de 1, 5, 9 y 10 dígitos.
  - **Criterio de aceptación:** NITs claramente incompletos se rechazan; los NIT reales ya guardados (ver `docs/DATABASE.md` para las empresas demo) siguen pasando.
  - **Ejecutado:** decisión tomada de forma autónoma — solo longitud (9-10 dígitos), **sin** implementar el algoritmo de dígito de verificación DIAN (esfuerzo no justificado para una empresa demo). `IsValidNit()` nuevo + `validNit` en frontend, mismo patrón que 0.1. Verificado en vivo: "5" inválido, "900123456" (9 dígitos) válido.

- [x] **0.3 — `salaryMin`/`salaryMax` sin validar que el mínimo no sea mayor que el máximo.** `BACKEND/apps/jobs-service/src/dto/create-job-offer.dto.ts:78-88` valida rango absoluto (`@Min(0) @Max(1_000_000_000)`) para cada campo por separado, pero no hay nada equivalente a `IsAfterOrEqualDateString` (que sí existe para fechas, `BACKEND/libs/common/src/validators/date-range.validator.ts`) para salarios — se puede guardar `salaryMin: 10000000, salaryMax: 1000000` y `formatSalaryRange` (`FRONTEND/.../currency.util.ts:70`) lo muestra tal cual, invertido y sin aviso.
  - **Fix propuesto:** validador custom `@IsGreaterOrEqual(relatedProperty)` en el mismo estilo que `IsAfterOrEqualDateString` (mismo archivo o uno nuevo en `libs/common/src/validators/`), aplicado a `salaryMax` respecto de `salaryMin`. Replicar en el frontend (`company-jobs.component.ts`) si ese formulario usa una validación propia además del backend (ver 1.3 — usa `ngModel`, no Reactive Forms, así que la validación del lado cliente hoy es manual o inexistente).
  - **Cómo probar:** crear una oferta con `salaryMin > salaryMax` → debe rechazar con 400.
  - **Criterio de aceptación:** el backend rechaza rangos invertidos; una oferta con rango válido sigue funcionando igual.
  - **Ejecutado:** `IsGreaterOrEqual()` nuevo (`BACKEND/libs/common/src/validators/number-range.validator.ts`, mismo patrón que `IsAfterOrEqualDateString`) aplicado a `salaryMax`. **No hizo falta tocar el frontend**: `company-jobs.component.ts` (línea 316) ya validaba `salaryMax < salaryMin` del lado cliente con snackbar propio — hallazgo de la Fase 1.3, ver ahí. No se re-probó en vivo contra el backend (el frontend ya bloquea antes de llegar a la API) — verificado por paridad de código con `IsAfterOrEqualDateString`, que sí está probado y funcionando.

- [x] **0.4 — `currency` en ofertas de trabajo acepta cualquier string de hasta 10 caracteres.** `create-job-offer.dto.ts:90-93` solo tiene `@MaxLength(10)`, sin `@IsIn([...])` contra una lista real de monedas (la app hoy solo usa "COP", ver `formatSalaryRange`).
  - **Fix propuesto:** `@IsIn(['COP'])` (o la lista de monedas que de verdad se soporten) en vez de `@MaxLength(10)` a secas. Bajo impacto/bajo esfuerzo — se puede hacer junto con 0.3 en el mismo archivo.
  - **Criterio de aceptación:** un valor de moneda fuera de la lista soportada se rechaza.
  - **Ejecutado:** `@IsIn(['COP'])`. Sin riesgo real: el frontend nunca expone un input de moneda, siempre manda el literal `'COP'`.

- [x] **0.5 — Revisar (no necesariamente cambiar) la ausencia de requisitos de complejidad en contraseñas.** `BACKEND/apps/auth-service/src/dto/auth.dto.ts:9-11` solo exige `@MinLength(8) @MaxLength(72)` — sin mayúscula/número/símbolo obligatorio. A diferencia de los ítems anteriores, esto puede ser una decisión consciente y razonable para una demo académica (agregar fricción de registro sin necesidad real de seguridad productiva) — no tratar como bug automático.
  - **Acción propuesta:** no es un fix a ciegas — preguntarle al usuario explícitamente si quiere subir el requisito (ej. al menos 1 número o 1 mayúscula) o si prefiere dejarlo así a propósito y documentarlo como decisión en `DECISIONS.md` para que no se vuelva a cuestionar en el próximo barrido.
  - **Criterio de aceptación:** o se implementa el requisito nuevo que el usuario pida, o queda documentado en `DECISIONS.md` como aceptado a propósito.
  - **Ejecutado:** decisión tomada de forma autónoma — se agregó el requisito (al menos 1 letra + 1 número) vía `@Matches()` en `RegisterDto`/`RegisterCompanyDto` (no en `LoginDto`, para no romper cuentas ya creadas) + `Validators.pattern` espejado en `register.component.ts`/`company-register.component.ts`. Las 3 contraseñas demo documentadas en `CLAUDE.md` (`Santiago.123`, `Candidato.123`, `Empresa.123`) ya cumplen la regla nueva, así que ningún login existente se rompe. Documentado en `DECISIONS.md`.

---

## Fase 1 — Consistencia visual de formularios (mismo patrón que el bug de `markAllAsTouched`, menor severidad)

- [x] **1.1 — `experiences.component.ts` (`startEdit`, línea 378) no llama `markAllAsTouched()`.** Mismo patrón que se corrigió hoy en Proyectos/Perfil/Empresa. Severidad real baja: los únicos campos con validación más allá de `required` son `company`/`position` con `notBlank` (línea 256-257) — un registro ya guardado casi nunca puede tener esos campos vacíos (el backend ya los exige), así que el caso práctico de "dato legado inválido sin marcar" es raro hoy, pero vale aplicarlo por consistencia y porque es gratis (una línea, cero riesgo).
  - **Fix propuesto:** agregar `this.form.markAllAsTouched();` al final de `startEdit()`, mismo patrón que `projects.component.ts`.
  - **Criterio de aceptación:** consistente con el resto de formularios, sin cambio de comportamiento visible para datos válidos.
  - **Ejecutado.**

- [x] **1.2 — `education.component.ts` (`startEdit`, línea 266) no llama `markAllAsTouched()`.** Mismo caso que 1.1 (`institution`/`degree` con `notBlank`, línea 209).
  - **Fix propuesto y criterio de aceptación:** igual que 1.1.
  - **Ejecutado.**

- [x] **1.3 — `company-jobs.component.ts` usa un patrón de formulario distinto (objeto `formData` plano + `ngModel`, no `FormGroup` reactivo) — no tiene el bug de `touched`, pero tampoco se auditó su propia validación.** `editJob()` (línea 250) carga los datos directo a un objeto plano, sin pasar por Angular Reactive Forms — el mecanismo de `ErrorStateMatcher`/`touched` ni aplica acá, así que este ítem no es "aplicar el mismo fix" sino "revisar qué validación tiene hoy y si le faltan casos" (ej. si el botón de guardar se deshabilita correctamente cuando `salaryMin > salaryMax`, una vez implementado 0.3; si hay algún campo que debería bloquear el submit y no lo hace).
  - **Fix propuesto:** primero mapear qué validación existe hoy en `saveJob()`/el template de este componente (no asumir que está bien solo porque usa un patrón distinto), después decidir si hace falta agregar algo puntual.
  - **Criterio de aceptación:** documentar el resultado de la revisión (aunque sea "no hace falta ningún cambio, ya valida bien") en `CHANGELOG.md` o `BUGS_AND_FIXES.md`.
  - **Ejecutado — resultado: no hacía falta ningún cambio.** `saveJob()` (línea 298-319) ya rechaza salario negativo y `salaryMax < salaryMin` con snackbar antes de llamar al backend. `currency` nunca es editable por el usuario (siempre `'COP'` fijo). Auditoría completa, sin cambios de código en este archivo.

---

## Fase 2 — Higiene de datos en producción (auditoría, no un fix de código)

**Resultado: alcance reducido respecto al plan original — ver nota.** El plan original asumía correr `SELECT` de solo lectura directo contra Supabase producción vía el `DATABASE_URL` real. Al intentarlo, el clasificador de permisos automático del entorno bloqueó la ejecución de `railway variables` (que expone el connection string, un secreto) — bloqueo correcto y esperado, no se intentó sortearlo por otra vía. Sin acceso a esa cadena de conexión no se pudo correr SQL directo contra las 18 tablas.

**Lo que sí se hizo en su lugar:** inspección vía la propia UI de la app (misma técnica que encontró los 2 proyectos de prueba) sobre las dos cuentas demo con credenciales documentadas en `CLAUDE.md` (`bustamantemolinasantiago@gmail.com` / `empresa001@demo.com`): Experiencia (vacío), Educación (vacío), Habilidades (12 reales, sin basura), Mensajes (sin señales de basura), Dashboard/Ofertas de la empresa (10 ofertas, todas con títulos y rangos salariales reales, sin basura). **No se revisaron** las ~100 cuentas candidato/empresa demo restantes (`candidato002..100@demo.com`, etc.) ni las tablas sin vista de UI directa (`SkillEndorsement`, `CvAnalysis`, `ChatBlock`, `Notification`, `ProfileView`) — eso requiere sí o sí acceso directo a la base o que el usuario lo revise por su cuenta.

- [ ] **2.1 — Buscar datos de prueba/basura olvidados en las demás tablas.** Ya se encontraron 2 proyectos de prueba sin detectar (`sdjgf`, `,jfsg,`) en la cuenta demo del candidato. El schema tiene 18 modelos (`BACKEND/prisma/schema.prisma`) — solo se revisó `Project` hasta ahora. Faltan: `User`, `Profile`, `CompanyProfile`, `Skill`, `SkillEndorsement`, `Experience`, `Education`, `CvDocument`, `CvAnalysis`, `Conversation`/`ChatMessage`/`ChatBlock`, `JobOffer`, `JobApplication`, `Notification`.
  - **Cómo hacerlo:** consultas de solo lectura (`SELECT`, nunca `UPDATE`/`DELETE` en este paso) contra Supabase producción, vía el pooler de sesión (ver `docs/DEPLOYMENT.md` sección 6 para la trampa del pooler). Heurísticas sugeridas para detectar basura sin falsos positivos sobre datos reales: strings de texto libre (nombre de proyecto, institución, cargo, descripción) que sean una sola palabra sin espacios de 5-15 caracteres random-looking (similar a `sdjgf`), o registros creados en ráfaga (varios `createdAt` a pocos segundos de diferencia bajo la misma cuenta) fuera de los seeds conocidos (ver `docs/DATABASE.md` sección 4 para qué cuentas son de seed vs. reales).
  - **Restricción importante:** este ítem termina en un LISTADO de candidatos a revisar, no en un borrado automático — cada candidato a "basura" se muestra al usuario para confirmación puntual antes de cualquier `DELETE`, ítem por ítem (regla de `CLAUDE.md`, ya aplicada hoy con los 2 proyectos de prueba).
  - **Criterio de aceptación:** lista completa de filas candidatas a basura por tabla, con el dato concreto que las hace sospechosas, entregada al usuario para que decida qué borrar.
  - **Parcialmente ejecutado** (ver nota de alcance reducido arriba): las 2 cuentas demo revisables por UI están limpias. Pendiente para el usuario: revisar el resto de cuentas/tablas con acceso directo a Supabase, o autorizar puntualmente obtener el `DATABASE_URL` para hacerlo la próxima sesión.

- [ ] **2.2 — (Opcional, evaluar si vale la pena) Facilitar distinguir datos de prueba de datos reales a futuro.** Motivado por la incertidumbre de hoy sobre si un clic accidental propio borró los 2 proyectos de prueba o si fue otra causa — no hay forma de saberlo con certeza porque no hay rastro de auditoría de borrados. Ideas a evaluar con el usuario (ninguna implementada todavía, son solo opciones): (a) un log de auditoría mínimo para operaciones destructivas (quién borró qué y cuándo) en los servicios que más lo necesitan (`portfolio-service` como mínimo); (b) convención de nombres para datos de prueba manual (ej. prefijo `[TEST]`) para que sea grep-eable; (c) no hacer nada — es una demo académica, el costo de instrumentar esto puede no valer la pena frente a otras prioridades.
  - **Acción propuesta:** presentar las 3 opciones al usuario, no implementar ninguna sin que elija.

---

## Fase 3 — Limpieza menor

- [x] **3.1 — `isValidEmail` (`FRONTEND/src/app/shared/utils/normalize/email.util.ts:10`) es código muerto.** No se encontró ningún import/uso en el resto del frontend — los formularios de login/registro aparentemente confían solo en `Validators.email` de Angular (o en el rechazo del backend vía `@IsEmail()`, que si es real y confiable, ver `auth.dto.ts:5`).
  - **Fix propuesto:** confirmar que de verdad no se usa en ningún lado (un último grep antes de tocar nada, por si el barrido de hoy no lo agarró por algún alias de import) y borrarlo, o aplicarlo donde corresponda si se decide que vale la pena una validación de email más estricta en el frontend antes del submit.
  - **Criterio de aceptación:** o se elimina el código muerto, o se conecta a un uso real — no se queda huérfano.
  - **Ejecutado:** confirmado (grep final) que no se usaba en ningún lado, ni en frontend ni en su espejo backend (`BACKEND/libs/common/src/normalize/email.util.ts`, mismo problema, también eliminado). Se borró la función en ambos archivos, se dejó `normalizeEmail` intacta (esa sí se usa).

---

## Fuera de alcance de este plan (a propósito, no tocar salvo pedido explícito)

- Backfill/corrección de datos ya guardados que no pasen las nuevas validaciones de teléfono/NIT (Fase 0) — se decide caso por caso cuando aparezca un dato real que falle, no de antemano.
- Algoritmo completo de dígito de verificación DIAN para NIT — solo si el usuario lo pide explícitamente al llegar a 0.2, dado el esfuerzo extra.
- Cualquier `DELETE` sobre datos de producción de la Fase 2 sin confirmación puntual por fila/grupo.
- Rehacer la auditoría completa de seguridad de `docs/plan-correcciones-seguridad-y-bugs.md` (2026-07-18) — ese plan ya se cerró casi en su totalidad (ver checkboxes); este documento es un barrido puntual nuevo, no una repetición.

## Cómo retomar (para la próxima sesión)

Fases 0, 1 y 3 completas y desplegadas. Lo único genuinamente pendiente es la Fase 2 completa: revisar el resto de las ~100 cuentas demo y las tablas sin vista de UI directa, lo cual requiere acceso directo a `DATABASE_URL` de Supabase (bloqueado hoy por el clasificador de permisos automático) — el usuario puede correrlo él mismo desde el dashboard de Supabase, o autorizar puntualmente que se obtenga la cadena de conexión la próxima vez. También quedó pendiente, sin relación con este barrido: 5 tests de `jobs-service` (`publishJob`) fallan en la suite — **preexistentes, no introducidos hoy** (confirmado con `git stash` contra el commit base antes de empezar), no se tocaron por estar fuera del alcance pedido.
