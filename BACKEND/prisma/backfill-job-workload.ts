import 'dotenv/config';
import { PrismaClient } from '../libs/database/src/generated/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env['DATABASE_URL'] as string,
});
const prisma = new PrismaClient({ adapter });

/**
 * Backfill idempotente: solo toca ofertas con workload NULL (no pisa nada
 * elegido por un usuario/empresa real). No borra ni crea filas, solo
 * completa un campo que faltaba en los seeds anteriores a que existiera.
 */
function inferWorkload(contractType: string | null): string {
  if (contractType === 'Prácticas') return 'Medio tiempo';
  return 'Tiempo completo';
}

async function main() {
  console.log('\n🕒  Backfill de jornada (workload) en ofertas existentes...\n');

  const jobs = await prisma.jobOffer.findMany({
    where: { workload: null },
    select: { id: true, contractType: true, title: true },
  });

  console.log(`  Ofertas sin jornada asignada: ${jobs.length}`);

  let updated = 0;
  for (const job of jobs) {
    const workload = inferWorkload(job.contractType);
    await prisma.jobOffer.update({
      where: { id: job.id },
      data: { workload },
    });
    updated++;
  }

  console.log(`\n📊  Actualizadas: ${updated}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
