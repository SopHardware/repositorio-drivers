import { HardwareDriver, HardwareType, User } from '@prisma/client';

export interface CreateDriverDTO {
  driverName: string;
  brand: string;
  model: string;
  version: string;
  hardwareType: HardwareType;
  driveFileId: string;
  fileExtension: string;
  fileSize: number;
  fileHash?: string;
  uploadedById: string;
}

export interface UpdateDriverDTO {
  driverName?: string;
  brand?: string;
  model?: string;
  version?: string;
  hardwareType?: HardwareType;
}

export interface DriverFilters {
  brand?: string;
  model?: string;
  hardwareType?: HardwareType;
  search?: string;
}

export interface IDriverRepository {
  create(data: CreateDriverDTO): Promise<HardwareDriver>;
  findById(id: number): Promise<HardwareDriver | null>;
  findByHash(fileHash: string): Promise<HardwareDriver | null>;
  findAll(filters?: DriverFilters): Promise<HardwareDriver[]>;
  update(id: number, data: UpdateDriverDTO): Promise<HardwareDriver>;
  delete(id: number): Promise<void>;
  count(filters?: DriverFilters): Promise<number>;
}

export interface IUserRepository {
  create(username: string, passwordHash: string, role: string): Promise<User>;
  findByUsername(username: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
}
