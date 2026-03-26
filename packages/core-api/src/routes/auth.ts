import { Router, Request, Response, NextFunction, Router as RouterType } from 'express';
import { body, validationResult } from 'express-validator';
import { authService } from '../services/AuthService.js';
import { LoginInput, RefreshTokenInput, LoginSchema, RefreshTokenSchema } from '../dto/index.js';
import { BadRequestError } from '../utils/errors.js';

export const authRouter: RouterType = Router();

const validateLogin = [
  body('username').isLength({ min: 3, max: 50 }).withMessage('Username debe tener entre 3 y 50 caracteres'),
  body('password').isLength({ min: 6 }).withMessage('Password debe tener al menos 6 caracteres'),
  (req: Request, _res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new BadRequestError(errors.array()[0].msg));
    }
    next();
  },
];

const validateRefresh = [
  body('refreshToken').notEmpty().withMessage('refreshToken es requerido'),
  (req: Request, _res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new BadRequestError(errors.array()[0].msg));
    }
    next();
  },
];

authRouter.post(
  '/login',
  validateLogin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, password } = req.body as LoginInput;
      const tokens = await authService.login(username, password);
      return res.json({ success: true, data: tokens });
    } catch (error) {
      next(new BadRequestError('Credenciales inválidas'));
    }
  }
);

authRouter.post(
  '/refresh',
  validateRefresh,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body as RefreshTokenInput;
      const tokens = await authService.refresh(refreshToken);
      return res.json({ success: true, data: tokens });
    } catch (error) {
      next(new BadRequestError('Refresh token inválido o expirado'));
    }
  }
);
