# Dificultades y soluciones — TalentBridge V3

Documento de auditoría técnica. Cada dificultad listada abajo está respaldada por evidencia verificable del repositorio: entradas de `docs/CHANGELOG.md`, `docs/DECISIONS.md`, `docs/BUGS_AND_FIXES.md`, o commits reales (`git log`). No se incluyó ninguna dificultad hipotética ni inferida — todo lo que sigue ocurrió y quedó documentado en el proyecto.

Búsqueda de comentarios `TODO`/`FIXME`/`HACK` en `BACKEND/` y `FRONTEND/src/`: un único resultado, en `BACKEND/libs/common/src/ai/deepseek.service.ts` línea 15 — es la palabra española "TODOS" dentro de un comentario JSDoc ("Nest instancia este provider en TODOS los microservicios al arrancar"), no un marcador de tarea pendiente. No se encontraron TODOs/FIXMEs reales sin resolver en el código.

Commits relevantes (`git log --oneline`, 10 en total desde el commit inicial):

```
e4be860 Fix login failing in browsers that block cross-domain cookies
5764dac Add JSDoc comments across the whole codebase, fix mobile responsiveness app-wide, and unify brand color to a single teal
1582216 Point frontend at the new Render backend + document the Railway->Render deploy
6ebd981 Add DATABASE_URL to api-gateway env vars in Render Blueprint
10fc990 Switch internal services to type web (pserv unavailable on free plan)
bd59124 Add Render Blueprint for backend deployment
cc40d03 Fix container networking for cloud deploys and lazy-init DeepSeek client
730a506 Global data normalization, real AI for Joaquin/CV analysis, and deploy config
5a2f6ec Frontend UX overhaul, skills matching/endorsements, and data fixes
9bfbda8 Initial commit TalentBridge V3 (microservicios funcionales hasta el final de la version 1)
```

Nota sobre fechas vs. commits: por regla acordada con el usuario (`NEXT_STEPS.md` #11, "un solo commit al final de todo el plan UX"), el trabajo de varias fechas de `CHANGELOG.md` (2026-07-16 y 2026-07-17 hasta el rediseño de habilidades) se commiteó junto en un solo commit (`5a2f6ec`, con fecha de commit 2026-07-17). Donde el commit exacto no puede aislarse por bug individual, se cita el commit consolidado que lo contiene.

---

## Infraestructura y deploy

### Dificultad 1: Login fallaba silenciosamente en navegadores que bloquean cookies cross-domain

**Problema:** Tras el deploy público (frontend en Vercel, backend en Render — dominios distintos), el usuario reportó "no me deja logearme": la app mostraba "No pudimos cargar tu información. Recarga la página." y volvía inmediatamente al login.
**Impacto:** Bloqueaba el acceso completo a la aplicación para cualquier usuario cuyo navegador bloqueara cookies de terceros (Safari con ITP activado por defecto, Chrome/Firefox con protección estricta de cookies, algunos navegadores in-app) — el escenario más grave encontrado en todo el proyecto porque impedía usar la demo en producción.
**Causa raíz:** La app autenticaba exclusivamente con una cookie HttpOnly `SameSite=None` (necesaria porque frontend y backend viven en dominios completamente distintos). El login respondía 200/201 sin error visible, pero el navegador nunca guardaba la cookie; el siguiente request (cargar el dashboard) salía sin sesión, el backend respondía 401, y el interceptor forzaba un logout automático.
**Evidencia:**
- Archivo: `BACKEND/apps/auth-service/src/auth.controller.ts`, `BACKEND/apps/chat-service/src/chat.gateway.ts`, `FRONTEND/src/app/core/auth/auth.service.ts`, `FRONTEND/src/app/core/interceptors/auth.interceptor.ts`, `FRONTEND/src/app/core/services/chat-socket.service.ts`
- Commit: `e4be860` ("Fix login failing in browsers that block cross-domain cookies")
- Referencia: `docs/CHANGELOG.md`, entrada "2026-07-18 (continuación) — Bug real y grave: el login no funcionaba en el navegador del usuario (cookie cross-domain bloqueada)"; `docs/DECISIONS.md`, "Sesión con cookie + JWT en localStorage en paralelo, no cookie sola ni JWT solo"
**Solución implementada:** Se agregó un segundo mecanismo de sesión en paralelo: JWT devuelto en el body de login/registro, guardado en `localStorage` del frontend, enviado como header `Authorization: Bearer` en cada request. La cookie se mantuvo (sigue funcionando en navegadores sin bloqueo). No hizo falta tocar CORS ni la estrategia JWT del backend — `JwtStrategy` ya tenía `ExtractJwt.fromAuthHeaderAsBearerToken()` como extractor de respaldo, y el gateway ya reenviaba el header `Authorization`, trabajo de una sesión anterior que había quedado sin conectar del lado frontend. Mismo fix aplicado al handshake del WebSocket de chat.
**Resultado:** Verificado con `fetch` directo simulando cookie bloqueada (sigue funcionando vía token) y con el flujo real de login en el navegador de verificación. No se pudo reproducir el bloqueo exacto del navegador del usuario ("Otro", sin especificar cuál) en el entorno de la sesión.
**Estado actual:** Solucionado (para la causa raíz conocida y documentada; si el usuario reporta el mismo síntoma en otro navegador, sería una causa distinta a investigar).
**Prevención:** El trade-off aceptado es que un JWT en `localStorage` es accesible por JS (a diferencia de la cookie HttpOnly) — riesgo mayor ante una eventual vulnerabilidad XSS, aceptado conscientemente para que la demo funcione. Documentado como pendiente futuro: usar un dominio propio compartido entre frontend/backend (ej. `app.talentbridge.com`/`api.talentbridge.com`) eliminaría la necesidad de este mecanismo dual.

---

### Dificultad 2: Deploy en Railway con error 502 persistente e irreproducible

**Problema:** Al intentar desplegar el backend (10 microservicios) en Railway, los 10 servicios devolvían `502 Application failed to respond` de forma persistente.
**Impacto:** Bloqueaba por completo la primera puesta en público del proyecto, con urgencia declarada por el usuario ("necesito activarlo solo para mostrar que funciona").
**Causa raíz:** No se pudo determinar con certeza — se agotaron las hipótesis de causa de aplicación (se probó forzar bind `0.0.0.0`, 3 regiones distintas, recrear el servicio, recrear el proyecto entero con token nuevo, y hasta un servidor Node mínimo sin NestJS dio el mismo 502). Se concluyó que era un problema de infraestructura ligado a la cuenta de Railway, sin poder confirmar la causa exacta del lado de Railway.
**Evidencia:**
- Referencia: `docs/CHANGELOG.md`, entrada "2026-07-18 — Deploy público: migración de Railway a Render"; `docs/DECISIONS.md`, "Backend público: Render (URLs públicas entre servicios) en vez de Railway o networking privado"
**Solución implementada:** Se abandonó Railway y se migró el backend a Render (ver Dificultad 3). Se descartó también Google Cloud Run por requerir prepago con activación de crédito de hasta 24h, incompatible con la urgencia del pedido. Se redactó un mensaje de soporte/reembolso para Railway, entregado al usuario (no enviado por el agente, corresponde al usuario decidir).
**Resultado:** Deploy funcional en Render, verificado end-to-end contra la URL pública real.
**Estado actual:** Solucionado (mediante cambio de proveedor, no de causa raíz identificada en Railway).
**Prevención:** No se encontró evidencia suficiente en el repositorio para confirmar la causa exacta del 502 en Railway — el diagnóstico quedó documentado como "problema de infraestructura de la cuenta", sin confirmación de causa raíz de parte de Railway.

---

### Dificultad 3: Networking privado de Render no resolvía DNS interno entre microservicios

**Problema:** El gateway intentaba comunicarse con los otros 9 servicios por hostname interno (`http://auth-service:3001`, convención estándar de Railway) — en Render esto devolvía `fetch failed`.
**Impacto:** El API Gateway no podía enrutar ninguna llamada a los microservicios internos tras el deploy en Render, dejando el backend completo inoperativo pese a que los 10 servicios individuales estaban `live`.
**Causa raíz:** El DNS interno de Render no resuelve el hostname para servicios `web_service` creados directo por API (a diferencia de Railway). No se investigó a fondo si el problema es específico de servicios creados por API cruda (vs. vía Blueprint) o si requiere agrupación explícita en un "Environment" de Render — quedó fuera de alcance por límite de tiempo.
**Evidencia:**
- Archivo: `render.yaml`, variables `*_SERVICE_URL` de `api-gateway`
- Commit: `1582216` ("Point frontend at the new Render backend + document the Railway->Render deploy"), relacionado también `bd59124`/`10fc990`/`cc40d03`
- Referencia: `docs/DECISIONS.md`, "Backend público: Render (URLs públicas entre servicios) en vez de Railway o networking privado"
**Solución implementada:** Se cambiaron las variables `*_SERVICE_URL` del gateway de `http://<servicio>:<puerto>` a las URLs públicas HTTPS de cada servicio (`https://auth-service-99od.onrender.com`, etc.). Viable sin riesgo adicional real porque el plan free de Render no soporta `pserv` (servicios privados) — los 10 servicios ya eran públicos de todas formas.
**Resultado:** Backend funcional end-to-end, verificado con login real y carga de datos reales de Supabase a través del gateway.
**Estado actual:** Solucionado parcialmente — funciona, pero mediante un workaround (URLs públicas) documentado explícitamente como no ideal, no por resolver la causa raíz del DNS interno.
**Prevención:** Cada llamada gateway→servicio sale a internet y vuelve a entrar, en vez de quedarse en la red privada — latencia extra despreciable para el volumen de esta demo académica, pero no es el patrón recomendado si el tráfico creciera. `DECISIONS.md` deja anotado cómo revertir si se resuelve la causa del DNS interno en el futuro (agrupar servicios en un "Environment" de Render o recrearlos vía Blueprint en vez de API cruda).

---

### Dificultad 4: Colisión de nombres en Render por Blueprints fallidos, y healthcheck del gateway degradado por falta de `DATABASE_URL`

**Problema:** El primer y segundo intento de desplegar el Blueprint de Render fallaron y generaron nombres de servicio con sufijo aleatorio (el intento fallido anterior ya había reservado los nombres limpios). Por separado, `api-gateway` reportaba `database: disconnected` en su healthcheck.
**Impacto:** Bloqueaba tener los 10 servicios con nombres y URLs predecibles/limpias; el healthcheck degradado del gateway podía confundirse con un problema real de conectividad a la base.
**Causa raíz:** (1) Reintentos de Blueprint sobre un intento previo fallido que ya había reservado los nombres. (2) `PrismaModule` es `@Global()` — mismo patrón que causó el bug de `DeepSeekService` (ver Dificultad 6) — por lo que `api-gateway` necesita su propio `DATABASE_URL` aunque no lo use para lógica de negocio.
**Evidencia:**
- Archivo: `render.yaml`
- Commit: `6ebd981` ("Add DATABASE_URL to api-gateway env vars in Render Blueprint"), `10fc990` ("Switch internal services to type web (pserv unavailable on free plan)")
- Referencia: `docs/CHANGELOG.md`, entrada "2026-07-18 — Deploy público: migración de Railway a Render"
**Solución implementada:** Se borraron manualmente 2 Blueprints y 19 servicios sueltos vía API de Render (con confirmación explícita del usuario) y se crearon los 10 servicios directo por `POST /v1/services` con nombres exactos, sin pasar por el flujo de Blueprint. Se agregó `DATABASE_URL` a las variables de entorno de `api-gateway`.
**Resultado:** 10 servicios `live` con nombres predecibles, healthcheck del gateway reportando `connected`.
**Estado actual:** Solucionado.
**Prevención:** `render.yaml` documenta la configuración pero los servicios reales se ajustaron por API directa — si se vuelve a sincronizar un Blueprint desde ese archivo, hay que revisar que no reintroduzca las URLs internas rotas (documentado en `CHANGELOG.md` como pendiente a vigilar).

---

### Dificultad 5: Servicios backend sin `DEEPSEEK_API_KEY` crasheaban al arrancar

**Problema:** `DeepSeekService` se instanciaba en el constructor, pero al ser provisto por `CommonModule` (`@Global()`), Nest lo instancia en TODOS los microservicios al arrancar — no solo en `assistant-service`/`portfolio-service`, que son los únicos con `DEEPSEEK_API_KEY` configurada.
**Impacto:** Servicios sin esa variable de entorno (la mayoría de los 10) fallaban al iniciar en el entorno de deploy.
**Causa raíz:** Instanciación eager del cliente OpenAI/DeepSeek en el constructor del servicio global, sin considerar que no todos los consumidores del módulo global tienen la variable necesaria.
**Evidencia:**
- Archivo: `BACKEND/libs/common/src/ai/deepseek.service.ts`
- Commit: `cc40d03` ("Fix container networking for cloud deploys and lazy-init DeepSeek client")
**Solución implementada:** El cliente OpenAI se crea de forma diferida (lazy init) en el primer uso real (`chatJson`/`chatText`), no en el constructor.
**Resultado:** Los servicios sin la variable configurada arrancan sin error; el cliente solo se crea (y solo fallaría) cuando algo intenta usarlo de verdad.
**Estado actual:** Solucionado.
**Prevención:** Documentado en el propio JSDoc del archivo (`BACKEND/libs/common/src/ai/deepseek.service.ts`, líneas 13-17) el motivo de la instanciación diferida, para que quede claro por qué no se hace en el constructor si alguien vuelve a tocar ese archivo.

---

## Backend y datos

### Dificultad 6: Historial de migraciones de Prisma desalineado con la base real (drift)

**Problema:** Al intentar agregar el modelo `SkillEndorsement` con `npx prisma migrate dev`, Prisma detectó que el historial de migraciones (3 migraciones, la última `20260617053007_improve_candidate_profile_phase1`) estaba desalineado con el estado real de la base, y pidió un reset completo del schema público ("All data will be lost") para continuar.
**Impacto:** Alto potencial de pérdida de datos — hubiera borrado 162 usuarios, 68 ofertas y 949 habilidades reales de la base de desarrollo si se hubiera aceptado el reset sin cuestionarlo.
**Causa raíz:** Cambios de schema de sesiones anteriores (columnas como `skills.normalized_name`, `job_offers.customContractType`/`workload`) se habían aplicado con `db push` o SQL manual en vez de migraciones formales, dejando el historial de `prisma/migrations/` sin reflejar el estado real de la base.
**Evidencia:**
- Archivo: `BACKEND/prisma/migrations/` (historial), `BACKEND/prisma/schema.prisma`
- Referencia: `docs/DECISIONS.md`, "`prisma migrate dev` no es seguro en este proyecto — usar `db push` para cambios de schema aditivos" (2026-07-17)
**Solución implementada:** Se abortó el reset y se usó `npx prisma db push`, que sincroniza el schema contra la base real sin depender del historial de migraciones, aplicando solo la diferencia real (crear la tabla nueva). Verificado con conteos de filas idénticos antes/después.
**Resultado:** Tabla `skill_endorsements` creada sin pérdida de datos. El historial de migraciones sigue desalineado (deuda preexistente, ni introducida ni resuelta por este cambio).
**Estado actual:** Solucionado parcialmente — el síntoma puntual (agregar la tabla) se resolvió, pero la causa de fondo (historial desalineado) sigue sin sanear.
**Prevención:** Regla explícita documentada: "en este proyecto, cualquier cambio de schema debe aplicarse con `npx prisma db push`, nunca con `npx prisma migrate dev`", hasta que alguien decida sanear el historial de migraciones como tarea aparte. Si se necesita levantar la base desde cero en otra máquina en el futuro, `migrate deploy` no alcanza — hay que usar `db push` contra una base poblada por los scripts de seed, o regenerar el historial desde el schema actual sobre una base vacía.

---

### Dificultad 7: Vistas de perfil nunca se registraban — feature documentada pero nunca conectada

**Problema:** Existía el modelo `ProfileView`, un endpoint `GET /profile/views`, e incluso el stat en el dashboard del candidato — pero nada en todo el backend llamaba jamás a `profileView.create()`.
**Impacto:** El candidato nunca veía datos reales de qué empresas visitaron su portafolio, pese a que la UI ya mostraba (vacío) ese stat como si funcionara.
**Causa raíz:** La ruta pública `GET /portfolio/:slug` no tenía ningún guard que identificara al visitante, así que no había forma de saber quién la visitaba ni de registrar la visita.
**Evidencia:**
- Archivo: `BACKEND/apps/portfolio-service/src/public-portfolio.controller.ts`, `public-portfolio.service.ts`
- Commit: `5a2f6ec` (commit consolidado de la fase que incluye este fix)
- Referencia: `docs/CHANGELOG.md`, entrada "2026-07-17 (continuación) — Ronda de fixes visuales + bug real de 'vistas de perfil' nunca implementado"
**Solución implementada:** Se agregó `OptionalJwtAuthGuard` (ya existía en `@app/auth`, sin crear nada nuevo) a la ruta pública, y `getBySlug()` ahora registra una `ProfileView` cuando el visitante es una empresa autenticada distinta del dueño del perfil, con límite de 10 minutos para no inflar el conteo con refrescos de la misma visita.
**Resultado:** Verificado en vivo: una empresa sin relación previa visitando el portafolio generó una fila nueva en `profile_views` (confirmada por SQL directo), y el candidato vio "Vistas de tu perfil: 1" con el detalle de qué empresa lo vio.
**Estado actual:** Solucionado.
**Prevención:** Un bug relacionado se descubrió en el propio arreglo: la primera versión usaba el decorador `@CurrentUser()`, que lanza 401 si no hay sesión — rompiendo el acceso anónimo real a un portafolio público. Se corrigió leyendo `req.user` directamente vía `@Req()`, sin el decorador estricto, y se aplicó el mismo ajuste en `previewMyPortfolio` por consistencia.

---

### Dificultad 8: Bug de normalización de moneda con separador de miles ("$2.500.000" se guardaba como "$3")

**Problema:** Al crear una oferta laboral con salario `$2.500.000`–`$4.000.000`, la tabla de ofertas mostraba "$3 – $4 COP".
**Impacto:** Cualquier oferta con montos en formato colombiano (puntos de miles, sin coma decimal) mostraba salarios completamente erróneos.
**Causa raíz:** `parseNumericInput` solo distinguía coma-decimal vs. punto-miles cuando ambos separadores estaban presentes. Con solo puntos ("2.500.000"), `parseFloat("2.500.000")` en JavaScript se detiene en el segundo punto y devuelve `2.5`; `Math.round(2.5)` redondea a `3`.
**Evidencia:**
- Archivo: `FRONTEND/src/app/shared/utils/normalize/currency.util.ts`, `BACKEND/libs/common/src/normalize/currency.util.ts`
- Commit: `730a506` ("Global data normalization, real AI for Joaquin/CV analysis, and deploy config")
- Referencia: BUG-016 en `docs/BUGS_AND_FIXES.md`
**Solución implementada:** Reescrita la lógica para distinguir 3 casos: ambos separadores presentes (comportamiento anterior sin cambios), un solo separador con grupos de 3 dígitos (se trata como miles y se elimina), un solo separador con 1-2 dígitos en el último grupo (se trata como decimal).
**Resultado:** Reproducido el bug exacto en vivo, corregido, y confirmado que la misma oferta reeditada muestra "$2.500.000 – $4.000.000 COP".
**Estado actual:** Solucionado.
**Prevención:** Ninguna medida estructural adicional más allá del fix — es un caso de prueba que debería cubrirse si el proyecto llegara a tener tests automatizados (ver `NEXT_STEPS.md` #8, "sin suite de tests automatizados en microservicios de negocio").

---

### Dificultad 9: `normalizeUrl` rompía rutas relativas de logo — regresión introducida por el propio sistema de normalización

**Problema:** El usuario reportó (con captura de pantalla) el logo de una empresa roto en el dashboard tras el deploy del nuevo sistema de normalización.
**Impacto:** Corrompió un dato real ya guardado (`company_profiles.logo_url` de `empresa001@demo.com`), rompiendo la visualización del logo en header y dashboard.
**Causa raíz:** `normalizeUrl` anteponía `https://` a cualquier valor sin protocolo, sin distinguir una ruta relativa válida (`/assets/company-logos/logo-1.svg`) de una URL externa incompleta — al guardar el perfil de esa empresa durante la verificación en vivo de la tarea de normalización, el valor quedó corrompido a `https:///assets/company-logos/logo-1.svg` (triple slash).
**Evidencia:**
- Archivo: `FRONTEND/src/app/shared/utils/normalize/url.util.ts`, `BACKEND/libs/common/src/normalize/url.util.ts`
- Commit: `730a506`
- Referencia: BUG-017 en `docs/BUGS_AND_FIXES.md`
**Solución implementada:** `normalizeUrl` ahora deja intacto cualquier valor que ya empiece con `/`. Se corrigió además el dato ya corrompido, de vuelta a `/assets/company-logos/logo-1.svg`.
**Resultado:** Confirmado por consulta directa al endpoint que el valor corrupto tenía el triple slash antes del fix; verificado en vivo que el logo vuelve a renderizar correctamente tras el fix.
**Estado actual:** Solucionado.
**Prevención:** Ejemplo documentado de por qué verificar en vivo cada cambio de normalización importa — el bug fue detectado porque se guardó un perfil real durante la propia verificación de la tarea, no por revisión de código estática.

---

### Dificultad 10: Email sin normalizar en autenticación — riesgo de cuentas duplicadas por mayúsculas

**Problema:** `auth.service.ts` nunca normalizaba el email antes de comparar/crear usuarios.
**Impacto:** Dos cuentas con el mismo correo en distinta capitalización (`User@Gmail.com` vs. `user@gmail.com`) se hubieran tratado como usuarios distintos, ya que Postgres compara `text` sensible a mayúsculas — riesgo real de duplicación de cuentas/datos de un mismo usuario.
**Causa raíz:** Ausencia de normalización de email en el flujo de registro/login, no detectado hasta que se construyó el sistema global de normalización de datos y se revisó ese módulo específicamente.
**Evidencia:**
- Archivo: `BACKEND/apps/auth-service/src/auth.service.ts`
- Commit: `730a506`
- Referencia: `docs/CHANGELOG.md`, entrada "2026-07-17 (continuación) — Sistema global de normalización y formato de datos", sección "Bugs encontrados y corregidos en el camino", punto 1
**Solución implementada:** `auth.service.ts` normaliza el email (minúsculas + sin espacios) antes de cualquier `findUnique`/`create`. Los 4 formularios de auth del frontend normalizan el email antes de enviarlo.
**Resultado:** No se ejecutó un backfill sobre cuentas ya existentes que pudieran colisionar (ver Dificultad 11) — el fix cubre only altas nuevas hacia adelante.
**Estado actual:** Solucionado para nuevas cuentas; pendiente de backfill sobre datos existentes.
**Prevención:** El backfill de normalización (`BACKEND/prisma/normalize-existing-data.ts`) detecta colisiones de email (dos cuentas que normalizarían al mismo valor) y las reporta sin fusionarlas automáticamente — fusionar cuentas es una decisión de producto (qué cuenta prevalece, qué pasa con su historial), no de formato, y requiere autorización explícita del usuario antes de ejecutarse (regla de `CLAUDE.md`).

---

### Dificultad 11: Backfill de normalización de datos existentes construido pero no ejecutado

**Problema:** El sistema de normalización global (teléfonos, nombres, NIT, emails, URLs, montos, habilidades) se construyó para nuevos datos, pero los datos ya persistidos en la base no pasan automáticamente por él.
**Impacto:** Datos históricos (ej. cuentas con email en mayúsculas, teléfonos sin formato consistente) siguen sin normalizar hasta que alguien corra el backfill explícitamente.
**Causa raíz:** No es un bug — es una limitación de diseño deliberada: `CLAUDE.md` prohíbe borrar/regenerar datos reales sin confirmación explícita puntual, y una normalización masiva sobre datos reales entra en esa categoría (puede haber colisiones que requieren decisión humana).
**Evidencia:**
- Archivo: `BACKEND/prisma/normalize-existing-data.ts`
- Referencia: `docs/NEXT_STEPS.md`, fila 15; `docs/DECISIONS.md`, "Sistema de normalización: separación storage/display, sin Title Case forzado en habilidades, y backfill construido pero no ejecutado", punto 5
**Solución implementada:** El script corre en modo dry-run por defecto (solo reporta cuántas filas cambiarían) y requiere el flag explícito `--apply` para escribir. Detecta colisiones y las reporta aparte, sin fusionar ni borrar nada por su cuenta.
**Resultado:** Verificado con `tsc --noEmit` únicamente — nunca ejecutado contra la base real.
**Estado actual:** Pendiente (de forma intencional, a la espera de autorización explícita del usuario).
**Prevención:** Ya construido con las salvaguardas necesarias (dry-run por defecto, reporte de colisiones separado); solo falta la autorización puntual para correr `--apply`.

---

### Dificultad 12: `PATCH /api/skills/:id` rechazaba con 400 una edición de solo nivel

**Problema:** Al construir la edición de nivel en línea del catálogo de habilidades, un `PATCH` con solo `{ level: 'EXPERT' }` (sin `name`) devolvía `400 Bad Request`.
**Impacto:** Bloqueaba la funcionalidad nueva de edición rápida de nivel en el catálogo rediseñado de habilidades.
**Causa raíz:** `SkillDto.name` estaba declarado `@IsString()` obligatorio (sin `@IsOptional()`), pensado solo para el flujo de creación. El `ValidationPipe` global (`whitelist`, `forbidNonWhitelisted`, `transform`) rechazaba la petición antes de que la lógica de `updateSkill()` (que sí manejaba `name` opcional en tiempo de ejecución) llegara a ejecutarse.
**Evidencia:**
- Archivo: `BACKEND/apps/portfolio-service/src/dto/skill.dto.ts`, `BACKEND/apps/portfolio-service/src/skills.service.ts`
- Commit: `5a2f6ec`
- Referencia: BUG-013 en `docs/BUGS_AND_FIXES.md`
**Solución implementada:** `name` pasado a `@IsOptional() @IsString() name?: string`. Se agregó un guard explícito en `addSkill()` (`if (!dto.name?.trim()) throw new BadRequestException(...)`) para mantener la validación real (nombre obligatorio al crear) como regla de negocio en el service, no como restricción ciega del DTO compartido.
**Resultado:** Verificado en vivo: cambio de nivel de "Básico" a "Experto" sin error, persistido tras recargar.
**Estado actual:** Solucionado.
**Prevención:** Patrón a tener en cuenta: cuando un mismo DTO se reutiliza para crear y actualizar, los campos que son obligatorios solo en creación no deben marcarse obligatorios a nivel de decorador si el pipe de validación es global — mover esa regla al service.

---

## Frontend y UX

### Dificultad 13: Mensaje propio aparecía duplicado (2-3 veces) al enviarlo en el chat

**Problema:** Al enviar un mensaje en el chat, el remitente lo veía aparecer 2-3 veces en su propia pantalla, aunque el destinatario y la base de datos solo tenían una copia real.
**Impacto:** Bug visible y confuso en una funcionalidad central (mensajería candidato↔empresa) — el tipo de bug que un usuario nota inmediatamente.
**Causa raíz:** `send()` agregaba el mensaje de forma optimista tras la respuesta REST, y por separado la suscripción a `chatSocket.message$` también lo agregaba cuando el backend hacía eco del mismo mensaje por WebSocket a toda la sala (el propio remitente ya está unido a esa sala). Ninguno de los dos puntos verificaba si el mensaje ya existía en la lista antes de agregarlo.
**Evidencia:**
- Archivo: `FRONTEND/src/app/features/messages/messages.component.ts`
- Commit: `5a2f6ec`
- Referencia: BUG-012 en `docs/BUGS_AND_FIXES.md`
**Solución implementada:** Nuevo método privado `appendMessage(msg)` que solo agrega el mensaje si no existe ya un `msg.id` igual en la lista actual, usado en los dos puntos de entrada (respuesta REST y eco de WebSocket).
**Resultado:** Detectado durante auditoría en vivo (mensaje de prueba triplicado en pantalla pese a una sola fila en la base). Reverificado contando específicamente los elementos `.message-row` del DOM: 1 fila real para 1 mensaje enviado.
**Estado actual:** Solucionado.
**Prevención:** Un primer script de verificación automatizada dio un resultado ambiguo por usar un selector CSS equivocado (`.msg-row`, de otro componente) — lección documentada en `DECISIONS.md`: ante un resultado de verificación sospechoso, revisar primero el propio script antes de asumir que el código de la app está mal.

---

### Dificultad 14: Formateo en vivo de teléfono/NIT no dejaba editar el campo (el cursor saltaba al final)

**Problema:** El usuario reportó que no podía cambiar el número de teléfono ya cargado en su perfil.
**Impacto:** Bug funcional grave en un formulario central (perfil de candidato y de empresa) — el campo se volvía prácticamente imposible de editar salvo agregando caracteres al final.
**Causa raíz:** El formateo en vivo (`valueChanges` → `setValue(formatted)` en cada tecla) reescribía el campo completo en cada pulsación. `setValue` reescribe el `<input>` del DOM sin preservar la posición del cursor, sin importar que se pasara `emitEvent: false` (ese flag solo evita que el propio listener se dispare de nuevo, no afecta la reescritura del valor visible). Insertar un carácter en la posición 5 de "+57 312 439 2090" hacía que el cursor terminara en la posición 16 (el final).
**Evidencia:**
- Archivo: `FRONTEND/src/app/features/profile/profile.component.ts`, `FRONTEND/src/app/features/company/company-profile.component.ts`
- Commit: `5a2f6ec`
- Referencia: BUG-015 en `docs/BUGS_AND_FIXES.md`
**Solución implementada:** Se reemplazó el formateo en `valueChanges` (cada tecla) por formateo en `(blur)` (al perder el foco). Mientras se escribe, el campo no interfiere en absoluto con el cursor.
**Resultado:** Reproducido el bug exacto contra el código anterior y confirmado que, con el fix, insertar un carácter en la posición 5 deja el cursor en la posición correcta (6) en vez de saltar al final.
**Estado actual:** Solucionado.
**Prevención:** La lección se aplicó explícitamente al diseño del sistema global de normalización construido después en la misma sesión (ver `DECISIONS.md`, "Sistema de normalización...", punto 2): el formateo mientras se escribe se limita a filtrado seguro de caracteres (`filterPhoneChars`), nunca a reordenamiento completo — el reordenamiento solo ocurre en `blur`.

---

### Dificultad 15: Botones de editar/eliminar en tarjetas de educación/proyectos inalcanzables en mobile (solo visibles con `:hover`)

**Problema:** En las tarjetas de educación y proyectos, los botones de editar/eliminar solo se mostraban al pasar el mouse por encima (`:hover`).
**Impacto:** En pantallas táctiles (mobile), el estado `:hover` no existe de forma persistente — los botones quedaban completamente inalcanzables, impidiendo editar o borrar educación/proyectos desde el celular.
**Causa raíz:** El patrón visual `:hover`-only fue diseñado (o copiado) sin considerar dispositivos táctiles, y no se detectó hasta la auditoría específica de responsividad mobile pedida por el usuario tras probar la app desplegada desde su celular.
**Evidencia:**
- Archivo: componentes de `education` y `projects` bajo `FRONTEND/src/app/features/{education,projects}/`
- Commit: `5764dac` ("Add JSDoc comments across the whole codebase, fix mobile responsiveness app-wide, and unify brand color to a single teal")
- Referencia: `docs/CHANGELOG.md`, entrada "2026-07-18 (continuación) — Violeta de marca 'empresa' corregido... + resto del responsive mobile..."
**Solución implementada:** Se forzó la visibilidad de esos botones desde el breakpoint tablet hacia abajo (dejan de depender de `:hover` en pantallas angostas).
**Resultado:** Parte del mismo batch de fixes de responsividad mobile de candidato (`home-candidate`, `profile`, `skills`, `experiences`, `education`, `projects`, `candidate-jobs`, `cv-analysis`, `public-preview`, `public-portfolio`, `portfolio-content`).
**Estado actual:** Solucionado (código); confirmación visual completa en dispositivo real del usuario para todo el batch quedó pendiente según el propio Changelog ("no se pudo repetir la verificación visual completa por un problema de renderizado del entorno de preview").
**Prevención:** Al auditar interactividad nueva, verificar explícitamente el equivalente táctil de cualquier interacción basada en `:hover` — es un patrón que puede repetirse en componentes futuros si no se revisa a propósito.

---

### Dificultad 16: Fechas de toda la aplicación renderizando en inglés

**Problema:** Cualquier fecha mostrada con el pipe `date` nativo de Angular en formatos largos (`longDate`, `medium`, `shortTime`) aparecía en inglés (`July 16, 2026`) en una aplicación 100% en español.
**Impacto:** Inconsistencia visible en una aplicación orientada al mercado colombiano — pasaba desapercibida en fechas cortas (`16/07/2026` se ve igual en cualquier locale) pero evidente en formatos largos.
**Causa raíz:** `LOCALE_ID` de Angular nunca fue configurado en `app.config.ts` — Angular usa `en-US` por defecto si no se registra explícitamente otro locale. No detectado hasta que se construyó un helper unificado de formato de fecha y se notó la inconsistencia.
**Evidencia:**
- Archivo: `FRONTEND/src/app/app.config.ts`
- Commit: `5a2f6ec`
- Referencia: BUG-002 en `docs/BUGS_AND_FIXES.md`; `docs/DECISIONS.md`, "Registrar `LOCALE_ID: 'es-CO'` globalmente en Angular"
**Solución implementada:** `registerLocaleData(localeEsCO)` + `{ provide: LOCALE_ID, useValue: 'es-CO' }` en `app.config.ts`, más `formatAppDate`/pipe `appDate` como fuente única de formato (reemplazando 8 formatos de fecha distintos que convivían sin criterio en 11 componentes).
**Resultado:** Todas las fechas de la app (incluidas las que ya usaban formatos nombrados) renderizan en español automáticamente.
**Estado actual:** Solucionado.
**Prevención:** Centralizar el formato en un pipe único (`appDate`) en vez de seguir formateando a mano por pantalla (`toLocaleDateString('es-CO', ...)`) evita que se repita la inconsistencia de 8 formatos distintos sin criterio.

---

### Dificultad 17: Parámetro de búsqueda `q` se perdía en la cadena landing → login empresa → candidatos

**Problema:** Buscar talento desde el hero de la landing navegaba a `/company/login?q=...`, pero tras loguearse el término de búsqueda desaparecía y `company/candidates` cargaba sin filtro.
**Impacto:** La función de búsqueda destacada en la landing (incluidos accesos directos por profesión) no producía ningún resultado visible tras el login, pese a que aparentaba funcionar.
**Causa raíz:** Bug con tres causas encadenadas, solo la primera estaba en el hallazgo original de auditoría: (1) `CompanyLoginComponent.onSubmit()` nunca leía el `q` de la URL para reenviarlo tras login; (2) `CompanyCandidatesComponent` nunca leía `q` de su propia ruta; (3) por lo mismo, tampoco disparaba una búsqueda automática al cargar.
**Evidencia:**
- Archivo: `FRONTEND/src/app/features/auth/company-login.component.ts`, `FRONTEND/src/app/features/company/company-candidates.component.ts`
- Commit: `5a2f6ec`
- Referencia: BUG-001 en `docs/BUGS_AND_FIXES.md`
**Solución implementada:** `company-login` lee el `q` de la URL y navega post-login a `/company/candidates?q=...`. `company-candidates` lee ese mismo param en `ngOnInit`, lo carga en el control de búsqueda y dispara la búsqueda.
**Resultado:** Arreglar solo la primera causa no hubiera resuelto nada visible — las tres causas se corrigieron juntas. Como efecto colateral, esto también dejó funcionando los accesos directos por profesión de la landing, que ya apuntaban a esa URL pero nunca hacían nada visible.
**Estado actual:** Solucionado (verificación visual en navegador real quedó marcada como pendiente en el propio changelog de esa fase, posteriormente cubierta por auditorías en vivo subsiguientes).
**Prevención:** Ejemplo documentado de por qué un fix "obvio" de un solo punto puede no ser suficiente cuando el flujo cruza varios componentes — conviene trazar la cadena completa antes de dar un bug por cerrado.

---

## Proceso y metodología

### Dificultad 18: Capturas de pantalla `fullPage: true` con elementos `position: fixed` producían falsos positivos de bugs

**Problema:** Durante una auditoría en vivo con navegador automatizado, una captura de página completa de la landing mostró un hueco de miles de píxeles en blanco, y otra en la vista de trabajos en mobile mostró el botón flotante de "Joaquín" (el asistente) tapando una tarjeta — ambas parecían bugs serios a simple vista.
**Impacto:** Riesgo de invertir tiempo "arreglando" bugs que no existían, y de introducir cambios innecesarios (con su propio riesgo de regresión) sobre código que funcionaba correctamente.
**Causa raíz:** Las capturas `fullPage: true` de Playwright/Chromium no son confiables cuando hay elementos `position: fixed` combinados con animaciones de scroll — el elemento fijo se renderiza en su posición de la primera pantalla capturada mientras el resto de la página se compone por partes, produciendo superposiciones que un usuario real nunca ve.
**Evidencia:**
- Referencia: `docs/DECISIONS.md`, "Gotcha descubierto: capturas `fullPage: true` de Playwright con elementos `position: fixed` producen falsos positivos"; falsos positivos documentados también en `docs/BUGS_AND_FIXES.md`, sección "Falsos positivos descartados en esta auditoría"
**Solución implementada:** Se verificó contra el DOM real (`getComputedStyle`, `getBoundingClientRect()`, `opacity`) y con capturas de viewport (no de página completa) tras hacer scroll real, antes de tocar código. Ambos "bugs" se descartaron como artefactos de la herramienta de captura.
**Resultado:** Se evitó modificar código que no estaba roto. Se agregó de todas formas un `padding-bottom` defensivo en `.page-content` de ambos shells como margen de seguridad, aunque no se confirmó que hiciera falta.
**Estado actual:** Solucionado (a nivel de proceso — no era un bug de código).
**Prevención:** Documentado explícitamente en `DECISIONS.md` y referenciado en `docs/REUSABLE_SKILLS.md` para no repetir el error ni gastar tiempo en el futuro. El mismo patrón de "revisar el propio script de verificación antes de asumir que el código está mal" se reforzó una segunda vez durante la verificación de BUG-012 (selector CSS equivocado, ver Dificultad 13).

---

### Dificultad 19: Color de marca "empresa" (`--accent-purple`) percibido como azul pese a ser matemáticamente púrpura, en dos iteraciones sucesivas

**Problema:** El violeta elegido como identidad visual de "empresa" (`#4338ca`, decisión del 2026-07-11) se seguía percibiendo como "azul oscuro" por el usuario incluso después de corregir un mismatch real de color viejo en la landing.
**Impacto:** Dos rondas de ajuste de color no resolvieron la percepción del usuario, consumiendo tiempo en iteraciones sucesivas sobre una decisión de diseño ya tomada.
**Causa raíz:** `#4338ca` tiene hue ≈ 244° (azul puro ≈ 240°, violeta ≈ 270-290°) — matemáticamente "púrpura" pero perceptualmente muy cerca del límite con el azul, sobre todo en superficies grandes donde el ojo pondera más el canal azul dominante.
**Evidencia:**
- Archivo: `FRONTEND/src/styles.scss`
- Commit: `5764dac`
- Referencia: `docs/DECISIONS.md`, "`--accent-purple` recalibrado: el valor 'matemáticamente púrpura' se percibía como azul" y "Marca monocromática: se abandona el segundo color de 'empresa' (violeta) — todo el mismo teal + blanco"
**Solución implementada:** Primer intento: recalibrado a `#7c3aed` (violeta franco, hue ≈ 262°) — el usuario lo siguió viendo como "morado/azul". Segundo intento (definitivo): se abandonó por completo el segundo color de marca — `--accent-purple*` se igualó a los valores de `--primary*` (el teal existente), quedando la app monocromática (teal + blanco), por pedido explícito y literal del usuario ("toda la página debe llevar este color y blanco excepto los logos").
**Resultado:** Cambio de 3-4 líneas en `styles.scss` (tokens), propagado automáticamente a toda pantalla que usara la variable, sin tocar componentes individuales.
**Estado actual:** Solucionado (mediante un cambio de decisión de producto, no de un bug de código).
**Prevención:** Documentado como ejemplo de priorizar la percepción repetida y explícita del usuario sobre la clasificación matemática/objetiva de un valor de color — tras dos correcciones de tono fallidas, seguir ajustando el hue hubiera repetido el mismo riesgo por tercera vez.

---

## Resumen

| # | Dificultad | Estado |
|---|---|---|
| 1 | Login fallaba por bloqueo de cookies cross-domain | Solucionado |
| 2 | Deploy en Railway con 502 persistente | Solucionado (cambio de proveedor) |
| 3 | Networking privado de Render sin DNS interno | Solucionado parcialmente (workaround) |
| 4 | Colisión de nombres en Render + healthcheck degradado | Solucionado |
| 5 | Servicios sin `DEEPSEEK_API_KEY` crasheaban al arrancar | Solucionado |
| 6 | Drift del historial de migraciones de Prisma | Solucionado parcialmente |
| 7 | Vistas de perfil nunca se registraban | Solucionado |
| 8 | Normalización de moneda con separador de miles | Solucionado |
| 9 | `normalizeUrl` rompía rutas relativas de logo | Solucionado |
| 10 | Email sin normalizar en auth (riesgo de duplicados) | Solucionado (altas nuevas); backfill pendiente |
| 11 | Backfill de normalización no ejecutado | Pendiente (intencional) |
| 12 | `PATCH` de habilidades rechazaba edición de solo nivel | Solucionado |
| 13 | Mensajes de chat duplicados | Solucionado |
| 14 | Formateo de teléfono/NIT no dejaba editar | Solucionado |
| 15 | Botones editar/eliminar inalcanzables en mobile | Solucionado |
| 16 | Fechas en inglés en toda la app | Solucionado |
| 17 | Parámetro `q` perdido landing→login→candidatos | Solucionado |
| 18 | Falsos positivos de capturas `fullPage` en auditoría | Solucionado (proceso) |
| 19 | Color de marca "empresa" percibido como azul | Solucionado (cambio de decisión) |

Total: 19 dificultades documentadas, todas con evidencia trazable a `docs/CHANGELOG.md`, `docs/DECISIONS.md`, `docs/BUGS_AND_FIXES.md` y/o commits reales del repositorio.
