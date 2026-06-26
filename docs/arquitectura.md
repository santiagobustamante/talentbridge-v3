# Arquitectura del Proyecto - Smart Portfolio

## Visión General

Smart Portfolio es una aplicación web full-stack que permite a usuarios crear y publicar un portafolio profesional digital, así como subir y analizar hojas de vida en PDF.

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Angular 19, TypeScript, Angular Material, SCSS |
| Backend | NestJS 11, TypeScript |
| Base de Datos | PostgreSQL 16 |
| ORM | Prisma 7 |
| Autenticación | JWT (HttpOnly Cookie) |
| Contenedores | Docker Compose |

## Arquitectura General

```
┌────────────────────────────────────────────────┐
│                   Cliente                      │
│  Angular (localhost:4200)                      │
│  SPA con componentes standalone               │
│  Angular Material UI                           │
└───────────────┬────────────────────────────────┘
                │ HTTP (REST)
                │ Cookie HttpOnly (JWT)
                │ CORS: credentials
┌───────────────▼────────────────────────────────┐
│              Backend NestJS                     │
│  (localhost:3000)                              │
│                                                │
│  ┌─────────┐ ┌──────────┐ ┌───────────────┐   │
│  │  Auth   │ │ Profiles │ │ CV / Analysis │   │
│  │ Module  │ │ Module   │ │ Modules        │   │
│  └─────────┘ └──────────┘ └───────────────┘   │
│  ┌─────────┐ ┌──────────┐ ┌───────────────┐   │
│  │ Skills  │ │Exp/Educ  │ │ Projects      │   │
│  └─────────┘ └──────────┘ └───────────────┘   │
│                                                │
│  ┌─────────────────────────────────────────┐   │
│  │           Prisma Service                │   │
│  └─────────────────────────────────────────┘   │
└───────────────┬────────────────────────────────┘
                │ Prisma Client
┌───────────────▼────────────────────────────────┐
│            PostgreSQL                           │
│  (localhost:5432)                              │
│  Base de datos: smart_portfolio                │
└────────────────────────────────────────────────┘
```

## Comunicación Frontend-Backend

- El frontend se comunica con el backend mediante peticiones HTTP REST.
- Todas las peticiones autenticadas incluyen la cookie `auth_token` (HttpOnly).
- CORS está configurado para permitir `localhost:4200` con credenciales.
- La API usa el prefijo `/api`.

## Autenticación

1. El usuario se registra con email y contraseña.
2. La contraseña se cifra con bcrypt.
3. Al iniciar sesión, el backend genera un JWT y lo envía como cookie HttpOnly.
4. El JWT se valida mediante un Passport strategy que lo extrae de la cookie.
5. Las rutas protegidas usan `JwtAuthGuard`.
6. El cierre de sesión elimina la cookie.

## Base de Datos

### Modelos

- **User**: email, passwordHash
- **Profile**: Datos profesionales, slug único, estado de publicación (1:1 con User)
- **Skill**: Habilidades con nivel (1:N con Profile)
- **Experience**: Experiencia laboral (1:N con Profile)
- **Education**: Formación académica (1:N con Profile)
- **Project**: Proyectos con tecnologías (1:N con Profile)
- **CvDocument**: PDFs subidos (1:N con User)
- **CvAnalysis**: Resultados de análisis (1:N con CvDocument)

### Relaciones

```
User 1 --- 1 Profile
User 1 --- N CvDocument
Profile 1 --- N Skill
Profile 1 --- N Experience
Profile 1 --- N Education
Profile 1 --- N Project
CvDocument 1 --- N CvAnalysis
```

## Gestión de Archivos

- Los PDFs se almacenan localmente en `backend/uploads/cv/`.
- Se valida tipo MIME y tamaño máximo (5 MB por defecto).
- El texto se extrae usando `pdf-parse`.
- En desarrollo, no se requiere almacenamiento en la nube.

## Análisis de CV

El análisis de CV utiliza un sistema basado en reglas:

1. **RuleBasedCvAnalysisProvider**: Implementa la interfaz `CvAnalysisProvider`.
2. Evalúa 9 categorías con puntuación máxima de 100 puntos:
   - Información de contacto (10 pts)
   - Resumen profesional (10 pts)
   - Experiencia laboral (20 pts)
   - Educación (10 pts)
   - Habilidades (15 pts)
   - Proyectos/Certificaciones (10 pts)
   - Logros cuantificables (10 pts)
   - Organización (10 pts)
   - Enlaces profesionales (5 pts)
3. La arquitectura permite cambiar a un proveedor de IA en el futuro mediante la interfaz `CvAnalysisProvider`.

## Estructura del Frontend

```
src/app/
├── core/           # Servicios, guards, interceptors, modelos
├── shared/          # Componentes reutilizables
├── features/        # Páginas de la aplicación
│   ├── home/
│   ├── auth/        # Login, Register
│   ├── dashboard/
│   ├── profile/
│   ├── skills/
│   ├── experiences/
│   ├── education/
│   ├── projects/
│   ├── cv-analysis/
│   └── public-portfolio/
├── app.routes.ts    # Configuración de rutas
└── app.config.ts    # Configuración de la aplicación
```

## Estructura del Backend

```
src/
├── auth/            # Autenticación JWT
├── profiles/        # Gestión de perfil
├── skills/          # CRUD habilidades
├── experiences/     # CRUD experiencia
├── education/       # CRUD educación
├── projects/        # CRUD proyectos
├── cv/              # Subida y gestión de CV
├── analysis/        # Análisis de CV
├── public-portfolios/ # Portafolio público
├── health/          # Health check
├── common/          # Filtros, interfaces, utilidades
├── prisma/          # Servicio de base de datos
└── generated/       # Prisma Client generado
```
