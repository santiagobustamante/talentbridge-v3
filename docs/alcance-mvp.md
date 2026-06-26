# Alcance del MVP - Smart Portfolio

## Incluido en esta versión

### Autenticación
- Registro de usuarios con email y contraseña
- Inicio y cierre de sesión
- JWT almacenado en cookie HttpOnly
- Protección de rutas privadas

### Gestión de Perfil
- Edición de perfil profesional
- Slug único personalizable
- Publicación/ocultación del portafolio

### Contenido del Portafolio
- CRUD de habilidades (con niveles)
- CRUD de experiencia laboral
- CRUD de educación
- CRUD de proyectos (con tecnologías)

### Portafolio Público
- Visualización pública mediante slug
- Diseño responsive
- Solo perfiles publicados son accesibles

### Análisis de CV
- Carga de PDF (validación de tipo y tamaño)
- Extracción de texto
- Análisis basado en reglas
- Puntuación de 0-100
- Fortalezas y recomendaciones

### Infraestructura
- PostgreSQL mediante Docker Compose
- API REST documentada con Swagger
- Prisma ORM con migraciones
- Variables de entorno (.env)
- README y documentación técnica

---

## Excluido de esta versión (mejoras futuras)

- Sistema para reclutadores
- Publicación de ofertas laborales
- Comparación entre candidatos
- Chat en tiempo real
- Notificaciones por correo electrónico
- Recuperación de contraseña
- Inicio de sesión con Google / OAuth
- Aplicación móvil
- Pagos y suscripciones
- Planes premium
- Panel administrativo
- Editor visual avanzado de plantillas
- Integración con IA externa (OpenAI, etc.)
- Entrenamiento de modelos de IA
- Dominio personalizado por usuario
- Sistema de seguimiento de visitas

---

## Mejoras Futuras Recomendadas

1. Integración con OpenAI/Gemini para análisis de CV más avanzados
2. Múltiples plantillas de diseño para portafolios
3. Dashboard de analíticas de visitas
4. Exportación de CV a PDF desde el perfil
5. Vista previa del portafolio antes de publicar
6. Subida de foto de perfil
7. Editor de texto enriquecido para descripciones
8. Tests E2E con Cypress/Playwright
9. CI/CD con GitHub Actions
10. Despliegue en la nube (Vercel/Railway)
