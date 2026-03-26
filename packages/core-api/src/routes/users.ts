import { Router, Request, Response, NextFunction, Router as RouterType } from 'express';
import { body, validationResult } from 'express-validator';
import { userRepository } from '../repositories/PrismaRepository.js';
import { passwordHasher } from '../services/PasswordHasher.js';
import {
  CreateUserSchema,
  UpdatePasswordSchema,
  CreateUserInput,
  UpdatePasswordInput,
} from '../dto/index.js';
import { authMiddleware, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { NotFoundError, ConflictError, BadRequestError } from '../utils/errors.js';

export const userRouter: RouterType = Router();

userRouter.use(authMiddleware);

const validateCreateUser = [
  body('username').isLength({ min: 3, max: 50 }).withMessage('Username debe tener entre 3 y 50 caracteres'),
  body('password').isLength({ min: 6, max: 100 }).withMessage('Password debe tener entre 6 y 100 caracteres'),
  body('role').isIn(['ADMIN_SISTEMAS', 'SOPORTE_WP', 'CONSULTA']).withMessage('Rol inválido'),
  (req: Request, _res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new BadRequestError(errors.array()[0].msg));
    }
    next();
  },
];

const validateUpdatePassword = [
  body('currentPassword').notEmpty().withMessage('currentPassword es requerido'),
  body('newPassword').isLength({ min: 6, max: 100 }).withMessage('newPassword debe tener entre 6 y 100 caracteres'),
  (req: Request, _res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new BadRequestError(errors.array()[0].msg));
    }
    next();
  },
];

userRouter.get(
  '/',
  requireRole('ADMIN_SISTEMAS'),
  async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const users = await userRepository.findAll();
      const safeUsers = users.map(({ passwordHash, ...user }) => user);
      return res.json({ success: true, data: safeUsers });
    } catch (error) {
      next(error);
    }
  }
);

userRouter.get(
  '/:id',
  requireRole('ADMIN_SISTEMAS'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = await userRepository.findById(req.params.id);
      if (!user) {
        throw new NotFoundError('Usuario');
      }
      const { passwordHash, ...safeUser } = user;
      return res.json({ success: true, data: safeUser });
    } catch (error) {
      next(error);
    }
  }
);

userRouter.post(
  '/',
  requireRole('ADMIN_SISTEMAS'),
  validateCreateUser,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parseResult = CreateUserSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw new BadRequestError(parseResult.error.errors[0].message);
      }

      const existing = await userRepository.findByUsername(parseResult.data.username);
      if (existing) {
        throw new ConflictError('El nombre de usuario ya existe');
      }

      const passwordHash = await passwordHasher.hash(parseResult.data.password);
      const user = await userRepository.create(
        parseResult.data.username,
        passwordHash,
        parseResult.data.role
      );

      const { passwordHash: _, ...safeUser } = user;
      return res.status(201).json({ success: true, data: safeUser });
    } catch (error) {
      next(error);
    }
  }
);

userRouter.put(
  '/:id/password',
  requireRole('ADMIN_SISTEMAS'),
  validateUpdatePassword,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parseResult = UpdatePasswordSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw new BadRequestError(parseResult.error.errors[0].message);
      }

      const user = await userRepository.findById(req.params.id);
      if (!user) {
        throw new NotFoundError('Usuario');
      }

      const isValid = await passwordHasher.compare(
        parseResult.data.currentPassword,
        user.passwordHash
      );
      if (!isValid) {
        throw new BadRequestError('Contraseña actual incorrecta');
      }

      const newPasswordHash = await passwordHasher.hash(parseResult.data.newPassword);
      await userRepository.updatePassword(req.params.id, newPasswordHash);

      return res.json({ success: true, message: 'Contraseña actualizada' });
    } catch (error) {
      next(error);
    }
  }
);

userRouter.delete(
  '/:id',
  requireRole('ADMIN_SISTEMAS'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = await userRepository.findById(req.params.id);
      if (!user) {
        throw new NotFoundError('Usuario');
      }

      if (user.role === 'ADMIN_SISTEMAS') {
        const allAdmins = await userRepository.findByRole('ADMIN_SISTEMAS');
        if (allAdmins.length <= 1) {
          throw new BadRequestError('No se puede eliminar el último administrador');
        }
      }

      await userRepository.delete(req.params.id);
      return res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);
