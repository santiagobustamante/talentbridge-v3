# Anexo E — Evidencia de ejecución

Evidencia real, generada localmente (Windows, Docker Desktop, Node v24), en respuesta a los 5 puntos señalados como `[PENDIENTE DE CONFIRMACIÓN]` en el Anexo E original. Cada bloque de abajo es una salida de consola/HTTP real, no reconstruida — capturada en la misma sesión, un ítem después del otro, sin reordenar.

**Entorno:** local (`docker compose -p version3`, Postgres en `localhost:5433`, los 10 microservicios corriendo con `nest start --watch` en sus puertos habituales, gateway en `localhost:3000`). No es el entorno de producción (Render/Vercel/Supabase) — para esa evidencia ver [`DEPLOYMENT.md`](./DEPLOYMENT.md).

---

## E.1 — Arranque de los diez microservicios

Los 10 arrancaron sin excepciones, cada uno confirmando su puerto en el último log de arranque (`Nest application successfully started` seguido del mensaje propio del servicio con su puerto). Extracto del log final de cada uno:

```
Auth Service corriendo en http://localhost:3001
No typescript errors found.

Candidate Service corriendo en http://localhost:3002
No typescript errors found.

Portfolio Service corriendo en http://localhost:3003
No typescript errors found.

Company Service corriendo en http://localhost:3004
No typescript errors found.

Jobs Service corriendo en http://localhost:3006
No typescript errors found.

Applications Service corriendo en http://localhost:3007
No typescript errors found.

Chat Service corriendo en http://localhost:3008
No typescript errors found.

Assistant Service corriendo en http://localhost:3009
No typescript errors found.

Dashboard Service corriendo en http://localhost:3010
No typescript errors found.

API Gateway corriendo en http://localhost:3000
Swagger disponible en http://localhost:3000/api/docs
```

Ejemplo de log completo de arranque de un servicio (`auth-service`), con todos los módulos y rutas mapeadas, para mostrar el detalle real (no solo la última línea):

```
[Nest] 32004  - 20/07/2026, 11:34:24 p. m.     LOG [InstanceLoader] ConfigHostModule dependencies initialized +1ms
[Nest] 32004  - 20/07/2026, 11:34:24 p. m.     LOG [InstanceLoader] JwtModule dependencies initialized +0ms
[Nest] 32004  - 20/07/2026, 11:34:24 p. m.     LOG [InstanceLoader] ThrottlerModule dependencies initialized +0ms
[Nest] 32004  - 20/07/2026, 11:34:24 p. m.     LOG [InstanceLoader] ConfigModule dependencies initialized +0ms
[Nest] 32004  - 20/07/2026, 11:34:24 p. m.     LOG [InstanceLoader] AuthModule dependencies initialized +1ms
[Nest] 32004  - 20/07/2026, 11:34:24 p. m.     LOG [RoutesResolver] AuthController {/api/auth}: +6ms
[Nest] 32004  - 20/07/2026, 11:34:24 p. m.     LOG [RouterExplorer] Mapped {/api/auth/register, POST} route +4ms
[Nest] 32004  - 20/07/2026, 11:34:24 p. m.     LOG [RouterExplorer] Mapped {/api/auth/register-company, POST} route +1ms
[Nest] 32004  - 20/07/2026, 11:34:24 p. m.     LOG [RouterExplorer] Mapped {/api/auth/login, POST} route +0ms
[Nest] 32004  - 20/07/2026, 11:34:24 p. m.     LOG [RouterExplorer] Mapped {/api/auth/login-company, POST} route +1ms
[Nest] 32004  - 20/07/2026, 11:34:24 p. m.     LOG [RouterExplorer] Mapped {/api/auth/logout, POST} route +0ms
[Nest] 32004  - 20/07/2026, 11:34:24 p. m.     LOG [RouterExplorer] Mapped {/api/auth/me, GET} route +1ms
[Nest] 32004  - 20/07/2026, 11:34:24 p. m.     LOG [NestApplication] Nest application successfully started +85ms
Auth Service corriendo en http://localhost:3001
```

**Nota real encontrada al levantar todo (no ocultada):** en el primer intento, `api-gateway` falló con `EADDRINUSE: address already in use 0.0.0.0:3000` — el puerto ya estaba tomado por un proceso anterior de una sesión de desarrollo previa que había quedado corriendo. Se liberó el puerto y se reinició limpio; el segundo intento arrancó sin errores (log arriba). Se documenta porque es justamente el tipo de evidencia real que un `[PENDIENTE DE CONFIRMACIÓN]` debería mostrar — incluidos los tropiezos, no solo el resultado final.

---

## E.2 — Conexión exitosa a PostgreSQL vía Docker Compose

Contenedor del proyecto activo y saludable:

```
$ docker ps
NAMES                   STATUS                  PORTS
smart_portfolio_db_v3   Up 13 hours (healthy)   0.0.0.0:5433->5432/tcp
```

Prisma confirmando la conexión real y el estado del schema contra esa base:

```
$ npx prisma migrate deploy
Datasource "db": PostgreSQL database "smart_portfolio", schema "public" at "127.0.0.1:5433"
2 migrations found in prisma/migrations
Applying migration `20260720172638_add_notifications`
All migrations have been successfully applied.

$ npx prisma migrate status
Datasource "db": PostgreSQL database "smart_portfolio", schema "public" at "127.0.0.1:5433"
2 migrations found in prisma/migrations
Database schema is up to date!
```

Y la confirmación en runtime real, no solo a nivel de migración — el propio health check del gateway reporta el estado de la conexión (ver E.3, campo `"database":"connected"`).

---

## E.3 — Respuesta del endpoint de salud `GET /api/health`

```
$ curl -s -i http://localhost:3000/api/health

HTTP/1.1 200 OK
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:4200
Vary: Origin
Access-Control-Allow-Credentials: true
Content-Type: application/json; charset=utf-8
Content-Length: 101

{"service":"api-gateway","status":"ok","database":"connected","timestamp":"2026-07-21T04:35:57.860Z"}
```

`"database":"connected"` confirma, desde el propio gateway en caliente, que la conexión a PostgreSQL (E.2) no es solo a nivel de migración sino que el servicio la usa activamente al responder.

---

## E.4 — Swagger en `/api/docs`

Cargado en `http://localhost:3000/api/docs`, confirmado por dos vías (captura de pantalla directa falló por un problema puntual de la herramienta de navegador en esta sesión — se documenta con el árbol de accesibilidad completo de la página real, que es una fuente de verdad equivalente):

```
TalentBridge API Gateway  3.0  OAS 3.0
API Gateway para la arquitectura de microservicios de TalentBridge

Health
  GET  /api/health           Verificar salud del API Gateway

Gateway
  GET     /api/{path}
  POST    /api/{path}
  PUT     /api/{path}
  DELETE  /api/{path}
  PATCH   /api/{path}
  OPTIONS /api/{path}
  HEAD    /api/{path}
```

### ⚠️ Nota visible sobre la cobertura real (ver sección 5.2.11 del informe)

**Swagger documenta únicamente los controllers propios del proceso `api-gateway`** (`AppController` → `/api/health`, y `GatewayController` → el proxy genérico `/api/{path}` para los 7 verbos HTTP). **No documenta los endpoints reales de los 10 microservicios** (`/api/auth/login`, `/api/jobs`, `/api/company/candidates/search`, etc. — decenas de rutas con sus propios DTOs y validaciones) porque cada uno corre como un proceso NestJS separado, con su propia instancia de `SwaggerModule` nunca configurada ni expuesta en producción — están mapeadas y funcionando (ver E.1, líneas `Mapped {...} route` de cada servicio), simplemente no aparecen en esta interfaz.

Confirmado en el código: `BACKEND/apps/api-gateway/src/main.ts` — `SwaggerModule.createDocument(app, config)` se llama sobre `app`, la instancia NestJS del gateway únicamente. Ninguno de los otros 9 `main.ts` invoca `SwaggerModule`.

**Conclusión:** Swagger sirve para explorar la forma general de la API (que todo pasa por `/api/*` a través del gateway) pero **no reemplaza la documentación de endpoints por servicio** — para eso, la fuente real son los `*.controller.ts` de cada microservicio (ver `docs/endpoints.md` y `docs/ARCHITECTURE.md`) o el log de arranque de cada uno (E.1), que sí lista cada ruta mapeada.

---

## E.5 — Prueba manual representativa: registro de candidato de punta a punta

Flujo completo: registro → creación real de usuario + perfil en Postgres → JWT emitido → login → consulta autenticada del perfil recién creado, todo a través del gateway (`localhost:3000`), igual que lo haría el frontend real.

**1. Registro** (`POST /api/auth/register`):

```
$ curl -s -i -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"evidencia.anexo.e@test-local.com","password":"Evidencia.123","confirmPassword":"Evidencia.123"}'

HTTP/1.1 201 Created
Set-Cookie: auth_token=eyJhbGci...; Max-Age=86400; Path=/; HttpOnly; SameSite=Lax
Content-Type: application/json; charset=utf-8

{
  "user": {
    "id": 176,
    "email": "evidencia.anexo.e@test-local.com",
    "role": "CANDIDATE",
    "createdAt": "2026-07-21T04:39:09.577Z",
    "profile": {
      "id": 111,
      "userId": 176,
      "slug": "evidenciaanexoe",
      "isPublished": false,
      "showCity": true, "showLinkedin": true, "showGithub": true, "showWebsite": true,
      "showExperience": true, "showEducation": true, "showProjects": true, "showSkills": true
    }
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

`201 Created`, con el usuario **y** su perfil creados en la misma transacción (`Profile` se crea automáticamente al registrar un candidato) — confirma la escritura real en PostgreSQL, no una respuesta simulada.

**2. Login con la cuenta recién creada** (`POST /api/auth/login`) → `token` JWT válido obtenido.

**3. Consulta autenticada del perfil** (`GET /api/profile`, con el token del paso 2):

```
$ curl -s -i http://localhost:3000/api/profile -H "Authorization: Bearer <token>"

HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{
  "id": 111,
  "userId": 176,
  "slug": "evidenciaanexoe",
  "isPublished": false,
  "skills": [], "experiences": [], "educations": [], "projects": [], "views": [],
  "completionPercentage": 0
}
```

`200 OK` con exactamente el perfil creado en el paso 1 (mismo `id`/`userId`) — confirma que el JWT emitido en el registro es válido para autenticar contra otro microservicio (`candidate-service`) a través del gateway, cerrando el ciclo completo: registro → persistencia → autenticación → autorización cruzada entre servicios.

> **Nota:** esta cuenta de prueba (`evidencia.anexo.e@test-local.com`, `userId=176`) quedó creada en la base de datos **local** de desarrollo (no en producción) como parte de esta evidencia. No se eliminó automáticamente — si se quiere una base local limpia antes de una demo, se puede borrar a mano o regenerar el seed.

---

## Resumen

| Punto del Anexo E | Estado |
|---|---|
| Arranque de los 10 microservicios, consola con puerto de cada uno, sin excepciones | ✅ Confirmado (E.1) |
| Conexión exitosa a PostgreSQL vía Docker Compose | ✅ Confirmado (E.2) |
| Respuesta de `GET /api/health` | ✅ Confirmado (E.3) |
| Swagger en `/api/docs`, con nota de cobertura limitada al Gateway | ✅ Confirmado (E.4) |
| Prueba manual representativa (registro de candidato) con captura de respuesta HTTP | ✅ Confirmado (E.5) |
