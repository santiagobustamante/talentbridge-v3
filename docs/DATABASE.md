# Base de datos — TalentBridge V3

PostgreSQL 16 único (`smart_portfolio`, contenedor `smart_portfolio_db_v3`, puerto host `5433`), Prisma ORM centralizado en `BACKEND/libs/database`. Schema completo: [`BACKEND/prisma/schema.prisma`](../BACKEND/prisma/schema.prisma) — este documento resume el modelo, no lo reemplaza; si hay diferencia entre este documento y el schema real, **el schema manda**.

## 1. Modelos principales

| Modelo | Tabla | Qué guarda |
|---|---|---|
| `User` | `users` | Email único, hash de password, `role` (`CANDIDATE`/`COMPANY`). Raíz de todo lo demás. |
| `Profile` | `profiles` | Perfil de candidato: 1:1 con `User`. Datos básicos, `slug` único, `isPublished`, 9 switches `show*` de visibilidad. |
| `CompanyProfile` | `company_profiles` | Perfil de empresa: 1:1 con `User`. `companyName`, `nit`, `sector`, `logoUrl`, etc. |
| `Skill` | `skills` | N:1 con `Profile`. `name` + `normalizedName` (para evitar duplicados case/acento-insensibles) + `level`. |
| `Experience` | `experiences` | N:1 con `Profile`. Incluye `learnedSkills String[]`. |
| `Education` | `educations` | N:1 con `Profile`. |
| `Project` | `projects` | N:1 con `Profile`. `technologies String[]`. |
| `CvDocument` / `CvAnalysis` | `cv_documents` / `cv_analyses` | PDF subido + análisis derivado (score, fortalezas, recomendaciones). |
| `ProfileView` | `profile_views` | Registro de qué empresa vio qué perfil y cuándo. |
| `Conversation` / `ChatMessage` / `ChatBlock` | `conversations` / `chat_messages` / `chat_blocks` | Chat 1:1 candidato↔empresa. |
| `JobOffer` | `job_offers` | Oferta de una empresa. `status`: `DRAFT`/`PUBLISHED`/`CLOSED`/`ARCHIVED`. |
| `JobApplication` | `job_applications` | Postulación de un candidato a una oferta. `status`: `PENDING`/`REVIEWED`/`PRESELECTED`/`REJECTED`/`HIRED`. |

## 2. Relaciones clave

- `User 1:1 Profile` / `User 1:1 CompanyProfile` — un mismo `User` nunca tiene ambos (lo separa el flujo de registro, no una constraint de DB).
- `Profile 1:N Skill/Experience/Education/Project/ProfileView` — `onDelete: Cascade` en todos: borrar un `Profile` borra todo su contenido.
- `Conversation` tiene dos FKs a `User` con nombres de relación distintos (`CandidateConversations`/`CompanyConversations`) — `@@unique([candidateId, companyId])`, no puede haber dos conversaciones entre el mismo par.
- `JobApplication` — `@@unique([jobOfferId, candidateId])`: es la constraint que produce el 409 "ya te postulaste" en `applications-service`, no una validación manual.
- `ChatBlock` — `@@unique([conversationId, blockerId, blockedId])`, bloqueo direccional (A puede bloquear a B sin que B lo sepa hasta escribir).

## 3. Enums

```prisma
enum UserRole { CANDIDATE  COMPANY }
enum JobOfferStatus { DRAFT  PUBLISHED  CLOSED  ARCHIVED }
enum JobApplicationStatus { PENDING  REVIEWED  PRESELECTED  REJECTED  HIRED }
```
Traducción a texto en español y color de badge: `statusToLabel()` / `statusToTone()` en el frontend (`shared/components/badge/`) — **no** hay un enum de traducción en el backend, la responsabilidad de mostrarlo en español es 100% del frontend.

## 4. Usuarios y empresas demo

Ver tabla completa con contraseñas en [`PROJECT_OVERVIEW.md`](./PROJECT_OVERVIEW.md#usuarios-demo). Resumen de origen:

| Cuenta | Seed que la crea |
|---|---|
| `bustamantemolinasantiago@gmail.com` (candidato, perfil rico) | `seed-santiago-profile.ts` |
| `candidato001@demo.com` … `candidato100@demo.com` (genéricos) | `seed.ts` |
| `empresa001@demo.com` (Talento Llanero S.A.S.) | `seed.ts` **y** `seed-company-demo.ts` (el segundo enriquece el perfil creado por el primero — no lo duplica, hace `findUnique` antes de escribir) |
| `empresa002@demo.com` (Conecta Empleo Colombia), `empresa003@demo.com` (Recursos Humanos Andinos) | `seed.ts` |
| `talento@llanero.com`, `conecta@empleo.com`, `rrhh@andinos.com` + ~50 empresas más | `seed-jobs.ts` |

## 5. Vacantes demo

`seed-jobs.ts`: ~50 empresas + 200 ofertas de trabajo con datos variados (ciudad, modalidad, tipo de contrato, salario, skills requeridas) en distintos estados del ciclo de vida, para que las pantallas de listado/filtro/paginación tengan datos realistas desde el primer arranque.

## 6. Habilidades

`Skill.normalizedName` = `name` en minúscula, sin tildes (`normalize('NFD') + replace acentos`) — es la clave real de unicidad (`@@unique([profileId, normalizedName])`), pensada para que "Node.JS", "node.js" y "Node.js" no generen 3 filas. `seed-skills-catalog.ts` carga un catálogo normalizado de habilidades usado por el autocompletado del frontend (`core/services/skill-catalog.ts`) — no es una tabla propia en el schema, es una lista estática consumida en frontend para sugerencias, la validación real de duplicados ocurre en `portfolio-service` al crear/actualizar un `Skill`.

✅ **Resuelto 2026-07-16.** El perfil de `bustamantemolinasantiago@gmail.com` había llegado a tener habilidades de más (la auditoría UX original habló de ~150 — para cuando se limpió realmente eran 13, cifra que ya había quedado desactualizada por auditorías intermedias). Con autorización explícita del usuario se repuso el set de 6 habilidades que define `BACKEND/prisma/seed-santiago-profile.ts`. Detalle y respaldo de los datos previos en `CHANGELOG.md`/`DECISIONS.md`.

## 7. Postulaciones

Regla de negocio (vive en `applications-service`, no en la DB): si `JobOffer.skillsRequired` está vacío, cualquiera puede postularse; si tiene contenido, el candidato necesita coincidir con **al menos una** skill (no todas). El match se calcula comparando `skillsRequired.split(',')` contra las skills normalizadas del perfil — devuelve `matchedSkills`/`requiredSkillsList`/`canApplyBySkills` al frontend, que los usa para la barra de coincidencia (ver Fase 8 en `plan-mejoras-frontend-ux.md`).

## 8. Chats

Una `Conversation` por par candidato-empresa (no por oferta — si una empresa contacta al mismo candidato por dos ofertas distintas, es la misma conversación). `seed-santiago-profile.ts` crea una conversación de ejemplo iniciada por `empresa001@demo.com` hacia el candidato demo.

## 9. Seeds disponibles

| Script | Comando | Qué hace | Idempotente |
|---|---|---|---|
| `prisma/seed.ts` | `npm run seed` | 3 empresas + 100 candidatos genéricos con datos aleatorios (skills, experiencia, educación) | Sí — `findUnique` por email antes de crear, no duplica. Re-correr **no** regenera los datos random de los ya existentes (solo crea los que falten). |
| `prisma/seed-jobs.ts` | `npm run seed:jobs` | ~50 empresas + 200 ofertas | Sí, mismo patrón |
| `prisma/seed-santiago-profile.ts` | `npm run seed:santiago` | Perfil demo rico del candidato principal | Sí — usa `upsert` real (`update`+`create`), re-correrlo actualiza el perfil a los valores del script |
| `prisma/seed-company-demo.ts` | `npm run seed:company-demo` | Enriquece/crea `empresa001@demo.com` | Sí — `upsert` |
| `prisma/seed-more-companies.ts` | `npm run seed:more-companies` | Empresas adicionales | Ver script antes de asumir — no auditado en esta sesión |
| `prisma/seed-skills-catalog.ts` | `npm run seed:skills-catalog` | Catálogo de skills para autocompletado | Ver script antes de asumir |
| `prisma/update-company-logos.ts` | `npm run update:company-logos` | Asigna los 11 logos SVG reales (`FRONTEND/public/assets/company-logos/`) a las empresas del seed por email | Sí — `UPDATE` directo por email, no crea ni borra filas. **Ya corrido** — `CompanyProfile.logoUrl` está poblado (ver Fase 9 en `PHASES.md`) |
| `prisma/backfill-job-workload.ts` | `npm run backfill:job-workload` | Completa `JobOffer.workload` en ofertas que lo tengan `null` (heurística: "Prácticas" → "Medio tiempo", resto → "Tiempo completo") | Sí — solo toca filas con `workload: null`, nunca pisa un valor ya elegido. **Ya corrido 2026-07-17** — 68 ofertas actualizadas, ver BUG relacionado en `NEXT_STEPS.md` |
| `prisma/clear-santiago-cvs.ts` | *(sin script en package.json)* | Borra los `CvDocument` del candidato demo | **Destructivo** — no correr sin confirmar con el usuario primero (ver regla general del proyecto) |

## 10. Scripts Prisma importantes

```bash
npx prisma validate                          # valida schema.prisma
npx prisma generate                          # regenera el cliente (BACKEND/libs/database/src/generated)
npx prisma migrate dev --name <descripcion>   # nueva migración en desarrollo
npx prisma migrate deploy                     # aplica migraciones pendientes
npx prisma studio                             # explorador visual de datos (útil para depurar sin escribir SQL)
```
Migraciones aplicadas hoy: `20260606192350_init` → `20260606223101_add_company_role` → `20260617053007_improve_candidate_profile_phase1`.
