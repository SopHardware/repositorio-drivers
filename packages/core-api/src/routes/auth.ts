import { FastifyInstance } from 'fastify';
import { authService } from '../services/AuthService.js';
import { LoginSchema, RefreshTokenSchema, LoginInput, RefreshTokenInput } from '../dto/index.js';
import { BadRequestError } from '../utils/errors.js';

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post<{ Body: LoginInput }>(
    '/login',
    { schema: { body: LoginSchema } },
    async (request, reply) => {
      const { username, password } = request.body;

      try {
        const tokens = await authService.login(username, password);
        return reply.send({ success: true, data: tokens });
      } catch (error) {
        throw new BadRequestError('Credenciales inválidas');
      }
    }
  );

  fastify.post<{ Body: RefreshTokenInput }>(
    '/refresh',
    { schema: { body: RefreshTokenSchema } },
    async (request, reply) => {
      const { refreshToken } = request.body;

      try {
        const tokens = await authService.refresh(refreshToken);
        return reply.send({ success: true, data: tokens });
      } catch (error) {
        throw new BadRequestError('Refresh token inválido o expirado');
      }
    }
  );
}
