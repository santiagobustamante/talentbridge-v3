# Despliegue — TalentBridge V3

Todo lo que hace falta saber para desplegar, redesplegar, diagnosticar o migrar la base de datos de este proyecto en producción. Escrito para que un agente (Claude Code u otro) que nunca vio este proyecto pueda retomarlo sin tener que redescubrir nada por prueba y error — varias de las cosas de acá (sobre todo la sección 6) costaron tiempo real de diagnóstico la primera vez.

No repite lo que ya está en [`CLAUDE.md`](../CLAUDE.md) (reglas de seguridad, cómo levantar el proyecto **local**) ni en [`PROJECT_OVERVIEW.md`](./PROJECT_OVERVIEW.md) — este documento es específicamente sobre el entorno **desplegado** (producción).

---

## 1. Resumen: qué está desplegado dónde

| Pieza | Dónde | Plan |
|---|---|---|
| Frontend (Angular) | **Vercel** | Hobby (gratis) |
| Backend (11 microservicios NestJS, uno por contenedor Docker — `admin-service` agregado 2026-07-30) | **Railway** (primario, desde 2026-07-25) — Render queda desplegado intacto como respaldo para los primeros 10, sin tráfico del frontend; `admin-service` **no** está en Render todavía (ver Fase 9 de `plan-panel-administrativo.md`) | Railway Hobby (pago) · Render Free |
| Base de datos (PostgreSQL) | **Supabase** | Free |

**Historial:** Railway → Render (2026-07-18, por un 502 que en ese momento se atribuyó a la plataforma) → Railway de nuevo (2026-07-25, tras diagnosticar que el 502 original era config propia, no la plataforma). Detalle completo de ambas migraciones en [`DECISIONS.md`](./DECISIONS.md). Render **no se desmanteló** — sigue con los 10 servicios y las mismas env vars, listo como fallback si Railway falla (solo hay que revertir `environment.prod.ts` y redesplegar Vercel, ver sección 5).

---

## 2. URLs de producción

| Servicio | URL (Railway, primario) |
|---|---|
| **Frontend** | https://talentbridge-v3.vercel.app |
| **API Gateway** (todo el tráfico del frontend pasa por acá, prefijo `/api`) | https://api-gateway-production-47f0.up.railway.app |
| chat-service (dominio público propio — WebSocket directo desde el navegador) | https://chat-service-production-ac0b.up.railway.app |
| portfolio-service (dominio público propio — subida de CV directa) | https://portfolio-service-production-4815.up.railway.app |
| auth-service, candidate-service, company-service, jobs-service, applications-service, assistant-service, dashboard-service, admin-service | Sin dominio público — solo alcanzables por red interna Railway (`http://<servicio>.railway.internal:<puerto>`) desde `api-gateway`. Generar uno desde el dashboard (**Settings → Networking → Generate Domain**) si hace falta pegarle directo a alguno para debug. |

Excepción de ruteo (igual que antes, ver `FRONTEND/src/environments/environment.prod.ts`): `chat-service` y `portfolio-service` necesitan dominio público propio porque el frontend les pega directo, bypaseando el gateway — los otros 8 no.

Swagger no está desplegado en producción (solo corre en local, `http://localhost:3000/api/docs`).

### URLs de Render (respaldo, no recibe tráfico del frontend actual)

| Servicio | URL |
|---|---|
| API Gateway | https://api-gateway-ey6d.onrender.com |
| auth-service | https://auth-service-99od.onrender.com |
| candidate-service | https://candidate-service-bzy0.onrender.com |
| portfolio-service | https://portfolio-service-uqi0.onrender.com |
| company-service | https://company-service-vua7.onrender.com |
| jobs-service | https://jobs-service-vq28.onrender.com |
| applications-service | https://applications-service-8co9.onrender.com |
| chat-service | https://chat-service-olzl.onrender.com |
| assistant-service | https://assistant-service-lyq5.onrender.com |
| dashboard-service | https://dashboard-service-ndtn.onrender.com |

---

## 3. Servicios de Railway — IDs

El proyecto Railway se llama **`renewed-enchantment`** (project ID `59919120-acee-4de3-956b-67b6cfd4de6a`, environment `production` = `2e0af374-5a62-4474-949b-dc9ed44413c5`). Los IDs no son secretos — quedan acá para operar por API/GraphQL sin tener que buscarlos cada vez.

| Servicio | Railway Service ID |
|---|---|
| api-gateway | `44ef75c9-069b-4ea1-a8a6-b6c2ee98c6ee` |
| auth-service | `485d9e78-23e4-4d5f-941b-af6f66dbd022` |
| candidate-service | `1251c988-872e-4ff1-abbe-f63ec881f729` |
| portfolio-service | `d83d1616-bc85-4779-81d2-8c9c235f27b5` |
| company-service | `a4e63895-59d8-4025-a32d-0f351e900da5` |
| jobs-service | `c7a2d73a-2330-4975-8ab2-4898d4cb4315` |
| applications-service | `f8e62c96-d38a-480a-9629-7f57db450023` |
| chat-service | `251009ea-b979-4d03-bf60-eeefbe82fe2a` |
| assistant-service | `acc76095-fa0a-4ba6-ad78-bf4203d0dea1` |
| dashboard-service | `709626ae-0716-4fc1-8d10-9f547831d3cc` |
| admin-service | `09f7eed8-d51e-4195-b6fb-3fe24c37a95d` |

Cada uno tiene su propio `Dockerfile` en `BACKEND/docker/<nombre-servicio>.Dockerfile`, con `rootDirectory: /BACKEND` y `dockerfilePath: docker/<nombre-servicio>.Dockerfile` configurados **a nivel de servicio en Railway** (no hay un `railway.json` en el repo — esa config vive server-side, ver la trampa en la sección 7).

### Cómo operar — CLI vs API GraphQL

**CLI** (`npm i -g @railway/cli`, `railway login`, `railway link -p renewed-enchantment`):
- Ver estado de todos los servicios: `railway status --json`
- Ver logs de build/deploy: `railway logs --service <nombre> --build` / `--deployment` / `--latest`
- Setear una variable: `railway variables --set "CLAVE=valor" --service <nombre>`
- Ver variables: `railway variables --service <nombre> --kv`
- Redesplegar reusando la imagen actual (rápido, no reconstruye): `railway redeploy --service <nombre> -y`
- Reconstruir desde código actual (lento, ~1-2 min por servicio): `railway up --service <nombre> --detach -c` — **corré esto desde la raíz del repo, nunca con `--path-as-root`** (ver la trampa en la sección 7)
- Detener un servicio (libera cómputo, no borra config): `railway down --service <nombre> -y`

**API GraphQL** (`https://backboard.railway.com/graphql/v2`, header `Authorization: Bearer <token>`) — necesaria para cosas que el CLI no expone, como `rootDirectory`/`dockerfilePath`:
```graphql
mutation($serviceId: String!, $environmentId: String!, $input: ServiceInstanceUpdateInput!) {
  serviceInstanceUpdate(serviceId: $serviceId, environmentId: $environmentId, input: $input)
}
```
con `input: { rootDirectory: "/BACKEND", dockerfilePath: "docker/<nombre>.Dockerfile" }`. **Ojo:** el campo `builder` de ese input es un enum (`HEROKU`/`NIXPACKS`/`PAKETO`/`RAILPACK`) que **no incluye `"DOCKERFILE"`** — no lo mandes, con `dockerfilePath` no-nulo alcanza y Railway usa el builder de Dockerfile solo. El token para esta API es el `accessToken` que ya usa el CLI — ver sección 8 para dónde está guardado localmente.

---

## 4. Variables de entorno por servicio

Nombres de las variables que cada servicio necesita configuradas en Railway (Dashboard → servicio → **Variables**, o `railway variables --set`). Los **valores** viven solo en Railway/Supabase, nunca en este repo (ver sección 8 sobre por qué).

| Variable | Quién la usa | Para qué |
|---|---|---|
| `DATABASE_URL` | los 10 servicios (**incluido `api-gateway`** — se olvidó una vez, ver `CHANGELOG.md` 2026-07-25) | Connection string de Supabase (Prisma) |
| `JWT_SECRET` | los 10 servicios | Firma/verifica JWTs — **tiene que ser el mismo valor en los 10**, si no las sesiones no cruzan entre servicios |
| `JWT_EXPIRES_IN` | los 10 servicios | Duración del token (ver `auth-service`) |
| `FRONTEND_URL` | los 10 servicios | CORS — el único origen permitido |
| `NODE_ENV` | los 10 servicios | `production` |
| `PORT` | los 10 servicios | **A diferencia de Render, Railway NO inyecta esta variable sola** — hay que setearla a mano con el mismo valor que `<NOMBRE>_SERVICE_PORT` de ese servicio (ej. `chat-service`: `CHAT_SERVICE_PORT=3008` y también `PORT=3008`). Sin esto, el proxy de borde de Railway no encuentra el puerto y devuelve 502 — ver sección 7 |
| `<NOMBRE>_SERVICE_URL` (×10, ej. `AUTH_SERVICE_URL`, incluye `ADMIN_SERVICE_URL` desde 2026-07-30) | solo `api-gateway` | A dónde reenviar cada ruta — ver tabla de ruteo en la sección siguiente. En Railway apuntan a la red interna (`http://<servicio>.railway.internal:<puerto>`), no a URLs públicas |
| `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL`, `DEEPSEEK_MODEL` | `portfolio-service` (análisis de CV), `assistant-service` (chatbot Joaquín) | Integración con DeepSeek para IA — si cambia el modelo soportado por DeepSeek, hay que actualizar `DEEPSEEK_MODEL` en **ambos** servicios, en **ambas** plataformas (Railway y Render) si se quiere mantener el respaldo funcional |
| `MAX_PDF_SIZE_MB`, `UPLOAD_DIR` | `portfolio-service` | Subida/análisis de CV |

**Si `JWT_SECRET` difiere entre servicios**, el síntoma es: login funciona (auth-service firma el token) pero cualquier otro endpoint devuelve 401 (el servicio que lo recibe no puede verificarlo con su propio secreto). Si ves eso, es lo primero a revisar.

### Ruteo del gateway (`BACKEND/apps/api-gateway/src/gateway.controller.ts`)

Todo pasa por `/api/*`. El gateway decide a qué servicio reenviar según el path — **el orden de los `if` importa** (los más específicos van antes que los genéricos, ej. `/api/company/jobs/:id/applications` antes que `/api/company/jobs` antes que `/api/company`):

| Prefijo de ruta | Servicio destino |
|---|---|
| `/api/auth` | auth-service |
| `/api/profile` | candidate-service |
| `/api/skills`, `/api/experiences`, `/api/education`, `/api/projects`, `/api/cv`, `/api/portfolio` | portfolio-service |
| `/api/company/jobs/:id/applications`, `/api/company/jobs/:id/apply` | applications-service |
| `/api/company/applications` | applications-service |
| `/api/notifications` | applications-service |
| `/api/company/analytics` | applications-service |
| `/api/company/jobs` | jobs-service |
| `/api/company` (todo lo demás) | company-service |
| `/api/jobs/:id/apply`, `/api/jobs/my-applications` | applications-service |
| `/api/jobs` (todo lo demás) | jobs-service |
| `/api/chat` | chat-service |
| `/api/assistant` | assistant-service |
| `/api/dashboard` | dashboard-service |
| `/api/admin`, `/api/feature-flags` | admin-service (nuevo, 2026-07-30 — parámetros/catálogos/audit log del panel administrativo; `/api/feature-flags` no exige rol ADMIN, cualquier autenticado) |

Si agregás un endpoint nuevo en un servicio existente, **acordate de agregar la regla acá también** — si no, el gateway devuelve 404 aunque el servicio sí tenga la ruta.

---

## 5. Cómo desplegar cambios

### Backend (los 10 servicios) — Railway

**Hay auto-deploy desde el 2026-07-25** — los 10 servicios están conectados al repo de GitHub `santiagobustamante/talentbridge-v3`, rama `master` (antes estaban enlazados solo por CLI, como en la fila de abajo). Un `git push` a `master` que toque `BACKEND/` dispara rebuild+redeploy automático en Railway para el/los servicio(s) afectados, usando el `rootDirectory`/`dockerfilePath` ya configurado por servicio (sección 3) — no hace falta ningún paso manual. Verificado extremo a extremo con `dashboard-service` y `api-gateway` (build vía GitHub exitoso, Dockerfile correcto).

Para conectar un servicio nuevo (u otro proyecto) del mismo modo: Railway → servicio → **Settings → Source → Connect Repo**. La UI de selección de repo tiene un bug de click — hay que navegar con teclado (`↓` + `Enter`), no con click directo (ver `docs/BUGS_AND_FIXES.md` si hace falta el detalle). Conectar el repo **no** resetea `Root Directory` ni `Dockerfile Path` — son independientes.

Si hace falta un deploy manual puntual (ej. antes de pushear, o para probar algo sin commitear), el CLI sigue funcionando igual:

```bash
railway up --service <nombre-del-servicio> --detach -c
```

...repetido por cada uno de los 10 servicios que cambiaste (no hay un comando "desplegar todos" — un loop de shell simple alcanza). Corré esto **desde la raíz del repo** (`cd` a `VERSION 3`, no a `BACKEND`) — el CLI de Railway sube el repo completo como archivo sin importar el directorio de trabajo, y la config server-side (`rootDirectory: /BACKEND`, sección 3) es la que resuelve el resto. **No uses `--path-as-root BACKEND`**: aunque parece la solución obvia, ignora el `dockerfilePath` persistido del servicio y cae al `Dockerfile` genérico de `BACKEND/` (multi-stage, sin `--target`), que construye el *último* stage del archivo para los 10 servicios por igual — ver la trampa completa en la sección 7 y `CHANGELOG.md` 2026-07-25.

Para reiniciar un servicio sin cambios de código (ej. tras cambiar una env var), `railway redeploy --service <nombre> -y` alcanza y es mucho más rápido (no reconstruye la imagen).

Ver estado: `railway status --json` → cada `serviceInstance.latestDeployment.status` (`QUEUED` → `BUILDING` → `DEPLOYING` → `SUCCESS`, o `FAILED`). Ojo: `activeDeployments` (sin "latest") muestra el deployment que está **sirviendo tráfico ahora mismo** — si un build nuevo falla, Railway no lo promueve y `activeDeployments` sigue mostrando el anterior como sano; hay que mirar `latestDeployment` para saber si el último intento realmente funcionó.

### Frontend — Vercel

**Hay auto-deploy desde el 2026-07-25** — el proyecto está conectado al repo de GitHub `santiagobustamante/talentbridge-v3` (antes solo por CLI, como en la fila de abajo), con **Root Directory = `FRONTEND`** configurado en Settings → Build and Deployment (obligatorio: no hay `package.json` en la raíz del repo, así que sin este ajuste el primer build por Git falla). Un `git push` a la rama de producción dispara build+deploy automático.

Si hace falta un deploy manual puntual, el CLI sigue funcionando igual:

```bash
cd FRONTEND
npx vercel --prod --yes
```

(Ya está autenticado como `santiagobustamante` en esta máquina — `.vercel/project.json` tiene el `projectId`/`orgId`. En una máquina nueva hace falta `npx vercel login` primero.)

### Base de datos — Supabase (sin auto-deploy, a propósito)

Supabase tiene una integración nativa de GitHub (Project → Settings → Integrations → GitHub) que aplica migraciones al mergear a la rama de producción. **Se investigó el 2026-07-25 y se decidió no conectarla**: esa integración espera migraciones en formato Supabase CLI (carpeta `supabase/migrations/*.sql`), y este proyecto no tiene esa carpeta — usa Prisma (`BACKEND/prisma/migrations/`), aplicado a mano contra el pooler de sesión como describe la sección 6. Conectarla no haría nada (no encontraría migraciones que aplicar) y podría sugerir engañosamente que las migraciones se auto-despliegan cuando en realidad siguen siendo un paso manual. Ver `docs/DECISIONS.md` para el detalle.

### Revertir a Render si Railway falla

`environment.prod.ts` tiene las URLs de Railway comentadas junto a las de Render (o viceversa, según cuándo se lea esto) — cambiar `apiUrl`/`wsUrl`/`cvUploadUrl` a las URLs de Render de la sección 2 y correr el deploy de Vercel de arriba. Render sigue con los 10 servicios desplegados y las mismas env vars — no requiere ningún paso adicional del lado del backend.

---

## 6. Migraciones de Prisma contra producción — ⚠️ el pooler de Supabase

Esto costó bastante tiempo diagnosticar la primera vez — léelo antes de correr una migración nueva.

### El problema

Supabase expone la base por **dos conexiones distintas**, mismo host, dos puertos:

- **Puerto 6543** — *transaction pooler* (pgbouncer en modo transacción). Es el `DATABASE_URL` configurado en los 10 servicios de Render — perfecto para queries normales de la app, pero **no soporta el advisory lock que `prisma migrate deploy` necesita** — el comando se queda colgado indefinidamente sin dar ningún error.
- **Puerto 5432** en el mismo host del pooler — *session pooler* (modo sesión). Este sí soporta el lock. **Es el que hay que usar para migrar.**
- Conexión directa (`db.<project-ref>.supabase.co:5432`, sin pasar por el pooler) — **no funciona desde esta red** (parece ser IPv6-only en este proyecto de Supabase y da `P1001: Can't reach database server`). No usar.

### Cómo migrar (paso a paso)

1. Escribí el cambio en `BACKEND/prisma/schema.prisma`.
2. Generá el SQL de la migración **sin necesitar conexión a ninguna base** (diff puro de schema a schema):
   ```bash
   cd BACKEND
   git show HEAD:prisma/schema.prisma > /tmp/schema_old.prisma   # o el schema anterior que corresponda
   npx prisma migrate diff --from-schema /tmp/schema_old.prisma --to-schema ./prisma/schema.prisma --script
   ```
3. Creá la carpeta de migración a mano (`prisma/migrations/<timestamp>_<nombre>/migration.sql`) con ese SQL.
4. **Probala primero contra una base descartable**, nunca directo a producción:
   ```bash
   docker run -d --name scratch_test -e POSTGRES_PASSWORD=test -e POSTGRES_DB=test -p 55432:5432 postgres:16
   DATABASE_URL="postgresql://postgres:test@localhost:55432/test" npx prisma migrate deploy
   DATABASE_URL="postgresql://postgres:test@localhost:55432/test" npx prisma migrate diff --from-config-datasource ./prisma.config.ts --to-schema ./prisma/schema.prisma --exit-code
   # tiene que decir "No difference detected"
   docker rm -f scratch_test
   ```
5. Recién ahí, contra producción — **con el puerto cambiado a 5432** (tomá el `DATABASE_URL` real de cualquier servicio en Render, sección 8, y reemplazá `:6543/` por `:5432/` en la URL antes de usarlo):
   ```bash
   DATABASE_URL="<el mismo DATABASE_URL de Render, pero con :5432/ en vez de :6543/>" npx prisma migrate deploy
   ```
6. Confirmá con `npx prisma migrate status` (mismo `DATABASE_URL` con :5432/) que diga **"Database schema is up to date!"**.
7. `npx prisma generate` local para regenerar el cliente y poder seguir compilando (el schema cambió).

El `DATABASE_URL` de los 10 servicios en Render **no hace falta tocarlo** — se queda apuntando al pooler de transacciones (6543), que es correcto para el tráfico normal de la app. El cambio a 5432 es solo para el comando de migración puntual, nunca para la config permanente de los servicios.

---

## 7. Problemas conocidos / comportamiento esperado

### Railway: `railway up` sube siempre el repo completo, y `--path-as-root` rompe el build

Ya corregido (2026-07-25) pero documentado acá para no volver a pisarlo. Dos trampas relacionadas, ambas alrededor de cómo Railway resuelve qué construir:

1. **`railway up` ignora el directorio de trabajo.** Correrlo desde `BACKEND/` en vez de la raíz del repo **no** cambia qué se sube — el CLI siempre empaqueta el repo git completo. Lo que sí importa es la config `rootDirectory`/`dockerfilePath` persistida *server-side* por servicio (sección 3) — sin esa config, Railway cae a autodetección (Railpack) sobre la raíz del repo, ve `BACKEND/`, `FRONTEND/`, `docs/`, etc., y falla con `Railpack could not determine how to build the app`.
2. **`--path-as-root BACKEND` parece la solución, pero rompe distinto:** sí acota el archivo subido a `BACKEND/`, pero al hacerlo Railway **ignora el `dockerfilePath` persistido** del servicio y busca un `Dockerfile` genérico en la raíz de lo subido — que en este repo es `BACKEND/Dockerfile`, el multi-stage combinado que sirve para desarrollo local (`docker-compose`). Sin especificar `--target`, Docker construye el **último stage** del archivo (`dashboard-service`, por ser el último bloque `FROM ... AS dashboard-service`) — los 10 servicios terminan corriendo literalmente el mismo build de `dashboard-service`, cada uno bajo su propio dominio/nombre, sin ningún error visible (el build "success", el deploy "success", pero cada servicio responde con las rutas de otro).

**La solución correcta** es la de la sección 3: setear `rootDirectory: /BACKEND` + `dockerfilePath: docker/<nombre>.Dockerfile` por servicio vía la API GraphQL, y desde ahí `railway up` (sin `--path-as-root`) desde la raíz del repo funciona perfecto, porque usa el Dockerfile específico de un solo target en vez del genérico multi-stage.

**Cómo detectarlo si vuelve a pasar:** el build y el deploy muestran `SUCCESS`, pero el servicio responde con rutas/lógica que no son las suyas (ej. `api-gateway` devolviendo logs de "Dashboard Service corriendo en..."). `railway logs --service <nombre> --deployment` muestra qué app arrancó realmente.

### Los servicios se "duermen" (plan free de Render — no aplica a Railway Hobby)

Específico de Render (el respaldo). Railway Hobby es un plan pago sin sleep automático, así que este problema no debería reaparecer mientras el backend primario sea Railway — si vuelve a pasar un 502/503 intermitente en Railway, sospechar primero de la trampa de la sección anterior o de un problema real, no de un cold start.

Cualquiera de los 10 servicios de Render sin tráfico ~15 minutos se suspende solo. El primer pedido después lo despierta, pero tarda **hasta 25-30 segundos** en volver a estar listo. Si en ese lapso el borde de Render corta la conexión antes de que el contenedor responda, el gateway ve un 502/503/504.

**Mitigado (no eliminado)** desde `BUG-018` (ver `BUGS_AND_FIXES.md`): el gateway reintenta automáticamente hasta 2 veces (4s de espera entre cada uno) cuando ve 502/503/504, pero solo en peticiones `GET` — sigue pudiendo fallar si el arranque tarda más que la ventana total de reintento (~13s), y `POST`/`PATCH`/`PUT`/`DELETE` no reintentan (para no arriesgar duplicar un efecto).

Si el usuario reporta un error que desaparece solo al reintentar unos segundos después, **primero sospechar de esto antes que de un bug real** — diagnosticar pegándole directo a la URL del servicio (sección 2) con y sin pasar por el gateway; si el directo funciona (aunque tarde), es esto.

Solución completa (no implementada, hay que evaluarla con el usuario si vuelve a molestar): pasar a un plan pago de Render, que no duerme los servicios.

### Bug conocido, no relacionado a lo de arriba: "undefined" en algunos títulos de vacante

Reproducido en `company-dashboard` y en la búsqueda de vacantes del candidato — un campo (posiblemente ciudad o modalidad) sale `undefined` concatenado al título en algunos casos. Investigación pendiente, no bloqueante. Ver la tarea abierta / `docs/BUGS_AND_FIXES.md` si ya se resolvió para cuando leas esto.

---

## 8. Credenciales necesarias (y dónde conseguirlas — **no están en este repo, a propósito**)

Ninguna de estas se guarda en el repo (ni en este archivo) porque el repo puede llegar a ser público — si alguna de estas se filtra, hay que rotarla (regenerarla) apenas se detecte.

| Credencial | Para qué | Dónde conseguirla |
|---|---|---|
| **Railway CLI login** | Operar los 10 servicios (deploys, env vars, logs) | `railway login` — abre el navegador para autenticar, no hay forma de que un agente lo complete por vos (OAuth interactivo). Una vez logueado, `railway whoami` confirma la sesión y queda persistida en `~/.railway/config.json` en esa máquina |
| **Railway API token (GraphQL)** | Solo hace falta para lo que el CLI no cubre (`rootDirectory`/`dockerfilePath`, sección 3) | Tras `railway login`, el `accessToken` ya queda en `~/.railway/config.json` (`.user.accessToken`) — se puede reusar directo para llamar a `https://backboard.railway.com/graphql/v2`, no hace falta generar uno nuevo aparte |
| **Render API Token** | Solo si hace falta operar el respaldo en Render | [dashboard.render.com](https://dashboard.render.com) → ícono de usuario (arriba a la derecha) → **Account Settings** → **API Keys** → Create API Key |
| **`DATABASE_URL` real de Supabase** | Migrar el schema, o correr una query puntual contra producción | Railway → cualquier servicio backend → **Variables** → copiar el valor de `DATABASE_URL`. También está en Supabase → el proyecto → **Settings** → **Database** → **Connection string** |
| **Credenciales de Vercel** | Desplegar el frontend | `npx vercel login` (usa el navegador para autenticar) — ya está logueado como `santiagobustamante` en esta máquina |
| **`JWT_SECRET`** | Ya configurado en los 10 servicios — no hace falta conocerlo salvo que quieras rotarlo (cambiarlo invalida todas las sesiones activas) | Railway → cualquier servicio → Variables |
| **`DEEPSEEK_API_KEY`** | Solo si vas a tocar el análisis de CV o el chatbot | Railway → `portfolio-service` o `assistant-service` → Variables |

**Si estás arrancando en una cuenta/sesión de Claude Code nueva:** pedile al usuario que corra `railway login` él mismo (ver arriba) y confirme con `railway whoami`. Con eso alcanza para diagnosticar, redesplegar y ver logs de los 10 servicios sin tener que entrar manualmente al dashboard cada vez.

---

## 9. Usuarios de prueba

| Rol | Email | Password | Notas |
|---|---|---|---|
| Candidato (perfil demo principal, rico en datos) | `bustamantemolinasantiago@gmail.com` | `Santiago.123` | Perfil publicado, slug `santiago-bustamante`, 6 habilidades, 4 proyectos, conversación de ejemplo con `empresa001@demo.com`. Es la cuenta de demo/presentación — no borrar ni regenerar sus datos sin confirmación puntual (tiene datos con el nombre real del desarrollador). |
| Candidato genérico (100 cuentas) | `candidato001@demo.com` … `candidato100@demo.com` | `Candidato.123` | Datos variados generados por el seed masivo. |
| Empresa (demo principal) | `empresa001@demo.com` | `Empresa.123` | "Talento Llanero S.A.S." — la empresa usada en casi todas las verificaciones de esta sesión. |
| Empresa (alternativas) | `talento@llanero.com`, `conecta@empleo.com`, `rrhh@andinos.com` | `Empresa.123` | ~50 empresas más del seed de vacantes (`seed-jobs.ts`), mismo password. |

Detalle de qué seed crea cada cuenta: [`DATABASE.md`](./DATABASE.md#4-usuarios-y-empresas-demo).

---

## 10. Documentación relacionada

- [`CLAUDE.md`](../CLAUDE.md) — punto de entrada del proyecto, reglas de seguridad, cómo levantar todo **local**
- [`PROJECT_OVERVIEW.md`](./PROJECT_OVERVIEW.md) — descripción general, usuarios demo
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — arquitectura de los 10 microservicios
- [`DATABASE.md`](./DATABASE.md) — schema, seeds, de dónde sale cada dato demo
- [`CHANGELOG.md`](./CHANGELOG.md) — historial cronológico de cambios reales
- [`BUGS_AND_FIXES.md`](./BUGS_AND_FIXES.md) — bugs encontrados y su solución (incluye `BUG-018`, el de los servicios dormidos)
- [`DECISIONS.md`](./DECISIONS.md) — decisiones técnicas no obvias, incluida la migración Railway→Render
- [`NEXT_STEPS.md`](./NEXT_STEPS.md) / [`PHASES.md`](./PHASES.md) — qué queda pendiente y en qué fase quedó cada frente de trabajo
