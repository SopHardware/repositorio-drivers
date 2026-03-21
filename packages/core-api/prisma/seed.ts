import { PrismaClient } from '@prisma/client';
import { passwordHasher } from '../src/services/PasswordHasher.js';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  const adminPassword = await passwordHasher.hash('AdminSistemas2026!');
  const soportePassword = await passwordHasher.hash('SoporteWP2026!');

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
