import { Request, Response, NextFunction } from 'express';
import { authService, TokenPayload } from '../services/AuthService.js';
import { UserRole } from '@prisma/client';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

const API_KEY_PUBLIC_REPO = process.env.API_KEY_PUBLIC_REPO;
const API_KEY_ADMIN_PORTAL = process.env.API_KEY_ADMIN_PORTAL;

export const authMiddleware = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Token de autenticación requerido'));
  }

  const token = authHeader.substring(7);

  try {
    const payload = authService.verify(token);
    req.user = payload;
    next();
  } catch {
    next(new UnauthorizedError('Token inválido o expirado'));
  }
};

export const apiKeyMiddleware = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void => {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    return next(new UnauthorizedError('API key requerida'));
  }

  if (apiKey === API_KEY_PUBLIC_REPO) {
    req.user = {
      userId: 'public-repo',
      username: 'public-repo',
      role: 'CONSULTA' as UserRole,
    };
    return next();
  }

  if (apiKey === API_KEY_ADMIN_PORTAL) {
    req.user = {
      userId: 'admin-portal',
      username: 'admin-portal',
      role: 'ADMIN_SISTEMAS' as UserRole,
    };
    return next();
  }

  next(new UnauthorizedError('API key inválida'));
};

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Token de autenticación requerido'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError('No tienes permisos para realizar esta acción'));
    }

    next();
  };
};
