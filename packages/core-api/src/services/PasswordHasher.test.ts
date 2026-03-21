import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PasswordHasher } from './PasswordHasher.js';

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed_password'),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

describe('PasswordHasher', () => {
  let passwordHasher: PasswordHasher;

  beforeEach(() => {
    vi.clearAllMocks();
    passwordHasher = PasswordHasher.getInstance();
  });

  it('should return singleton instance', () => {
    const instance1 = PasswordHasher.getInstance();
    const instance2 = PasswordHasher.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should hash a password', async () => {
    const password = 'testPassword123';
    const hash = await passwordHasher.hash(password);
    expect(hash).toBe('hashed_password');
  });

  it('should compare password with hash', async () => {
    const password = 'testPassword123';
    const hash = 'hashed_password';
    const result = await passwordHasher.compare(password, hash);
    expect(result).toBe(true);
  });
});
