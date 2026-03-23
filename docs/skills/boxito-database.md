# Skill: boxito-database

## Descripción

Este skill proporciona una guía completa para implementar la capa de datos del proyecto Boxito usando PostgreSQL y Prisma ORM. Incluye diseño de schema, relaciones, y implementación del Repository Pattern.

## Pre-requisitos

- PostgreSQL 14+
- Node.js 18+
- Conocimiento de SQL básico
- Conocimiento de TypeScript

## Técnicas de Programación

### 1. Schema Design - Models

**Modelo User:**
```prisma
model User {
  id           String          @id @default(cuid())
  username     String          @unique
  passwordHash String
  role         UserRole
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt
  drivers      HardwareDriver[]

  @@map("users")
}
```

**Modelo HardwareDriver:**
```prisma
model HardwareDriver {
  id            Int      @id @default(autoincrement())
  driverName    String
  brand         String
  model         String
  version       String
  hardwareType  HardwareType
  driveFileId   String
  fileExtension String
  fileSize      Int
  uploadedById  String
  uploadedBy    User     @relation(fields: [uploadedById], references: [id])
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@map("hardware_drivers")
}
```

**Enums:**
```prisma
enum UserRole {
  ADMIN_SISTEMAS
  SOPORTE_WP
  CONSULTA
}

enum HardwareType {
  IMPRESORA
  ESCANER
  TARJETA_RED
  USB
  DISCO_DURO
  OPTICO
  OTRO
}
```

### 2. Schema Design - Relations

**Relación One-to-Many:**
```prisma
// Un usuario puede subir muchos drivers
// Un driver fue subido por un usuario

model User {
  id      String          @id @default(cuid())
  drivers HardwareDriver[]
}

model HardwareDriver {
  id            Int
  uploadedById  String
  uploadedBy    User     @relation(fields: [uploadedById], references: [id])
}
```

**Configuración de relación:**
```prisma
// Relación con cascade delete (opcional)
model HardwareDriver {
  id            Int
  uploadedById  String
  uploadedBy    User     @relation(fields: [uploadedById], references: [id], onDelete: Cascade)
}
```

### 3. Repository Pattern

**Interfaz del repositorio:**
```typescript
// interfaces/IRepository.ts

export interface DriverFilters {
  brand?: string;
  model?: string;
  hardwareType?: HardwareType;
  search?: string;
}

export interface IDriverRepository {
  create(data: CreateDriverDTO): Promise<HardwareDriver>;
  findById(id: number): Promise<HardwareDriver | null>;
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
```

**Implementación del repositorio:**
```typescript
// repositories/PrismaRepository.ts

import { PrismaClient, HardwareDriver, User } from '@prisma/client';
import { IDriverRepository, CreateDriverDTO, UpdateDriverDTO, DriverFilters } from '../interfaces/IRepository.js';

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
        { model: { contains: filters.search, mode: 'insensitive' } }
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

  async findAll(filters?: DriverFilters): Promise<HardwareDriver[]> {
    const where = this.buildWhereClause(filters);
    return this.prisma.hardwareDriver.findMany({
      where,
      orderBy: { createdAt: 'desc' }
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

export const driverRepository = PrismaDriverRepository.getInstance();
```

### 4. Cursor-based Pagination

**Implementación de cursor:**
```typescript
interface CursorParams {
  id: number;
  createdAt: Date;
}

interface PaginationParams {
  limit: number;
  cursor?: CursorParams;
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
          { id: { lt: pagination.cursor.id } }
        ]
      }
    ];
  }

  return this.prisma.hardwareDriver.findMany({
    where,
    orderBy: [
      { createdAt: 'desc' },
      { id: 'desc' }
    ],
    take: pagination.limit + 1 // Fetch one extra to check if there's more
  });
}
```

**Uso del cursor en la API:**
```typescript
// En la ruta de drivers
fastify.get('/', async (request, reply) => {
  const { cursor, limit } = request.query;
  
  const drivers = await driverRepository.findAllWithCursor(
    filters,
    {
      limit: limit || 20,
      cursor: cursor ? JSON.parse(cursor) : undefined
    }
  );

  // Determinar si hay más resultados
  const hasMore = drivers.length > (limit || 20);
  const results = hasMore ? drivers.slice(0, -1) : drivers;

  // Generar cursor para siguiente página
  const nextCursor = hasMore
    ? JSON.stringify({
        id: results[results.length - 1].id,
        createdAt: results[results.length - 1].createdAt
      })
    : null;

  return reply.send({
    data: results,
    pagination: { nextCursor, hasMore }
  });
});
```

### 5. Migrations

**Crear migración:**
```bash
# Crear migración inicial
npx prisma migrate dev --name init

# Aplicar migración a producción
npx prisma migrate deploy

# Resetear base de datos (desarrollo)
npx prisma migrate reset

# Ver estado de migraciones
npx prisma migrate status
```

**Archivo de migración:**
```sql
-- migration timestamp and name
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- More migrations...
```

### 6. Seeding

**Script de seed:**
```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { passwordHasher } from '../src/services/PasswordHasher.js';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Crear usuario admin
  const adminPassword = await passwordHasher.hash('AdminSistemas2024!');
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin_sistemas' },
    update: {},
    create: {
      username: 'admin_sistemas',
      passwordHash: adminPassword,
      role: 'ADMIN_SISTEMAS'
    }
  });
  console.log(`Created user: ${adminUser.username} (${adminUser.role})`);

  // Crear usuario soporte
  const soportePassword = await passwordHasher.hash('SoporteWP2024!');
  const soporteUser = await prisma.user.upsert({
    where: { username: 'soporte_wp' },
    update: {},
    create: {
      username: 'soporte_wp',
      passwordHash: soportePassword,
      role: 'SOPORTE_WP'
    }
  });
  console.log(`Created user: ${soporteUser.username} (${soporteUser.role})`);

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Configurar seed en package.json:**
```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

**Ejecutar seed:**
```bash
npm run db:seed
# o
npx prisma db seed
```

### 6. Query Optimization

**Filtrado:**
```typescript
// Filtrado básico
const drivers = await prisma.hardwareDriver.findMany({
  where: {
    brand: { contains: 'HP', mode: 'insensitive' }
  }
});

// Múltiples filtros
const drivers = await prisma.hardwareDriver.findMany({
  where: {
    AND: [
      { brand: { contains: search } },
      { hardwareType: 'IMPRESORA' }
    ]
  }
});

// Búsqueda OR
const drivers = await prisma.hardwareDriver.findMany({
  where: {
    OR: [
      { driverName: { contains: search, mode: 'insensitive' } },
      { brand: { contains: search, mode: 'insensitive' } },
      { model: { contains: search, mode: 'insensitive' } }
    ]
  }
});
```

**Ordenamiento:**
```typescript
const drivers = await prisma.hardwareDriver.findMany({
  orderBy: [
    { createdAt: 'desc' },
    { id: 'desc' }
  ]
});
```

**Selección de campos:**
```typescript
// Selecting specific fields
const drivers = await prisma.hardwareDriver.findMany({
  select: {
    id: true,
    driverName: true,
    brand: true,
    hardwareType: true
  }
});

// Including relations
const driver = await prisma.hardwareDriver.findUnique({
  where: { id: 1 },
  include: {
    uploadedBy: {
      select: { username: true, role: true }
    }
  }
});
```

**Paginación con skip/take:**
```typescript
// Offset-based pagination (menos eficiente para grandes volúmenes)
const drivers = await prisma.hardwareDriver.findMany({
  skip: page * limit,
  take: limit,
  orderBy: { createdAt: 'desc' }
});
```

### 7. Transacciones

**Operaciones transactionales:**
```typescript
// Crear driver y actualizar usuario en una transacción
const result = await prisma.$transaction(async (tx) => {
  const driver = await tx.hardwareDriver.create({
    data: { ...driverData }
  });
  
  await tx.user.update({
    where: { id: userId },
    data: { updatedAt: new Date() }
  });
  
  return driver;
});
```

## Testing con Prisma

### Unit Tests - Repository Mock

**Setup de mock:**
```typescript
// test/setup.ts
import { vi } from 'vitest';

// Mock del PrismaClient
vi.mock('@prisma/client', () => {
  const mockPrismaClient = {
    hardwareDriver: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn()
    },
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }
  };
  
  return {
    PrismaClient: vi.fn(() => mockPrismaClient)
  };
});
```

**Test de DriverRepository:**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrismaDriverRepository } from '../repositories/PrismaRepository.js';

describe('PrismaDriverRepository', () => {
  let repository: PrismaDriverRepository;
  let mockPrisma: any;

  const mockDriver = {
    id: 1,
    driverName: 'HP LaserJet Driver',
    brand: 'HP',
    model: 'LaserJet Pro',
    version: '1.0',
    hardwareType: 'IMPRESORA',
    driveFileId: 'file-123',
    fileExtension: '.exe',
    fileSize: 15000000,
    uploadedById: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    const { PrismaClient } = require('@prisma/client');
    const prismaClient = new PrismaClient();
    mockPrisma = prismaClient as any;
    repository = new PrismaDriverRepository();
  });

  it('should create a driver', async () => {
    mockPrisma.hardwareDriver.create.mockResolvedValue(mockDriver);

    const result = await repository.create({
      driverName: 'HP LaserJet Driver',
      brand: 'HP',
      model: 'LaserJet Pro',
      version: '1.0',
      hardwareType: 'IMPRESORA',
      driveFileId: 'file-123',
      fileExtension: '.exe',
      fileSize: 15000000,
      uploadedById: 'user-123'
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
      orderBy: { createdAt: 'desc' }
    });
  });

  it('should update a driver', async () => {
    const updatedDriver = { ...mockDriver, version: '2.0' };
    mockPrisma.hardwareDriver.update.mockResolvedValue(updatedDriver);

    const result = await repository.update(1, { version: '2.0' });

    expect(result.version).toBe('2.0');
    expect(mockPrisma.hardwareDriver.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { version: '2.0' }
    });
  });

  it('should delete a driver', async () => {
    mockPrisma.hardwareDriver.delete.mockResolvedValue(mockDriver);

    await repository.delete(1);

    expect(mockPrisma.hardwareDriver.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('should count drivers with filters', async () => {
    mockPrisma.hardwareDriver.count.mockResolvedValue(10);

    const result = await repository.count({ brand: 'HP' });

    expect(result).toBe(10);
  });
});
```

### Integration Tests

**Test de migrations:**
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Database Integration', () => {
  beforeAll(async () => {
    // Setup: asegurar que la DB está limpia
    await prisma.hardwareDriver.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should create and retrieve a user', async () => {
    const user = await prisma.user.create({
      data: {
        username: 'testuser',
        passwordHash: 'hashedpassword',
        role: 'SOPORTE_WP'
      }
    });

    const retrieved = await prisma.user.findUnique({
      where: { id: user.id }
    });

    expect(retrieved?.username).toBe('testuser');
    expect(retrieved?.role).toBe('SOPORTE_WP');
  });

  it('should create driver with user relation', async () => {
    const user = await prisma.user.create({
      data: {
        username: 'driveruser',
        passwordHash: 'hash',
        role: 'ADMIN_SISTEMAS'
      }
    });

    const driver = await prisma.hardwareDriver.create({
      data: {
        driverName: 'Test Driver',
        brand: 'Test',
        model: 'Model X',
        version: '1.0',
        hardwareType: 'USB',
        driveFileId: 'file-123',
        fileExtension: '.exe',
        fileSize: 1000,
        uploadedById: user.id
      }
    });

    const retrieved = await prisma.hardwareDriver.findUnique({
      where: { id: driver.id },
      include: { uploadedBy: true }
    });

    expect(retrieved?.uploadedBy?.username).toBe('driveruser');
  });
});
```

### Database Fixtures

**Fixtures para tests:**
```typescript
// test/fixtures/index.ts
import { PrismaClient } from '@prisma/client';

export async function seedTestData(prisma: PrismaClient) {
  // Create test users
  const admin = await prisma.user.create({
    data: {
      username: 'test-admin',
      passwordHash: '$2a$12$hashedpassword',
      role: 'ADMIN_SISTEMAS'
    }
  });

  const soporte = await prisma.user.create({
    data: {
      username: 'test-soporte',
      passwordHash: '$2a$12$hashedpassword',
      role: 'SOPORTE_WP'
    }
  });

  // Create test drivers
  await prisma.hardwareDriver.createMany({
    data: [
      {
        driverName: 'HP LaserJet Driver',
        brand: 'HP',
        model: 'LaserJet Pro',
        version: '1.0',
        hardwareType: 'IMPRESORA',
        driveFileId: 'file-1',
        fileExtension: '.exe',
        fileSize: 15000000,
        uploadedById: admin.id
      },
      {
        driverName: 'Canon Scanner Driver',
        brand: 'Canon',
        model: 'LiDE 300',
        version: '2.0',
        hardwareType: 'ESCANER',
        driveFileId: 'file-2',
        fileExtension: '.zip',
        fileSize: 5000000,
        uploadedById: soporte.id
      }
    ]
  });

  return { admin, soporte };
}

export async function cleanTestData(prisma: PrismaClient) {
  await prisma.hardwareDriver.deleteMany();
  await prisma.user.deleteMany();
}
```

## Scripts de Comandos

```json
{
  "scripts": {
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio",
    "db:reset": "prisma migrate reset"
  }
}
```

## Configuración Necesaria

### Dependencies
```json
{
  "dependencies": {
    "@prisma/client": "^5.10.0"
  },
  "devDependencies": {
    "prisma": "^5.10.0",
    "tsx": "^4.7.0"
  }
}
```

### Variables de Entorno
```env
DATABASE_URL="postgresql://user:password@localhost:5432/drivers_db?schema=public"
```

### Schema.prisma
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Models definition...
```

## Implementación Paso a Paso

1. **Instalar Prisma:**
   ```bash
   npm install prisma @prisma/client
   npx prisma init
   ```

2. **Definir schema:**
   - Crear modelos User y HardwareDriver
   - Definir enums UserRole y HardwareType
   - Configurar relaciones

3. **Generar cliente:**
   ```bash
   npx prisma generate
   ```

4. **Crear migrations:**
   ```bash
   npx prisma migrate dev --name init
   ```

5. **Implementar repositories:**
   - Crear interfaz IDriverRepository
   - Implementar PrismaDriverRepository
   - Implementar PrismaUserRepository

6. **Crear seeds:**
   - Script de seed con usuarios iniciales
   - Ejecutar seed

7. **Ejecutar tests:**
   ```bash
   npm test
   ```

## Links de Referencia

- [Prisma Documentation](https://www.prisma.io/docs/)
- [Prisma Schema](https://www.prisma.io/docs/orm/prisma-schema)
- [Prisma Client](https://www.prisma.io/docs/orm/prisma-client)
- [Prisma Migrations](https://www.prisma.io/docs/orm/prisma-migrations)
- [Prisma Seed](https://www.prisma.io/docs/orm/prisma-seeding)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## Validación

Para verificar la implementación:

```bash
# Generar cliente Prisma
npm run db:generate

# Aplicar schema a DB
npm run db:push

# Poblar datos de prueba
npm run db:seed

# Ejecutar tests
npm test

# Abrir Prisma Studio (desarrollo)
npm run db:studio
```