# Guía de Backend — TalentBridge V3

NestJS 11, monorepo con 10 apps + 5 libs compartidas. Ver también [`BACKEND/MICROSERVICES.md`](../BACKEND/MICROSERVICES.md) (referencia completa de endpoints por servicio, ya existente) — este documento se enfoca en *cómo está construido*, no en repetir el listado de rutas.

## 1. Estructura

```
BACKEND/
├── apps/<servicio>/src/
│   ├── main.ts                  bootstrap propio, puerto propio, cookie-parser, CORS
│   ├── <servicio>.module.ts     ValidationPipe global (whitelist+forbidNonWhitelisted+transform) + HttpExceptionFilter
│   ├── <servicio>.controller.ts
│   ├── <servicio>.service.ts    lógica + acceso a Prisma
│   └── dto/*.dto.ts             class-validator
├── libs/
│   ├── auth/       JwtStrategy, JwtAuthGuard, OptionalJwtAuthGuard, RolesGuard, @Roles(), @CurrentUser()
│   ├── database/    PrismaService, PrismaModule, cliente Prisma generado (no tocar a mano)
│   ├── common/       ResponseHelper, HttpExceptionFilter, CommonModule
│   ├── contracts/    Interfaces compartidas entre servicios (DTOs de comunicación interna)
│   └── events/       Nombres/payloads de eventos — preparado para un futuro broker, no usado hoy
├── prisma/           schema.prisma, migrations/, seeds (ver DATABASE.md)
├── nest-cli.json      Registro de las 10 apps del monorepo
├── Dockerfile          Multi-stage, un `target` por servicio (nombres = los de docker-compose.yml)
└── .env / .env.example
```

## 2. Los 10 microservicios

| Servicio | Puerto | Dominio |
|---|---|---|
| `api-gateway` | 3000 | Proxy HTTP hacia el resto, CORS, Swagger, health check. Sin lógica de negocio propia. |
| `auth-service` | 3001 | Registro/login (candidato y empresa por separado), JWT, logout, `/me`. |
| `candidate-service` | 3002 | Perfil candidato, slug, cálculo de `completionPercentage`, vistas de perfil. |
| `portfolio-service` | 3003 | Skills, experiencia, educación, proyectos, CV (upload+análisis), portafolio público. |
| `company-service` | 3004 | Perfil empresarial, búsqueda de candidatos con filtros. |
| `jobs-service` | 3006 | Ofertas de trabajo (CRUD + ciclo de vida). |
| `applications-service` | 3007 | Postulaciones, validación de match por skills. |
| `chat-service` | 3008 | Conversaciones, mensajes, WebSocket (`/chat`). |
| `assistant-service` | 3009 | Asistente "Joaquín" — respuestas basadas en reglas según rol/contexto, no LLM. |
| `dashboard-service` | 3010 | Agregación de métricas para los dos dashboards. |

Cada uno se levanta independiente: `npm run start:<nombre>` (dev, `--watch`) o `npm run build:<nombre>` → `nest build <nombre>`. En Docker, cada uno es un `target` distinto del mismo `Dockerfile` multi-stage.

## 3. Rutas principales

Ver [`BACKEND/MICROSERVICES.md`](../BACKEND/MICROSERVICES.md) sección 8 para el listado completo endpoint por endpoint. Resumen de prefijos vistos por el frontend (todos vía Gateway, prefijo `/api`):
`/api/auth/*` · `/api/profile*` · `/api/skills*` `/api/experiences*` `/api/education*` `/api/projects*` `/api/cv*` `/api/portfolio*` · `/api/company/*` · `/api/jobs*` `/api/company/jobs*` · `/api/applications*` · `/api/chat*` · `/api/assistant*` · `/api/dashboard*`.

## 4. DTOs

`class-validator` + `class-transformer`, un DTO por operación de escritura (ej. `CreateJobOfferDto`, `UpdateJobOfferDto`). **Regla dura**: el `ValidationPipe` global de *cada* servicio tiene `whitelist: true` + `forbidNonWhitelisted: true` + `transform: true` — cualquier campo que mande el frontend y no esté declarado en el DTO correspondiente hace fallar el request con `property X should not exist`. Antes de agregar un campo nuevo en un formulario del frontend, agregalo primero al DTO del backend (ver skill dedicada en [`REUSABLE_SKILLS.md`](./REUSABLE_SKILLS.md)).

## 5. Guards, roles y autenticación

- **`JwtStrategy`** (`libs/auth/src/jwt.strategy.ts`): extrae el JWT primero de la cookie `auth_token`, si no está prueba `Authorization: Bearer`. Secreto: `process.env.JWT_SECRET`.
- **`JwtAuthGuard`** / **`OptionalJwtAuthGuard`**: el segundo no rechaza si no hay token (para endpoints públicos que igual quieren saber si hay usuario, ej. portafolio público con posible dueño viéndolo).
- **`RolesGuard`** + **`@Roles(UserRole.CANDIDATE)`** (o `COMPANY`): reconsulta el usuario en base (`prisma.user.findUnique`) en cada request para verificar el rol — no confía solo en el payload del JWT. Lanza `ForbiddenException` si no matchea.
- **`@CurrentUser()`**: decorator para extraer el usuario del request en el controller sin repetir `req.user`.
- El login normal (`/api/auth/login`) rechaza cuentas `COMPANY` con 403; `/api/auth/login-company` rechaza `CANDIDATE` igual — la separación de rol pasa por el endpoint de login, no por un flag adicional.

## 6. API Gateway

`apps/api-gateway/src/http-client.service.ts` hace el proxy con `fetch` nativo de Node — sin librería de gateway. `gateway.controller.ts` mapea cada prefijo de ruta al microservicio interno (usa las `*_SERVICE_URL` del `.env`). Si agregás un microservicio nuevo o un prefijo de ruta nuevo, hay que registrarlo ahí explícitamente — no hay descubrimiento automático.

## 7. Prisma

- Cliente generado en `libs/database/src/generated` (**no** en `node_modules` — revisar `.gitignore` antes de asumir que no está versionado).
- `PrismaService`/`PrismaModule` en `libs/database` — inyectado en cada servicio que necesita DB.
- Comandos:
  ```bash
  npx prisma validate     # valida schema.prisma sin tocar la DB
  npx prisma generate     # regenera el cliente — correr después de CUALQUIER cambio a schema.prisma
  npx prisma migrate dev --name <descripcion>   # crea + aplica una migración nueva (dev)
  npx prisma migrate deploy                      # aplica migraciones pendientes (equivalente a producción/CI)
  ```
- Migraciones existentes: `20260606192350_init`, `20260606223101_add_company_role`, `20260617053007_improve_candidate_profile_phase1`.
- Modelo completo: [`DATABASE.md`](./DATABASE.md).

## 8. Seeds

Ver tabla completa en [`DATABASE.md`](./DATABASE.md#seeds-disponibles). Orden recomendado en una base nueva: `seed` → `seed:jobs` → `seed:skills-catalog` → `seed:santiago` → `seed:company-demo`. Todos usan `upsert` sobre `email` (usuarios) o claves naturales — son **re-ejecutables sin duplicar** (idempotentes), salvo donde se indique lo contrario en `DATABASE.md`.

## 9. Comandos de build

```bash
cd BACKEND
npm run build             # todos los servicios (nest build, sin target = build de todas las apps registradas)
npm run build:gateway     # nest build api-gateway
npm run build:auth        # nest build auth-service
npm run build:candidate   # ...y así por cada servicio (ver package.json para la lista completa)
npm run lint               # eslint --fix sobre src/apps/libs/test
npm run format              # prettier --write
```
**Regla de este proyecto**: si tocás un servicio puntual, compilá *ese* servicio (`npm run build:<nombre>`), no todo el monorepo — es más rápido y aísla errores de compilación al servicio real que cambiaste.

## 10. Cómo validar que un servicio funciona

1. `npx prisma validate` (si tocaste el schema).
2. `npm run build:<servicio>` — debe terminar sin error TypeScript.
3. `npm run start:<servicio>` y confirmar en la consola que loguea el puerto sin excepciones al bootstrap.
4. `GET http://localhost:3000/api/health` (vía Gateway) — o pegarle directo al puerto del servicio si el Gateway no está levantado.
5. Swagger en `http://localhost:3000/api/docs` para probar un endpoint puntual sin depender del frontend.
6. Si el cambio toca un flujo que cruza servicios (ej. postulación → notificación en dashboard), probarlo end-to-end desde el frontend, no solo el servicio aislado — la lógica de negocio real muchas veces vive partida entre dos servicios.

No hay suite de tests automatizados corriendo hoy sobre los microservicios de negocio (`test/app.e2e-spec.ts` es el scaffold default de Nest, sin cobertura real todavía) — la validación es manual vía los pasos de arriba. Si se agregan tests, documentarlo en [`DECISIONS.md`](./DECISIONS.md) y actualizar esta sección.
