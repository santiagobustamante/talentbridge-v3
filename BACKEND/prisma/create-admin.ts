import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaClient, UserRole } from '../libs/database/src/generated/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env['DATABASE_URL'] as string,
});
const prisma = new PrismaClient({ adapter });

/**
 * Script de un solo uso para crear (o promover) la cuenta ADMIN — no existe,
 * ni debe existir nunca, un endpoint público de registro para este rol. Se
 * corre a mano, una vez, contra la base que corresponda (local o producción).
 *
 * Uso: npx ts-node prisma/create-admin.ts <email> <password>
 */
async function main() {
  const [email, password] = process.argv.slice(2);

  if (!email || !password) {
    console.error('Uso: npx ts-node prisma/create-admin.ts <email> <password>');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('La contraseña debe tener al menos 8 caracteres.');
    process.exit(1);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (existing) {
    if (existing.role === UserRole.ADMIN) {
      console.log(`\nLa cuenta ${normalizedEmail} ya es ADMIN. No se hizo ningún cambio.\n`);
      return;
    }
    console.log(`\nLa cuenta ${normalizedEmail} ya existe con rol ${existing.role}. Se promueve a ADMIN (la contraseña no cambia).\n`);
    await prisma.user.update({
      where: { id: existing.id },
      data: { role: UserRole.ADMIN },
    });
    console.log('Listo — cuenta promovida a ADMIN.\n');
    return;
  }

  const admin = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      role: UserRole.ADMIN,
      emailVerified: true,
    },
  });

  console.log(`\nCuenta ADMIN creada: ${admin.email} (id ${admin.id}).\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
