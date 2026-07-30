import 'dotenv/config';
import { PrismaClient } from '../libs/database/src/generated/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env['DATABASE_URL'] as string,
});
const prisma = new PrismaClient({ adapter });

/**
 * Seed idempotente (upsert) de los catálogos ya migrados a `SystemCatalog` y
 * realmente wireados en el código (JobsService.assertValidCatalogValue) —
 * ver docs/plan-panel-administrativo.md, Fase 3. Solo se seedean acá los
 * catálogos que el backend/frontend efectivamente leen de esta tabla; el
 * resto (nivel de habilidad, tipo de contrato de Experience, etc.) siguen
 * hardcodeados hasta que se migren en una fase futura — sembrarlos acá sin
 * wireado sería un catálogo decorativo que un admin podría "editar" sin que
 * eso cambiara nada real.
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
