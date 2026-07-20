# Auditoría técnica: Base de datos, autenticación/seguridad, chat en tiempo real y frontend — TalentBridge V3

Auditoría 100% basada en evidencia de código real del repositorio. Toda afirmación indica el archivo y las líneas donde se verificó. Donde no se encontró evidencia suficiente, se indica explícitamente.

Fecha de la auditoría: 2026-07-18.

---

## 1. Base de datos

### 1.1 Motor y despliegue

- Motor: PostgreSQL, declarado como `provider = "postgresql"` en el datasource de Prisma.
  Evidencia:
  - Archivo: `BACKEND/prisma/schema.prisma`
  - Líneas: 7-9

- Versión de la imagen de Postgres usada en desarrollo local (Docker): `postgres:16-alpine`.
  Evidencia:
  - Archivo: `docker-compose.yml`
  - Líneas: 2-3

- Contenedor: `smart_portfolio_db_v3`, puerto host `5433`, volumen `pgdata_v3`, red `talentbridge_net`.
  Evidencia:
  - Archivo: `docker-compose.yml`
  - Líneas: 4, 11, 13, 196-197

- En producción (Render), no hay un servicio de Postgres declarado en `render.yaml` — cada microservicio recibe `DATABASE_URL` como variable con `sync: false` (es decir, se configura manualmente en el dashboard de Render, probablemente apuntando a un proveedor externo tipo Supabase). El propio `.env.example` documenta una variable `DIRECT_URL` pensada específicamente para "un pooler delante de DATABASE_URL (ej. Supabase, puerto 6543 pgbouncer)".
  Evidencia:
  - Archivo: `render.yaml`
  - Líneas: 17-18 (y análogamente en cada servicio, ej. 58-59, 81-82, 114-115, etc.)
  - Archivo: `BACKEND/.env.example`
  - Líneas: 3-8
  - No se encontró evidencia suficiente en el repositorio para confirmar si el proveedor de Postgres en producción es efectivamente Supabase u otro — el nombre solo aparece como ejemplo en un comentario.

### 1.2 ¿Base compartida o una por microservicio?

Confirmado: **los 10 microservicios comparten una única base de datos Postgres**, no hay separación por servicio (patrón "database per service" no implementado; es un monorepo con un solo `schema.prisma` y un único `DATABASE_URL`).

Evidencia:
- Cada servicio instancia su propio `PrismaService`, pero todos leen la misma variable de entorno `DATABASE_URL`:
  - Archivo: `BACKEND/libs/database/src/prisma.service.ts`
  - Líneas: 10-15 (`new PrismaPg({ connectionString: process.env['DATABASE_URL'] as string })`)
- En Docker Compose, los 9 servicios de aplicación (`api-gateway`, `auth-service`, `candidate-service`, `portfolio-service`, `company-service`, `jobs-service`, `applications-service`, `chat-service`, `assistant-service`, `dashboard-service`) usan el mismo `env_file: ./BACKEND/.env`, es decir, el mismo valor de `DATABASE_URL` para todos.
  - Archivo: `docker-compose.yml`
  - Líneas: 29-30, 48-49, 65-66, 82-83, 99-100, 116-117, 133-134, 150-151, 167-168, 184-185
- Hay un único `schema.prisma` en todo el monorepo (`BACKEND/prisma/schema.prisma`) que define todos los modelos usados por todos los servicios — no existen `schema.prisma` adicionales por servicio.
  Evidencia: `Glob BACKEND/**/schema.prisma` solo devuelve `BACKEND/prisma/schema.prisma` (verificado durante la auditoría).

### 1.3 Modelos / entidades reales

Todos los modelos provienen de `BACKEND/prisma/schema.prisma` (344 líneas totales).

| Modelo | Tabla física (`@@map`) | Campos principales | Relaciones | Claves/índices |
|---|---|---|---|---|
| `User` (enum `UserRole`: CANDIDATE\|COMPANY) | `users` | `id`, `email` (único), `passwordHash`, `role` (default CANDIDATE), `createdAt`, `updatedAt` | 1:1 con `Profile` y `CompanyProfile`; 1:N con `CvDocument`, `ProfileView` (como empresa que ve), `Conversation` (x2, como candidato y como empresa), `ChatMessage`, `ChatBlock` (x2), `JobOffer`, `JobApplication`, `SkillEndorsement` | `email` único |
| `Profile` | `profiles` | `userId` (único), `fullName`, `professionalTitle`, `summary`, `phone`, `city`, `photoUrl`, `linkedinUrl`, `githubUrl`, `websiteUrl`, `slug` (único), `isPublished`, 9 flags `show*` de visibilidad pública | 1:1 con `User` (cascade); 1:N con `Skill`, `Experience`, `Education`, `Project`, `ProfileView` | `userId` único, `slug` único |
| `ProfileView` | `profile_views` | `profileId`, `companyUserId`, `createdAt` | N:1 con `Profile` y con `User` (empresa) | — |
| `CompanyProfile` | `company_profiles` | `userId` (único), `companyName`, `nit`, `sector`, `city`, `phone`, `websiteUrl`, `description`, `logoUrl` | 1:1 con `User` (cascade) | `userId` único |
| `Skill` | `skills` | `profileId`, `name`, `normalizedName`, `level` (default BASIC) | N:1 con `Profile`; 1:N con `SkillEndorsement` | `@@unique([profileId, normalizedName])` |
| `SkillEndorsement` | `skill_endorsements` | `skillId`, `companyId` | N:1 con `Skill` y con `User` (empresa) | `@@unique([skillId, companyId])` |
| `Experience` | `experiences` | `profileId`, `company`, `position`, `city`, `workMode`, `contractType`, `description`, `functions`, `achievements`, `tools`, `learnedSkills` (array), `startDate`, `endDate`, `isCurrent` | N:1 con `Profile` (cascade) | — |
| `Education` | `educations` | `profileId`, `institution`, `degree`, `fieldOfStudy`, `educationType` (default FORMAL), `formationLevel`, `startDate`, `endDate`, `isCurrent` | N:1 con `Profile` (cascade) | — |
| `Project` | `projects` | `profileId`, `name`, `description`, `role`, `responsibilities`, `technologies` (array), `repositoryUrl`, `demoUrl`, `imageUrl`, `projectType`, `status`, `startDate`, `endDate` | N:1 con `Profile` (cascade) | — |
| `CvDocument` | `cv_documents` | `userId`, `originalName`, `filePath`, `mimeType`, `extractedText`, `uploadedAt` | N:1 con `User` (cascade); 1:N con `CvAnalysis` | — |
| `CvAnalysis` | `cv_analyses` | `cvDocumentId`, `score`, `strengths` (array), `recommendations` (array), `createdAt` | N:1 con `CvDocument` (cascade) | — |
| `Conversation` | `conversations` | `candidateId`, `companyId`, `lastMessageAt` | N:1 con `User` (dos veces: `candidate`, `company`); 1:N con `ChatMessage`, `ChatBlock` | `@@unique([candidateId, companyId])`; índices en `candidateId`, `companyId`, `lastMessageAt` |
| `ChatMessage` | `chat_messages` | `conversationId`, `senderId`, `body`, `createdAt`, `readAt` | N:1 con `Conversation` y con `User` (sender) | índices `[conversationId, createdAt]`, `senderId` |
| `ChatBlock` | `chat_blocks` | `conversationId`, `blockerId`, `blockedId`, `reason` | N:1 con `Conversation`; N:1 con `User` (x2: blocker/blocked) | `@@unique([conversationId, blockerId, blockedId])`; índices `blockerId`, `blockedId` |
| `JobOffer` (enum `JobOfferStatus`: DRAFT\|PUBLISHED\|CLOSED\|ARCHIVED) | `job_offers` | `companyId`, `title`, `description`, `requirements`, `responsibilities`, `city`, `modality`, `contractType`, `workload`, `salaryMin/Max`, `currency` (default COP), `skillsRequired`, `status`, `publishedAt`, `closedAt` | N:1 con `User` (company); 1:N con `JobApplication` | índices `companyId`, `status`, `city`, `createdAt` |
| `JobApplication` (enum `JobApplicationStatus`: PENDING\|REVIEWED\|PRESELECTED\|REJECTED\|HIRED) | `job_applications` | `jobOfferId`, `candidateId`, `coverMessage`, `status` (default PENDING) | N:1 con `JobOffer` y con `User` (candidate) | `@@unique([jobOfferId, candidateId])`; índices `candidateId`, `jobOfferId`, `status` |

Evidencia general: `BACKEND/prisma/schema.prisma`, líneas 1-344 (leído completo).

### 1.4 Diagrama ER (Mermaid, entidades reales del schema)

```mermaid
erDiagram
    USER ||--o| PROFILE : "1:1"
    USER ||--o| COMPANY_PROFILE : "1:1"
    USER ||--o{ CV_DOCUMENT : "1:N"
    USER ||--o{ PROFILE_VIEW : "1:N (como empresa)"
    USER ||--o{ CONVERSATION : "1:N (como candidato)"
    USER ||--o{ CONVERSATION : "1:N (como empresa)"
    USER ||--o{ CHAT_MESSAGE : "1:N (sender)"
    USER ||--o{ CHAT_BLOCK : "1:N (blocker)"
    USER ||--o{ CHAT_BLOCK : "1:N (blocked)"
    USER ||--o{ JOB_OFFER : "1:N (empresa)"
    USER ||--o{ JOB_APPLICATION : "1:N (candidato)"
    USER ||--o{ SKILL_ENDORSEMENT : "1:N (empresa)"

    PROFILE ||--o{ SKILL : "1:N"
    PROFILE ||--o{ EXPERIENCE : "1:N"
    PROFILE ||--o{ EDUCATION : "1:N"
    PROFILE ||--o{ PROJECT : "1:N"
    PROFILE ||--o{ PROFILE_VIEW : "1:N"

    SKILL ||--o{ SKILL_ENDORSEMENT : "1:N"

    CV_DOCUMENT ||--o{ CV_ANALYSIS : "1:N"

    CONVERSATION ||--o{ CHAT_MESSAGE : "1:N"
    CONVERSATION ||--o{ CHAT_BLOCK : "1:N"

    JOB_OFFER ||--o{ JOB_APPLICATION : "1:N"

    USER {
        int id PK
        string email UK
        string passwordHash
        enum role
    }
    PROFILE {
        int id PK
        int userId FK_UK
        string slug UK
    }
    COMPANY_PROFILE {
        int id PK
        int userId FK_UK
    }
    SKILL {
        int id PK
        int profileId FK
        string normalizedName
    }
    SKILL_ENDORSEMENT {
        int id PK
        int skillId FK
        int companyId FK
    }
    EXPERIENCE {
        int id PK
        int profileId FK
    }
    EDUCATION {
        int id PK
        int profileId FK
    }
    PROJECT {
        int id PK
        int profileId FK
    }
    PROFILE_VIEW {
        int id PK
        int profileId FK
        int companyUserId FK
    }
    CV_DOCUMENT {
        int id PK
        int userId FK
    }
    CV_ANALYSIS {
        int id PK
        int cvDocumentId FK
    }
    CONVERSATION {
        int id PK
        int candidateId FK
        int companyId FK
    }
    CHAT_MESSAGE {
        int id PK
        int conversationId FK
        int senderId FK
    }
    CHAT_BLOCK {
        int id PK
        int conversationId FK
        int blockerId FK
        int blockedId FK
    }
    JOB_OFFER {
        int id PK
        int companyId FK
        enum status
    }
    JOB_APPLICATION {
        int id PK
        int jobOfferId FK
        int candidateId FK
        enum status
    }
```

Evidencia: diagrama construido a partir de `BACKEND/prisma/schema.prisma`, líneas 16-343 (todas las relaciones `@relation` del archivo).

### 1.5 Seeds y scripts de datos (`BACKEND/prisma/*.ts`)

| Script | Qué genera | ¿Idempotente? | Evidencia |
|---|---|---|---|
| `seed.ts` | Job principal: usuario demo `bustamantemolinasantiago@gmail.com` y otros usuarios/empresas/candidatos de ejemplo con perfil, skills, experiencias, proyectos generados proceduralmente | Sí — hace `findUnique` por email antes de cada `user.create` y salta (`continue`) si ya existe | `BACKEND/prisma/seed.ts`, líneas 379-407 (empresas), 409-459 (candidatos, `findUnique` en 415, `create` recién si no existe en 446) |
| `seed-jobs.ts` | Empresas + ofertas de trabajo (`JobOffer`) de ejemplo | Parcialmente — las empresas se crean solo si no existen (`findUnique` antes de `create`, líneas 193-198), pero los `jobOffer.create` (línea 299) no verifican duplicados: correr el script dos veces duplicaría ofertas | `BACKEND/prisma/seed-jobs.ts`, líneas 184-198, 299 |
| `seed-santiago-profile.ts` | Perfil completo del usuario demo principal (skills, experiencias, educación, proyectos, postulaciones, conversación de chat de ejemplo) | Sí — usa `user.upsert`/`profile.upsert` (líneas 20, 28) y limpia con `deleteMany` antes de recrear cada colección hija (skills línea 79, experiences línea 103, education línea 161, projects línea 196, chatMessage línea 294) — patrón "delete + recreate", seguro para correr repetidas veces | `BACKEND/prisma/seed-santiago-profile.ts`, líneas 20-304 |
| `seed-company-demo.ts` | Empresa demo con ofertas, postulaciones y una conversación de chat de ejemplo | Sí — mismo patrón `upsert` (líneas 20, 28) + `deleteMany` antes de recrear (`jobApplication`/`jobOffer` líneas 55-56, `chatMessage` línea 217) | `BACKEND/prisma/seed-company-demo.ts`, líneas 20-227 |
| `seed-more-companies.ts` | Empresas adicionales de demo con sus ofertas | Sí — `user.upsert`/`companyProfile.upsert` (líneas 125, 131) + `deleteMany` de `jobOffer` antes de recrear (línea 146) | `BACKEND/prisma/seed-more-companies.ts`, líneas 125-192 |
| `seed-skills-catalog.ts` | Catálogo de ~280 nombres de habilidades técnicas/blandas, insertadas contra el primer perfil existente | Sí — hace `findUnique` por `profileId_normalizedName` antes de cada `create` y cuenta inserciones vs. saltadas | `BACKEND/prisma/seed-skills-catalog.ts`, líneas 91-104 |
| `backfill-job-workload.ts` | Backfill: completa el campo `workload` en ofertas que lo tienen `null` | Sí — solo actualiza filas con `workload: null`; explícitamente documentado como idempotente en el comentario del archivo | `BACKEND/prisma/backfill-job-workload.ts`, líneas 10-14, 23-26 |
| `normalize-existing-data.ts` | Backfill de normalización (email, teléfono, NIT, URLs, nombres, skills) sobre datos preexistentes | Sí — según el comentario del archivo, solo escribe si el valor normalizado difiere del actual; además corre en modo **dry-run por defecto** y requiere el flag `--apply` explícito para escribir | `BACKEND/prisma/normalize-existing-data.ts`, líneas 11-26 |
| `generate-company-logos.ts` | Genera un logo SVG único por empresa (combinación silueta+color sin repetir) | No se encontró evidencia suficiente en el repositorio para confirmar si valida existencia previa antes de sobrescribir — el script no fue leído más allá de sus primeras 30 líneas (definición de paletas/marcas); su propio comentario indica que reemplaza logos de un seed anterior por diseño | `BACKEND/prisma/generate-company-logos.ts`, líneas 7-13 |
| `update-company-logos.ts` | Asigna archivos de logo estáticos (`/assets/company-logos/*.svg`) a empresas demo puntuales por email | No se encontró evidencia suficiente en el repositorio para confirmar idempotencia completa — solo se leyeron las primeras 30 líneas (el mapa `logoMap`), sin ver la lógica de escritura | `BACKEND/prisma/update-company-logos.ts`, líneas 10-28 |
| `clear-santiago-cvs.ts` | Script de limpieza explícita: borra los `CvDocument`/`CvAnalysis` del usuario demo principal | No aplica el concepto de idempotencia (es una operación destructiva intencional, no un seed) — usa `findMany` + `deleteMany` en cascada, sale temprano si no hay CVs | `BACKEND/prisma/clear-santiago-cvs.ts`, líneas 14-30, 35 |

---

## 2. Autenticación y seguridad

### 2.1 Estrategia JWT

- Librería: `passport-jwt` vía `@nestjs/passport`, con `PassportStrategy(Strategy)`.
  Evidencia: `BACKEND/libs/auth/src/jwt.strategy.ts`, líneas 1-29.
- Extracción del token: primero cookie httpOnly `auth_token` (extractor custom `cookieExtractor`), con fallback al header `Authorization: Bearer`.
  Evidencia: `BACKEND/libs/auth/src/jwt.strategy.ts`, líneas 6-11, 17-20.
- Algoritmo: no se especifica `algorithms` explícitamente en `JwtStrategy` ni en `JwtModule.register`, por lo que `passport-jwt`/`jsonwebtoken` usan el default **HS256** (firma simétrica con `JWT_SECRET`).
  Evidencia: `BACKEND/libs/auth/src/jwt.strategy.ts`, líneas 15-23; `BACKEND/apps/auth-service/src/auth.module.ts`, líneas 19-22.
  Versión de `jsonwebtoken` resuelta (dependencia transitiva de `@nestjs/jwt`): `9.0.3`.
  Evidencia: `BACKEND/package-lock.json`, línea 2654.
- Expiración: `1d` (un día), **hardcodeado como string literal** en `auth.module.ts` (`signOptions: { expiresIn: '1d' }`), no leído de la variable de entorno `JWT_EXPIRES_IN` pese a que esta existe en `.env.example` y en `render.yaml` con el mismo valor.
  Evidencia: `BACKEND/apps/auth-service/src/auth.module.ts`, líneas 19-22; `BACKEND/.env.example`, línea 10; `render.yaml`, líneas 21-22.
  La cookie `auth_token` se fija con `maxAge: 24 * 60 * 60 * 1000` (también 1 día, coincide).
  Evidencia: `BACKEND/apps/auth-service/src/auth.controller.ts`, líneas 72-79.
- **Secreto de respaldo inseguro**: tanto `JwtStrategy` como `JwtModule.register` y `JwtUtil` (usado por el chat) caen a `'dev_secret'` como string literal si `process.env['JWT_SECRET']` no está definido.
  Evidencia:
  - `BACKEND/libs/auth/src/jwt.strategy.ts`, línea 22
  - `BACKEND/apps/auth-service/src/auth.module.ts`, línea 20
  - `BACKEND/libs/auth/src/jwt.util.ts`, líneas 10, 16
  Esto es un riesgo real (no genérico): si en algún ambiente (ej. un microservicio mal configurado, o al correr localmente sin `.env`) `JWT_SECRET` no está seteado, el servicio arranca igual y firma/valida tokens con un secreto público y predecible en vez de fallar duro.

### 2.2 Hash de contraseñas

- Librería: `bcrypt` (paquete npm `bcrypt`, versión `^6.0.0`).
  Evidencia: `BACKEND/package.json`, línea 73.
- Rondas de sal: **10**, hardcodeado en las tres rutas que hashean contraseña (`register`, `registerCompany`) y usado también en los seeds.
  Evidencia:
  - `BACKEND/apps/auth-service/src/auth.service.ts`, líneas 35, 69
  - `BACKEND/prisma/seed.ts`, líneas 390, 449 (`bcrypt.hash('Empresa.123', 10)`, `bcrypt.hash('Candidato.123', 10)`)
- Comparación en login: `bcrypt.compare(dto.password, user.passwordHash)`.
  Evidencia: `BACKEND/apps/auth-service/src/auth.service.ts`, líneas 101, 126.
- El hash nunca se devuelve al cliente: `sanitizeUser()` desestructura y descarta `passwordHash` antes de responder.
  Evidencia: `BACKEND/apps/auth-service/src/auth.service.ts`, líneas 158-171.

### 2.3 Guards

| Guard | Comportamiento | Ubicación |
|---|---|---|
| `JwtAuthGuard` | Extiende `AuthGuard('jwt')`; si no hay usuario válido, lanza `UnauthorizedException` con el mensaje de Passport o uno genérico | `BACKEND/libs/auth/src/jwt-auth.guard.ts`, líneas 1-21 |
| `OptionalJwtAuthGuard` | Extiende `AuthGuard('jwt')` pero nunca lanza: si no hay token válido, `request.user` queda `null` en vez de 401 — usado en rutas públicas que opcionalmente personalizan la respuesta si hay sesión (portafolio público) | `BACKEND/libs/auth/src/optional-jwt-auth.guard.ts`, líneas 1-16 |
| `RolesGuard` | Lee metadata `roles` (seteada con `@Roles(...)`), busca el usuario en BD por `request.user.sub` y verifica que `user.role` esté en la lista permitida; lanza `ForbiddenException` si no | `BACKEND/libs/auth/src/roles.guard.ts`, líneas 1-37 |
| `@Roles(...UserRole[])` (decorator) | `SetMetadata('roles', roles)` | `BACKEND/libs/auth/src/roles.decorator.ts`, líneas 1-5 |
| `@CurrentUser()` (decorator) | Extrae `request.user` del contexto; lanza `UnauthorizedException` si no existe `request.user.sub` | `BACKEND/libs/auth/src/current-user.decorator.ts`, líneas 1-16 |

Uso real de `@Roles(UserRole.COMPANY)` combinado con `RolesGuard` (endpoints company-only reforzados con verificación de rol, no solo de sesión):
- `BACKEND/apps/applications-service/src/applications.controller.ts`, líneas 51, 63 (con `@UseGuards(JwtAuthGuard, RolesGuard)` en línea 51, 63)
- `BACKEND/apps/jobs-service/src/company-jobs.controller.ts`, líneas 10-67 (9 endpoints, todos con `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(UserRole.COMPANY)`)
- `BACKEND/apps/portfolio-service/src/skills.controller.ts`, líneas 35-43 (endorsement de habilidades, company-only)

### 2.4 CORS

Idéntico en los 10 servicios (`api-gateway`, `auth-service`, `candidate-service`, `portfolio-service`, `company-service`, `jobs-service`, `applications-service`, `chat-service`, `assistant-service`, `dashboard-service`): origen restringido a `process.env['FRONTEND_URL']` (fallback `http://localhost:4200`), `credentials: true`, métodos `GET, POST, PATCH, DELETE, OPTIONS`, headers permitidos `Content-Type, Authorization`.

Evidencia (un ejemplo representativo; el patrón se repite igual en los 10 `main.ts`):
- `BACKEND/apps/api-gateway/src/main.ts`, líneas 14-19
- `BACKEND/apps/auth-service/src/main.ts`, líneas 11-16
- `BACKEND/apps/chat-service/src/main.ts`, líneas 16-21
- `BACKEND/apps/candidate-service/src/main.ts`, líneas 10-15
- `BACKEND/apps/company-service/src/main.ts`, líneas 10-15
- `BACKEND/apps/jobs-service/src/main.ts`, líneas 10-15
- `BACKEND/apps/applications-service/src/main.ts`, líneas 17-22
- `BACKEND/apps/portfolio-service/src/main.ts`, líneas 10-15
- `BACKEND/apps/assistant-service/src/main.ts`, líneas 16-21
- `BACKEND/apps/dashboard-service/src/main.ts`, líneas 10-15

El gateway WebSocket del chat (`ChatGateway`) declara su propio CORS, con el mismo origen pero sin restringir métodos (no aplica a WebSocket):
Evidencia: `BACKEND/apps/chat-service/src/chat.gateway.ts`, líneas 26-32.

### 2.5 Rate limiting

**No implementado.** No existe `@nestjs/throttler` (ni ningún otro paquete de rate limiting) en `BACKEND/package.json` (dependencias ni devDependencies revisadas completas). Tampoco se encontró uso de `@Throttle` ni `ThrottlerModule` en ningún archivo del backend (búsqueda `throttler|Throttle|rate.?limit` sobre todo `BACKEND/` solo encontró una coincidencia, y es en un array de nombres de skills del seed `seed-skills-catalog.ts`, no código funcional).
Evidencia:
- `BACKEND/package.json`, líneas 57-113 (dependencias completas, sin `@nestjs/throttler`)
- Búsqueda `throttler|Throttle|rate.?limit` (case-insensitive) sobre `BACKEND/`: único resultado en `BACKEND/prisma/seed-skills-catalog.ts` (string `'Rate Limiting'` dentro de la lista de nombres de habilidades del catálogo, no funcionalidad real)

Esto significa que **no hay ningún límite de intentos** en `POST /api/auth/login` ni `POST /api/auth/login-company` — un atacante puede intentar fuerza bruta de contraseñas sin bloqueo alguno a nivel de aplicación.

### 2.6 Validación de entrada

- `class-validator` + `class-transformer` están en dependencias (`^0.15.1` y `^0.5.1`).
  Evidencia: `BACKEND/package.json`, líneas 74-75.
- Los DTOs de auth usan decoradores reales (`@IsEmail`, `@IsString`, `@MinLength`, `@IsOptional`), con mensajes de error en español.
  Evidencia: `BACKEND/apps/auth-service/src/dto/auth.dto.ts`, líneas 1-46.
- Cada módulo de servicio (auth, chat, y por patrón repetido en los demás) registra un `ValidationPipe` global vía `APP_PIPE` con `whitelist: true, forbidNonWhitelisted: true, transform: true` — rechaza cualquier campo no declarado en el DTO y transforma tipos automáticamente.
  Evidencia:
  - `BACKEND/apps/auth-service/src/auth.module.ts`, líneas 29-37
  - `BACKEND/apps/chat-service/src/chat.module.ts`, líneas 29-36
- Otro DTO con validación confirmado por búsqueda: `BACKEND/apps/jobs-service/src/dto/create-job-offer.dto.ts` (usa decoradores de `class-validator`).

### 2.7 Manejo de errores / sanitización de respuesta

Todos los servicios registran un `AllExceptionsFilter` global (`APP_FILTER`) que normaliza cualquier excepción no controlada a `{ statusCode, message }`, sin exponer el stack trace al cliente (el stack solo se imprime en el log del servidor, truncado a 3 líneas).
Evidencia: `BACKEND/libs/common/src/http-exception.filter.ts`, líneas 10-38 (especialmente 27-31: el stack va a `console.error`, nunca a la respuesta HTTP).

### 2.8 Endpoints y control de acceso — hallazgos concretos

- **Cookie `auth_token`**: `httpOnly: true` siempre; `secure` y `sameSite` dependen de `NODE_ENV === 'production'` (`secure:false, sameSite:'lax'` en dev; `secure:true, sameSite:'none'` en producción, con comentario explícito en el código sobre por qué — frontend en Vercel y backend en otro dominio).
  Evidencia: `BACKEND/apps/auth-service/src/auth.controller.ts`, líneas 51-63 (logout) y 72-80 (login/register).

- **Fallback de token en WebSocket (mencionado en la tarea como "corregido hoy mismo")**: `ChatGateway.handleConnection` intenta primero extraer el JWT de la cookie (`JwtUtil.extractTokenFromCookie`), y si no lo encuentra, cae a `client.handshake.auth?.['token']`. El comentario del propio código explica el motivo: en despliegues cross-domain, algunos navegadores bloquean la cookie `SameSite=None`, y sin este respaldo el chat quedaría inutilizable en esos casos.
  Evidencia: `BACKEND/apps/chat-service/src/chat.gateway.ts`, líneas 42-57.
  El frontend efectivamente manda ese respaldo: `ChatSocketService.connect()` pasa `auth: { token: this.auth.getToken() }` al conectar el socket.
  Evidencia: `FRONTEND/src/app/core/services/chat-socket.service.ts`, líneas 38-43.

- **`candidate-search.controller.ts` (`company-service`) protegido solo con `JwtAuthGuard`, sin `RolesGuard`/`@Roles(COMPANY)`**, pese a que sus tres endpoints (`GET /api/company/candidates/filter-options`, `GET /api/company/candidates/search`, `GET /api/company/candidates/suggestions`) están pensados para uso exclusivo de empresas (buscar candidatos). Cualquier usuario autenticado con rol `CANDIDATE` (con un token válido propio) puede llamar a estos endpoints igualmente, a diferencia de otros controllers company-only del mismo servicio (`company-profile.controller.ts` sí usa solo `JwtAuthGuard` pero opera sobre el propio usuario, no expone datos de terceros del mismo modo).
  Evidencia: `BACKEND/apps/company-service/src/candidate-search.controller.ts`, líneas 1-39 (compárese con `BACKEND/apps/jobs-service/src/company-jobs.controller.ts`, que sí usa `RolesGuard` + `@Roles(UserRole.COMPANY)` en cada endpoint, líneas 10-67).
  Riesgo real (no crítico): exposición de datos de candidatos (nombre, ciudad, skills, etc. — lo que devuelva `CandidateSearchService.search`) a cuentas candidatas autenticadas, cuando el flujo de producto asume que solo empresas buscan candidatos.

- **Gateway HTTP (`api-gateway`) es un proxy "ciego"**: `GatewayController.proxyAll` (`@All('*path')`) reenvía cualquier request a la URL del microservicio correspondiente según el prefijo de la ruta, sin aplicar ningún guard propio — la autenticación/autorización recae 100% en cada microservicio destino, no en el gateway. Esto es consistente en todo el código (no es un bug puntual), pero significa que si algún microservicio interno quedara expuesto directamente (sin pasar por el gateway) en producción, no habría una segunda capa de control de acceso.
  Evidencia: `BACKEND/apps/api-gateway/src/gateway.controller.ts`, líneas 1-74.

- **Subida de CV**: valida tamaño máximo (`MAX_PDF_SIZE_MB`, default 5MB) y tipo MIME (`file.mimetype !== 'application/pdf'` rechazado) en el service, no en el controller ni vía `FileInterceptor` (no se configuran `limits`/`fileFilter` en el interceptor mismo).
  Evidencia: `BACKEND/apps/portfolio-service/src/cv.controller.ts`, líneas 23-28 (`@UseInterceptors(FileInterceptor('file'))` sin opciones); `BACKEND/apps/portfolio-service/src/cv.service.ts`, líneas 47-52.
  Nota: la validación de `mimetype` confía en el valor que reporta el cliente en el `multipart/form-data` (no hay verificación de "magic bytes" del archivo real) — no se encontró evidencia en el código de una validación más profunda del contenido del PDF antes de guardarlo en disco.

### 2.9 Tabla resumen de controles de seguridad

| Control de seguridad | Implementado | Ubicación | Observaciones |
|---|---|---|---|
| Hash de contraseña (bcrypt) | Sí | `BACKEND/apps/auth-service/src/auth.service.ts:35,69,101,126` | 10 rondas de sal, hardcodeado |
| JWT firmado (HS256 por default) | Sí | `BACKEND/libs/auth/src/jwt.strategy.ts`, `BACKEND/apps/auth-service/src/auth.module.ts:19-22` | Secreto con fallback inseguro `'dev_secret'` si falta `JWT_SECRET` |
| Expiración de sesión (1 día) | Sí | `BACKEND/apps/auth-service/src/auth.module.ts:21` | Hardcodeada, no lee `JWT_EXPIRES_IN` pese a existir la variable |
| Cookie httpOnly + secure/sameSite condicional | Sí | `BACKEND/apps/auth-service/src/auth.controller.ts:72-80` | `sameSite:'none'` en producción (necesario por dominios cruzados) |
| Guard de autenticación (`JwtAuthGuard`) | Sí | `BACKEND/libs/auth/src/jwt-auth.guard.ts` | Aplicado en la gran mayoría de endpoints protegidos |
| Guard de rol (`RolesGuard` + `@Roles`) | Sí, parcial | `BACKEND/libs/auth/src/roles.guard.ts` | No aplicado en `candidate-search.controller.ts` (ver 2.8) |
| CORS restringido por origen | Sí | Los 10 `main.ts` de `BACKEND/apps/*/src/main.ts` | Uniforme en todos los servicios |
| Rate limiting / anti fuerza-bruta | **No** | — | `@nestjs/throttler` no está en `package.json`; sin límite en `/auth/login` |
| Validación de entrada (`class-validator`) | Sí | DTOs en `BACKEND/apps/*/src/dto/*.dto.ts` + `ValidationPipe` global (`whitelist`, `forbidNonWhitelisted`) | Confirmado en auth, chat, jobs |
| Sanitización de errores (no exponer stack) | Sí | `BACKEND/libs/common/src/http-exception.filter.ts` | Stack solo va a log de servidor |
| Validación de archivos subidos (CV) | Sí, básica | `BACKEND/apps/portfolio-service/src/cv.service.ts:47-52` | Solo tamaño + `mimetype` declarado por el cliente, sin verificación de contenido real |
| Segunda capa de auth en el gateway | No | `BACKEND/apps/api-gateway/src/gateway.controller.ts` | Proxy ciego; auth delegada 100% a cada microservicio |

---

## 3. Chat / WebSockets

### 3.1 Librería y versiones

- Backend: `socket.io` `^4.8.3` + `@nestjs/websockets` `^11.1.27` + `@nestjs/platform-socket.io` `^11.1.27`.
  Evidencia: `BACKEND/package.json`, líneas 63-66, 84.
- Frontend: `socket.io-client` `^4.8.3`.
  Evidencia: `FRONTEND/package.json`, línea 26.

### 3.2 Gateway y namespace

`ChatGateway`, decorado con `@WebSocketGateway({ cors: {...}, namespace: '/chat' })`.
Evidencia: `BACKEND/apps/chat-service/src/chat.gateway.ts`, líneas 26-33.

### 3.3 Eventos reales

Backend — únicamente eventos **emitidos** hacia el cliente (push), no hay ningún `@SubscribeMessage` en todo el backend (verificado con búsqueda global sobre `BACKEND/`, el único resultado es la mención en un comentario, no un handler real):

| Evento emitido | Método que lo dispara | Sala destino |
|---|---|---|
| `chat:message` | `sendMessageToConversation()` | `conversation:<id>` |
| `chat:read` | `notifyReadMessages()` | `conversation:<id>` |
| `chat:unread-count` | `sendUnreadCount()` (privado, llamado por `notifyUnreadCount()` y en `handleConnection`) | `user:<id>` |
| `chat:conversation-updated` | `notifyConversationUpdated()` | `user:<id>` |

Evidencia: `BACKEND/apps/chat-service/src/chat.gateway.ts`, líneas 112-137 (métodos), 26 (búsqueda `@SubscribeMessage` sobre todo `BACKEND/` sin resultados funcionales).

Frontend — `ChatSocketService` **emite** eventos hacia el servidor que el `ChatGateway` **no escucha** (no existe ningún `@SubscribeMessage` que los reciba):

| Evento emitido por el frontend | Método | Estado en el backend |
|---|---|---|
| `chat:join` | `joinConversation()` | Sin handler — no tiene efecto en el servidor |
| `chat:leave` | `leaveConversation()` | Sin handler — no tiene efecto en el servidor |
| `chat:send` | `sendMessage()` (del socket, no confundir con el método HTTP homónimo del servicio) | Sin handler — no tiene efecto en el servidor |
| `chat:typing` | `sendTyping()` | Sin handler — no tiene efecto en el servidor |
| `chat:read` | `markAsRead()` (del socket) | Sin handler — no tiene efecto en el servidor |

Evidencia: `FRONTEND/src/app/core/services/chat-socket.service.ts`, líneas 58-80.

**Hallazgo real**: esto es código muerto/no funcional en el frontend — las llamadas a `joinConversation`, `leaveConversation`, `sendTyping` y el `sendMessage`/`markAsRead` vía socket no producen ningún efecto en el servidor, porque el `ChatGateway` está diseñado explícitamente (según su propio comentario de cabecera) como un gateway "push-only": el envío real de mensajes y el marcado de leído se hacen por HTTP (`ChatController`/`ChatService`), y el gateway solo retransmite después de persistir en base de datos. El backend además ya une automáticamente cada socket a las salas de conversación relevantes en `handleConnection` (líneas 74-87), por lo que el "join" manual del frontend es redundante incluso si tuviera handler. El indicador de "escribiendo..." (`chat:typing`) específicamente no tiene ninguna implementación funcional de punta a punta.
Evidencia: `BACKEND/apps/chat-service/src/chat.gateway.ts`, líneas 16-25 (comentario de diseño), 74-87 (join automático).

### 3.4 Autenticación del socket

Descrita en la sección 2.8 (cookie httpOnly primero, `handshake.auth.token` como respaldo). Si ninguno de los dos produce un JWT válido, `client.disconnect()` inmediato.
Evidencia: `BACKEND/apps/chat-service/src/chat.gateway.ts`, líneas 55-93.

### 3.5 Persistencia de mensajes

Sí, en la tabla `chat_messages` (modelo `ChatMessage`). El flujo es: `ChatController.sendMessage` → `ChatService.sendMessage` → `prisma.chatMessage.create` (persiste primero) → recién después llama a `chatGateway.sendMessageToConversation(...)` para retransmitir en vivo. El comentario del código es explícito sobre el orden: "el orden persistir→emitir asegura que un refresh de página siempre vea el mensaje aunque el socket falle".
Evidencia: `BACKEND/apps/chat-service/src/chat.service.ts`, líneas 229-268 (especialmente 250-261).

### 3.6 Salas (rooms)

Dos tipos, ambas asignadas automáticamente por el servidor al conectar (no por acción del cliente):
- `user:<id>` — sala personal, para eventos dirigidos a un usuario (contador de no leídos, actualización de lista de conversaciones).
- `conversation:<id>` — una por cada conversación en la que el usuario participa (calculadas según su rol: `candidateId` o `companyId`), para recibir mensajes/lecturas de esa conversación puntual.

Evidencia: `BACKEND/apps/chat-service/src/chat.gateway.ts`, líneas 74-87.

### 3.7 Reconexión

No se encontró evidencia suficiente en el repositorio para confirmar configuración explícita de reconexión (`reconnection`, `reconnectionAttempts`, etc.) — `ChatSocketService.connect()` instancia `io()` solo con `{ withCredentials: true, auth: {...}, transports: ['websocket'], autoConnect: true }`, sin opciones de reconexión propias, por lo que el comportamiento depende íntegramente de los defaults de `socket.io-client` v4 (que sí reconecta automáticamente por defecto, pero eso es comportamiento de la librería, no configuración explícita de este proyecto).
Evidencia: `FRONTEND/src/app/core/services/chat-socket.service.ts`, líneas 35-49.

---

## 4. Frontend Angular — estructura y formularios

### 4.1 Tecnologías de UI reales

- Angular Material `^19.2.19` está en dependencias y se usa activamente (`MatFormFieldModule`, `MatInputModule`, `MatCardModule`, `MatSnackBarModule`, `MatSlideToggleModule`, `MatDialog`, etc., confirmados en los componentes leídos).
  Evidencia: `FRONTEND/package.json`, línea 21; uso concreto en `FRONTEND/src/app/features/auth/login.component.ts`, líneas 5-10, 24-34, y en `FRONTEND/src/app/features/company/company-jobs.component.ts`, líneas 5-8, 76-79.
- **No hay Tailwind CSS**: no aparece en `FRONTEND/package.json` (ni dependencies ni devDependencies) ni se usa como directiva (`@tailwind`) en `FRONTEND/src/styles.scss`.
  Evidencia: `FRONTEND/package.json`, líneas 1-45 (completo); `FRONTEND/src/styles.scss`, líneas 1-446 (completo, sin directivas Tailwind).
- El sistema de estilos real es **SCSS con variables CSS custom** (`:root { --primary: ...; --bg-page: ...; }`, más de 70 tokens de color/espaciado/tipografía/radios/sombras) combinado con overrides puntuales de los componentes Material (`.mdc-text-field--outlined`, `.mat-mdc-form-field`, etc.) y un tema Material 3 definido con `mat.define-theme(...)` sobre paleta cian.
  Evidencia: `FRONTEND/src/styles.scss`, líneas 4-140 (tokens), 142-161 (tema Material), 163-327 (overrides de componentes Material).
- Linter de estilos: `stylelint` `^17.14.0` con `stylelint-config-recommended-scss`, corrido vía `npm run lint:css`.
  Evidencia: `FRONTEND/package.json`, líneas 10-11, 41-42.

### 4.2 Rutas reales (`FRONTEND/src/app/app.routes.ts`, 181 líneas, leído completo)

| Ruta | Componente (`loadComponent`) | Guard | Rol implícito |
|---|---|---|---|
| `''` | `HomeComponent` | — | Público |
| `login` | `LoginComponent` | — | Público (candidato) |
| `register` | `RegisterComponent` | — | Público (candidato) |
| `company/login` | `CompanyLoginComponent` | — | Público (empresa) |
| `company/register` | `CompanyRegisterComponent` | — | Público (empresa) |
| `app` (shell, `AppShellComponent`) | — | `CandidateGuard` | CANDIDATE |
| `app/inicio` | `HomeCandidateComponent` | (heredado de `app`) | CANDIDATE |
| `app/dashboard` | redirect a `inicio` | (heredado) | CANDIDATE |
| `app/profile` | `ProfileComponent` | (heredado) | CANDIDATE |
| `app/skills` | `SkillsComponent` | (heredado) | CANDIDATE |
| `app/experience` | `ExperiencesComponent` | (heredado) | CANDIDATE |
| `app/education` | `EducationComponent` | (heredado) | CANDIDATE |
| `app/projects` | `ProjectsComponent` | (heredado) | CANDIDATE |
| `app/cv-analysis` | `CvAnalysisComponent` | (heredado) | CANDIDATE |
| `app/public-view` | `PublicPreviewComponent` | (heredado) | CANDIDATE |
| `app/jobs` | `CandidateJobsComponent` | (heredado) | CANDIDATE |
| `app/messages` | `MessagesComponent` | (heredado) | CANDIDATE |
| `app/company-view/:id` | `CompanyViewComponent` | (heredado) | CANDIDATE |
| `app` (vacío, índice) | redirect a `inicio` | (heredado) | CANDIDATE |
| `company` (shell, `CompanyShellComponent`) | — | `CompanyGuard` | COMPANY |
| `company/dashboard` | `CompanyDashboardComponent` | (heredado) | COMPANY |
| `company/profile` | `CompanyProfileComponent` | (heredado) | COMPANY |
| `company/candidates` | `CompanyCandidatesComponent` | (heredado) | COMPANY |
| `company/messages` | `MessagesComponent` (mismo componente que el candidato) | (heredado) | COMPANY |
| `company/jobs` | `CompanyJobsComponent` | (heredado) | COMPANY |
| `company` (vacío, índice) | redirect a `dashboard` | (heredado) | COMPANY |
| `portfolio/:slug` | `PublicPortfolioComponent` | — | Público |
| `**` | redirect a `''` | — | — |

Evidencia: `FRONTEND/src/app/app.routes.ts`, líneas 1-181 (completo).

Los guards (`CandidateGuard`, `CompanyGuard`) redirigen — no solo bloquean — según el rol real del usuario autenticado: una empresa logueada que navega a `/app/*` es mandada a `/company/dashboard`, no deslogueada ni mostrada un error; comportamiento simétrico para candidatos en `/company/*`.
Evidencia: `FRONTEND/src/app/core/guards/auth.guard.ts`, líneas 29-57 (`CandidateGuard`), 66-91 (`CompanyGuard`). Existe además un `AuthGuard` genérico (solo exige sesión, sin importar rol) declarado pero no usado en `app.routes.ts` según el propio comentario del archivo.
Evidencia: `FRONTEND/src/app/core/guards/auth.guard.ts`, líneas 94-96.

### 4.3 Formularios: Reactive Forms y template-driven, mezclados (confirmado, no uniforme)

- `login.component.ts`: **Reactive Forms** — `ReactiveFormsModule`, `FormBuilder`, `this.fb.group({...})`, `formControlName` en el template inline.
  Evidencia: `FRONTEND/src/app/features/auth/login.component.ts`, líneas 3, 26, 50, 53, 60, 99-102.
- `profile.component.ts`: **Reactive Forms** — mismo patrón (`FormBuilder`, `this.fb.group({...})` con 14 controles), con normalización aplicada en handlers `(blur)` explícitos (`onPhoneBlur`, `onNameLikeBlur`, `onSummaryBlur`, `onUrlBlur`).
  Evidencia: `FRONTEND/src/app/features/profile/profile.component.ts`, líneas 2, 46, 61-76, 93-132.
- `company-jobs.component.ts`: **template-driven** — usa `FormsModule` (no `ReactiveFormsModule`) y un objeto plano `formData: any = {...}` sin `FormGroup`/`FormControl`, presumiblemente enlazado con `[(ngModel)]` en el template HTML separado (`company-jobs.component.html`, no leído en esta auditoría).
  Evidencia: `FRONTEND/src/app/features/company/company-jobs.component.ts`, líneas 3, 76, 103-108.

**Confirmado: la app mezcla ambos enfoques según el componente**, no hay un estándar único aplicado uniformemente.

### 4.4 Normalización de datos (`FRONTEND/src/app/shared/utils/normalize/`)

Archivos reales: `text.util.ts`, `email.util.ts`, `phone.util.ts`, `nit.util.ts`, `url.util.ts`, `currency.util.ts`, `skill-tag.util.ts`, reexportados desde `index.ts`.
Evidencia: resultado de `Glob FRONTEND/src/app/shared/utils/normalize/*.ts`; barrel en `FRONTEND/src/app/shared/utils/normalize/index.ts`, líneas 6-12.

| Dato | Función(es) | Momento de aplicación real |
|---|---|---|
| Email | `normalizeEmail` (trim + lowercase + sin espacios), `isValidEmail` | Al enviar el formulario (`onSubmit`), no mientras se escribe ni al perder foco — confirmado en `login.component.ts` línea 113, `register.component.ts` línea 128, `company-login.component.ts` línea 115, `company-register.component.ts` línea 149 |
| Teléfono | `normalizePhoneStorage` (solo dígitos + `+`), `formatPhoneDisplay` (agrupado "+57 312 439 2090"), `filterPhoneChars` (filtro en vivo, sin reordenar) | Dos momentos distintos según el componente: **al perder foco** (`onPhoneBlur()`, con comentario explícito en el código sobre por qué no se reformatea en vivo — mover el cursor rompía la edición), en `profile.component.ts` líneas 87-100 y `company-profile.component.ts` (patrón análogo, línea 75); y **al cargar/mostrar** datos ya guardados (`formatPhoneDisplay` en `patchForm`, línea 165) |
| NIT (empresa) | `normalizeNitStorage` (solo dígitos, máx. 10), `formatNitDisplay` ("900.123.456-7") | Al perder foco, mismo patrón que teléfono — `company-profile.component.ts`, línea 85 (`formatNitDisplay(normalizeNitStorage(value))`) |
| Nombres/texto libre | `titleCaseText`, `trimText` | Al perder foco (`onNameLikeBlur`, `onSummaryBlur`) — `profile.component.ts`, líneas 104-121 |
| URLs (LinkedIn/GitHub/sitio web) | `normalizeUrl` | Al perder foco (`onUrlBlur`) — `profile.component.ts`, líneas 124-132 |

Además, el **backend re-normaliza por su cuenta** en el registro (no confía solo en el frontend): `AuthService.register`/`registerCompany` llaman a `normalizeEmail()` (de `@app/common`, la copia backend del mismo util) antes de guardar.
Evidencia: `BACKEND/apps/auth-service/src/auth.service.ts`, líneas 10, 25, 59; confirmado además por el comentario propio del archivo de normalización de teléfono del frontend: "Es lo que se manda al backend y lo que el backend vuelve a normalizar por su cuenta (no hay que confiar solo en el frontend)".
Evidencia: `FRONTEND/src/app/shared/utils/normalize/phone.util.ts`, líneas 1-8.

Existe además un script de backfill (`BACKEND/prisma/normalize-existing-data.ts`) que reutiliza las mismas funciones de normalización, importadas directamente desde `libs/common/src/normalize/*` (la copia backend), confirmando que frontend y backend mantienen implementaciones paralelas del mismo criterio de normalización, no una sola fuente compartida entre ambos lados del stack.
Evidencia: `BACKEND/prisma/normalize-existing-data.ts`, líneas 4-9.

### 4.5 Diseño responsivo

Mecanismo real: mixins SCSS por breakpoint (`_breakpoints.scss`), pensados explícitamente para reemplazar `@media` ad hoc repetidos por todo el código (768/480/1024/1023/900/600px mencionados en el propio comentario del archivo como los valores que reemplaza).

```scss
@mixin mobile { @media (max-width: 480px) { @content; } }
@mixin tablet { @media (max-width: 768px) { @content; } }
@mixin desktop-up { @media (min-width: 1024px) { @content; } }
@mixin until-desktop { @media (max-width: 1023px) { @content; } }
```

Evidencia: `FRONTEND/src/styles/_breakpoints.scss`, líneas 1-27 (completo).
Uso: `@use 'breakpoints' as bp;` y luego `@include bp.mobile { ... }` en los `.scss` de cada componente, según el propio comentario de cabecera del archivo (línea 3) — no se auditó exhaustivamente cada `.component.scss` para contar cuántos ya migraron a este mixin vs. cuántos aún tienen `@media` ad hoc remanente; no se encontró evidencia suficiente en el repositorio para cuantificar la cobertura real de la migración.

---

## Resumen de hallazgos de seguridad más relevantes

1. **Fallback `'dev_secret'` para `JWT_SECRET`** en tres puntos del código (`jwt.strategy.ts`, `auth.module.ts`, `jwt.util.ts`) — riesgo de firma/validación de tokens con secreto público si la variable de entorno falta en algún ambiente.
2. **Sin rate limiting** en ningún endpoint, incluyendo login — sin `@nestjs/throttler` ni mecanismo equivalente en todo el backend.
3. **`candidate-search.controller.ts` sin `RolesGuard`** — endpoints pensados para empresas son accesibles con un token de candidato válido.
4. **`JWT_EXPIRES_IN` hardcodeado a `'1d'`** en `auth.module.ts`, ignorando la variable de entorno homónima ya definida en `.env.example` y `render.yaml`.
5. **Eventos de socket del frontend sin handler en el backend** (`chat:join`, `chat:leave`, `chat:send`, `chat:typing`, `chat:read` vía WebSocket) — no es una falla de seguridad, pero es código no funcional que puede confundir a quien mantenga el chat esperando que el indicador de "escribiendo..." funcione.
6. **Validación de PDF de CV limitada a tamaño + `mimetype` declarado por el cliente**, sin verificación de contenido real del archivo.
