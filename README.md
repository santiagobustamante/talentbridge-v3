# TalentBridge V3 - Arquitectura de Microservicios

Plataforma de conexión laboral entre candidatos y empresas con portafolio profesional inteligente.

## Descripción

TalentBridge permite a profesionales crear portafolios digitales con habilidades, experiencia, educación y proyectos. Las empresas pueden buscar candidatos, publicar ofertas de trabajo, gestionar postulaciones y comunicarse vía chat. Incluye un asistente virtual (Joaquín) y dashboards para ambos roles.

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Angular 19, Angular Material, SCSS |
| Backend | NestJS 11 (Monorepo) |
| API Gateway | NestJS (Puerta de entrada única) |
| ORM | Prisma 7.8 |
| Base de Datos | PostgreSQL 16 |
| Comunicación | HTTP REST + WebSocket (Socket.IO) |
| Contenedores | Docker + Docker Compose |

## Arquitectura de Microservicios

```
                    ┌──────────────────┐
                    │  FRONTEND Angular │
                    │  localhost:4200   │
                    └────────┬─────────┘
                             │ HTTP + WebSocket
                             ▼
                    ┌──────────────────┐
                    │   API GATEWAY    │
                    │  localhost:3000   │
                    │   /api/*         │
                    └────────┬─────────┘
                             │ Proxy HTTP interno
          ┌──────────────────┼──────────────────────────┐
          │                  │                          │
          ▼                  ▼                          ▼
   ┌─────────────┐   ┌─────────────┐   ┌─────────────────────┐
   │ Auth Service│   │  Candidate   │   │  Portfolio Service  │
   │   :3001     │   │  Service     │   │  :3003               │
   │             │   │  :3002       │   │  Skills, Exp, Edu,   │
   │ Register    │   │  Profile     │   │  Projects, CV,      │
   │ Login       │   │  Views       │   │  Public Portfolio   │
   │ JWT/Cookies │   │  Slug        │   │                     │
   └─────────────┘   └─────────────┘   └─────────────────────┘
          │                  │                          │
   ┌─────────────┐   ┌─────────────────────┐   ┌─────────────┐
   │  Company    │   │   Jobs Service      │   │Applications │
   │  Service    │   │   :3006             │   │  Service    │
   │  :3004      │   │                     │   │  :3007      │
   │  Profile    │   │  CRUD + Publish     │   │  Apply      │
   │  Search     │   │  Close/Archive      │   │  Status     │
   └─────────────┘   └─────────────────────┘   └─────────────┘
          │                  │
   ┌─────────────┐   ┌─────────────┐   ┌─────────────────────┐
   │ Chat Service│   │  Assistant  │   │ Dashboard Service   │
   │ :3008       │   │  Service    │   │ :3010               │
   │ WebSocket   │   │  :3009      │   │                     │
   │ Messages    │   │  Joaquín    │   │ Métricas y          │
   │ Unread      │   │  Rules      │   │ recomendaciones     │
   └─────────────┘   └─────────────┘   └─────────────────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │   PostgreSQL     │
                    │   :5433          │
                    │   Prisma ORM     │
                    └──────────────────┘
```

## Servicios y Puertos

| Servicio | Puerto | Responsabilidad |
|----------|--------|-----------------|
| API Gateway | 3000 | Entrada única, proxy, CORS, cookies |
| Auth Service | 3001 | Registro, login, JWT, roles |
| Candidate Service | 3002 | Perfil candidato, vistas, slug |
| Portfolio Service | 3003 | Skills, experiencia, educación, proyectos, CV, portafolio público |
| Company Service | 3004 | Perfil empresa, búsqueda candidatos |
| Jobs Service | 3006 | Ofertas de trabajo, CRUD, publicación |
| Applications Service | 3007 | Postulaciones, validación habilidades |
| Chat Service | 3008 | Conversaciones, mensajes, WebSocket |
| Assistant Service | 3009 | Asistente Joaquín, respuestas contextuales |
| Dashboard Service | 3010 | Métricas, dashboards candidato/empresa |

## Variables de Entorno

```env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/smart_portfolio
JWT_SECRET=dev_secret_change_in_production_abc123
FRONTEND_URL=http://localhost:4200
API_GATEWAY_PORT=3000
AUTH_SERVICE_URL=http://localhost:3001
CANDIDATE_SERVICE_URL=http://localhost:3002
PORTFOLIO_SERVICE_URL=http://localhost:3003
COMPANY_SERVICE_URL=http://localhost:3004
JOBS_SERVICE_URL=http://localhost:3006
APPLICATIONS_SERVICE_URL=http://localhost:3007
CHAT_SERVICE_URL=http://localhost:3008
ASSISTANT_SERVICE_URL=http://localhost:3009
DASHBOARD_SERVICE_URL=http://localhost:3010
```

## Inicio Rápido

### Requisitos

- Node.js 22+
- PostgreSQL 16
- Docker (opcional)

### 1. Base de Datos

```bash
cd VERSION 3
docker compose up -d postgres
```

O usar una instancia local de PostgreSQL en puerto 5433.

### 2. Backend

```bash
cd BACKEND
npm install
npx prisma generate
npx prisma migrate deploy

# Opción A: Iniciar todos en terminales separadas
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

# Opción B: Docker
docker compose up -d
```

### 3. Frontend

```bash
cd FRONTEND
npm install
npm start
```

Abrir http://localhost:4200

### 4. Seed (datos de prueba)

```bash
cd BACKEND
npm run seed
npm run seed:jobs
```

- Candidatos: `Candidato.123`
- Empresas: `Empresa.123`

## Flujos Principales

### Candidato
1. Registro en `/register`
2. Login en `/login`
3. Dashboard en `/app/inicio`
4. Editar perfil en `/app/profile`
5. Gestionar habilidades, experiencia, educación, proyectos
6. Ver ofertas en `/app/jobs` y aplicar
7. Chat en `/app/messages`
8. Portafolio público en `/portfolio/:slug` y previsualización

### Empresa
1. Registro en `/company/register`
2. Login en `/company/login`
3. Dashboard en `/company/dashboard`
4. Perfil empresarial en `/company/profile`
5. Buscar candidatos en `/company/candidates`
6. Crear y gestionar ofertas en `/company/jobs`
7. Ver postulaciones y cambiar estados
8. Chat con candidatos en `/company/messages`

## Decisiones Técnicas

- **Base de datos compartida (Fase 1)**: PostgreSQL único con Prisma para simplificar la migración. Preparado para evolucionar a base por servicio.
- **HTTP interno**: API Gateway usa fetch para proxy HTTP a servicios internos. Simple y efectivo para desarrollo.
- **Monorepo NestJS**: apps/ y libs/ compartidos, builds independientes con webpack.
- **WebSocket directo**: El frontend se conecta a chat-service:3008 directamente para WebSocket.
- **Cookies + JWT**: Autenticación por cookies httpOnly con JWT firmado.

## Mejoras Futuras

- Base de datos por microservicio (auth_db, profiles_db, jobs_db, chat_db)
- Message broker (RabbitMQ/Kafka) para eventos entre servicios
- Redis para caché y rate limiting
- CI/CD con GitHub Actions
- Monitoreo con Prometheus + Grafana
- Kubernetes para orquestación
- OAuth 2.0 / Google Login
- Notificaciones push y email

## Documentación de mejoras en curso

- [`docs/plan-consistencia-css.md`](docs/plan-consistencia-css.md) — sistema de diseño del FRONTEND (tokens, componentes compartidos Button/Badge/Card). **Completo.**
- [`docs/auditoria-frontend-ux.md`](docs/auditoria-frontend-ux.md) — auditoría UX/UI detallada del FRONTEND (hallazgos con archivo:línea).
- [`docs/plan-mejoras-frontend-ux.md`](docs/plan-mejoras-frontend-ux.md) — decisiones de producto y plan de fases derivado de esa auditoría. **En curso.**

## Licencia

Proyecto académico - Seminario UCC 2026
