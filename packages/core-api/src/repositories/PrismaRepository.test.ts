import { describe, it, expect, vi } from 'vitest';
import { driverRepository } from './PrismaRepository.js';

vi.mock('@prisma/client', () => {
  const mockPrismaClient = {
    hardwareDriver: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
  return {
    PrismaClient: vi.fn(() => mockPrismaClient),
  };
});

describe('PrismaDriverRepository', () => {
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

  it('should have a driverRepository instance', () => {
    expect(driverRepository).toBeDefined();
  });
});
