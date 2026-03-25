import jwt from 'jsonwebtoken';
import { passwordHasher } from './PasswordHasher.js';
import { userRepository } from '../repositories/PrismaRepository.js';
import { UserRole } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const jwtSecret = JWT_SECRET as string;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export interface TokenPayload {
  userId: string;
  username: string;
  role: UserRole;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface IAuthService {
  login(username: string, password: string): Promise<AuthTokens>;
  refresh(refreshToken: string): Promise<AuthTokens>;
  verify(token: string): TokenPayload;
}

export class AuthService implements IAuthService {
  private static instance: AuthService;

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async login(username: string, password: string): Promise<AuthTokens> {
    const user = await userRepository.findByUsername(username);
    if (!user) {
      throw new Error('Credenciales inválidas');
    }

    const isValid = await passwordHasher.compare(password, user.passwordHash);
    if (!isValid) {
      throw new Error('Credenciales inválidas');
    }

    return this.generateTokens({
      userId: user.id,
      username: user.username,
      role: user.role,
    });
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = jwt.verify(refreshToken, jwtSecret) as unknown as TokenPayload & { type: string };
      if (payload.type !== 'refresh') {
        throw new Error('Token inválido');
      }
      return this.generateTokens({
        userId: payload.userId,
        username: payload.username,
        role: payload.role,
      });
    } catch {
      throw new Error('Refresh token inválido o expirado');
    }
  }

  verify(token: string): TokenPayload {
    try {
      return jwt.verify(token, jwtSecret) as unknown as TokenPayload;
    } catch {
      throw new Error('Token inválido o expirado');
    }
  }

  private generateTokens(payload: TokenPayload): AuthTokens {
    const accessToken = jwt.sign({ ...payload, type: 'access' }, jwtSecret, {
      expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });

    const refreshToken = jwt.sign({ ...payload, type: 'refresh' }, jwtSecret, {
      expiresIn: JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });

    return { accessToken, refreshToken };
  }
}

export const authService = AuthService.getInstance();
