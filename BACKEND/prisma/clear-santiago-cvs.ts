import 'dotenv/config';
import { PrismaClient } from '../libs/database/src/generated/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as fs from 'fs';

const adapter = new PrismaPg({
  connectionString: process.env['DATABASE_URL'] as string,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('\n🧹 Limpiando CVs de Santiago...\n');

  const email = 'bustamantemolinasantiago@gmail.com';
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    console.log('  ⚠  Usuario no encontrado');
    process.exit(0);
  }

  const cvs = await prisma.cvDocument.findMany({
    where: { userId: user.id },
    include: { analyses: true },
  });

  if (cvs.length === 0) {
    console.log('  ✓  No hay CVs para eliminar');
    process.exit(0);
  }

  let deletedFiles = 0;
  for (const cv of cvs) {
    if (cv.analyses.length > 0) {
      await prisma.cvAnalysis.deleteMany({ where: { cvDocumentId: cv.id } });
    }

    if (cv.filePath && fs.existsSync(cv.filePath)) {
      try { fs.unlinkSync(cv.filePath); deletedFiles++; } catch {}
    }

    await prisma.cvDocument.delete({ where: { id: cv.id } });
    console.log(`  🗑  Eliminado: ${cv.originalName}`);
  }

  console.log(`\n  ✓  ${cvs.length} CVs eliminados (${deletedFiles} archivos físicos)\n`);
}

main()
  .catch((e) => { console.error('❌ Error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
