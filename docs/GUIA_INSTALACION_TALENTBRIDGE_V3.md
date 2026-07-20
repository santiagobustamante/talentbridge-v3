# Guía de instalación — TalentBridge V3

Auditado directamente contra el código del repositorio (no contra documentación previa). Cada comando listado fue verificado contra `BACKEND/package.json`, `FRONTEND/package.json`, `docker-compose.yml`, `BACKEND/Dockerfile`, `BACKEND/.env.example` y `BACKEND/prisma/`. Fecha de auditoría: 2026-07-18.

## 1. Requisitos

| Requisito | Versión | Evidencia |
|---|---|---|
| Node.js | El `Dockerfile` usa `node:22-alpine` en las 11 etapas de build/runtime (`BACKEND/Dockerfile:2,26,33,40,...`). Ningún `package.json` del repo (`BACKEND/package.json`, `FRONTEND/package.json`) declara un campo `engines`, así que no hay una versión mínima forzada por npm. El entorno donde se auditó este documento corre Node `v24.14.1` sin problemas. | `BACKEND/Dockerfile`, `BACKEND/package.json`, `FRONTEND/package.json` |
| npm | No especificado en ningún `package.json` (sin campo `engines`). El entorno de auditoría usa npm `11.11.0`. | — |
| PostgreSQL | `postgres:16-alpine` (imagen de la única base de datos en `docker-compose.yml`). | `docker-compose.yml:3` |
| Docker Compose | El `docker-compose.yml` usa la sintaxis moderna (`services:` como clave raíz sin declarar `version:`), compatible con Docker Compose v2. No se encontró una versión mínima explícita en el repo. | `docker-compose.yml` |
| Angular CLI | `@angular/cli` `^19.2.27` está en `devDependencies` de `FRONTEND/package.json` — se instala junto con `npm install`, no hace falta instalarlo global. | `FRONTEND/package.json:32` |
| NestJS CLI | `@nestjs/cli` `^11.0.0` en `devDependencies` de `BACKEND/package.json`, misma lógica. | `BACKEND/package.json:89` |

No se encontró evidencia suficiente en el repositorio para confirmar una versión mínima de Docker Desktop o Docker Engine.

## 2. Configuración (variables de entorno)

El archivo de referencia es `BACKEND/.env.example`. Existe también un `BACKEND/.env` real en el repositorio (no versionado en git — el árbol de trabajo lo tiene localmente); **no se leyó ni se reproduce aquí ningún valor de `BACKEND/.env` real** — todo lo listado abajo sale de `.env.example`, que ya viene con placeholders, no secretos reales.

```env
NODE_ENV=development
FRONTEND_URL=http://localhost:4200
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5433/smart_portfolio?schema=public"
# Solo hace falta en producción con un pooler delante de DATABASE_URL (ej. Supabase,
# puerto 6543 pgbouncer) -- prisma.config.ts la usa para migrate/db push, que no
# funcionan bien contra un pooler en modo transaction. En dev local (un solo
# Postgres, sin pooler) se deja vacía y cae a DATABASE_URL.
DIRECT_URL=
JWT_SECRET=CAMBIAR_POR_UN_SECRETO_SEGURO
JWT_EXPIRES_IN=1d
UPLOAD_DIR=uploads
MAX_PDF_SIZE_MB=5

DEEPSEEK_API_KEY=CAMBIAR_POR_TU_API_KEY_DE_DEEPSEEK
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat

API_GATEWAY_PORT=3000

AUTH_SERVICE_URL=http://localhost:3001
AUTH_SERVICE_PORT=3001

CANDIDATE_SERVICE_URL=http://localhost:3002
CANDIDATE_SERVICE_PORT=3002

PORTFOLIO_SERVICE_URL=http://localhost:3003
PORTFOLIO_SERVICE_PORT=3003

COMPANY_SERVICE_URL=http://localhost:3004
COMPANY_SERVICE_PORT=3004

SEARCH_SERVICE_URL=http://localhost:3004

JOBS_SERVICE_URL=http://localhost:3006
JOBS_SERVICE_PORT=3006

APPLICATIONS_SERVICE_URL=http://localhost:3007
APPLICATIONS_SERVICE_PORT=3007

CHAT_SERVICE_URL=http://localhost:3008
CHAT_SERVICE_PORT=3008

ASSISTANT_SERVICE_URL=http://localhost:3009
ASSISTANT_SERVICE_PORT=3009

DASHBOARD_SERVICE_URL=http://localhost:3010
DASHBOARD_SERVICE_PORT=3010
```

Notas verificadas contra código:
- `DEEPSEEK_API_KEY`/`DEEPSEEK_BASE_URL`/`DEEPSEEK_MODEL` las consume `BACKEND/libs/common/src/ai/deepseek.service.ts` (integración real con DeepSeek para el asistente "Joaquín" y el análisis de CV, ver `docs/DECISIONS.md`).
- `API_GATEWAY_PORT` la lee `apps/api-gateway/src/main.ts:32` (`process.env['API_GATEWAY_PORT'] || 3000`).
- Cuando se corre con Docker, `docker-compose.yml` inyecta variables a cada servicio vía `env_file: ./BACKEND/.env` (no via `environment:` inline) — hace falta que `BACKEND/.env` exista y tenga los valores reales antes de `docker compose up`.
- El frontend **no** lee variables de entorno en tiempo de ejecución — usa archivos de configuración estática (`FRONTEND/src/environments/environment.ts` para dev, `environment.prod.ts` para producción), con `apiUrl`, `wsUrl` y `cvUploadUrl` hardcodeados por archivo. En dev apuntan a `http://localhost:3000/api`, `http://localhost:3008` y `http://localhost:3003` respectivamente.

## 3. Instalación de dependencias

```bash
# Backend (monorepo NestJS — un solo package.json para las 10 apps + libs)
cd BACKEND
npm install

# Frontend (Angular 19 standalone)
cd FRONTEND
npm install
```

No existe un `package.json` por microservicio dentro de `BACKEND/apps/*` — es un monorepo NestJS con un único `BACKEND/package.json` en la raíz del backend (confirmado: no se encontraron archivos `BACKEND/apps/*/package.json`).

## 4. Base de datos y Prisma

```bash
cd BACKEND
npx prisma generate      # genera el cliente en libs/database/src/generated (no editar a mano)
npx prisma migrate deploy
```

Detalle verificado en `BACKEND/prisma/schema.prisma`:
- Generador: `prisma-client`, salida en `../libs/database/src/generated`, `moduleFormat = "cjs"`.
- Datasource: `postgresql`.
- 16 modelos: `User`, `Profile`, `ProfileView`, `CompanyProfile`, `Skill`, `SkillEndorsement`, `Experience`, `Education`, `Project`, `CvDocument`, `CvAnalysis`, `Conversation`, `ChatMessage`, `ChatBlock`, `JobOffer`, `JobApplication`.
- Historial de migraciones (`BACKEND/prisma/migrations/`): `20260606192350_init`, `20260606223101_add_company_role`, `20260617053007_improve_candidate_profile_phase1`.

**Advertencia documentada en el propio repo** (`docs/DECISIONS.md`, entrada "`prisma migrate dev` no es seguro en este proyecto"): el historial de migraciones está desalineado con el estado real del schema — cambios posteriores a la última migración formal se aplicaron con `prisma db push` en vez de generar migraciones nuevas. Esto significa que, contra una base de datos ya poblada (la de desarrollo del repo), `npx prisma migrate deploy` puede no reflejar el 100% del schema actual, y `npx prisma migrate dev` pedirá un reset completo de la base. Para sincronizar el schema completo contra una base ya existente, el propio repo documenta usar `npx prisma db push` en vez de `migrate dev`/`migrate deploy`. Para una base **nueva y vacía** (instalación desde cero), `npx prisma migrate deploy` debería ser suficiente porque no hay datos previos con los que entrar en conflicto — no se encontró evidencia de que se haya probado explícitamente este escenario en el repositorio.

## 5. Ejecución con Docker

`docker-compose.yml` (raíz del repo) define, dentro del proyecto Docker `version3` (ejecutar siempre con `-p version3`):

| Servicio | Contenedor | Puerto host | Imagen/build |
|---|---|---|---|
| postgres | `smart_portfolio_db_v3` | `5433:5432` | `postgres:16-alpine`, volumen `pgdata_v3` |
| api-gateway | `talentbridge_api_gateway` | `3000:3000` | `BACKEND/Dockerfile`, target `api-gateway` |
| auth-service | `talentbridge_auth_service` | `3001:3001` | target `auth-service` |
| candidate-service | `talentbridge_candidate_service` | `3002:3002` | target `candidate-service` |
| portfolio-service | `talentbridge_portfolio_service` | `3003:3003` | target `portfolio-service` |
| company-service | `talentbridge_company_service` | `3004:3004` | target `company-service` |
| jobs-service | `talentbridge_jobs_service` | `3006:3006` | target `jobs-service` |
| applications-service | `talentbridge_applications_service` | `3007:3007` | target `applications-service` |
| chat-service | `talentbridge_chat_service` | `3008:3008` | target `chat-service` |
| assistant-service | `talentbridge_assistant_service` | `3009:3009` | target `assistant-service` |
| dashboard-service | `talentbridge_dashboard_service` | `3010:3010` | target `dashboard-service` |

Nota: no hay puerto `3005` — no existe un servicio con ese puerto en `docker-compose.yml` ni en `.env.example` (posible hueco intencional dejado en la numeración, no un servicio faltante documentado).

Cada servicio de aplicación usa `env_file: ./BACKEND/.env` y depende de `postgres` (`condition: service_healthy`); `api-gateway` además depende de `auth-service` (`condition: service_started`). Red: `talentbridge_net` (bridge). Volumen: `pgdata_v3`. El frontend **no** está en `docker-compose.yml` — se corre aparte con `npm start` (ver sección 6).

```bash
# Solo Postgres (uso típico en desarrollo: backend/frontend corren fuera de Docker)
docker compose -p version3 up -d postgres

# Todo el backend en contenedores (requiere BACKEND/.env poblado)
docker compose -p version3 up -d

# Bajar servicios sin borrar datos (NUNCA usar -v en este proyecto)
docker compose -p version3 down
```

`BACKEND/Dockerfile` es un multi-stage build: una etapa base (`FROM node:22-alpine`) instala dependencias, genera el cliente Prisma (`npx prisma generate`) y compila las 10 apps (`npx nest build <servicio>`); luego 10 etapas finales (una por servicio, nombradas igual que los `target` de `docker-compose.yml`) copian solo el `dist/` de esa app + `node_modules` + `package.json` y arrancan con `node dist/main.js`.

## 6. Ejecución sin Docker (manual, un proceso por servicio)

```bash
# 1. Postgres (vía Docker, o una instancia local propia en el puerto 5433)
docker compose -p version3 up -d postgres

# 2. Prisma
cd BACKEND
npx prisma generate
npx prisma migrate deploy

# 3. Los 10 microservicios backend + gateway (cada uno en su propia terminal)
npm run start:gateway        # :3000
npm run start:auth           # :3001
npm run start:candidate      # :3002
npm run start:portfolio      # :3003
npm run start:company        # :3004
npm run start:jobs           # :3006
npm run start:applications   # :3007
npm run start:chat           # :3008
npm run start:assistant      # :3009
npm run start:dashboard      # :3010

# 4. Frontend
cd FRONTEND
npm start                    # ng serve, :4200
```

Todos los scripts `start:*` están definidos en `BACKEND/package.json` y usan `nest start <app> --watch` (hot-reload). El script `iniciar-talentbridge.bat` (raíz del repo) automatiza exactamente esta secuencia en Windows: valida que Docker esté corriendo, levanta Postgres con `docker compose -p version3 up -d postgres`, corre `npx prisma generate` + `npx prisma migrate deploy`, abre una ventana `cmd` por cada uno de los 10 servicios backend + gateway, y finalmente abre una ventana para `npm start` del frontend. Se verificó que los 11 comandos `nest start <app> --watch` del `.bat` coinciden exactamente con los scripts `start:*` de `BACKEND/package.json`.

## 7. Seeds (datos de prueba)

Scripts reales definidos en `BACKEND/package.json`, todos ejecutan contra `DATABASE_URL` vía `ts-node`:

| Comando | Script | Qué hace (según el propio archivo) |
|---|---|---|
| `npm run seed` | `prisma/seed.ts` | Seed principal/base (usuarios, perfiles). También configurado como `prisma.seed` en `package.json`, así que corre automáticamente con `npx prisma db seed`. |
| `npm run seed:jobs` | `prisma/seed-jobs.ts` | Genera ofertas de trabajo (`JobOffer`) de prueba. |
| `npm run seed:santiago` | `prisma/seed-santiago-profile.ts` | Crea/actualiza el perfil demo principal (`bustamantemolinasantiago@gmail.com`) con datos realistas (habilidades, experiencia, educación, proyectos). |
| `npm run seed:company-demo` | `prisma/seed-company-demo.ts` | Crea la empresa demo `empresa001@demo.com` ("Talento Llanero S.A.S."). |
| `npm run seed:more-companies` | `prisma/seed-more-companies.ts` | Crea empresas demo adicionales (lote definido en el propio script). |
| `npm run seed:skills-catalog` | `prisma/seed-skills-catalog.ts` | Carga el catálogo global de habilidades (cientos de entradas por categoría, usado por el selector de habilidades del frontend). |
| `npm run clear:santiago-cvs` | `prisma/clear-santiago-cvs.ts` | Borra los CV subidos del perfil demo principal (dato destructivo — no correr sin confirmación explícita del usuario, según `CLAUDE.md`). |
| `npm run update:company-logos` | `prisma/update-company-logos.ts` | Asigna logos a empresas desde un set de archivos fijo. |
| `npm run generate:company-logos` | `prisma/generate-company-logos.ts` | Genera un logo SVG único por empresa (combinación silueta+paleta sin repetir), reemplaza al script anterior. |
| `npm run backfill:job-workload` | `prisma/backfill-job-workload.ts` | Backfill idempotente: completa el campo `workload` solo en ofertas donde es `NULL`, sin pisar datos existentes. |
| `npm run backfill:normalize-data` | `prisma/normalize-existing-data.ts` | Backfill de normalización de datos (emails, teléfonos, NIT, URLs, nombres de habilidad). Corre en modo dry-run por defecto; requiere el flag `--apply` para escribir cambios. **Construido y tipo-chequeado pero no ejecutado contra la base real** (ver `docs/DECISIONS.md`). |

No se encontró evidencia de un orden de ejecución obligatorio documentado en el propio `package.json` — el orden razonable según las dependencias de datos (usuarios antes que perfiles, empresas antes que ofertas) es `seed` → `seed:company-demo` / `seed:more-companies` → `seed:jobs` → `seed:santiago` → `seed:skills-catalog`, pero esto es una inferencia, no algo documentado explícitamente en el código.

## 8. Pruebas

- **Backend:** `BACKEND/package.json` define `test`, `test:watch`, `test:cov`, `test:debug` y `test:e2e` (Jest, config en `test/jest-e2e.json`), con `testRegex: ".*\\.spec\\.ts$"`. **No se encontró ningún archivo `*.spec.ts` real en `BACKEND/apps/` ni `BACKEND/libs/`** — los scripts de test existen pero no hay suite implementada (confirmado por búsqueda de archivos; ver también `docs/DEUDA_TECNICA_TALENTBRIDGE_V3.md`).
- **Frontend:** `FRONTEND/package.json` define `test` (`ng test`, Karma+Jasmine). Se encontró un único archivo de test: `FRONTEND/src/app/app.component.spec.ts` (el spec por defecto que genera `ng new`, no una suite de tests de negocio).

```bash
cd BACKEND && npm test          # correría Jest, pero no hay specs que ejecutar
cd FRONTEND && npm test         # correría Karma/Jasmine sobre el único spec existente
```

## 9. Verificación

URLs reales confirmadas contra el código y `docker-compose.yml`:

| URL | Qué es | Evidencia |
|---|---|---|
| `http://localhost:4200` | Frontend Angular | `FRONTEND/package.json` (`ng serve`, puerto por defecto de Angular CLI) |
| `http://localhost:3000` | API Gateway | `docker-compose.yml` puerto `3000:3000`; `apps/api-gateway/src/main.ts` (`API_GATEWAY_PORT` default `3000`) |
| `http://localhost:3000/api/docs` | Swagger UI del API Gateway | `apps/api-gateway/src/main.ts:29-30` (`SwaggerModule.createDocument` + `SwaggerModule.setup('api/docs', app, document)`), confirmado también por el log de arranque `console.log(\`Swagger disponible en http://localhost:${port}/api/docs\`)` en la misma línea 36 |

Detalle del `DocumentBuilder` real (`apps/api-gateway/src/main.ts:21-27`): título `"TalentBridge API Gateway"`, versión `"3.0"`, autenticación documentada con `addBearerAuth()` y `addCookieAuth('auth_token')` — coherente con el esquema dual (cookie HttpOnly + JWT en `localStorage`) documentado en `docs/DECISIONS.md`.

El `api-gateway` usa `app.setGlobalPrefix('api')`, por lo que todas las rutas de negocio quedan bajo `/api/*` (ej. `http://localhost:3000/api/auth/login`).

## 10. Usuarios demo

Confirmado en `CLAUDE.md` y en los scripts de seed correspondientes (`seed-santiago-profile.ts`, `seed-company-demo.ts`):

| Rol | Email | Password |
|---|---|---|
| Candidato (perfil demo principal) | `bustamantemolinasantiago@gmail.com` | `Santiago.123` |
| Candidato genérico | `candidato001@demo.com` … `candidato100@demo.com` | `Candidato.123` |
| Empresa | `empresa001@demo.com` | `Empresa.123` |
