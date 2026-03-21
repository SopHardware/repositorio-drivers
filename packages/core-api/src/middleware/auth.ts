import { FastifyRequest, FastifyReply } from 'fastify';
import { authService } from '../services/AuthService.js';
import { TokenPayload } from '../services/AuthService.js';
import { UserRole } from '@prisma/client';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: TokenPayload;
  }
}

export const authMiddleware = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Token de autenticación requerido');
  }

  const token = authHeader.substring(7);

  try {
    const payload = authService.verify(token);
    request.user = payload;
  } catch {
    throw new UnauthorizedError('Token inválido o expirado');
  }
};

export const requireRole = (...allowedRoles: UserRole[]) => {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.user) {
      throw new UnauthorizedError('Token de autenticación requerido');
    }

    if (!allowedRoles.includes(request.user.role)) {
      throw new ForbiddenError('No tienes permisos para realizar esta acción');
    }
  };
};
