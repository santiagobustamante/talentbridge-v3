# Arquitectura de Microservicios TalentBridge V3

## Resumen Ejecutivo

TalentBridge V3 migra de una arquitectura monolítica a una arquitectura de microservicios, donde cada dominio de negocio opera como un servicio independiente con responsabilidades claramente delimitadas. La comunicación se realiza a través de un API Gateway que actúa como punto de entrada único.

---

## 1. Principios Arquitectónicos

- **Separación por dominio**: Cada microservicio es dueño de un dominio de negocio específico.
- **API Gateway como entrada única**: El frontend solo conoce el Gateway (puerto 3000).
- **Base de datos compartida (Fase 1)**: PostgreSQL único con tablas por dominio, preparado para separación futura.
- **Comunicación HTTP interna**: Los servicios se comunican vía REST/HTTP.
- **Autenticación centralizada**: Auth Service emite JWT, los demás servicios validan el token.

---

## 2. Estructura del Proyecto

```
BACKEND/
├── apps/                          # Microservicios
│   ├── api-gateway/               # Punto de entrada único
│   ├── auth-service/              # Autenticación y autorización
│   ├── candidate-service/         # Perfil del candidato
│   ├── portfolio-service/         # Habilidades, experiencia, educación, proyectos, CV
│   ├── company-service/           # Perfil empresarial, búsqueda de candidatos
│   ├── jobs-service/              # Ofertas de trabajo
│   ├── applications-service/      # Postulaciones
│   ├── chat-service/              # Mensajería y WebSocket
│   ├── assistant-service/         # Asistente virtual Joaquín
│   └── dashboard-service/         # Dashboards y métricas
│
├── libs/                          # Código compartido
│   ├── database/                  # PrismaService, PrismaModule, enums
│   ├── auth/                      # JWT Strategy, Guards, Decorators
│   ├── common/                    # Filtros, helpers, respuesta estándar
│   ├── contracts/                 # Interfaces compartidas
│   └── events/                    # Nombres y payloads de eventos
│
├── prisma/                        # Schema, migraciones, seeds
│   ├── schema.prisma
│   ├── migrations/
│   ├── seed.ts
│   └── seed-jobs.ts
│
├── nest-cli.json                  # Configuración monorepo
├── package.json                   # Dependencias y scripts
├── tsconfig.json                  # TypeScript con path aliases
├── Dockerfile                     # Build multi-stage
└── .env                           # Variables de entorno
```

---

## 3. Responsabilidades por Servicio

### 3.1 API Gateway (:3000)

- Única entrada del frontend.
- Proxy HTTP a servicios internos.
- Manejo de CORS.
- Cookies y forwarding de auth_token.
- Validación de salud (health check).
- Swagger centralizado.

**Rutas expuestas**:
```
/api/auth/*          → Auth Service (:3001)
/api/profile/*       → Candidate Service (:3002)
/api/skills*         → Portfolio Service (:3003)
/api/experiences*    → Portfolio Service (:3003)
/api/education*      → Portfolio Service (:3003)
/api/projects*       → Portfolio Service (:3003)
/api/cv*             → Portfolio Service (:3003)
/api/portfolio*      → Portfolio Service (:3003)
/api/company/*       → Company Service (:3004)
/api/jobs*           → Jobs Service (:3006) / Applications Service (:3007)
/api/applications*   → Applications Service (:3007)
/api/chat*           → Chat Service (:3008)
/api/assistant*      → Assistant Service (:3009)
/api/dashboard*      → Dashboard Service (:3010)
```

### 3.2 Auth Service (:3001)

- `POST /api/auth/register` - Registro candidato
- `POST /api/auth/register-company` - Registro empresa
- `POST /api/auth/login` - Login candidato (valida rol CANDIDATE)
- `POST /api/auth/login-company` - Login empresa (valida rol COMPANY)
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/me` - Usuario autenticado actual

**Reglas**:
- Login candidato rechaza cuentas COMPANY (403).
- Login empresa rechaza cuentas CANDIDATE (403).
- JWT incluye `{ sub: userId, email, role }`.
- Cookie httpOnly `auth_token` con 24h de expiración.

### 3.3 Candidate Service (:3002)

- `GET /api/profile` - Perfil con porcentaje de completado
- `PATCH /api/profile` - Actualizar perfil
- `POST /api/profile/generate-slug` - Generar slug único
- `GET /api/profile/views` - Vistas del perfil

**Propiedades del perfil**:
- fullName, professionalTitle, summary, phone, city, photoUrl
- linkedinUrl, githubUrl, websiteUrl
- Slug único por candidato
- Switches de visibilidad (showPhone, showCity, showLinkedin, etc.)
- Porcentaje de perfil completado (25% por sección)

### 3.4 Portfolio Service (:3003)

**Habilidades**:
- `GET /api/skills` - Listar
- `POST /api/skills` - Agregar (normaliza nombre, evita duplicados)
- `PATCH /api/skills/:id` - Actualizar
- `DELETE /api/skills/:id` - Eliminar

**Experiencia**:
- `GET /api/experiences` - Listar
- `POST /api/experiences` - Agregar
- `PATCH /api/experiences/:id` - Actualizar
- `DELETE /api/experiences/:id` - Eliminar

**Educación**:
- `GET /api/education` - Listar
- `POST /api/education` - Agregar
- `PATCH /api/education/:id` - Actualizar
- `DELETE /api/education/:id` - Eliminar

**Proyectos**:
- `GET /api/projects` - Listar
- `POST /api/projects` - Agregar
- `PATCH /api/projects/:id` - Actualizar
- `DELETE /api/projects/:id` - Eliminar

**CV**:
- `GET /api/cv` - Listar CVs
- `POST /api/cv/upload` - Subir PDF (max 5MB)
- `DELETE /api/cv/:id` - Eliminar

**Portafolio Público**:
- `GET /api/portfolio/:slug` - Vista pública (respeta switches)
- `GET /api/portfolio/preview/me` - Vista previa autenticada

### 3.5 Company Service (:3004)

**Perfil Empresarial**:
- `GET /api/company/profile` - Perfil propio
- `PATCH /api/company/profile` - Actualizar
- `GET /api/company/:id/public` - Perfil público

**Búsqueda de Candidatos**:
- `GET /api/company/candidates/search` - Búsqueda con filtros
  - Parámetros: q, city, profession, skills, mode (ANY/ALL)
- `GET /api/company/candidates/suggestions` - Autocompletado

### 3.6 Jobs Service (:3006)

**Empresa**:
- `GET /api/company/jobs` - Listar ofertas (filtro por status)
- `POST /api/company/jobs` - Crear oferta (DRAFT)
- `PATCH /api/company/jobs/:id` - Editar
- `PATCH /api/company/jobs/:id/publish` - Publicar
- `PATCH /api/company/jobs/:id/close` - Cerrar
- `PATCH /api/company/jobs/:id/archive` - Archivar
- `PATCH /api/company/jobs/:id/restore` - Restaurar

**Candidato**:
- `GET /api/jobs` - Listar publicadas (con matchedSkills y canApplyBySkills)
- `GET /api/jobs/:id` - Detalle con perfil de empresa

### 3.7 Applications Service (:3007)

- `POST /api/jobs/:id/apply` - Aplicar (valida match de habilidades)
- `GET /api/jobs/my-applications` - Mis postulaciones
- `GET /api/company/jobs/:id/applications` - Postulaciones por oferta
- `PATCH /api/company/applications/:id/status` - Cambiar estado

**Validación de habilidades**:
- Si la oferta tiene `skillsRequired`, el candidato debe coincidir con al menos una.
- Si no coincide, retorna 400 con mensaje.
- Si no hay habilidades requeridas, permite aplicar.
- Evita doble postulación (409).

### 3.8 Chat Service (:3008)

**REST**:
- `GET /api/chat/conversations` - Listar conversaciones
- `POST /api/chat/conversations` - Crear/recuperar conversación
- `GET /api/chat/conversations/:id/messages` - Mensajes
- `POST /api/chat/conversations/:id/messages` - Enviar mensaje
- `PATCH /api/chat/conversations/:id/read` - Marcar leído
- `GET /api/chat/unread-count` - Contador no leídos

**WebSocket (Socket.IO)**:
- Namespace: `/chat`
- Eventos: `chat:message`, `chat:read`, `chat:unread-count`, `chat:conversation-updated`
- Autenticación por cookie JWT

### 3.9 Assistant Service (:3009)

- `POST /api/assistant/message` - Procesar mensaje

**Capacidades de Joaquín**:
- Detecta rol (candidato/empresa).
- Responde sobre perfil, ofertas, postulaciones, mensajes, dashboard.
- Preguntas sugeridas y acciones con rutas.
- Estadísticas en tiempo real.
- Advertencia de GitHub para candidatos.

### 3.10 Dashboard Service (:3010)

- `GET /api/dashboard/candidate` - Dashboard candidato
- `GET /api/dashboard/company` - Dashboard empresa

**Métricas candidato**: perfil completado, vistas, postulaciones, mensajes, ofertas recientes, próximos pasos.
**Métricas empresa**: ofertas activas/totales, postulaciones pendientes, mensajes, vistas de perfiles, próximos pasos.

---

## 4. Modelo de Datos (Prisma)

15 modelos + 3 enums:

| Modelo | Descripción |
|--------|------------|
| User | Usuarios con rol CANDIDATE/COMPANY |
| Profile | Perfil de candidato con switches de visibilidad |
| CompanyProfile | Perfil empresarial |
| Skill | Habilidades por perfil (normalizadas) |
| Experience | Experiencia laboral |
| Education | Formación académica |
| Project | Proyectos del portafolio |
| CvDocument | Documentos CV subidos |
| CvAnalysis | Análisis de CV |
| Conversation | Conversaciones candidato-empresa |
| ChatMessage | Mensajes del chat |
| ChatBlock | Bloqueos entre usuarios |
| JobOffer | Ofertas de trabajo (DRAFT/PUBLISHED/CLOSED/ARCHIVED) |
| JobApplication | Postulaciones (PENDING/REVIEWED/PRESELECTED/REJECTED/HIRED) |
| ProfileView | Registro de vistas a perfiles |

---

## 5. Estrategia de Base de Datos

### Fase Actual (V3)
- PostgreSQL único compartido.
- Cada servicio accede solo a las tablas de su dominio.
- Prisma ORM centralizado en `libs/database`.

### Evolución Futura
```
auth_db       → Auth Service
profiles_db   → Candidate + Portfolio Services
company_db    → Company Service
jobs_db       → Jobs + Applications Services
chat_db       → Chat Service
```

---

## 6. Comunicación entre Servicios

### API Gateway → Servicios
- HTTP fetch con forwarding de cookies y headers.
- Sin librerías adicionales, usando fetch nativo de Node.js.

### WebSocket
- Conexión directa frontend → Chat Service (:3008).
- Namespace `/chat` con autenticación JWT.

### Eventos (preparado para futuro)
- `libs/events` define nombres de eventos y payloads.
- Preparado para integrar RabbitMQ o Kafka.

---

## 7. Ventajas de la Arquitectura

- **Escalabilidad independiente**: Cada servicio escala según demanda.
- **Despliegue aislado**: Actualizar un servicio no afecta a los demás.
- **Responsabilidad clara**: Cada equipo/servicio tiene un dominio definido.
- **Resiliencia**: Fallo en un servicio no derriba toda la aplicación.
- **Tecnología flexible**: Cada servicio podría usar diferentes tecnologías en el futuro.
- **Testing**: Pruebas unitarias por servicio, sin dependencias cruzadas.

---

## 8. Endpoints por Servicio

### API Gateway (:3000)
```
GET  /api/health
```

### Auth Service (:3001)
```
POST /api/auth/register
POST /api/auth/register-company
POST /api/auth/login
POST /api/auth/login-company
POST /api/auth/logout
GET  /api/auth/me
```

### Candidate Service (:3002)
```
GET    /api/profile
PATCH  /api/profile
POST   /api/profile/generate-slug
GET    /api/profile/views
```

### Portfolio Service (:3003)
```
GET    /api/skills
POST   /api/skills
PATCH  /api/skills/:id
DELETE /api/skills/:id
GET    /api/experiences
POST   /api/experiences
PATCH  /api/experiences/:id
DELETE /api/experiences/:id
GET    /api/education
POST   /api/education
PATCH  /api/education/:id
DELETE /api/education/:id
GET    /api/projects
POST   /api/projects
PATCH  /api/projects/:id
DELETE /api/projects/:id
GET    /api/cv
POST   /api/cv/upload
DELETE /api/cv/:id
GET    /api/portfolio/:slug
GET    /api/portfolio/preview/me
```

### Company Service (:3004)
```
GET    /api/company/profile
PATCH  /api/company/profile
GET    /api/company/:id/public
GET    /api/company/candidates/search
GET    /api/company/candidates/suggestions
```

### Jobs Service (:3006)
```
GET    /api/company/jobs
POST   /api/company/jobs
PATCH  /api/company/jobs/:id
PATCH  /api/company/jobs/:id/publish
PATCH  /api/company/jobs/:id/close
PATCH  /api/company/jobs/:id/archive
PATCH  /api/company/jobs/:id/restore
GET    /api/jobs
GET    /api/jobs/:id
```

### Applications Service (:3007)
```
POST   /api/jobs/:id/apply
GET    /api/jobs/my-applications
GET    /api/company/jobs/:id/applications
PATCH  /api/company/applications/:id/status
```

### Chat Service (:3008)
```
GET    /api/chat/conversations
POST   /api/chat/conversations
GET    /api/chat/conversations/:id/messages
POST   /api/chat/conversations/:id/messages
PATCH  /api/chat/conversations/:id/read
GET    /api/chat/unread-count
WS     /chat
```

### Assistant Service (:3009)
```
POST   /api/assistant/message
```

### Dashboard Service (:3010)
```
GET    /api/dashboard/candidate
GET    /api/dashboard/company
```

---

## 9. Scripts Disponibles

```bash
# Construir todos los servicios
npm run build

# Iniciar servicios individuales (con --watch)
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

# Base de datos
npm run seed          # 3 empresas + 100 candidatos
npm run seed:jobs     # 50 empresas + 200 ofertas
```

---

## 10. Credenciales de Prueba

| Tipo | Email | Contraseña |
|------|-------|-----------|
| Candidato | (cualquiera del seed) | `Candidato.123` |
| Empresa | talento@llanero.com | `Empresa.123` |
| Empresa | conecta@empleo.com | `Empresa.123` |
| Empresa | rrhh@andinos.com | `Empresa.123` |

---

*Documento generado para Seminario UCC - Versión 3.0 - Junio 2026*
