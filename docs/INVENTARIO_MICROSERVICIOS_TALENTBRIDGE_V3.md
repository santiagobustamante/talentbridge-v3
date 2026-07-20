# Inventario técnico de microservicios — TalentBridge V3

Auditoría 100% basada en lectura directa del código fuente en `BACKEND/` (raíz: `C:\Users\busta\Documents\UCC\SEMINARIO\PROYECTO\VERSION 3\BACKEND`). Cada afirmación relevante incluye su evidencia (archivo + método/línea). Donde no se encontró evidencia en el repositorio, se indica explícitamente.

Fecha de auditoría: 2026-07-18.

---

## 1. Tabla resumen — 10 microservicios + Gateway

| Servicio | Puerto por defecto (`main.ts`) | Prefijo(s) de ruta | Responsabilidad (1 línea) |
|---|---|---|---|
| api-gateway | 3000 | `/api/*` (proxy) | Punto de entrada único; reenvía cada request al microservicio correspondiente vía `fetch()` manual. |
| auth-service | 3001 | `/api/auth` | Registro/login de candidatos y empresas, emisión y verificación de JWT (cookie httpOnly). |
| candidate-service | 3002 | `/api/profile` | Perfil del candidato (datos básicos, switches de visibilidad, slug, vistas recibidas). |
| portfolio-service | 3003 | `/api/skills`, `/api/experiences`, `/api/education`, `/api/projects`, `/api/cv`, `/api/portfolio` | Habilidades, experiencia, educación, proyectos, CV (subida + análisis IA) y portafolio público. |
| company-service | 3004 | `/api/company` | Perfil de empresa y búsqueda/filtrado de candidatos publicados. |
| jobs-service | 3006 | `/api/jobs`, `/api/company/jobs` | CRUD de ofertas laborales (lado empresa) y listado/detalle para candidatos, con cálculo de match de habilidades. |
| applications-service | 3007 | `/api/jobs/:id/apply`, `/api/jobs/my-applications`, `/api/company/jobs/:id/applications`, `/api/company/applications` | Postulaciones de candidatos a ofertas y su gestión por parte de la empresa. |
| chat-service | 3008 | `/api/chat` (+ WebSocket namespace `/chat`) | Mensajería candidato↔empresa (HTTP para historial/CRUD, Socket.io para tiempo real). |
| assistant-service | 3009 | `/api/assistant` | Asistente virtual "Joaquín" (LLM DeepSeek) con contexto real del usuario y sugerencias de navegación. |
| dashboard-service | 3010 | `/api/dashboard` | Agregación de estadísticas/resúmenes para el panel principal de candidato y de empresa. |

**Nota sobre el puerto 3005**: no existe ningún microservicio que lo use por defecto (ni en `main.ts`, ni en `docker-compose.yml`, ni en `render.yaml`). Salto intencional en la numeración, no un servicio faltante.

Evidencia de puertos:
```
Archivo: BACKEND/apps/api-gateway/src/main.ts:31        → process.env['API_GATEWAY_PORT'] || 3000
Archivo: BACKEND/apps/auth-service/src/main.ts:19        → process.env['AUTH_SERVICE_PORT'] || 3001
Archivo: BACKEND/apps/candidate-service/src/main.ts:17   → process.env['CANDIDATE_SERVICE_PORT'] || 3002
Archivo: BACKEND/apps/portfolio-service/src/main.ts:17   → process.env['PORTFOLIO_SERVICE_PORT'] || 3003
Archivo: BACKEND/apps/company-service/src/main.ts:17     → process.env['COMPANY_SERVICE_PORT'] || 3004
Archivo: BACKEND/apps/jobs-service/src/main.ts:17        → process.env['JOBS_SERVICE_PORT'] || 3006
Archivo: BACKEND/apps/applications-service/src/main.ts:23 → process.env['APPLICATIONS_SERVICE_PORT'] || 3007
Archivo: BACKEND/apps/chat-service/src/main.ts:24        → process.env['CHAT_SERVICE_PORT'] || 3008
Archivo: BACKEND/apps/assistant-service/src/main.ts:20   → process.env['ASSISTANT_SERVICE_PORT'] || 3009
Archivo: BACKEND/apps/dashboard-service/src/main.ts:17   → process.env['DASHBOARD_SERVICE_PORT'] || 3010
```

**`docker-compose.yml` (raíz del repo) sigue existiendo** y define los 10 servicios + Postgres, con los mismos puertos que sus `main.ts` (ej. `chat-service` puerto host/contenedor `3008:3008`). No hay discrepancia entre `docker-compose.yml` y los `main.ts`.

**`render.yaml` (raíz del repo) también existe** y confirma que el despliegue real actual es en Render (no Railway, pese a que commits antiguos del historial de git mencionan Railway) — cada servicio se despliega como `type: web` con `runtime: docker`, un `Dockerfile` propio en `BACKEND/docker/<servicio>.Dockerfile`, y variables `PORT` + `<SERVICIO>_SERVICE_PORT` con el mismo valor que el puerto por defecto de su `main.ts`. El API Gateway declara `healthCheckPath: /api/health` — ver hallazgo de riesgo sobre esta ruta en la sección del Gateway.

---

## 2. Detalle por servicio

### 2.1 api-gateway

- **Responsabilidad**: único punto de entrada HTTP para el frontend; reenvía cada request al microservicio interno correspondiente.
- **Puerto**: 3000 (`API_GATEWAY_PORT`).
- **Módulos**: `AppModule` (único módulo).
  Evidencia: `BACKEND/apps/api-gateway/src/app.module.ts`.
- **Controladores**:
  - `AppController` (`@Controller()`, sin prefijo) — `GET /health` (con prefijo global `/api` → `GET /api/health`), sin guard, consulta `SELECT 1` en Postgres para reportar `database: connected|disconnected`.
    Evidencia: `BACKEND/apps/api-gateway/src/app.controller.ts:9-24`.
  - `GatewayController` (`@Controller()`) — un único endpoint catch-all `@All('*path')` que decide a qué microservicio reenviar según el prefijo de `req.path`.
    Evidencia: `BACKEND/apps/api-gateway/src/gateway.controller.ts:9-73`.
- **Servicios internos**:
  - `HttpClient.proxy(req, res, targetBase)` — arma la URL destino (`targetBase + req.path + querystring`), copia headers `Cookie` y `Authorization`, serializa el body a JSON si es POST/PATCH/PUT y no es `multipart/form-data`, hace `fetch()` al servicio destino, reenvía `Set-Cookie` y responde con el mismo status/body (JSON o texto) que devolvió el microservicio interno.
    Evidencia: `BACKEND/apps/api-gateway/src/http-client.service.ts:8-67`.
- **Entidades/tablas**: ninguna propia; solo usa Prisma para el `SELECT 1` de health check (no lee/escribe modelos de negocio).
- **Dependencias hacia otros servicios**: hacia los 9 microservicios restantes, vía HTTP interno (`fetch`), usando URLs configurables por variable de entorno (`AUTH_SERVICE_URL`, `CANDIDATE_SERVICE_URL`, etc.) con fallback a `http://localhost:<puerto>`.
- **Comunicación**: **NO** es un cliente de microservicios de NestJS (no usa `@nestjs/microservices`, ni TCP/Redis/gRPC transport). Es un **proxy HTTP manual** implementado a mano con `fetch()` nativo de Node, confirmado leyendo `http-client.service.ts` completo — no hay ningún import de `ClientProxy`, `@MessagePattern` ni similar en todo `apps/api-gateway`.
- **Riesgos reales encontrados**:
  1. **Subida de archivos (multipart) rota a través del Gateway.** `HttpClient.proxy` solo arma `body` cuando `!isMultipart` (línea 33: `if (['POST','PATCH','PUT'].includes(method) && !isMultipart && req.body)`). Para requests `multipart/form-data` (el único caso real en el backend es `POST /api/cv/upload` en `portfolio-service`, ver `cv.controller.ts`), `body` queda `undefined` y el archivo **nunca llega** al microservicio destino a través del Gateway — se reenvía la request sin el archivo. Esto es un bug real si la subida de CV pasa por el Gateway en vez de ir directo al `portfolio-service`.
     Evidencia: `BACKEND/apps/api-gateway/src/http-client.service.ts:26-39`, contrastado con `BACKEND/apps/portfolio-service/src/cv.controller.ts:24-28` (`@UseInterceptors(FileInterceptor('file'))`).
  2. **Regla `/api/health` del Gateway es código muerto para GET.** `gateway.controller.ts` (líneas 17-19) define una regla que reenvía `/api/health` a `auth-service`, pero `auth-service` **no tiene ningún endpoint `health`** (solo `AuthController` con prefijo `auth`, confirmado por listado completo de archivos de `apps/auth-service/src`). Además, `AppController` (registrado antes que `GatewayController` en `app.module.ts`) ya responde `GET /api/health` directamente — Express/Nest resuelve esa ruta exacta antes de llegar al wildcard `@All('*path')`, por lo que la regla del Gateway solo sería alcanzable con métodos HTTP distintos de GET a `/api/health`, y en ese caso devolvería 404 desde `auth-service` (no tiene handler para esa ruta). El `healthCheckPath: /api/health` de `render.yaml` en producción depende de `AppController`, no de esta regla del proxy.
     Evidencia: `BACKEND/apps/api-gateway/src/gateway.controller.ts:17-19`, `BACKEND/apps/api-gateway/src/app.module.ts:16` (orden de `controllers: [AppController, GatewayController]`), `render.yaml:9`.
  3. **Regla `/api/analysis` del Gateway no tiene destino real.** Reenvía a `portfolio-service`, pero ningún controlador de `portfolio-service` está registrado bajo el prefijo `analysis` (los 6 controladores son `skills`, `experiences`, `education`, `projects`, `cv`, y uno sin prefijo para portafolio público — confirmado por `grep` de `@Controller(` en todo `apps/portfolio-service/src`). El análisis de CV real vive bajo `POST /api/cv/:id/analyze`. La regla `/api/analysis` es una ruta declarada en el proxy que no resuelve a nada.
     Evidencia: `BACKEND/apps/api-gateway/src/gateway.controller.ts:27-28` vs. controladores listados en `BACKEND/apps/portfolio-service/src/*.controller.ts`.
  4. **Orden de registro de controladores es una dependencia implícita y frágil.** El hallazgo #2 depende de que `AppController` esté antes que `GatewayController` en el array `controllers` de `app.module.ts`. Si alguien reordena ese array (o agrega un nuevo controlador con rutas específicas después del wildcard), el comportamiento de qué handler resuelve `/api/health` puede cambiar silenciosamente.
  5. **El WebSocket del chat NO pasa por el Gateway.** Como el proxy está implementado con `fetch()` (no soporta upgrade de conexión WebSocket), el frontend se conecta directo a `chat-service` (`environment.wsUrl` + `/chat`), sin pasar por el puerto 3000. Confirmado en el frontend: `FRONTEND/src/app/core/services/chat-socket.service.ts:38` usa `io(`${environment.wsUrl}/chat`, ...)`. Esto significa que en producción el navegador debe poder alcanzar directamente el host/puerto público de `chat-service`, no solo el del Gateway — una superficie de red adicional a exponer y proteger.

---

### 2.2 auth-service

- **Responsabilidad**: registro/login de candidatos y empresas, emisión y verificación de JWT vía cookie httpOnly.
- **Puerto**: 3001 (`AUTH_SERVICE_PORT`).
- **Módulos**: `AuthModule` — importa `PassportModule` (estrategia `jwt` por defecto) y `JwtModule` con `secret: process.env['JWT_SECRET'] || 'dev_secret'`.
  Evidencia: `BACKEND/apps/auth-service/src/auth.module.ts:18-22`.
- **Controlador**: `AuthController` (`@Controller('auth')`):

| Método | Ruta | Guard/Rol | Qué hace |
|---|---|---|---|
| POST | `auth/register` | ninguno | Registra candidato, crea `Profile` con slug único, devuelve `{user, token}` y setea cookie `auth_token`. |
| POST | `auth/register-company` | ninguno | Registra empresa (`role: COMPANY`), crea `CompanyProfile`. |
| POST | `auth/login` | ninguno | Login de candidato; rechaza si la cuenta es de empresa (`ForbiddenException`). |
| POST | `auth/login-company` | ninguno | Login de empresa; rechaza si la cuenta es de candidato. |
| POST | `auth/logout` | ninguno | Limpia la cookie `auth_token`. |
| GET | `auth/me` | `JwtAuthGuard` | Devuelve el usuario autenticado (sin `passwordHash`). |

  Evidencia: `BACKEND/apps/auth-service/src/auth.controller.ts:11-70`.
- **Servicios internos** (`AuthService`):
  - `register/registerCompany`: valida `password === confirmPassword`, normaliza email, hashea con `bcrypt` (10 rounds), crea `User` + `Profile`/`CompanyProfile` en una sola escritura Prisma (`create` anidado).
  - `login/loginCompany`: busca por email normalizado, compara hash con `bcrypt.compare`, valida que el `role` coincida con el endpoint usado.
  - `me`: busca por id, incluye `profile`/`companyProfile`.
  - `generateToken`: firma JWT con `{sub, email, role}`.
  - `sanitizeUser`: quita `passwordHash` de la respuesta.
  - `generateUniqueSlug`: genera slug desde la parte local del email, agregando sufijo numérico si ya existe.
  Evidencia: `BACKEND/apps/auth-service/src/auth.service.ts:20-183`.
- **Entidades Prisma usadas**: `User`, `Profile`, `CompanyProfile`.
- **Dependencias hacia otros servicios**: ninguna (no llama a otros microservicios).
- **Comunicación**: solo expuesto vía Gateway (`/api/auth/*`); no consume nada externo salvo Postgres.
- **Riesgos reales**:
  - **Secreto JWT con fallback hardcodeado.** `process.env['JWT_SECRET'] || 'dev_secret'` aparece en tres lugares (`auth.module.ts:20`, `libs/auth/src/jwt.strategy.ts:22`, `libs/auth/src/jwt.util.ts:10,16`). Si `JWT_SECRET` no está seteada en algún entorno (ej. un microservicio desplegado sin esa variable), ese proceso firma/valida tokens con el secreto público `'dev_secret'`, lo cual permitiría falsificar tokens válidos para esa instancia. En `render.yaml` cada servicio sí declara `JWT_SECRET` con `sync: false` (se configura manualmente en el dashboard de Render), por lo que el riesgo es de configuración/despliegue, no de código per se, pero el fallback silencioso (sin error ni warning) hace que un olvido pase desapercibido.
    Evidencia: `BACKEND/apps/auth-service/src/auth.module.ts:20`, `BACKEND/libs/auth/src/jwt.strategy.ts:22`, `BACKEND/libs/auth/src/jwt.util.ts:10-17`.
  - No hay verificación de formato/fuerza de contraseña más allá de `MinLength(8)` (sin exigir mayúsculas/números/símbolos) — ver `RegisterDto`.

---

### 2.3 candidate-service

- **Responsabilidad**: perfil de datos básicos del candidato (nombre, título, contacto, switches de visibilidad), generación de slug, listado de vistas recibidas.
- **Puerto**: 3002 (`CANDIDATE_SERVICE_PORT`).
- **Módulos**: `CandidateModule`.
  Evidencia: `BACKEND/apps/candidate-service/src/candidate.module.ts`.
- **Controlador**: `ProfileController` (`@Controller('profile')`), todas las rutas con `JwtAuthGuard`:

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `profile` | Devuelve el perfil completo (skills, experiences, educations, projects, views) + `completionPercentage` calculado. |
| PATCH | `profile` | Actualiza campos del perfil, re-normalizando en el servidor (no confía en lo que ya llegó formateado del frontend). |
| POST | `profile/generate-slug` | Regenera el slug único del portafolio a partir del email. |
| GET | `profile/views` | Lista quién (qué empresa) vio el perfil publicado. |

  Evidencia: `BACKEND/apps/candidate-service/src/profile.controller.ts:6-36`.
- **Servicio interno** (`ProfileService`): normaliza `fullName`/`professionalTitle`/`city` con `titleCaseText`, `phone` con `normalizePhoneStorage`, URLs con `normalizeUrl`; calcula `completionPercentage` en 4 bloques de 25% (info básica, skills, experiencia/educación, proyectos).
  Evidencia: `BACKEND/apps/candidate-service/src/profile.service.ts:9-131`.
- **Entidades Prisma usadas**: `Profile`, `Skill`, `Experience`, `Education`, `Project`, `ProfileView`, `User` (para el email al generar slug).
- **Dependencias hacia otros servicios**: ninguna directa (no llama a otros microservicios).
- **Riesgos reales**: ninguno de severidad relevante encontrado en la lectura del código; validación de DTO cubre todos los campos con `@IsOptional()/@IsString()/@IsBoolean()` (sin `@IsUrl()` en los campos de URL, se delega la normalización/validez a `normalizeUrl`, que no rechaza URLs mal formadas, solo les antepone `https://`).

---

### 2.4 portfolio-service

- **Responsabilidad**: habilidades, experiencia laboral, educación, proyectos, subida y análisis IA de CV, y portafolio público. El microservicio con más controladores (6).
- **Puerto**: 3003 (`PORTFOLIO_SERVICE_PORT`).
- **Módulos**: `PortfolioModule`, registra `SkillsController`, `ExperiencesController`, `EducationController`, `ProjectsController`, `CvController`, `PublicPortfolioController`.
  Evidencia: `BACKEND/apps/portfolio-service/src/portfolio.module.ts:27-34`.

**Controladores y endpoints:**

| Controlador | Método | Ruta | Guard/Rol | Qué hace |
|---|---|---|---|---|
| `SkillsController` (`skills`) | GET | `skills` | Jwt | Lista skills del perfil con conteo de avales. |
| | POST | `skills` | Jwt | Agrega skill (rechaza duplicado por nombre normalizado). |
| | PATCH | `skills/:id` | Jwt | Edita nombre/nivel. |
| | DELETE | `skills/:id` | Jwt | Elimina. |
| | POST | `skills/:id/endorse` | Jwt + `Roles(COMPANY)` | Empresa avala una skill — **solo si ya tuvo conversación o postulación con ese candidato** (`companyHasContactedCandidate`). |
| | DELETE | `skills/:id/endorse` | Jwt + `Roles(COMPANY)` | Retira el aval propio. |
| `ExperiencesController` (`experiences`) | GET/POST/PATCH `:id`/DELETE `:id` | Jwt | CRUD de experiencia laboral; dedup case-insensitive de `learnedSkills`. |
| `EducationController` (`education`) | GET/POST/PATCH `:id`/DELETE `:id` | Jwt | CRUD de educación. |
| `ProjectsController` (`projects`) | GET/POST/PATCH `:id`/DELETE `:id` | Jwt | CRUD de proyectos del portafolio. |
| `CvController` (`cv`) | GET | `cv` | Jwt | Lista CVs subidos con sus análisis. |
| | GET | `cv/:id` | Jwt | Detalle de un CV. |
| | POST | `cv/upload` | Jwt | Sube PDF (`FileInterceptor('file')`), valida tamaño (`MAX_PDF_SIZE_MB`, default 5MB) y `mimetype === 'application/pdf'`, guarda en `uploads/cv/`, extrae texto con `pdf-parse`. |
| | POST | `cv/:id/analyze` | Jwt | Llama a DeepSeek (`chatJson`) con el texto extraído (truncado a 8000 caracteres) para obtener `{score, strengths, recommendations}`. |
| | GET | `cv/:id/analyses` | Jwt | Historial de análisis de un CV. |
| | DELETE | `cv/:id` | Jwt | Borra archivo físico (`fs.unlinkSync`, con `try/catch` silencioso) y el registro. |
| `PublicPortfolioController` (sin prefijo) | GET | `portfolio/:slug` | `OptionalJwtAuthGuard` | Portafolio público; si el visitante es una empresa autenticada distinta del dueño, registra una vista (`ProfileView`), con deduplicación de 10 minutos. |
| | GET | `portfolio/preview/me` | `OptionalJwtAuthGuard` | Preview del propio portafolio autenticado. |

  Evidencia: `BACKEND/apps/portfolio-service/src/skills.controller.ts`, `experiences.controller.ts`, `education.controller.ts`, `projects.controller.ts`, `cv.controller.ts`, `public-portfolio.controller.ts`.

- **Servicios internos** (resumen):
  - `SkillsService`: además del CRUD, `companyHasContactedCandidate` consulta `Conversation` y `JobApplication` para autorizar avales.
  - `CvService.extractTextFromBuffer`: usa `require('pdf-parse')` (import dinámico), soporta dos formas de API de la librería (`PDFParse` clase o función directa), captura cualquier error y devuelve string vacío (no lanza).
  - `CvService.performAnalysis`: arma un prompt de sistema en español que exige JSON estricto, clampa `score` a 0-100 y filtra que `strengths`/`recommendations` sean arrays de strings.
  - `PublicPortfolioService.filterByVisibility`: aplica los switches `showX` del perfil (`showCity`, `showPhone`, etc.) antes de exponer datos — es el único punto que respeta la privacidad configurada por el candidato.
- **Entidades Prisma usadas**: `Profile`, `Skill`, `SkillEndorsement`, `Experience`, `Education`, `Project`, `CvDocument`, `CvAnalysis`, `ProfileView`, `Conversation`, `JobApplication` (para `companyHasContactedCandidate`).
- **Dependencias hacia otros servicios**: ninguna llamada HTTP directa a otro microservicio; usa `DeepSeekService` (librería compartida `@app/common`, llamada HTTP saliente a la API de DeepSeek, no a otro microservicio interno).
- **Riesgos reales**:
  - Ver riesgo #1 del Gateway (subida de CV vía multipart potencialmente rota si pasa por el proxy).
  - `deleteCv` ignora silenciosamente el error si el archivo físico no existe (`try { fs.unlinkSync(...) } catch {}`) — aceptable pero sin logging, dificulta diagnosticar inconsistencias entre disco y base de datos.
  - El directorio de subida (`uploads/cv/`) se resuelve con `path.join(process.cwd(), 'uploads', 'cv')` — depende del working directory del proceso, no de una ruta absoluta configurada; en contenedores Docker/Render esto es estable porque el `WORKDIR` es fijo, pero es un acoplamiento implícito a cómo se lanza el proceso.
  - `filterByVisibility` está tipado como `(profile: any)` sin interfaz — no hay chequeo de tipos que garantice que todos los campos nuevos del modelo `Profile` se contemplen si se agrega uno nuevo al schema.

---

### 2.5 company-service

- **Responsabilidad**: perfil de la empresa (propio y público) y búsqueda/filtrado de candidatos con perfil publicado.
- **Puerto**: 3004 (`COMPANY_SERVICE_PORT`).
- **Módulos**: `CompanyModule`, registra `CompanyProfileController` y `CandidateSearchController` (ambos bajo el mismo prefijo `company`).
  Evidencia: `BACKEND/apps/company-service/src/company.module.ts:19`.

| Controlador | Método | Ruta | Guard/Rol | Qué hace |
|---|---|---|---|---|
| `CompanyProfileController` | GET | `company/profile` | Jwt | Perfil propio de la empresa autenticada. |
| | PATCH | `company/profile` | Jwt | Actualiza perfil (normaliza `companyName`, `sector`, `city`, `phone` (`normalizePhoneStorage`), `nit` (`normalizeNitStorage`), `websiteUrl`). |
| | GET | `company/public/:id` | **ninguno** | Perfil público de una empresa por `userId` — endpoint sin autenticación, expone solo campos ya pensados como públicos (nombre, sector, ciudad, teléfono, sitio, descripción, logo). |
| `CandidateSearchController` | GET | `company/candidates/filter-options` | Jwt | Lista de skills/ciudades/profesiones distintas entre perfiles publicados (hasta 50/30/30). |
| | GET | `company/candidates/search` | Jwt | Búsqueda paginada de candidatos publicados por texto, ciudad, profesión y skills (modo `ANY` u `ALL`), con `matchedSkills` y `endorsedByMe` por resultado. |
| | GET | `company/candidates/suggestions` | Jwt | Autocompletado de skills (mínimo 2 caracteres, hasta 15 resultados). |

  Evidencia: `BACKEND/apps/company-service/src/company-profile.controller.ts`, `candidate-search.controller.ts`.

- **Servicios internos**: `CandidateSearchService.search` arma un `where` dinámico de Prisma (`OR` para texto libre, `contains/insensitive` para ciudad/profesión, `some`/`AND` de skills según modo), pagina con `skip/take`, calcula `matchedSkills` y filtra resultados en memoria cuando el modo es `ALL` (el filtro de "todas las skills" se aplica **después** de la consulta a base de datos, sobre la página ya traída — con `limit` alto y `mode=ALL`, puede devolver menos resultados de los pedidos en esa página aunque existan más que sí cumplan, porque el filtrado post-query no re-pagina).
  Evidencia: `BACKEND/apps/company-service/src/candidate-search.service.ts:50-139`.
- **Entidades Prisma usadas**: `CompanyProfile`, `Profile`, `Skill`, `SkillEndorsement`.
- **Dependencias hacia otros servicios**: ninguna.
- **Riesgos reales**:
  - `company-profile.service.ts.updateProfile(userId, dto: any)` — el parámetro del servicio está tipado `any` (aunque el controlador sí valida contra `CompanyProfileDto` antes de llamarlo, por lo que el riesgo real es bajo, pero rompe la garantía de tipos en la capa de servicio).
  - El filtrado post-query en modo `ALL` (arriba) es un bug de paginación potencial, no solo un "risk" cosmético: con muchos candidatos y filtro `ALL` estricto, una página puede devolver menos de `limit` resultados sin que sea la última página real.
  - `GET company/public/:id` sin guard es intencional (perfil público de empresa), pero vale remarcarlo explícitamente como endpoint no autenticado, tal como pide la consigna de esta auditoría.

---

### 2.6 jobs-service

- **Responsabilidad**: CRUD de ofertas laborales del lado empresa (incluyendo su ciclo de estado) y listado/detalle de ofertas para candidatos con cálculo de compatibilidad de habilidades.
- **Puerto**: 3006 (`JOBS_SERVICE_PORT`).
- **Módulos**: `JobsModule`, registra `CompanyJobsController` y `CandidateJobsController`.
  Evidencia: `BACKEND/apps/jobs-service/src/jobs.module.ts:18`.

| Controlador | Método | Ruta | Guard/Rol | Qué hace |
|---|---|---|---|---|
| `CandidateJobsController` (`jobs`) | GET | `jobs` | Jwt | Ofertas publicadas, filtrables por texto/ciudad, con `skillMatch`/`hasApplied` por oferta. |
| | GET | `jobs/:id` | Jwt | Detalle de una oferta + match de skills del candidato autenticado. |
| `CompanyJobsController` (`company/jobs`) | GET | `company/jobs` | Jwt + `Roles(COMPANY)` | Ofertas propias, filtrables por `status`. |
| | GET | `company/jobs/:id` | Jwt + `Roles(COMPANY)` | Detalle de oferta propia. |
| | POST | `company/jobs` | Jwt + `Roles(COMPANY)` | Crea oferta en estado `DRAFT`. |
| | PATCH | `company/jobs/:id` | Jwt + `Roles(COMPANY)` | Edita campos (solo si es dueña). |
| | DELETE | `company/jobs/:id` | Jwt + `Roles(COMPANY)` | Elimina (solo si es dueña). |
| | PATCH | `company/jobs/:id/publish` | Jwt + `Roles(COMPANY)` | Publica (exige título y descripción). |
| | PATCH | `company/jobs/:id/close` | Jwt + `Roles(COMPANY)` | Cierra. |
| | PATCH | `company/jobs/:id/archive` | Jwt + `Roles(COMPANY)` | Archiva. |
| | PATCH | `company/jobs/:id/restore` | Jwt + `Roles(COMPANY)` | Vuelve a `DRAFT`. |

  Evidencia: `BACKEND/apps/jobs-service/src/candidate-jobs.controller.ts`, `company-jobs.controller.ts`.

- **Servicio interno** (`JobsService`): usa `computeSkillMatch` (de `@app/contracts`) para calcular `matchPercent`/`breakdown` entre `skillsRequired` de la oferta y las skills del candidato; todas las mutaciones de empresa verifican `job.companyId !== companyUserId → ForbiddenException` antes de escribir.
  Evidencia: `BACKEND/apps/jobs-service/src/jobs.service.ts`.
- **Entidades Prisma usadas**: `JobOffer`, `JobApplication`, `Profile`, `Skill`.
- **Dependencias hacia otros servicios**: ninguna llamada directa; el match de skills se calcula localmente con la librería compartida `@app/contracts`, sin llamar a `applications-service` ni `candidate-service`.
- **Riesgos reales**:
  - **`CreateJobOfferDto` existe pero no se usa.** El archivo `BACKEND/apps/jobs-service/src/dto/create-job-offer.dto.ts` define validaciones (`@IsString`, `@IsInt`, etc.) pero `CompanyJobsController.createJob`/`updateJob` reciben `@Body() dto: any` (confirmado: `CreateJobOfferDto` no aparece importado ni referenciado en ningún otro archivo del servicio, solo en su propia definición). Como el `ValidationPipe` global necesita un tipo/clase concreto para aplicar `class-validator`, con `dto: any` **no hay validación real del body** en `POST company/jobs` ni `PATCH company/jobs/:id` — puede llegar cualquier estructura, incluyendo tipos incorrectos para `salaryMin`/`salaryMax` que luego se pasan tal cual a Prisma.
    Evidencia: `BACKEND/apps/jobs-service/src/company-jobs.controller.ts:27,34` vs. `BACKEND/apps/jobs-service/src/dto/create-job-offer.dto.ts` (sin otras referencias en el repo).
  - `status` de la oferta se maneja con constantes `as any` (`DRAFT`, `PUBLISHED`, etc. declaradas como `'DRAFT' as any`) en vez de usar el enum `JobOfferStatus` importado de Prisma directamente — funciona pero evita el chequeo de tipos que el enum ofrecería.
    Evidencia: `BACKEND/apps/jobs-service/src/jobs.service.ts:6-9`.

---

### 2.7 applications-service

- **Responsabilidad**: postulaciones de candidatos a ofertas y su gestión (listado, cambio de estado) por parte de la empresa dueña de la oferta.
- **Puerto**: 3007 (`APPLICATIONS_SERVICE_PORT`).
- **Módulos**: `ApplicationsModule`.
  Evidencia: `BACKEND/apps/applications-service/src/applications.module.ts`.
- **Controlador**: `ApplicationsController` (`@Controller()`, sin prefijo — las rutas incluyen el path completo):

| Método | Ruta | Guard/Rol | Qué hace |
|---|---|---|---|
| POST | `jobs/:id/apply` | Jwt | Candidato se postula; valida oferta publicada, perfil existente, no duplicado, y **al menos una skill que matchee** (`computeSkillMatch(...).hasAnyMatch`). |
| GET | `jobs/my-applications` | Jwt | Postulaciones propias, paginadas y filtrables por `status`/`fromDate`/`toDate`. |
| GET | `company/jobs/:id/applications` | Jwt + `Roles(COMPANY)` | Candidatos postulados a una oferta propia. |
| PATCH | `company/applications/:id/status` | Jwt + `Roles(COMPANY)` | Cambia el estado de una postulación (valida que la oferta asociada sea de esa empresa y que el nuevo estado sea uno del enum `JobApplicationStatus`). |

  Evidencia: `BACKEND/apps/applications-service/src/applications.controller.ts:24-68`.
- **Servicio interno** (`ApplicationsService`): reutiliza `computeSkillMatch` (misma librería compartida que `jobs-service`) para la regla de elegibilidad al postularse; todas las consultas/mutaciones de empresa verifican propiedad de la oferta antes de proceder.
  Evidencia: `BACKEND/apps/applications-service/src/applications.service.ts`.
- **Entidades Prisma usadas**: `JobOffer`, `JobApplication`, `Profile`, `Skill`.
- **Dependencias hacia otros servicios**: ninguna llamada HTTP directa; duplica localmente la lógica de matching (misma función compartida `computeSkillMatch` que usa `jobs-service`, no hay llamada cruzada entre ambos servicios).
- **Riesgos reales**: `POST jobs/:id/apply` y `PATCH company/applications/:id/status` reciben `@Body() body: any` sin DTO (no existe un DTO propio para estos dos endpoints en el servicio — a diferencia de `jobs-service`, aquí ni siquiera se definió un DTO no usado; se accede directamente a `body.coverMessage`/`body.status`). El `ValidationPipe` global con `forbidNonWhitelisted: true` no tiene efecto sobre estos dos endpoints porque no hay clase DTO que valide.
  Evidencia: `BACKEND/apps/applications-service/src/applications.controller.ts:25,66`.

---

### 2.8 chat-service

- **Responsabilidad**: mensajería candidato↔empresa. Es el único servicio con dos superficies: HTTP (historial/CRUD) y WebSocket (tiempo real).
- **Puerto**: 3008 (`CHAT_SERVICE_PORT`).
- **Módulos**: `ChatModule`, registra `ChatController` (HTTP) y `ChatGateway` (WebSocket, no es un `@Controller`).
  Evidencia: `BACKEND/apps/chat-service/src/chat.module.ts:24-27`.
- **Controlador HTTP**: `ChatController` (`@Controller('chat')`), todas las rutas con `JwtAuthGuard`:

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `chat/conversations` | Lista conversaciones del usuario con último mensaje, no leídos y estado de bloqueo. |
| POST | `chat/conversations` | Crea/recupera conversación — **solo una empresa puede iniciarla** (`ForbiddenException` si `role === 'CANDIDATE'`). |
| GET | `chat/conversations/:id` | Detalle, valida pertenencia. |
| GET | `chat/conversations/:id/messages` | Mensajes paginados (más antiguos primero). |
| POST | `chat/conversations/:id/messages` | Envía mensaje; persiste y retransmite por WebSocket. |
| PATCH | `chat/conversations/:id/read` | Marca mensajes recibidos como leídos. |
| GET | `chat/unread-count` | Total de no leídos del usuario. |
| POST | `chat/conversations/:id/block` | Bloquea a la contraparte. |
| DELETE | `chat/conversations/:id/block` | Revierte el bloqueo. |

  Evidencia: `BACKEND/apps/chat-service/src/chat.controller.ts:17-92`.
- **WebSocket** (`ChatGateway`, namespace `/chat`, Socket.io): no recibe mensajes entrantes por socket (`@SubscribeMessage` no se usa) — es "solo push". Autentica en `handleConnection` extrayendo el JWT de la cookie (`JwtUtil.extractTokenFromCookie`) con fallback a `handshake.auth.token` (documentado en el código como respaldo para navegadores que bloquean cookies cross-domain `SameSite=None`); si no hay token válido, desconecta. Mantiene un `Map<userId, Set<socketId>>` en memoria del proceso y une cada socket a las salas `user:<id>` y `conversation:<id>` de las conversaciones del usuario. Emite `chat:message`, `chat:read`, `chat:unread-count`, `chat:conversation-updated`.
  Evidencia: `BACKEND/apps/chat-service/src/chat.gateway.ts`.
- **Servicio interno** (`ChatService`): valida en cada operación que el usuario autenticado sea `candidateId` o `companyId` de la conversación; `sendMessage` primero persiste en Postgres y **después** emite los eventos WebSocket (orden documentado explícitamente en el código para que un refresh de página nunca pierda un mensaje aunque el socket falle); respeta bloqueos (`ChatBlock`) antes de permitir enviar.
  Evidencia: `BACKEND/apps/chat-service/src/chat.service.ts`.
- **Entidades Prisma usadas**: `Conversation`, `ChatMessage`, `ChatBlock`, `User`, `Profile` (para datos de candidato), `CompanyProfile`.
- **Dependencias hacia otros servicios**: ninguna llamada HTTP a otro microservicio.
- **Riesgos reales**:
  - **El registro en memoria (`userSockets: Map`) no sobrevive a reinicios ni escala horizontalmente.** Si `chat-service` corre con más de una instancia (varios contenedores/procesos), cada instancia tiene su propio mapa de sockets — un usuario conectado a la instancia A no recibiría eventos emitidos por acciones procesadas en la instancia B (no hay adaptador de Socket.io compartido tipo Redis). No es un problema mientras se despliegue una sola instancia (que es el caso actual en Render free tier), pero es una limitación real de escalabilidad horizontal.
  - Ver riesgo del Gateway: el WebSocket bypassa el Gateway, exponiendo directamente el puerto de `chat-service`.

---

### 2.9 assistant-service

- **Responsabilidad**: asistente virtual "Joaquín" — un único endpoint conversacional que combina datos reales del usuario (Prisma) con una llamada a DeepSeek para responder y sugerir navegación.
- **Puerto**: 3009 (`ASSISTANT_SERVICE_PORT`).
- **Módulos**: `AssistantModule`.
  Evidencia: `BACKEND/apps/assistant-service/src/assistant.module.ts`.
- **Controlador**: `AssistantController` (`@Controller('assistant')`):

| Método | Ruta | Guard | Qué hace |
|---|---|---|---|
| POST | `assistant/message` | Jwt | Recibe `{message, history?}` (DTO validado, `history` máx. 12 items, `message` máx. 2000 chars), devuelve `{reply, role, intent, actions, results}`. |

  Evidencia: `BACKEND/apps/assistant-service/src/assistant.controller.ts:22-26`, DTO en `BACKEND/apps/assistant-service/src/dto/assistant-message.dto.ts`.
- **Servicio interno** (`AssistantService.processMessage`): arma contexto real (estadísticas del candidato/empresa vía consultas Prisma propias, y compatibilidad candidato↔ofertas u oferta↔candidatos reutilizando `computeSkillMatch`), construye un system prompt en español con reglas explícitas ("nunca inventes rutas/porcentajes"), llama a `DeepSeekService.chatJson`, y filtra las `actions` devueltas por el modelo contra una lista cerrada de rutas válidas (`CANDIDATE_ROUTES`/`COMPANY_ROUTES`) antes de devolverlas — así el modelo no puede sugerir una ruta inexistente del frontend. La conversación **no se persiste** en base de datos (a diferencia de `chat-service`); el historial lo reenvía el propio frontend en cada request.
  Evidencia: `BACKEND/apps/assistant-service/src/assistant.service.ts:110-320`.
- **Entidades Prisma usadas**: `User`, `Profile`, `Skill`, `JobOffer`, `JobApplication`, `Conversation`, `ChatMessage`, `CompanyProfile` (solo lectura, para armar estadísticas y contexto — no escribe nada).
- **Dependencias hacia otros servicios**: ninguna llamada HTTP interna; llamada saliente a la API externa de DeepSeek vía `DeepSeekService` (`@app/common`).
- **Riesgos reales**:
  - Si `DeepSeek` falla, se captura el error y se devuelve una respuesta de fallback genérica (`FALLBACK_REPLY`) — buen manejo, sin exponer detalles del error al cliente.
  - `getCompanyCandidateMatches` trae hasta 200 perfiles publicados completos (`take: 200`) en cada mensaje del asistente cuando el usuario es empresa — costo de consulta no trivial en cada interacción del chat, sin cache.
    Evidencia: `BACKEND/apps/assistant-service/src/assistant.service.ts:281-285`.

---

### 2.10 dashboard-service

- **Responsabilidad**: agregación de estadísticas para el panel principal, tanto de candidato como de empresa (evita que el frontend tenga que llamar a 4-5 servicios distintos para pintar un dashboard).
- **Puerto**: 3010 (`DASHBOARD_SERVICE_PORT`).
- **Módulos**: `DashboardModule`.
  Evidencia: `BACKEND/apps/dashboard-service/src/dashboard.module.ts`.
- **Controlador**: `DashboardController` (`@Controller('dashboard')`):

| Método | Ruta | Guard | Qué hace |
|---|---|---|---|
| GET | `dashboard/candidate` | Jwt | Resumen candidato: % de perfil completo, conteos, últimas 5 postulaciones, últimas 5 ofertas publicadas, últimas 3 conversaciones, mensajes sin leer, y un `nextStep` sugerido calculado con reglas simples. |
| GET | `dashboard/company` | Jwt | Resumen empresa: conteos de ofertas por estado, candidatos publicados totales, últimas 5 ofertas propias, últimas 10 postulaciones recibidas, últimas 3 conversaciones. |

  Evidencia: `BACKEND/apps/dashboard-service/src/dashboard.controller.ts`.
- **Servicio interno** (`DashboardService`): cada método del dashboard dispara múltiples queries Prisma secuenciales/paralelas (no usa `Promise.all` de forma consistente — algunas queries van una tras otra en vez de en paralelo, ej. `getCandidateDashboard` hace ~8 queries await secuenciales antes de las 2 en `Promise.all` iniciales de otros métodos del proyecto) para armar el payload agregado.
  Evidencia: `BACKEND/apps/dashboard-service/src/dashboard.service.ts:12-101` (candidato), `103-173` (empresa).
- **Entidades Prisma usadas**: `Profile`, `Skill`, `Experience`, `Education`, `Project`, `JobApplication`, `ProfileView`, `JobOffer`, `Conversation`, `ChatMessage`, `CompanyProfile`.
- **Dependencias hacia otros servicios**: ninguna; consulta Postgres directamente (mismo patrón que todos los demás servicios — ver observación de arquitectura en la sección final).
- **Riesgos reales**:
  - Igual que `jobs-service`/`dashboard-service` usan constantes `as any` para el enum de estado (`const PUBLISHED = 'PUBLISHED' as any;` etc.) en vez del enum tipado de Prisma directamente — funciona pero renuncia al chequeo de tipos.
    Evidencia: `BACKEND/apps/dashboard-service/src/dashboard.service.ts:4-6`.
  - Cada llamada a `dashboard/candidate` o `dashboard/company` dispara entre 6 y 9 queries Prisma independientes sin agregación/cache — no es incorrecto, pero es notablemente más pesado que los otros endpoints del sistema; en el plan gratuito de Render (recursos limitados) esto es el endpoint más costoso del backend en términos de queries por request.

---

## 3. Libs compartidas (`BACKEND/libs/`)

| Lib | Qué exporta | Quién la usa |
|---|---|---|
| `@app/auth` | `JwtAuthGuard`, `OptionalJwtAuthGuard`, `JwtStrategy`, `CurrentUser` (decorator), `Roles` (decorator) + `RolesGuard`, `JwtUtil` (verificación de token fuera del ciclo de request HTTP, usado por Socket.io), `AuthLibModule` (`@Global()`). | Todos los 9 microservicios de negocio la importan vía `AuthLibModule` (excepto `api-gateway`, que no tiene rutas protegidas propias más allá del proxy). `JwtUtil` se usa puntualmente en `chat.gateway.ts` para autenticar sockets fuera del pipeline HTTP normal. |
| `@app/common` | `AllExceptionsFilter` (filtro global de excepciones, homogeneiza el shape de error `{statusCode, message}`), `CommonModule` (`@Global()`), `ResponseHelper` (helpers `success/created/paginated`), `DeepSeekService` (cliente LLM, lazy-init del SDK de OpenAI apuntando a `api.deepseek.com`), y utilidades de normalización (`text`, `email`, `phone`, `nit`, `url`, `currency`, `skill-tag`). | `AllExceptionsFilter` y `CommonModule` los importan los 10 servicios (incluido el Gateway). `DeepSeekService` solo lo usan realmente `portfolio-service` (análisis de CV) y `assistant-service` (Joaquín), aunque `CommonModule` es `@Global()` y lo instancia en todos — documentado explícitamente en el propio código como decisión deliberada (init perezoso para no crashear los servicios que no tienen `DEEPSEEK_API_KEY`). Las utilidades de normalización (`titleCaseText`, `normalizePhoneStorage`, `normalizeNitStorage`, `normalizeUrl`, `normalizeEmail`, `normalizeSkillDisplay/Key`) se usan en `auth-service`, `candidate-service`, `company-service`, `portfolio-service` y `jobs-service`. **`ResponseHelper` no se usa en ningún controlador/servicio de ningún microservicio** (búsqueda en todo `apps/` sin resultados) — código exportado pero muerto. |
| `@app/database` | `PrismaService` (extiende el `PrismaClient` generado, usa el adaptador `@prisma/adapter-pg` con `DATABASE_URL`), `PrismaModule` (`@Global()`), y re-exporta `UserRole`, `JobOfferStatus`, `JobApplicationStatus`, `Prisma` (namespace de tipos) desde el cliente generado. | Los 10 microservicios (cada uno con su propia instancia de `PrismaService`/pool de conexión, apuntando al mismo `DATABASE_URL`/schema). |
| `@app/contracts` | `parseSkillsRequired`, `stringifySkillsRequired`, `computeSkillMatch` (algoritmo central de matching candidato↔oferta, con soporte de nivel mínimo requerido vía sintaxis `"Nombre:NIVEL"` en `skillsRequired`), y tipos `ServiceHealth`/`PaginatedResponse` (interfaces, sin uso confirmado fuera de la propia lib). | `jobs-service` (`getCandidateJobs`, `getJobById`), `applications-service` (`apply`), `assistant-service` (`getCandidateJobMatchesText`, `getCompanyCandidateMatches`) — es la única lib de negocio compartida entre 3 microservicios distintos, y por tanto la que más garantiza que "match %" sea consistente en toda la plataforma. |
| `@app/events` | `Events` (const con nombres de eventos: `MESSAGE_SENT`, `APPLICATION_STATUS_CHANGED`, `JOB_PUBLISHED`, `NOTIFICATION_CREATED`, etc.) y varias interfaces de payload (`ChatMessagePayload`, `ApplicationStatusPayload`, `JobEventPayload`, `NotificationPayload`). | **Ningún archivo de `apps/` la importa** (búsqueda de `@app/events` en todo `apps/` sin resultados). Es una librería completamente sin uso — probablemente pensada para un futuro bus de eventos entre servicios (ej. notificar `chat-service` cuando `applications-service` cambia un estado) que nunca se conectó; hoy cada servicio calcula sus propios datos derivados (ej. `unreadCount`, stats de dashboard) por queries directas a Postgres en el momento, no por eventos. |

---

## 4. Modelos de datos (Prisma, `BACKEND/prisma/schema.prisma`) y qué servicio los usa

El schema es **único y compartido**: los 10 microservicios apuntan al mismo `DATABASE_URL`/base de datos Postgres, cada uno con su propia instancia de `PrismaService` (su propio pool de conexiones), pero **no hay separación de esquema por servicio** ("database-per-service" no está implementado — es una base de datos compartida entre microservicios, patrón habitual llamado "shared database" que acopla el despliegue de todos los servicios a un único schema/migración).

| Modelo | Usado por (servicios que hacen `findX`/`create`/`update`/`delete` sobre él) |
|---|---|
| `User` | auth-service, candidate-service, company-service, chat-service, assistant-service, dashboard-service, jobs-service, applications-service (relaciones vía `include`) |
| `Profile` | candidate-service, portfolio-service, company-service, jobs-service, applications-service, assistant-service, dashboard-service, chat-service (lectura vía `include`) |
| `ProfileView` | candidate-service (lectura), portfolio-service (creación en `recordView`), dashboard-service (conteo) |
| `CompanyProfile` | auth-service (creación en registro), company-service, chat-service, jobs-service, applications-service, dashboard-service, assistant-service |
| `Skill` / `SkillEndorsement` | portfolio-service (CRUD + avales), company-service (búsqueda/filtros), jobs-service y applications-service (matching), assistant-service (contexto) |
| `Experience` | portfolio-service, candidate-service (lectura embebida), dashboard-service, assistant-service (conteos) |
| `Education` | portfolio-service, candidate-service (lectura embebida), dashboard-service, assistant-service |
| `Project` | portfolio-service, candidate-service (lectura embebida), dashboard-service, assistant-service |
| `CvDocument` / `CvAnalysis` | portfolio-service exclusivamente |
| `Conversation` / `ChatMessage` / `ChatBlock` | chat-service exclusivamente para CRUD; dashboard-service y assistant-service las leen (solo conteos, sin mutar) |
| `JobOffer` | jobs-service (CRUD completo), applications-service (lectura), dashboard-service, assistant-service (lectura) |
| `JobApplication` | applications-service (CRUD completo), jobs-service (lectura, para `hasApplied`), portfolio-service (lectura, para `companyHasContactedCandidate`), dashboard-service, assistant-service |

Evidencia: `BACKEND/prisma/schema.prisma` (schema completo, 344 líneas) — modelos `User`, `Profile`, `ProfileView`, `CompanyProfile`, `Skill`, `SkillEndorsement`, `Experience`, `Education`, `Project`, `CvDocument`, `CvAnalysis`, `Conversation`, `ChatMessage`, `ChatBlock`, `JobOffer`, `JobApplication`, más enums `UserRole`, `JobOfferStatus`, `JobApplicationStatus`.

---

## 5. Tabla completa de rutas del API Gateway

El Gateway **no define rutas individuales**: es un único endpoint catch-all (`@All('*path')` en `GatewayController`) que decide el destino evaluando, en orden, 14 condiciones sobre `req.path` (`fullPath.startsWith(...)`). Confirmado leyendo `gateway.controller.ts` completo (74 líneas) — no hay ningún otro archivo de rutas en `api-gateway`. La tabla siguiente traduce esas 14 reglas de prefijo, en el mismo orden en que el código las evalúa (el orden importa: las reglas más específicas de `/api/company/jobs/...` y `/api/jobs/...` están antes que sus versiones genéricas `/api/company` y `/api/jobs`).

| # | Prefijo evaluado | Condición completa | Microservicio destino | Var. de entorno / URL interna | Protegida (según el servicio destino) |
|---|---|---|---|---|---|
| 1 | `/api/auth` | `startsWith('/api/auth')` | auth-service | `AUTH_SERVICE_URL` (`:3001`) | Mixta — la mayoría pública, `GET /me` requiere Jwt |
| 2 | `/api/health` | `startsWith('/api/health')` | auth-service | `AUTH_SERVICE_URL` (`:3001`) | **Inalcanzable para GET** (ver riesgo #2 del Gateway); auth-service no tiene handler `health` |
| 3 | `/api/profile` | `startsWith('/api/profile')` | candidate-service | `CANDIDATE_SERVICE_URL` (`:3002`) | Todas con Jwt |
| 4 | `/api/skills`, `/api/experiences`, `/api/education`, `/api/projects`, `/api/cv`, `/api/portfolio`, `/api/analysis` | `startsWith` de cualquiera de los 7 | portfolio-service | `PORTFOLIO_SERVICE_URL` (`:3003`) | Mixta — `/api/portfolio/:slug` y `/api/portfolio/preview/me` con `OptionalJwtAuthGuard` (público), resto con Jwt. `/api/analysis` sin destino real (ver riesgo #3) |
| 5 | `/api/company/jobs/*` con `/applications` o `/apply` en el path | condición compuesta | applications-service | `APPLICATIONS_SERVICE_URL` (`:3007`) | Jwt + `Roles(COMPANY)` |
| 6 | `/api/company/applications` | `startsWith('/api/company/applications')` | applications-service | `APPLICATIONS_SERVICE_URL` (`:3007`) | Jwt + `Roles(COMPANY)` |
| 7 | `/api/company/jobs` | `startsWith('/api/company/jobs')` (evaluado después de #5/#6, que son más específicas) | jobs-service | `JOBS_SERVICE_URL` (`:3006`) | Jwt + `Roles(COMPANY)` |
| 8 | `/api/company` | `startsWith('/api/company')` (catch-all de lo no capturado por #5-7) | company-service | `COMPANY_SERVICE_URL` (`:3004`) | Mixta — `GET /company/public/:id` sin guard, resto Jwt |
| 9 | `/api/jobs/*` con `/apply` o `/my-applications` en el path | condición compuesta | applications-service | `APPLICATIONS_SERVICE_URL` (`:3007`) | Jwt |
| 10 | `/api/jobs` | `startsWith('/api/jobs')` (evaluado después de #9) | jobs-service | `JOBS_SERVICE_URL` (`:3006`) | Jwt |
| 11 | `/api/applications` | `startsWith('/api/applications')` | applications-service | `APPLICATIONS_SERVICE_URL` (`:3007`) | Jwt (no hay ningún controlador de `applications-service` registrado literalmente bajo el prefijo `applications` — sus rutas reales son `jobs/:id/apply`, `jobs/my-applications`, `company/jobs/:id/applications`, `company/applications/:id/status`, ya cubiertas por las reglas #5/#6/#9; esta regla #11 queda sin ruta real que la use hoy, mismo patrón de "regla sin destino" que `/api/analysis`) |
| 12 | `/api/chat` | `startsWith('/api/chat')` | chat-service | `CHAT_SERVICE_URL` (`:3008`) | Todas con Jwt |
| 13 | `/api/assistant` | `startsWith('/api/assistant')` | assistant-service | `ASSISTANT_SERVICE_URL` (`:3009`) | Jwt |
| 14 | `/api/dashboard` | `startsWith('/api/dashboard')` | dashboard-service | `DASHBOARD_SERVICE_URL` (`:3010`) | Jwt |
| — | cualquier otro path | (ninguna condición matchea) | — | — | Responde `404 { message: 'Ruta no encontrada' }` directamente desde el Gateway |
| — | `GET /api/health` (exacto) | resuelto por `AppController`, **no** por `GatewayController` | api-gateway (local) | — | Sin guard — usado como healthcheck de Render (`render.yaml:9`) |

Evidencia completa: `BACKEND/apps/api-gateway/src/gateway.controller.ts:9-73` (14 bloques `if`, contados uno por uno).

**Segundo hallazgo de regla sin destino real** (además de `/api/analysis`, ver riesgo #3 del Gateway): la regla #11 (`/api/applications`) del Gateway no tiene ningún controlador registrado bajo ese prefijo exacto — todas las rutas reales de `applications-service` usan prefijos `jobs/...` o `company/...`, que ya están cubiertas por las reglas #5, #6 y #9 antes de llegar a la #11. No es necesariamente un bug (puede ser una regla dejada a propósito por si se agrega una ruta futura bajo `/api/applications`), pero hoy es código sin tráfico real posible que la use, ya que ningún endpoint del frontend puede generar un path que empiece con `/api/applications` sin también empezar con `/api/jobs` o `/api/company` primero.

**Conteo total de endpoints HTTP reales en la plataforma** (sumando todos los `@Get/@Post/@Patch/@Delete` de los 10 microservicios, contados controlador por controlador en las secciones 2.1-2.10, sin contar el catch-all del Gateway ni el WebSocket): **70 endpoints** — 1 en api-gateway (`GET /api/health`) + 6 en auth-service + 4 en candidate-service + 26 en portfolio-service + 6 en company-service + 11 en jobs-service + 4 en applications-service + 9 en chat-service + 1 en assistant-service + 2 en dashboard-service.

---

## 6. Discrepancias encontradas frente a documentación previa del repositorio

- `BACKEND/MICROSERVICES.md` (línea 260) menciona `profiles_db → Candidate + Portfolio Services`, dando a entender una base de datos separada por dominio. La lectura del código actual (`libs/database/src/prisma.service.ts`, `prisma/schema.prisma`, y los 10 `main.ts`) confirma que **todos los microservicios usan el mismo `DATABASE_URL`/schema Postgres único** — no hay `profiles_db` como base separada. Puede ser documentación de una etapa de diseño anterior no actualizada; no se modificó ese archivo por instrucción explícita del proyecto (`docs/` previos no se sobrescriben).
- No se encontró discrepancia de puertos entre `main.ts`, `docker-compose.yml` y `render.yaml` — los tres coinciden exactamente para los 10 servicios.
- El puerto 3005 no está asignado a ningún servicio; no se encontró evidencia de que haya existido un servicio ahí anteriormente (no hay referencias a `3005` en ningún archivo de configuración del repo).

---

## 7. Resumen de riesgos reales encontrados (consolidado)

1. Subida de CV vía `multipart/form-data` pierde el body si pasa por el proxy del Gateway (`http-client.service.ts`).
2. Regla `/api/health` del Gateway apunta a un endpoint que no existe en `auth-service`; el health check real lo resuelve `AppController` directamente, antes de llegar al proxy.
3. Regla `/api/analysis` del Gateway no tiene ningún controlador destino en `portfolio-service`.
4. Regla `/api/applications` del Gateway no tiene ningún controlador destino literal en `applications-service` (sus rutas reales ya están cubiertas por reglas más específicas anteriores).
5. `JWT_SECRET` tiene fallback hardcodeado a `'dev_secret'` en 3 archivos (`auth.module.ts`, `jwt.strategy.ts`, `jwt.util.ts`) — riesgo si algún despliegue omite la variable.
6. `CreateJobOfferDto` (jobs-service) está definido pero no se usa; `createJob`/`updateJob` no validan el body (`dto: any`).
7. `applications-service` nunca definió DTOs para `apply`/`updateStatus`; ambos usan `body: any`.
8. `libs/events` está completamente sin uso en todo el backend (0 imports desde `apps/`).
9. `ResponseHelper` (`libs/common`) está exportado pero sin uso en ningún servicio.
10. El WebSocket de chat no pasa por el Gateway — el frontend se conecta directo a `chat-service`, expandiendo la superficie de red expuesta.
11. `chat.gateway.ts` mantiene el registro de sockets conectados en memoria local del proceso — no escala horizontalmente sin un adaptador compartido (ej. Redis).
12. `CandidateSearchService.search` con modo `ALL` filtra en memoria después de paginar en base de datos — puede devolver menos resultados de los reales en una página.
13. Base de datos compartida entre los 10 microservicios (mismo `DATABASE_URL`/schema) — acoplamiento de despliegue/migración entre todos los servicios, no aislamiento real de datos por dominio.

---

## 8. Qué NO se pudo confirmar

No se encontró evidencia suficiente en el repositorio para confirmar si `applications-service` o `jobs-service` tienen algún mecanismo de idempotencia adicional más allá del constraint único `@@unique([jobOfferId, candidateId])` de Prisma (ej. ante condiciones de carrera con requests simultáneos, el comportamiento exacto depende de si Postgres rechaza el segundo insert con un error de constraint que el código traduce correctamente a `ConflictException`, o si puede quedar sin manejar — no se auditó el comportamiento bajo concurrencia real, solo el código fuente síncrono).
