import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { AuthService } from './AuthService.js';
import { UserRole } from '@prisma/client';

vi.mock('jsonwebtoken');
vi.mock('../repositories/PrismaRepository.js', () => ({
  userRepository: {
    findByUsername: vi.fn(),
  },
}));
vi.mock('./PasswordHasher.js', () => ({
  passwordHasher: {
    compare: vi.fn(),
  },
}));

describe('AuthService', () => {
  let authService: AuthService;

  const mockUser = {
    id: 'user-123',
    username: 'admin_sistemas',
    passwordHash: 'hashed_password',
    role: 'ADMIN_SISTEMAS' as UserRole,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    authService = AuthService.getInstance();
  });

  it('should return singleton instance', () => {
    const instance1 = AuthService.getInstance();
    const instance2 = AuthService.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should generate tokens on login', async () => {
    const { userRepository } = await import('../repositories/PrismaRepository.js');
    const { passwordHasher } = await import('./PasswordHasher.js');

    (userRepository.findByUsername as any).mockResolvedValue(mockUser);
    (passwordHasher.compare as any).mockResolvedValue(true);
    (jwt.sign as any).mockReturnValue('mocked_token');

    const result = await authService.login('admin_sistemas', 'password123');

    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
    expect(result.accessToken).toBe('mocked_token');
  });

  it('should throw error for invalid credentials', async () => {
    const { userRepository } = await import('../repositories/PrismaRepository.js');

    (userRepository.findByUsername as any).mockResolvedValue(null);

    await expect(authService.login('invalid', 'password')).rejects.toThrow(
      'Credenciales inválidas'
    );
  });

  it('should verify valid token', () => {
    const mockPayload = {
      userId: 'user-123',
      username: 'admin_sistemas',
      role: 'ADMIN_SISTEMAS',
    };

    (jwt.verify as any).mockReturnValue(mockPayload);

    const result = authService.verify('valid_token');
    expect(result).toEqual(mockPayload);
  });

  it('should throw error for invalid token', () => {
    (jwt.verify as any).mockImplementation(() => {
      throw new Error('invalid token');
    });

    expect(() => authService.verify('invalid_token')).toThrow('Token inválido o expirado');
  });
});
