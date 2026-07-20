# Plan de correcciones — seguridad y bugs reales (auditoría 2026-07-18)

**Estado: planificado, sin implementar. Para ejecutar en la próxima sesión.** Basado en la [documentación técnica completa](DOCUMENTACION_TECNICA_TALENTBRIDGE_V3.md) generada el 2026-07-18 (auditoría exhaustiva contra el código real, ver también [`DEUDA_TECNICA_TALENTBRIDGE_V3.md`](DEUDA_TECNICA_TALENTBRIDGE_V3.md) e [`INVENTARIO_MICROSERVICIOS_TALENTBRIDGE_V3.md`](INVENTARIO_MICROSERVICIOS_TALENTBRIDGE_V3.md) para el detalle línea por línea de cada hallazgo).

## Contexto

La auditoría técnica encontró varios problemas reales (no hipotéticos) de seguridad y funcionalidad, verificados contra el código en producción. El usuario pidió priorizarlos y dejar un plan claro para resolverlos en la siguiente sesión, sin tocar nada todavía.

## Restricciones del proyecto (ver `CLAUDE.md`)

- `git status` antes y después de cada cambio.
- Build correspondiente después de cada fix (`build:<servicio>` para backend puntual, `lint:css && ng build` para frontend).
- No commitear sin pedido explícito en el momento.
- Probar cada fix contra el deploy real (Render + Vercel) antes de dar la fase por cerrada, no solo "compila".
- Documentar cada fix en `CHANGELOG.md` (y `BUGS_AND_FIXES.md` si aplica) al cerrarlo.

## Orden de ejecución sugerido

Crítico primero (son rápidos y son huecos reales de seguridad/funcionalidad) → Alto → Medio. Los ítems "Bajo" del documento de deuda técnica quedan fuera de este plan a propósito (ya evaluados y aceptados conscientemente, no requieren acción salvo pedido explícito nuevo).

---

## Fase 0 — Crítico

- [x] **0.1 — Falta `RolesGuard` en búsqueda de candidatos.** `BACKEND/apps/company-service/src/candidate-search.controller.ts` solo tiene `@UseGuards(JwtAuthGuard)`, sin `RolesGuard`/`@Roles(COMPANY)` — cualquier candidato autenticado puede llamar un endpoint pensado exclusivamente para empresas.
  - **Fix propuesto:** agregar `RolesGuard` + `@Roles('COMPANY')` al controller/endpoint, siguiendo el mismo patrón ya usado en el resto de endpoints company-only del mismo servicio.
  - **Cómo probar:** login como candidato → llamar el endpoint con su token → debe dar 403. Login como empresa → debe seguir funcionando igual que antes.
  - **Criterio de aceptación:** 403 para rol candidato, 200 sin cambios para rol empresa, `build:company` limpio.

- [x] **0.2 — `jobs-service` y `applications-service` no validan el body.** `createJob`/`updateJob` (jobs-service) y `apply`/`updateStatus` (applications-service) reciben `body: any` — el `ValidationPipe` global no tiene nada que validar. Existe `CreateJobOfferDto` pero nunca se conectó.
  - **Fix propuesto:** tipar los métodos de controller con los DTOs reales (crear los que falten para applications-service, conectar el `CreateJobOfferDto` ya existente en jobs-service) y confirmar que `class-validator` los rechaza cuando corresponde.
  - **Cómo probar:** mandar un POST con un campo inválido/faltante a cada endpoint → debe dar 400 con mensaje de validación, no aceptarlo silenciosamente.
  - **Criterio de aceptación:** los 4 endpoints rechazan payloads inválidos con 400; los payloads válidos que ya funcionaban hoy siguen funcionando igual (revisar formularios reales de `company-jobs` y `candidate-jobs`/aplicar en el frontend, que no dejen de funcionar).

- [x] **0.3 — Subida de CV se rompe si pasa por el gateway (multipart perdido).** `BACKEND/apps/api-gateway/src/http-client.service.ts` nunca arma `body` cuando `Content-Type` es `multipart/form-data` — si `cv.service.ts` (frontend) alguna vez apuntara al gateway en vez de directo a `portfolio-service`, la subida de CV llegaría sin archivo.
  - **Verificar primero:** confirmar si el frontend hoy le pega directo a `portfolio-service` (`environment.cvUploadUrl`) — si es así, el bug existe pero no se dispara hoy; igual vale la pena arreglarlo porque es fácil que alguien cambie esa URL sin saber del problema.
  - **Fix propuesto:** en `http-client.service.ts`, cuando `isMultipart` sea `true`, reenviar el stream/buffer crudo del request en vez de omitir el body (usar `req` directo como stream hacia `fetch`, o el mecanismo equivalente que soporte Node `fetch` con `duplex: 'half'`).
  - **Cómo probar:** subir un CV real desde la UI apuntando el gateway a `portfolio-service` (temporalmente, para probar) y confirmar que el archivo llega íntegro del otro lado.
  - **Criterio de aceptación:** subida de CV funciona igual pasando por el gateway que yendo directo.

- [x] **0.4 — `JWT_SECRET` cae a `'dev_secret'` hardcodeado.** 3 archivos (`jwt.strategy.ts`, `auth.module.ts`, `jwt.util.ts`) usan `process.env['JWT_SECRET'] || 'dev_secret'` — si la variable de entorno faltara en algún ambiente, el servicio firmaría/validaría tokens con un secreto público y predecible.
  - **Fix propuesto:** quitar el fallback hardcodeado; si `JWT_SECRET` no está seteado, el servicio debería fallar al arrancar (fail-fast) en vez de arrancar inseguro en silencio. Confirmar que `JWT_SECRET` está seteado en los 10 servicios de Render (ya debería estarlo, per `render.yaml`/configuración actual) antes de sacar el fallback, para no romper el deploy.
  - **Cómo probar:** confirmar que los 10 servicios en Render tienen `JWT_SECRET` seteado (`GET /v1/services/:id/env-vars` vía API de Render, o revisar el dashboard) antes de sacar el fallback. Después del cambio, un arranque local sin `JWT_SECRET` en `.env` debe fallar con un error claro, no arrancar silenciosamente.
  - **Criterio de aceptación:** los 10 servicios siguen arrancando bien en Render (todos ya tienen la variable seteada); localmente, sin la variable, el servicio no levanta.

---

## Fase 1 — Alto

- [x] **1.1 — Sin rate limiting en ningún endpoint (incluido login).** No hay `@nestjs/throttler` ni equivalente instalado.
  - **Fix propuesto:** instalar `@nestjs/throttler` en `auth-service` como mínimo (login/register son los de mayor riesgo — fuerza bruta de contraseña), evaluar si extenderlo al resto de servicios o solo al gateway.
  - **Criterio de aceptación:** N intentos de login fallidos seguidos desde la misma IP en poco tiempo devuelven 429 en vez de seguir intentando indefinidamente.

- [x] **1.2 — 3 rutas del gateway sin destino real.** `/api/health`, `/api/analysis`, `/api/applications` en `gateway.controller.ts` no tienen un controller real del otro lado (dead code / confunde).
  - **Fix propuesto:** revisar cada una — `/api/health` ya lo maneja `AppController` antes del catch-all (la regla es redundante, se puede borrar); `/api/analysis` y `/api/applications` revisar si deberían apuntar a algo que hoy no existe, o si son reglas obsoletas a borrar.
  - **Criterio de aceptación:** el archivo de reglas del gateway solo tiene reglas que efectivamente apuntan a algo real.

- [x] **1.3 — Indicador "escribiendo..." del chat roto.** El frontend (`chat-socket.service.ts`) emite `chat:typing` y otros eventos por WebSocket, pero `chat.gateway.ts` no tiene ningún `@SubscribeMessage` — no tiene efecto del lado servidor. Los mensajes en sí funcionan bien (van por HTTP), solo el indicador de "está escribiendo" está roto de punta a punta.
  - **Fix propuesto:** decidir si vale la pena implementarlo (agregar los `@SubscribeMessage` correspondientes en el gateway y reenviar el evento a la sala de la conversación) o si se saca el código muerto del frontend si no se prioriza la feature.
  - **Criterio de aceptación:** o el indicador funciona de punta a punta, o se documenta explícitamente como feature no implementada y se limpia el código muerto del emit sin efecto.

- [x] **1.4 — Historial de migraciones de Prisma desalineado.** Ya documentado en `DECISIONS.md` — `prisma migrate dev` pide reset completo de la base.
  - **Fix propuesto:** regenerar el historial de migraciones una vez contra una base vacía (no la de producción), siguiendo el camino que la propia entrada de `DECISIONS.md` recomienda. Evaluar si vale la pena hacerlo ahora o dejarlo para cuando haga falta levantar la base desde cero en otra máquina (ej. antes de la entrega final).
  - **Criterio de aceptación:** `npx prisma migrate dev` corre limpio contra una base nueva y reproduce el schema real actual.

- [x] **1.5 — Cero tests automatizados (backend y frontend).** Alcance acotado a lo que el propio plan priorizaba: `auth-service` (login/registro/JWT) y `applications-service` (validación de habilidades/elegibilidad), más `libs/contracts/skill-match.util.ts` (la lógica de matching que comparten ambos). 31 tests nuevos, 3 suites, todos pasando. No se tocó el resto de servicios ni el frontend — cobertura total del proyecto sigue siendo baja, pero la lógica de mayor riesgo real ya tiene tests.

---

## Fase 2 — Medio (si queda tiempo)

- [x] **2.1 — `npm run build` (backend, sin sufijo) roto.** Agregado script `build:all` (encadena `build:libs` + los 10 `build:<servicio>`) y `build` ahora es un alias de `build:all` en vez de `nest build` a secas. Verificado corriendo `npm run build` completo: los 10 servicios + 5 libs compilan limpio. `CLAUDE.md` ya documentaba este comando como la forma correcta de compilar "varios/todos los servicios" — antes era una promesa falsa, ahora es cierta, no hizo falta tocar la documentación.
- [ ] **2.2 — 19 warnings de presupuesto de bundle en el frontend.** Ya evaluado y aceptado a propósito (mixins de `_forms.scss`) — no re-litigar salvo pedido explícito nuevo. **Sin tocar, según lo ya decidido.**
- [ ] **2.3 — `Card` compartido sin adopción real (14 componentes duplicando estilo).** Ya diferido a propósito por decisión documentada — encarar como tanda dedicada, un componente a la vez, solo si se pide explícitamente. **Sin tocar, según lo ya decidido.**

---

## Fuera de alcance de este plan (aceptado a propósito, no tocar salvo pedido explícito)

- Backfill de normalización de datos existentes (requiere confirmación puntual antes de correr con `--apply`, per regla de `CLAUDE.md`).
- Sin `ipAllowList`/red privada entre servicios en Render — limitación del plan free, aceptada para esta demo.
- Token JWT en `localStorage` además de la cookie — trade-off consciente del fix de login de hoy, documentado en `DECISIONS.md`.
- `titleCaseText` sin excepciones de preposiciones en español — cosmético, cerrado por decisión previa.

## Cómo retomar mañana

Empezar por la Fase 0 en orden (0.1 → 0.4), cada ítem con su propio build/prueba antes de pasar al siguiente. Después de la Fase 0, revisar con el usuario si sigue con la Fase 1 completa o prioriza puntualmente. Actualizar los checkboxes de este archivo (`[ ]` → `[x]`) a medida que se cierra cada ítem, y dejar rastro en `CHANGELOG.md` por cada fix real aplicado, siguiendo la convención del resto del proyecto.
