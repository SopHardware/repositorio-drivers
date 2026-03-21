import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export interface IPasswordHasher {
  hash(password: string): Promise<string>;
  compare(password: string, hash: string): Promise<boolean>;
}

export class PasswordHasher implements IPasswordHasher {
  private static instance: PasswordHasher;

  private constructor() {}

  static getInstance(): PasswordHasher {
    if (!PasswordHasher.instance) {
      PasswordHasher.instance = new PasswordHasher();
    }
    return PasswordHasher.instance;
  }

  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}

export const passwordHasher = PasswordHasher.getInstance();
