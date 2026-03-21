import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrismaDriverRepository } from './PrismaRepository.js';
import { PrismaClient } from '@prisma/client';

vi.mock('@prisma/client', () => {
  const mockPrismaClient = {
    hardwareDriver: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  };
  return {
    PrismaClient: vi.fn(() => mockPrismaClient),
  };
});

describe('PrismaDriverRepository', () => {
  let repository: PrismaDriverRepository;
  let mockPrisma: any;

  const mockDriver = {
    id: 1,
    driverName: 'HP LaserJet Pro',
    brand: 'HP',
    model: 'P1102w',
    version: '1.0',
    hardwareType: 'IMPRESORA',
    driveFileId: 'file-id-123',
    fileExtension: '.exe',
    fileSize: 15000000,
    uploadedById: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const prismaClient = new PrismaClient();
    mockPrisma = prismaClient as any;
    repository = new PrismaDriverRepository();
  });

  it('should create a driver', async () => {
    mockPrisma.hardwareDriver.create.mockResolvedValue(mockDriver);

    const result = await repository.create({
      driverName: 'HP LaserJet Pro',
      brand: 'HP',
      model: 'P1102w',
      version: '1.0',
      hardwareType: 'IMPRESORA',
      driveFileId: 'file-id-123',
      fileExtension: '.exe',
      fileSize: 15000000,
      uploadedById: 'user-123',
    });

    expect(result).toEqual(mockDriver);
    expect(mockPrisma.hardwareDriver.create).toHaveBeenCalledTimes(1);
  });

  it('should find driver by id', async () => {
    mockPrisma.hardwareDriver.findUnique.mockResolvedValue(mockDriver);

    const result = await repository.findById(1);

    expect(result).toEqual(mockDriver);
    expect(mockPrisma.hardwareDriver.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('should return null for non-existent driver', async () => {
    mockPrisma.hardwareDriver.findUnique.mockResolvedValue(null);

    const result = await repository.findById(999);

    expect(result).toBeNull();
  });

  it('should find all drivers with filters', async () => {
    mockPrisma.hardwareDriver.findMany.mockResolvedValue([mockDriver]);

    const result = await repository.findAll({ brand: 'HP' });

    expect(result).toEqual([mockDriver]);
    expect(mockPrisma.hardwareDriver.findMany).toHaveBeenCalledWith({
      where: { brand: { contains: 'HP', mode: 'insensitive' } },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('should update a driver', async () => {
    const updatedDriver = { ...mockDriver, version: '2.0' };
    mockPrisma.hardwareDriver.update.mockResolvedValue(updatedDriver);

    const result = await repository.update(1, { version: '2.0' });

    expect(result.version).toBe('2.0');
    expect(mockPrisma.hardwareDriver.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { version: '2.0' },
    });
  });

  it('should delete a driver', async () => {
    mockPrisma.hardwareDriver.delete.mockResolvedValue(mockDriver);

    await repository.delete(1);

    expect(mockPrisma.hardwareDriver.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});
