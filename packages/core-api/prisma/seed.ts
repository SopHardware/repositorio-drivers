import { PrismaClient } from '@prisma/client';
import { passwordHasher } from '../src/services/PasswordHasher.js';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Obtener contraseñas de variables de entorno (sin valor por defecto)
  const adminPasswordPlain = process.env.SEED_ADMIN_PASSWORD;
  const soportePasswordPlain = process.env.SEED_SOPORTE_PASSWORD;

  if (!adminPasswordPlain || !soportePasswordPlain) {
    console.error('Error: Las variables de entorno SEED_ADMIN_PASSWORD y SEED_SOPORTE_PASSWORD son requeridas');
    console.error('');
    console.error('Uso:');
    console.error('  SEED_ADMIN_PASSWORD="MiPassword123!" SEED_SOPORTE_PASSWORD="OtroPass456!" npx prisma db seed');
    process.exit(1);
  }

  const adminPassword = await passwordHasher.hash(adminPasswordPlain);
  const soportePassword = await passwordHasher.hash(soportePasswordPlain);

  const adminUser = await prisma.user.upsert({
    where: { username: 'admin_sistemas' },
    update: {},
    create: {
      username: 'admin_sistemas',
      passwordHash: adminPassword,
      role: 'ADMIN_SISTEMAS',
    },
  });
  console.log(`Created/Updated user: ${adminUser.username} (${adminUser.role})`);

  const soporteUser = await prisma.user.upsert({
    where: { username: 'soporte_wp' },
    update: {},
    create: {
      username: 'soporte_wp',
      passwordHash: soportePassword,
      role: 'SOPORTE_WP',
    },
  });
  console.log(`Created/Updated user: ${soporteUser.username} (${soporteUser.role})`);

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
