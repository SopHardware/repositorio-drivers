import { PrismaClient } from '@prisma/client';
import {
  IDriverRepository,
  IUserRepository,
  CreateDriverDTO,
  UpdateDriverDTO,
  DriverFilters,
} from '../interfaces/IRepository.js';
import { User } from '@prisma/client';

export class PrismaDriverRepository implements IDriverRepository {
  private static instance: PrismaDriverRepository;
  private prisma: PrismaClient;

  private constructor() {
    this.prisma = new PrismaClient();
  }

  static getInstance(): PrismaDriverRepository {
    if (!PrismaDriverRepository.instance) {
      PrismaDriverRepository.instance = new PrismaDriverRepository();
    }
    return PrismaDriverRepository.instance;
  }

  async create(data: CreateDriverDTO): Promise<import('@prisma/client').HardwareDriver> {
    return this.prisma.hardwareDriver.create({ data });
  }

  async findById(id: number): Promise<import('@prisma/client').HardwareDriver | null> {
    return this.prisma.hardwareDriver.findUnique({ where: { id } });
  }

  async findAll(filters?: DriverFilters): Promise<import('@prisma/client').HardwareDriver[]> {
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

    return this.prisma.hardwareDriver.findMany({ where });
  }

  async update(id: number, data: UpdateDriverDTO): Promise<import('@prisma/client').HardwareDriver> {
    return this.prisma.hardwareDriver.update({ where: { id }, data });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.hardwareDriver.delete({ where: { id } });
  }

  async count(filters?: DriverFilters): Promise<number> {
    const where: any = {};

    if (filters?.brand) where.brand = { contains: filters.brand, mode: 'insensitive' };
    if (filters?.model) where.model = { contains: filters.model, mode: 'insensitive' };
    if (filters?.hardwareType) where.hardwareType = filters.hardwareType;
    if (filters?.search) {
      where.OR = [
        { driverName: { contains: filters.search, mode: 'insensitive' } },
        { brand: { contains: filters.search, mode: 'insensitive' } },
        { model: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.hardwareDriver.count({ where });
  }
}

export class PrismaUserRepository implements IUserRepository {
  private static instance: PrismaUserRepository;
  private prisma: PrismaClient;

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
      data: { username, passwordHash, role: role as any },
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }
}

export const driverRepository = PrismaDriverRepository.getInstance();
export const userRepository = PrismaUserRepository.getInstance();
