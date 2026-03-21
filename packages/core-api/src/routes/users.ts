import { FastifyInstance } from 'fastify';
import { userRepository } from '../repositories/PrismaRepository.js';
import { passwordHasher } from '../services/PasswordHasher.js';
import {
  CreateUserSchema,
  UpdatePasswordSchema,
  CreateUserInput,
  UpdatePasswordInput,
} from '../dto/index.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { NotFoundError, ConflictError, BadRequestError } from '../utils/errors.js';

export async function userRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('onRequest', authMiddleware);

  fastify.get(
    '/',
    requireRole('ADMIN_SISTEMAS'),
    async (request, reply) => {
      const users = await userRepository.findAll();
      const safeUsers = users.map(({ passwordHash, ...user }) => user);
      return reply.send({ success: true, data: safeUsers });
    }
  );

  fastify.get<{ Params: { id: string } }>(
    '/:id',
    requireRole('ADMIN_SISTEMAS'),
    async (request, reply) => {
      const user = await userRepository.findById(request.params.id);
      if (!user) {
        throw new NotFoundError('Usuario');
      }
      const { passwordHash, ...safeUser } = user;
      return reply.send({ success: true, data: safeUser });
    }
  );

  fastify.post<{ Body: CreateUserInput }>(
    '/',
    { schema: { body: CreateUserSchema } },
    requireRole('ADMIN_SISTEMAS'),
    async (request, reply) => {
      const existing = await userRepository.findByUsername(request.body.username);
      if (existing) {
        throw new ConflictError('El nombre de usuario ya existe');
      }

      const passwordHash = await passwordHasher.hash(request.body.password);
      const user = await userRepository.create(
        request.body.username,
        passwordHash,
        request.body.role
      );

      const { passwordHash: _, ...safeUser } = user;
      return reply.status(201).send({ success: true, data: safeUser });
    }
  );

  fastify.put<{ Params: { id: string }; Body: UpdatePasswordInput }>(
    '/:id/password',
    { schema: { body: UpdatePasswordSchema } },
    requireRole('ADMIN_SISTEMAS'),
    async (request, reply) => {
      const user = await userRepository.findById(request.params.id);
      if (!user) {
        throw new NotFoundError('Usuario');
      }

      const isValid = await passwordHasher.compare(
        request.body.currentPassword,
        user.passwordHash
      );
      if (!isValid) {
        throw new BadRequestError('Contraseña actual incorrecta');
      }

      const newPasswordHash = await passwordHasher.hash(request.body.newPassword);
      await userRepository.updatePassword(request.params.id, newPasswordHash);

      return reply.send({ success: true, message: 'Contraseña actualizada' });
    }
  );

  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    requireRole('ADMIN_SISTEMAS'),
    async (request, reply) => {
      const user = await userRepository.findById(request.params.id);
      if (!user) {
        throw new NotFoundError('Usuario');
      }

      if (user.role === 'ADMIN_SISTEMAS') {
        const allAdmins = await userRepository.findByRole('ADMIN_SISTEMAS');
        if (allAdmins.length <= 1) {
          throw new BadRequestError('No se puede eliminar el último administrador');
        }
      }

      await userRepository.delete(request.params.id);
      return reply.status(204).send();
    }
  );
}
