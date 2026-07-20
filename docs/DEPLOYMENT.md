# Despliegue — TalentBridge V3

Todo lo que hace falta saber para desplegar, redesplegar, diagnosticar o migrar la base de datos de este proyecto en producción. Escrito para que un agente (Claude Code u otro) que nunca vio este proyecto pueda retomarlo sin tener que redescubrir nada por prueba y error — varias de las cosas de acá (sobre todo la sección 6) costaron tiempo real de diagnóstico la primera vez.

No repite lo que ya está en [`CLAUDE.md`](../CLAUDE.md) (reglas de seguridad, cómo levantar el proyecto **local**) ni en [`PROJECT_OVERVIEW.md`](./PROJECT_OVERVIEW.md) — este documento es específicamente sobre el entorno **desplegado** (producción).

---

## 1. Resumen: qué está desplegado dónde

| Pieza | Dónde | Plan |
|---|---|---|
| Frontend (Angular) | **Vercel** | Hobby (gratis) |
| Backend (10 microservicios NestJS, uno por contenedor Docker) | **Render** | Free |
| Base de datos (PostgreSQL) | **Supabase** | Free |

El proyecto se migró de Railway a Render en una sesión anterior por 502s persistentes a nivel de cuenta de Railway — ver `DECISIONS.md` si hace falta el detalle de por qué.

---

## 2. URLs de producción

| Servicio | URL |
|---|---|
| **Frontend** | https://talentbridge-v3.vercel.app |
| **API Gateway** (todo el tráfico del frontend pasa por acá, prefijo `/api`) | https://api-gateway-ey6d.onrender.com |
| auth-service | https://auth-service-99od.onrender.com |
| candidate-service | https://candidate-service-bzy0.onrender.com |
| portfolio-service | https://portfolio-service-uqi0.onrender.com |
| company-service | https://company-service-vua7.onrender.com |
| jobs-service | https://jobs-service-vq28.onrender.com |
| applications-service | https://applications-service-8co9.onrender.com |
| chat-service | https://chat-service-olzl.onrender.com |
| assistant-service | https://assistant-service-lyq5.onrender.com |
| dashboard-service | https://dashboard-service-ndtn.onrender.com |

Los 10 servicios son **públicos** (no `private service`) porque el plan free de Render no soporta redes privadas entre servicios — el gateway les habla por HTTP público, no por red interna. La única excepción real es `chat-service` (WebSocket directo desde el navegador, no pasa por el gateway) y `portfolio-service` (la subida de CV le pega directo, bypasea el gateway) — ver `FRONTEND/src/environments/environment.prod.ts`, están comentadas ahí mismo.

Swagger no está desplegado en producción (solo corre en local, `http://localhost:3000/api/docs`).

---

## 3. Servicios de Render — IDs

Los IDs no son secretos (no dan acceso a nada sin el token de API) — quedan acá para poder operar por API sin tener que buscarlos cada vez.

| Servicio | Render Service ID |
|---|---|
| api-gateway | `srv-d9duojbtqb8s739g444g` |
| auth-service | `srv-d9duokt7vvec73eovgtg` |
| candidate-service | `srv-d9duolf7f7vs739gvv7g` |
| portfolio-service | `srv-d9duokd7vvec73eovfl0` |
| company-service | `srv-d9duom57vvec73eovj60` |
| jobs-service | `srv-d9duomn7f7vs739h01hg` |
| applications-service | `srv-d9duon3tqb8s739g49s0` |
| chat-service | `srv-d9duojt7vvec73eovem0` |
| assistant-service | `srv-d9duonjbc2fs73etfoi0` |
| dashboard-service | `srv-d9duoo3bc2fs73etfpkg` |

Cada uno tiene su propio `Dockerfile` en `BACKEND/docker/<nombre-servicio>.Dockerfile`, `rootDir` = `BACKEND` en la config de Render.

### Cómo operar por API en vez de por el dashboard

```
Authorization: Bearer <RENDER_API_TOKEN>
Base: https://api.render.com/v1
```

- Ver deploys recientes de un servicio: `GET /services/{id}/deploys?limit=1`
- Disparar un redeploy manual: `POST /services/{id}/deploys` (body `{}`) — normalmente **no hace falta**, ver sección 5.
- Ver/leer variables de entorno: `GET /services/{id}/env-vars`
- Ver estado del servicio (suspendido o no, URL pública, etc.): `GET /services/{id}`

El token de API **no está en este repo** — ver sección 8.

---

## 4. Variables de entorno por servicio

Nombres de las variables que cada servicio necesita configuradas en Render (Dashboard → servicio → **Environment**). Los **valores** viven solo en Render/Supabase, nunca en este repo (ver sección 8 sobre por qué).

| Variable | Quién la usa | Para qué |
|---|---|---|
| `DATABASE_URL` | los 10 servicios | Connection string de Supabase (Prisma) |
| `JWT_SECRET` | los 10 servicios | Firma/verifica JWTs — **tiene que ser el mismo valor en los 10**, si no las sesiones no cruzan entre servicios |
| `JWT_EXPIRES_IN` | los 10 servicios | Duración del token (ver `auth-service`) |
| `FRONTEND_URL` | los 10 servicios | CORS — el único origen permitido |
| `NODE_ENV` | los 10 servicios | `production` |
| `PORT` | los 10 servicios | Puerto que Render asigna (lo inyecta Render solo, no hace falta setearlo a mano) |
| `<NOMBRE>_SERVICE_URL` (×9, ej. `AUTH_SERVICE_URL`) | solo `api-gateway` | A dónde reenviar cada ruta — ver tabla de ruteo en la sección siguiente. Tienen que apuntar a las URLs públicas de la sección 2 |
| `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL`, `DEEPSEEK_MODEL` | `portfolio-service` (análisis de CV), `assistant-service` (chatbot Joaquín) | Integración con DeepSeek para IA |
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

Si agregás un endpoint nuevo en un servicio existente, **acordate de agregar la regla acá también** — si no, el gateway devuelve 404 aunque el servicio sí tenga la ruta.

---

## 5. Cómo desplegar cambios

### Backend (los 10 servicios)

**Auto-deploy está activado** (`autoDeploy: yes`, rama `master`, conectado a `https://github.com/santiagobustamante/talentbridge-v3`). Con solo hacer:

```bash
git push
```

Render reconstruye y redespliega **automáticamente**. No hace falta disparar nada a mano — el `POST /services/{id}/deploys` de la sección 3 es solo para forzar un redeploy sin cambios de código (por ejemplo, si un servicio quedó en mal estado y querés reiniciarlo limpio).

Cada deploy tarda ~1-2 minutos por servicio en construir la imagen Docker + arrancar. Para ver el estado: `GET /services/{id}/deploys?limit=1` → campo `deploy.status` (`queued` → `build_in_progress` → `update_in_progress` → `live`, o `build_failed`/`update_failed` si algo salió mal).

### Frontend

**NO tiene auto-deploy** — Vercel está enlazado por CLI, no por integración de Git. Cada cambio necesita un deploy manual:

```bash
cd FRONTEND
npx vercel --prod --yes
```

(Ya está autenticado como `santiagobustamante` en esta máquina — `.vercel/project.json` tiene el `projectId`/`orgId`. En una máquina nueva hace falta `npx vercel login` primero.)

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

### Los servicios se "duermen" (plan free de Render)

Cualquiera de los 10 servicios sin tráfico ~15 minutos se suspende solo. El primer pedido después lo despierta, pero tarda **hasta 25-30 segundos** en volver a estar listo. Si en ese lapso el borde de Render corta la conexión antes de que el contenedor responda, el gateway ve un 502/503/504.

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
| **Render API Token** | Operar servicios por API (deploys, env vars, logs) sin entrar al dashboard | [dashboard.render.com](https://dashboard.render.com) → ícono de usuario (arriba a la derecha) → **Account Settings** → **API Keys** → Create API Key |
| **`DATABASE_URL` real de Supabase** | Migrar el schema, o correr una query puntual contra producción | Render → cualquier servicio backend → **Environment** → copiar el valor de `DATABASE_URL`. También está en Supabase → el proyecto → **Settings** → **Database** → **Connection string** |
| **Credenciales de Vercel** | Desplegar el frontend | `npx vercel login` (usa el navegador para autenticar) — ya está logueado como `santiagobustamante` en esta máquina |
| **`JWT_SECRET`** | Ya configurado en los 10 servicios de Render — no hace falta conocerlo salvo que quieras rotarlo (cambiarlo invalida todas las sesiones activas) | Render → cualquier servicio → Environment |
| **`DEEPSEEK_API_KEY`** | Solo si vas a tocar el análisis de CV o el chatbot | Render → `portfolio-service` o `assistant-service` → Environment |

**Si estás arrancando en una cuenta/sesión de Claude Code nueva:** pedile al usuario que te pase el Render API Token directo en el chat (no lo pidas para guardarlo en un archivo del repo). Con eso alcanza para diagnosticar, redesplegar y ver logs de los 10 servicios sin tener que entrar manualmente al dashboard cada vez.

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
