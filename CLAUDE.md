# CLAUDE.md — Instrucciones para agentes IA en TalentBridge V3

Este archivo es el punto de entrada para cualquier agente (Claude u otro) que retome trabajo en este repositorio. Documentación completa en [`docs/`](./docs/) — este archivo resume y enlaza, no repite el detalle.

## Descripción del proyecto

TalentBridge V3 es una plataforma de conexión laboral (candidatos↔empresas) con portafolio profesional, construida como demo de arquitectura de microservicios para un seminario académico (UCC 2026). Frontend Angular 19, backend NestJS 11 (monorepo, 10 microservicios detrás de un API Gateway), PostgreSQL vía Prisma, Docker Compose. Detalle completo: [`docs/PROJECT_OVERVIEW.md`](./docs/PROJECT_OVERVIEW.md) y [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

## Reglas de seguridad — leer antes de tocar nada

- **No hacer cambios destructivos.** Preferir siempre la opción reversible.
- **No borrar datos.** Ni filas de la base de datos ni archivos con contenido real (ej. `BACKEND/uploads/cv/`).
- **No borrar volúmenes Docker.** Nunca `docker compose down -v` en este proyecto.
- **No tocar el Docker "version1"** (proyecto/contenedores de una versión anterior del sistema, en la misma máquina). Este repo usa exclusivamente el **proyecto Docker `version3`**: `docker compose -p version3 <comando>`. Si no estás seguro de si un contenedor pertenece a version1 o version3, `docker ps` y mirar el `container_name` (todos los de este proyecto empiezan con `talentbridge_` o son `smart_portfolio_db_v3`) antes de tocar nada.
- **No hacer commit automático.** Nunca correr `git commit` sin que el usuario lo pida explícitamente en ese momento — una autorización general de "andá avanzando" no cuenta como pedido de commit.
- **No force-push, no `git reset --hard`, no `git clean`** sin confirmación explícita puntual.
- Si una tarea requiere borrar/regenerar datos reales (ej. limpiar las habilidades del perfil demo, ver `docs/NEXT_STEPS.md` #1), **pedir confirmación explícita y puntual** antes de ejecutar — una instrucción general del plan no alcanza.

## Comandos de inicio

```bash
# Todo-en-uno (Windows)
./iniciar-talentbridge.bat

# Manual
docker compose -p version3 up -d postgres      # Postgres del proyecto version3
cd BACKEND && npx prisma generate && npx prisma migrate deploy
cd BACKEND && npm run start:gateway            # + un start:<servicio> por cada uno (ver docs/BACKEND_GUIDE.md)
cd FRONTEND && npm start                        # http://localhost:4200
```
URLs: Frontend `http://localhost:4200` · Gateway `http://localhost:3000` · Swagger `http://localhost:3000/api/docs`. Detalle: [`docs/PROJECT_OVERVIEW.md`](./docs/PROJECT_OVERVIEW.md#cómo-levantar-el-proyecto).

## Comandos de build — ejecutar según lo que se tocó

| Si tocaste... | Correr |
|---|---|
| Frontend (cualquier archivo en `FRONTEND/`) | `cd FRONTEND && npm run lint:css && ng build` |
| Un microservicio backend puntual | `cd BACKEND && npm run build:<nombre-servicio>` |
| Varios/todos los servicios backend | `cd BACKEND && npm run build` |
| `BACKEND/prisma/schema.prisma` | `cd BACKEND && npx prisma validate && npx prisma generate` (y evaluar si hace falta `prisma migrate dev`) |

Nunca dar una tarea por terminada sin correr el build correspondiente. Comparar warnings contra los ya conocidos en [`docs/NEXT_STEPS.md`](./docs/NEXT_STEPS.md) — uno nuevo amerita investigar antes de seguir.

## Estructura del proyecto

```
VERSION 3/
├── BACKEND/     Monorepo NestJS — 10 apps + 5 libs compartidas (ver docs/BACKEND_GUIDE.md)
├── FRONTEND/    Angular 19 standalone (ver docs/FRONTEND_GUIDE.md)
├── docs/        Toda la documentación — leer antes de asumir cómo funciona algo
├── docker-compose.yml     Proyecto Docker "version3"
└── iniciar-talentbridge.bat
```

## Usuarios demo

| Rol | Email | Password |
|---|---|---|
| Candidato (perfil demo principal) | `bustamantemolinasantiago@gmail.com` | `Santiago.123` |
| Candidato genérico | `candidato001@demo.com` … `candidato100@demo.com` | `Candidato.123` |
| Empresa | `empresa001@demo.com` | `Empresa.123` |

Más cuentas y su origen (qué seed las crea): [`docs/DATABASE.md`](./docs/DATABASE.md#4-usuarios-y-empresas-demo).

## Rutas importantes del frontend

`/` landing · `/login` `/register` candidato · `/company/login` `/company/register` empresa · `/app/*` shell candidato (`inicio`, `profile`, `skills`, `experience`, `education`, `projects`, `cv-analysis`, `jobs`, `messages`, `public-view`) · `/company/*` shell empresa (`dashboard`, `profile`, `candidates`, `jobs`, `messages`) · `/portfolio/:slug` portafolio público. Detalle: [`docs/FRONTEND_GUIDE.md`](./docs/FRONTEND_GUIDE.md#2-rutas-principales).

## Reglas de Docker

- Proyecto: **siempre `-p version3`**. Nunca operar sobre contenedores/volúmenes sin ese prefijo o sin verificar el nombre primero.
- Contenedor DB: `smart_portfolio_db_v3` · volumen: `pgdata_v3` · red: `talentbridge_net` · puerto host `5433`.
- El frontend **no** está en `docker-compose.yml` — se corre aparte con `npm start`.
- Nunca `docker compose down -v`. Si hace falta bajar servicios, `docker compose -p version3 down` (sin `-v`) o `docker compose -p version3 stop <servicio>`.

## Reglas de Git

- `git status` **antes** de cualquier cambio (para saber qué ya estaba modificado y no es tuyo) y **después** (para confirmar que lo tocado es lo esperado).
- No commitear salvo pedido explícito en ese momento.
- No descartar cambios (`checkout`/`restore`/`reset`/`clean`) sin revisar `git status` primero y, si hay algo sin commitear que no es tuyo, dejarlo intacto o preguntar.
- Ver [`docs/REUSABLE_SKILLS.md`](./docs/REUSABLE_SKILLS.md#12-cómo-trabajar-con-git-de-forma-segura) para el detalle completo.

## Cómo trabajar por fases

El trabajo de mejora del frontend está organizado en fases numeradas con estado explícito (`[x]`/`[ ]`) y bitácora en [`docs/plan-mejoras-frontend-ux.md`](./docs/plan-mejoras-frontend-ux.md) — ver también el resumen estructurado en [`docs/PHASES.md`](./docs/PHASES.md). Al retomar el proyecto: leer qué fase quedó pendiente ahí, no asumir ni re-preguntar desde cero. Si se abre una línea de trabajo nueva que no encaja en ese plan, documentarla como una fase/plan nuevo siguiendo el mismo formato (objetivo, tareas, estado, criterios de aceptación).

## Cómo documentar cambios

Cada tarea con cambios reales de código debe dejar rastro en:
- [`docs/CHANGELOG.md`](./docs/CHANGELOG.md) — entrada con fecha/módulo/tipo/archivos/problema/solución/prueba/pendientes.
- [`docs/BUGS_AND_FIXES.md`](./docs/BUGS_AND_FIXES.md) — si lo que se corrigió era un bug (no una feature nueva).
- [`docs/DECISIONS.md`](./docs/DECISIONS.md) — si se tomó una decisión técnica no obvia, o se descartó una opción a propósito.
- [`docs/REUSABLE_SKILLS.md`](./docs/REUSABLE_SKILLS.md) — si el patrón encontrado/aplicado es reutilizable más allá de este proyecto puntual.
- El plan de fases correspondiente (`docs/plan-mejoras-frontend-ux.md` o el que aplique) — marcar checkbox y agregar fila a la bitácora.

No hace falta tocar los 5 documentos por cada cambio trivial — usar criterio: un fix de una línea sin decisión de por medio va al Changelog y listo; algo con causa no obvia o con una decisión detrás justifica también Bugs/Decisions.

## Qué NO tocar

- `BACKEND/libs/database/src/generated/` — cliente Prisma generado, se regenera con `npx prisma generate`, no se edita a mano.
- Docker "version1" (contenedores/volúmenes/proyecto de la versión anterior) — no forma parte de este repo.
- Datos reales de usuarios/empresas sin confirmación explícita puntual.
- `BACKEND/uploads/cv/` — contenido real subido por usuarios, no versionar ni limpiar sin pedirlo.
- Los documentos previos ya existentes en `docs/` (`arquitectura.md`, `endpoints.md`, `alcance-mvp.md`, `plan-consistencia-css.md`, `auditoria-frontend-ux.md`, `plan-mejoras-frontend-ux.md`) — son fuente histórica, no se sobrescriben; si algo cambia, se actualiza el documento nuevo correspondiente (`ARCHITECTURE.md`, etc.) y se referencia al viejo, no al revés.

## Cómo validar antes de entregar

1. `git status` — confirmar qué se tocó.
2. Build correspondiente (ver tabla arriba) sin errores nuevos.
3. Si el cambio tiene una prueba manual razonable (un flujo de UI, un endpoint puntual), ejecutarla — no asumir que "compila" implica que "funciona".
4. Comparar contra `docs/TESTING_CHECKLIST.md` si el cambio toca una de las pantallas listadas ahí.
5. Documentación actualizada (ver sección de arriba).

## Checklist obligatorio antes de terminar una tarea

- [ ] Entendí la tarea y, si era grande, expliqué el plan antes de tocar código (qué entendí, qué archivos voy a revisar, qué riesgos hay, qué pruebas voy a hacer).
- [ ] Revisé `git status` antes de empezar.
- [ ] Cambios mínimos y acotados al problema pedido (no refactors no solicitados).
- [ ] Probé el cambio (manualmente si aplica, o al menos verifiqué el flujo de código que toca).
- [ ] Corrí el build correspondiente y no hay errores/warnings nuevos sin explicar.
- [ ] Actualicé la documentación relevante (Changelog como mínimo; Bugs/Decisions/Skills si aplica).
- [ ] `git status` final coincide con lo que creo que cambié — nada tocado por accidente.
- [ ] Reporte final entregado con: resumen de cambios, archivos modificados, errores encontrados y su solución, comandos ejecutados, resultado de build, pruebas realizadas, documentación actualizada, pendientes, `git status` final.
- [ ] No commiteé nada salvo que se pidiera explícitamente en esta tarea.
