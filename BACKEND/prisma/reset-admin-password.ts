import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaClient, UserRole } from '../libs/database/src/generated/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env['DATABASE_URL'] as string,
});
const prisma = new PrismaClient({ adapter });

/**
 * Script de un solo uso para resetear la contraseña de una cuenta ADMIN ya
 * existente — no hay endpoint público para esto (ver create-admin.ts) y el
 * flujo de forgot-password no sirve acá porque las cuentas ADMIN de demo no
 * tienen una casilla de correo real. Se corre a mano, una vez, contra la
 * base que corresponda (local o producción).
 *
 * Uso: npx ts-node prisma/reset-admin-password.ts <email> <nueva-password>
 */
async function main() {
  const [email, password] = process.argv.slice(2);

  if (!email || !password) {
    console.error('Uso: npx ts-node prisma/reset-admin-password.ts <email> <nueva-password>');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('La contraseña debe tener al menos 8 caracteres.');
    process.exit(1);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (!existing) {
    console.error(`No existe ninguna cuenta con el correo ${normalizedEmail}.`);
    process.exit(1);
  }

  if (existing.role !== UserRole.ADMIN) {
    console.error(`La cuenta ${normalizedEmail} no es ADMIN (rol actual: ${existing.role}). Este script solo resetea cuentas ADMIN.`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: existing.id },
    data: { passwordHash },
  });

  console.log(`\nContraseña actualizada para ${normalizedEmail} (id ${existing.id}).\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
