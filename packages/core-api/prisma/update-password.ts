import { PrismaClient } from '@prisma/client';
import { passwordHasher } from '../src/services/PasswordHasher.js';

const prisma = new PrismaClient();

async function updatePassword(username: string, newPassword: string) {
  try {
    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      console.error(`Error: Usuario '${username}' no encontrado`);
      process.exit(1);
    }

    // Hashear la nueva contraseña
    const passwordHash = await passwordHasher.hash(newPassword);

    // Actualizar en la base de datos
    await prisma.user.update({
      where: { username },
      data: { passwordHash },
    });

    console.log(`✅ Contraseña actualizada para: ${username}`);
    console.log(`   Rol: ${user.role}`);
  } catch (error) {
    console.error('Error al actualizar contraseña:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Leer argumentos de línea de comandos
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Uso: npx tsx prisma/update-password.ts <username> <new_password>');
  console.log('');
  console.log('Ejemplo:');
  console.log('  npx tsx prisma/update-password.ts admin_sistemas NuevaPassword123!');
  process.exit(1);
}

const [username, newPassword] = args;
updatePassword(username, newPassword);
