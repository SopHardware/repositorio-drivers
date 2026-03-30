import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import type { HardwareDriver, User, HardwareType, UserRole } from '@prisma/client';
import type { PrismaClient as PrismaClientType } from '@prisma/client';
import {
  IDriverRepository,
  IUserRepository,
  CreateDriverDTO,
  UpdateDriverDTO,
  DriverFilters,
} from '../interfaces/IRepository.js';

interface CursorParams {
  id: number;
  createdAt: Date;
}

interface PaginationParams {
  limit: number;
  cursor?: CursorParams;
}

export class PrismaDriverRepository implements IDriverRepository {
  private static instance: PrismaDriverRepository;
  private prisma: PrismaClientType;

  private constructor() {
    this.prisma = new PrismaClient();
  }

  static getInstance(): PrismaDriverRepository {
    if (!PrismaDriverRepository.instance) {
      PrismaDriverRepository.instance = new PrismaDriverRepository();
    }
    return PrismaDriverRepository.instance;
  }

  private buildWhereClause(filters?: DriverFilters): any {
    const where: any = {};

    if (filters?.brand) {
      where.brand = { contains: filters.brand, mode: 'insensitive' };
    }
    if (filters?.model) {
      where.model = { contains: filters.model, mode: 'insensitive' };
    }
    if (filters?.hardwareType) {
      where.hardwareType = filters.hardwareType;
    }
    if (filters?.search) {
      where.OR = [
        { driverName: { contains: filters.search, mode: 'insensitive' } },
        { brand: { contains: filters.search, mode: 'insensitive' } },
        { model: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  async create(data: CreateDriverDTO): Promise<HardwareDriver> {
    return this.prisma.hardwareDriver.create({ data });
  }

  async findById(id: number): Promise<HardwareDriver | null> {
    return this.prisma.hardwareDriver.findUnique({ where: { id } });
  }

  async findByHash(fileHash: string): Promise<HardwareDriver | null> {
    return this.prisma.hardwareDriver.findFirst({ where: { fileHash } });
  }

  async findAll(filters?: DriverFilters): Promise<HardwareDriver[]> {
    const where = this.buildWhereClause(filters);
    return this.prisma.hardwareDriver.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllWithCursor(
    filters: DriverFilters,
    pagination: PaginationParams
  ): Promise<HardwareDriver[]> {
    const where: any = this.buildWhereClause(filters);

    if (pagination.cursor) {
      where.OR = [
        { createdAt: { lt: pagination.cursor.createdAt } },
        {
          AND: [
            { createdAt: { equals: pagination.cursor.createdAt } },
            { id: { lt: pagination.cursor.id } },
          ],
        },
      ];
    }

    return this.prisma.hardwareDriver.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: pagination.limit + 1,
    });
  }

  async update(id: number, data: UpdateDriverDTO): Promise<HardwareDriver> {
    return this.prisma.hardwareDriver.update({ where: { id }, data });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.hardwareDriver.delete({ where: { id } });
  }

  async count(filters?: DriverFilters): Promise<number> {
    const where = this.buildWhereClause(filters);
    return this.prisma.hardwareDriver.count({ where });
  }
}

export class PrismaUserRepository implements IUserRepository {
  private static instance: PrismaUserRepository;
  private prisma: PrismaClientType;

  private constructor() {
    this.prisma = new PrismaClient();
  }

  static getInstance(): PrismaUserRepository {
    if (!PrismaUserRepository.instance) {
      PrismaUserRepository.instance = new PrismaUserRepository();
    }
    return PrismaUserRepository.instance;
  }

  async create(username: string, passwordHash: string, role: string): Promise<User> {
    return this.prisma.user.create({
      data: { username, passwordHash, role: role as UserRole },
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findAll(): Promise<User[]> {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByRole(role: UserRole): Promise<User[]> {
    return this.prisma.user.findMany({ where: { role } });
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }
}

export const driverRepository = PrismaDriverRepository.getInstance();
export const userRepository = PrismaUserRepository.getInstance();
