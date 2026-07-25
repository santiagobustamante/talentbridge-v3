import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '../libs/database/src/generated/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] as string });
const prisma = new PrismaClient({ adapter });

interface MunicipioRow {
  codigoDivipola: string;
  nombre: string;
  departamentoCodigo: string;
  departamento: string;
  label: string;
}

async function main() {
  const raw = readFileSync(join(__dirname, 'data/municipios-colombia.json'), 'utf8');
  const municipios: MunicipioRow[] = JSON.parse(raw);

  console.log(`\n🗺️  Poblando catálogo de ${municipios.length} municipios (DIVIPOLA)...\n`);

  let inserted = 0;
  let updated = 0;

  for (const m of municipios) {
    const result = await prisma.municipality.upsert({
      where: { codigoDivipola: m.codigoDivipola },
      create: m,
      update: m,
    });
    if (result) inserted++;
  }

  const total = await prisma.municipality.count();
  console.log(`  ✓  Insertados/actualizados: ${inserted}`);
  console.log(`  📊  Total en BD: ${total}\n`);
}

main()
  .catch((e) => { console.error('❌', e.message); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
