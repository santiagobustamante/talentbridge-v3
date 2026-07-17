# TalentBridge V3 — Visión general del proyecto

> Proyecto académico — Seminario UCC 2026. Este documento es el punto de entrada: si abrís `docs/` sin contexto previo, empezá acá.

## Qué es

TalentBridge es una plataforma de conexión laboral entre **candidatos** y **empresas**, con portafolio profesional inteligente. Un candidato construye su perfil (habilidades, experiencia, educación, proyectos, CV), lo publica como portafolio público, aplica a ofertas y conversa con empresas. Una empresa publica vacantes, busca candidatos con filtros, gestiona postulaciones y conversa con los perfiles que le interesan. Incluye un asistente virtual ("Joaquín") y dashboards con métricas para ambos roles.

## Objetivo general

Demostrar el diseño e implementación de una plataforma web full-stack con **arquitectura de microservicios** real (no un monolito disfrazado): 10 servicios NestJS independientes detrás de un API Gateway, un frontend Angular consumiéndolos como una API única, base de datos compartida vía Prisma, y todo containerizable con Docker.

## Módulos principales

| Módulo | Qué resuelve | Para quién |
|---|---|---|
| Autenticación | Registro/login separado por rol, JWT en cookie httpOnly | Ambos |
| Perfil candidato | Datos básicos, slug público, switches de visibilidad | Candidato |
| Portafolio (skills/experiencia/educación/proyectos/CV) | El contenido real del portafolio | Candidato |
| Portafolio público | Vista sin auth en `/portfolio/:slug`, respeta switches de visibilidad | Público |
| Perfil empresarial + búsqueda de candidatos | Datos de la empresa, filtros por skill/ciudad/profesión | Empresa |
| Ofertas de trabajo | CRUD + ciclo de vida (DRAFT→PUBLISHED→CLOSED/ARCHIVED) | Empresa |
| Postulaciones | Aplicar, validar match de skills, cambiar estado | Ambos |
| Chat | Mensajería 1:1 candidato↔empresa, tiempo real vía WebSocket | Ambos |
| Asistente "Joaquín" | Respuestas contextuales según rol y estado del usuario | Ambos |
| Dashboard | Métricas y próximos pasos sugeridos | Ambos |

## Arquitectura general

Frontend Angular (SPA) → **API Gateway** (única puerta de entrada, puerto 3000) → proxy HTTP interno → 9 microservicios NestJS, cada uno dueño de su dominio → PostgreSQL único (Prisma ORM compartido, fase de transición hacia DB-por-servicio). El chat usa WebSocket directo frontend↔chat-service (no pasa por el Gateway). Detalle completo en [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Tecnologías usadas

| Capa | Tecnología | Versión |
|---|---|---|
| Frontend | Angular + Angular Material, SCSS | 19 |
| Backend | NestJS (monorepo, 10 apps) | 11 |
| ORM | Prisma | 7.8 |
| Base de datos | PostgreSQL | 16 (Docker, puerto host `5433`) |
| Comunicación | HTTP REST (Gateway→servicios) + WebSocket (Socket.IO, chat) | — |
| Auth | JWT firmado, cookie httpOnly `auth_token` | Passport-JWT |
| Contenedores | Docker + Docker Compose | — |

## Usuarios demo

| Rol | Email | Password | Origen / notas |
|---|---|---|---|
| Candidato (perfil rico, para demo/presentación) | `bustamantemolinasantiago@gmail.com` | `Santiago.123` | `prisma/seed-santiago-profile.ts` — slug `santiago-bustamante`, portafolio publicado, 4 proyectos, conversación de ejemplo con `empresa001@demo.com`. |
| Candidato genérico (cualquiera del seed masivo) | — | `Candidato.123` | `prisma/seed.ts` — 100 candidatos genéricos. |
| Empresa (demo principal) | `empresa001@demo.com` | `Empresa.123` | `prisma/seed-company-demo.ts` — "Talento Llanero S.A.S.". |
| Empresa (alternativas) | `talento@llanero.com`, `conecta@empleo.com`, `rrhh@andinos.com` | `Empresa.123` | Seeds adicionales (`seed-jobs.ts`: 50 empresas + 200 ofertas; `seed-more-companies.ts`). |

⚠️ El candidato `bustamantemolinasantiago@gmail.com` es la cuenta personal de demo del propio desarrollador — tiene datos reales de contacto en el seed (LinkedIn/GitHub ficticios pero con su nombre). Ver la nota de la Fase 0.1 en [`plan-mejoras-frontend-ux.md`](./plan-mejoras-frontend-ux.md): antes de borrar o regenerar sus datos hace falta confirmación explícita, no alcanza con una instrucción general.

## Cómo levantar el proyecto

### Opción rápida (Windows, todo junto)
```bat
iniciar-talentbridge.bat
```
Levanta Postgres (`docker compose -p version3 up -d postgres`), corre `prisma generate` + `migrate deploy`, abre una ventana `cmd` por cada uno de los 10 microservicios (`--watch`) y otra para el frontend. Espera ~30s a que todo compile.

### Manual, paso a paso
```bash
# 1. Base de datos (Docker, proyecto "version3" — ver regla en CLAUDE.md)
docker compose -p version3 up -d postgres

# 2. Backend
cd BACKEND
npm install
npx prisma generate
npx prisma migrate deploy

# 3a. Todos los servicios en paralelo (una terminal por servicio)
npm run start:gateway
npm run start:auth
npm run start:candidate
npm run start:portfolio
npm run start:company
npm run start:jobs
npm run start:applications
npm run start:chat
npm run start:assistant
npm run start:dashboard

# 3b. O con Docker (build multi-stage, un target por servicio)
docker compose -p version3 up -d

# 4. Frontend
cd ../FRONTEND
npm install
npm start        # http://localhost:4200

# 5. Datos de prueba (si la base está vacía)
cd ../BACKEND
npm run seed                 # 3 empresas + 100 candidatos
npm run seed:jobs            # 50 empresas + 200 ofertas
npm run seed:santiago        # perfil demo rico (bustamantemolinasantiago@gmail.com)
npm run seed:company-demo    # empresa001@demo.com
npm run seed:skills-catalog  # catálogo de habilidades normalizado
```

## URLs importantes

| Recurso | URL |
|---|---|
| Frontend | http://localhost:4200 |
| API Gateway | http://localhost:3000 |
| Swagger (Gateway) | http://localhost:3000/api/docs |
| Health check | http://localhost:3000/api/health |
| Portafolio público de ejemplo | http://localhost:4200/portfolio/santiago-bustamante |
| PostgreSQL (host) | `localhost:5433` (contenedor `smart_portfolio_db_v3`, DB `smart_portfolio`) |

## Estructura de carpetas

```
VERSION 3/
├── BACKEND/                       Monorepo NestJS
│   ├── apps/                      10 microservicios (ver BACKEND_GUIDE.md)
│   ├── libs/                      Código compartido: auth, database, common, contracts, events
│   ├── prisma/                    schema.prisma, migrations/, seeds
│   ├── uploads/cv/                PDFs de CV subidos (no versionar contenido real)
│   ├── docker-compose.yml         (no existe acá — está en la raíz)
│   ├── Dockerfile                 Build multi-stage, un target por servicio
│   └── .env / .env.example
├── FRONTEND/                      Angular 19
│   └── src/app/
│       ├── core/                  auth, guards, interceptors, services, models
│       ├── features/              Un directorio por pantalla/dominio
│       └── shared/                components/, pipes/, utils/, constants/, layout/, assistant/
├── docs/                          Toda la documentación del proyecto (este directorio)
├── docker-compose.yml             Orquesta Postgres + 10 servicios (proyecto Docker "version3")
├── iniciar-talentbridge.bat       Arranque todo-en-uno para Windows
└── CLAUDE.md                      Instrucciones para agentes IA que trabajen en este repo
```

## Documentos relacionados

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — arquitectura técnica detallada + diagramas.
- [`FRONTEND_GUIDE.md`](./FRONTEND_GUIDE.md) / [`BACKEND_GUIDE.md`](./BACKEND_GUIDE.md) — guías por capa.
- [`DATABASE.md`](./DATABASE.md) — modelo de datos y seeds.
- [`PHASES.md`](./PHASES.md) — plan de fases vigente del proyecto.
- [`NEXT_STEPS.md`](./NEXT_STEPS.md) — qué falta y en qué orden.
- Documentos previos ya existentes en este mismo directorio (no reemplazados, siguen vigentes): [`arquitectura.md`](./arquitectura.md), [`endpoints.md`](./endpoints.md), [`alcance-mvp.md`](./alcance-mvp.md), [`plan-consistencia-css.md`](./plan-consistencia-css.md), [`auditoria-frontend-ux.md`](./auditoria-frontend-ux.md), [`plan-mejoras-frontend-ux.md`](./plan-mejoras-frontend-ux.md).
