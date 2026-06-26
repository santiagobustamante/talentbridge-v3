# Endpoints de la API - Smart Portfolio

Base URL: `http://localhost:3000/api`
Swagger: `http://localhost:3000/api/docs`

## Autenticación

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/auth/register` | No | Registro de usuario |
| POST | `/auth/login` | No | Inicio de sesión |
| POST | `/auth/logout` | No | Cierre de sesión |
| GET | `/auth/me` | Sí | Usuario autenticado |

### POST /auth/register
Body: `{ email: string, password: string, confirmPassword: string }`
Response: `{ user: { id, email, profile } }`

### POST /auth/login
Body: `{ email: string, password: string }`
Response: `{ user: { id, email, profile } }`

### POST /auth/logout
Response: `{ message: "Sesión cerrada" }`

### GET /auth/me
Response: `{ id, email, createdAt, updatedAt, profile }`

---

## Health

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/health` | No | Estado del servidor |

---

## Perfil

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/profile` | Sí | Obtener perfil |
| PATCH | `/profile` | Sí | Actualizar perfil |
| PATCH | `/profile/publication` | Sí | Publicar/ocultar |

### PATCH /profile
Body: `{ fullName?, professionalTitle?, summary?, phone?, city?, linkedinUrl?, githubUrl?, websiteUrl?, slug? }`

### PATCH /profile/publication
Body: `{ isPublished: boolean }`

---

## Habilidades

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/skills` | Sí | Listar |
| POST | `/skills` | Sí | Crear |
| PATCH | `/skills/:id` | Sí | Actualizar |
| DELETE | `/skills/:id` | Sí | Eliminar |

### POST /skills
Body: `{ name: string, level?: "BASIC"|"INTERMEDIATE"|"ADVANCED"|"EXPERT" }`

---

## Experiencia Laboral

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/experiences` | Sí | Listar |
| POST | `/experiences` | Sí | Crear |
| PATCH | `/experiences/:id` | Sí | Actualizar |
| DELETE | `/experiences/:id` | Sí | Eliminar |

### POST /experiences
Body: `{ company, position, description?, startDate, endDate?, isCurrent? }`

---

## Educación

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/education` | Sí | Listar |
| POST | `/education` | Sí | Crear |
| PATCH | `/education/:id` | Sí | Actualizar |
| DELETE | `/education/:id` | Sí | Eliminar |

### POST /education
Body: `{ institution, degree, fieldOfStudy?, startDate, endDate?, isCurrent? }`

---

## Proyectos

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/projects` | Sí | Listar |
| POST | `/projects` | Sí | Crear |
| PATCH | `/projects/:id` | Sí | Actualizar |
| DELETE | `/projects/:id` | Sí | Eliminar |

### POST /projects
Body: `{ name, description?, technologies?: string[], repositoryUrl?, demoUrl?, imageUrl? }`

---

## CV / Hoja de Vida

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/cv/upload` | Sí | Subir PDF |
| GET | `/cv` | Sí | Listar documentos |
| GET | `/cv/:id` | Sí | Ver documento |
| POST | `/cv/:id/analyze` | Sí | Analizar CV |
| GET | `/cv/:id/analyses` | Sí | Ver análisis |

### POST /cv/upload
Content-Type: `multipart/form-data`
Field: `file` (PDF, max 5 MB)

### POST /cv/:id/analyze
Response: `{ id, score, strengths, recommendations, createdAt }`

---

## Portafolio Público

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/public/portfolios/:slug` | No | Ver portafolio |

Solo devuelve perfiles con `isPublished = true`.

Response: `{ id, fullName, professionalTitle, summary, phone, city, linkedinUrl, githubUrl, websiteUrl, slug, skills, experiences, educations, projects }`
