import 'dotenv/config';
import { PrismaClient } from '../libs/database/src/generated/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env['DATABASE_URL'] as string,
});
const prisma = new PrismaClient({ adapter });

/**
 * Seed idempotente (upsert) de los catálogos ya migrados a `SystemCatalog` y
 * realmente wireados en el código (`assertValidCatalogValue` en cada
 * servicio) — ver docs/plan-panel-administrativo.md, Fases 3 y 10. Solo se
 * seedean acá los catálogos que el backend/frontend efectivamente leen de
 * esta tabla; sembrar uno sin wireado sería un catálogo decorativo que un
 * admin podría "editar" sin que eso cambiara nada real. El catálogo de
 * categorías de habilidad (~600 entradas de `skill-catalog.ts`) sigue fuera
 * de acá a propósito — requiere un campo de agrupación que `SystemCatalog`
 * no tiene hoy (ver Fase 10.6 del plan). El *nivel* de habilidad (Fase 10.5)
 * sí valida contra esta tabla del lado del backend, pero el selector visual
 * del frontend (`level-meter.component.ts`) se deja con sus 4 valores fijos
 * (con hint + color por nivel) en vez de volverlo dinámico — no es una
 * lista de opciones simple como las demás, es un componente presentacional
 * con contenido propio por nivel.
 */
async function main() {
  const catalogs: { catalogKey: string; entries: { value: string; label: string; sortOrder: number }[] }[] = [
    {
      catalogKey: 'JOB_MODALITY',
      entries: [
        { value: 'Remoto', label: 'Remoto', sortOrder: 1 },
        { value: 'Híbrido', label: 'Híbrido', sortOrder: 2 },
        { value: 'Presencial', label: 'Presencial', sortOrder: 3 },
      ],
    },
    {
      catalogKey: 'JOB_CONTRACT_TYPE',
      entries: [
        { value: 'Término indefinido', label: 'Término indefinido', sortOrder: 1 },
        { value: 'Término fijo', label: 'Término fijo', sortOrder: 2 },
        { value: 'Obra o labor', label: 'Obra o labor', sortOrder: 3 },
        { value: 'Aprendizaje', label: 'Aprendizaje', sortOrder: 4 },
        { value: 'Prestación de servicios', label: 'Prestación de servicios', sortOrder: 5 },
        { value: 'Temporal / ocasional / accidental', label: 'Temporal / ocasional / accidental', sortOrder: 6 },
        { value: 'Prácticas', label: 'Prácticas', sortOrder: 7 },
        { value: 'Otro', label: 'Otro', sortOrder: 8 },
      ],
    },
    {
      catalogKey: 'JOB_WORKLOAD',
      entries: [
        { value: 'Tiempo completo', label: 'Tiempo completo', sortOrder: 1 },
        { value: 'Medio tiempo', label: 'Medio tiempo', sortOrder: 2 },
        { value: 'Por horas', label: 'Por horas', sortOrder: 3 },
        { value: 'Turnos', label: 'Turnos', sortOrder: 4 },
        { value: 'Flexible', label: 'Flexible', sortOrder: 5 },
        { value: 'Otra', label: 'Otra', sortOrder: 6 },
      ],
    },
    {
      // Fase 10 — valores idénticos a los que ya usaba el `<mat-select>` de
      // experiences.component.ts (líneas 94-96 antes de esta fase), para no
      // invalidar ninguna experiencia ya guardada.
      catalogKey: 'EXPERIENCE_WORK_MODE',
      entries: [
        { value: 'ONSITE', label: 'Presencial', sortOrder: 1 },
        { value: 'REMOTE', label: 'Remoto', sortOrder: 2 },
        { value: 'HYBRID', label: 'Híbrido', sortOrder: 3 },
      ],
    },
    {
      catalogKey: 'EXPERIENCE_CONTRACT_TYPE',
      entries: [
        { value: 'FULL_TIME', label: 'Tiempo completo', sortOrder: 1 },
        { value: 'PART_TIME', label: 'Medio tiempo', sortOrder: 2 },
        { value: 'CONTRACTOR', label: 'Contratista', sortOrder: 3 },
        { value: 'INTERNSHIP', label: 'Prácticas', sortOrder: 4 },
        { value: 'FREELANCE', label: 'Freelance', sortOrder: 5 },
        { value: 'TEMPORARY', label: 'Temporal', sortOrder: 6 },
        { value: 'OTHER', label: 'Otro', sortOrder: 7 },
      ],
    },
    {
      catalogKey: 'EDUCATION_TYPE',
      entries: [
        { value: 'FORMAL', label: 'Formal', sortOrder: 1 },
        { value: 'NON_FORMAL', label: 'No formal', sortOrder: 2 },
      ],
    },
    {
      catalogKey: 'FORMATION_LEVEL',
      entries: [
        { value: 'Curso', label: 'Curso', sortOrder: 1 },
        { value: 'Certificación', label: 'Certificación', sortOrder: 2 },
        { value: 'Diplomado', label: 'Diplomado', sortOrder: 3 },
        { value: 'Seminario', label: 'Seminario', sortOrder: 4 },
        { value: 'Bootcamp', label: 'Bootcamp', sortOrder: 5 },
        { value: 'Bachillerato', label: 'Bachillerato', sortOrder: 6 },
        { value: 'Técnico', label: 'Técnico', sortOrder: 7 },
        { value: 'Tecnólogo', label: 'Tecnólogo', sortOrder: 8 },
        { value: 'Universidad', label: 'Universidad', sortOrder: 9 },
        { value: 'Posgrado', label: 'Posgrado', sortOrder: 10 },
        { value: 'Otro', label: 'Otro', sortOrder: 11 },
      ],
    },
    {
      catalogKey: 'PROJECT_TYPE',
      entries: [
        { value: 'INDIVIDUAL', label: 'Individual', sortOrder: 1 },
        { value: 'TEAM', label: 'En equipo', sortOrder: 2 },
      ],
    },
    {
      catalogKey: 'PROJECT_STATUS',
      entries: [
        { value: 'PLANNED', label: 'Planificado', sortOrder: 1 },
        { value: 'IN_PROGRESS', label: 'En progreso', sortOrder: 2 },
        { value: 'COMPLETED', label: 'Completado', sortOrder: 3 },
      ],
    },
    {
      catalogKey: 'SKILL_LEVEL',
      entries: [
        { value: 'BASIC', label: 'Básico', sortOrder: 1 },
        { value: 'INTERMEDIATE', label: 'Intermedio', sortOrder: 2 },
        { value: 'ADVANCED', label: 'Avanzado', sortOrder: 3 },
        { value: 'EXPERT', label: 'Experto', sortOrder: 4 },
      ],
    },
    {
      // Nueva (antes `currency` no tenía catálogo — cualquier string corto
      // de hasta 10 caracteres pasaba, sin validación real). Mismos 3
      // valores y mismas etiquetas cortas que ya tenía el `<select>`
      // hardcodeado de company-jobs.component.html antes de esta fase.
      catalogKey: 'CURRENCY',
      entries: [
        { value: 'COP', label: 'COP', sortOrder: 1 },
        { value: 'USD', label: 'USD', sortOrder: 2 },
        { value: 'EUR', label: 'EUR', sortOrder: 3 },
      ],
    },
  ];

  let count = 0;
  for (const catalog of catalogs) {
    for (const entry of catalog.entries) {
      await prisma.systemCatalog.upsert({
        where: { catalogKey_value: { catalogKey: catalog.catalogKey, value: entry.value } },
        update: { label: entry.label, sortOrder: entry.sortOrder },
        create: { catalogKey: catalog.catalogKey, value: entry.value, label: entry.label, sortOrder: entry.sortOrder },
      });
      count++;
    }
  }

  console.log(`\nCatálogos de sistema sincronizados: ${count} entradas en ${catalogs.length} catálogos.\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
