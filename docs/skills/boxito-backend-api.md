# Skill: boxito-backend-api

## Descripción

Este skill proporciona una guía completa para implementar el backend del proyecto Boxito usando Fastify, TypeScript y Prisma. El skill sigue una arquitectura de triple capa con patrones SOLID.

## Pre-requisitos

- Node.js 18+
- npm o yarn
- PostgreSQL
- Conocimiento de TypeScript
- Conocimiento de APIs REST

## Técnicas de Programación

### 1. Fastify - Estructura y Configuración

**Decoradores de rutas:**
```typescript
fastify.get('/ruta', { schema: {...} }, handlerFunction)
fastify.post('/ruta', { schema: {...} }, handlerFunction)
```

**Plugins:**
```typescript
// Registrar plugins
fastify.register(require('@fastify/multipart'), { limits: {...} })
```

**Hooks:**
```typescript
// Hooks de lifecycle
fastify.addHook('onRequest', authMiddleware)
fastify.addHook('preHandler', validationHook)
```

**Schema Validation:**
```typescript
const schema = {
  body: z.object({ campo: z.string() }),
  querystring: z.object({ id: z.number() }),
  params: z.object({ id: z.string() })
}
```

### 2. TypeScript - Tipos y Patrones

**Interfaces para DTOs:**
```typescript
interface CreateDriverDTO {
  driverName: string;
  brand: string;
  model: string;
  hardwareType: HardwareType;
  driveFileId: string;
  fileSize: number;
}
```

**Generics para repositorios:**
```typescript
interface IRepository<T> {
  findById(id: number): Promise<T | null>;
  create(data: Partial<T>): Promise<T>;
  update(id: number, data: Partial<T>): Promise<T>;
  delete(id: number): Promise<void>;
}
```

**Module Resolution ESM:**
```typescript
// Usar extensiones .js en imports
import { driverRepository } from '../repositories/PrismaRepository.js';
```

### 3. Patrones de Diseño

**Singleton Pattern:**
```typescript
export class AuthService {
  private static instance: AuthService;
  
  private constructor() {}
  
  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }
}
```

**Repository Pattern:**
```typescript
export class PrismaDriverRepository implements IDriverRepository {
  private prisma: PrismaClient;
  
  async findAll(filters?: DriverFilters): Promise<HardwareDriver[]> {
    const where = this.buildWhereClause(filters);
    return this.prisma.hardwareDriver.findMany({ where });
  }
}
```

**Service Pattern:**
```typescript
export class AuthService {
  async login(username: string, password: string): Promise<AuthTokens> {
    const user = await userRepository.findByUsername(username);
    const isValid = await passwordHasher.compare(password, user.passwordHash);
    return this.generateTokens(user);
  }
}
```

### 4. JWT - Autenticación

**Estructura de tokens:**
```typescript
interface TokenPayload {
  userId: string;
  username: string;
  role: UserRole;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
```

**Generación de tokens:**
```typescript
const accessToken = jwt.sign({ ...payload, type: 'access' }, JWT_SECRET, {
  expiresIn: JWT_EXPIRES_IN
});
```

**Middleware de autenticación:**
```typescript
export const authMiddleware = async (request: FastifyRequest, reply: FastifyReply) => {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Token requerido');
  }
  const token = authHeader.substring(7);
  request.user = authService.verify(token);
};
```

**Protección por roles:**
```typescript
export const requireRole = (...allowedRoles: UserRole[]) => {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!allowedRoles.includes(request.user!.role)) {
      throw new ForbiddenError('No tienes permisos');
    }
  };
};
```

### 5. Prisma - ORM

**Schema definition:**
```prisma
model User {
  id        String   @id @default(cuid())
  username   String   @unique
  role      UserRole
  drivers   HardwareDriver[]
}

model HardwareDriver {
  id           Int      @id @default(autoincrement())
  driverName   String
  hardwareType HardwareType
  uploadedBy   User     @relation(fields: [uploadedById], references: [id])
}

enum UserRole {
  ADMIN_SISTEMAS
  SOPORTE_WP
  CONSULTA
}
```

**Consultas con filtros:**
```typescript
async findAllWithCursor(filters: DriverFilters, pagination: PaginationParams) {
  const where = this.buildWhereClause(filters);
  
  if (pagination.cursor) {
    where.OR = [
      { createdAt: { lt: pagination.cursor.createdAt } },
      { AND: [{ createdAt: pagination.cursor.createdAt }, { id: { lt: pagination.cursor.id } }] }
    ];
  }
  
  return this.prisma.hardwareDriver.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: pagination.limit + 1
  });
}
```

### 6. Manejo de Errores

**HttpError Classes:**
```typescript
export class HttpError extends Error {
  constructor(statusCode: number, message: string, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || this.getDefaultCode(statusCode);
  }
}

export class NotFoundError extends HttpError {
  constructor(resource: string) {
    super(404, `${resource} no encontrado`, 'NOT_FOUND');
  }
}
```

**Error Handler Global:**
```typescript
fastify.setErrorHandler((error, request, reply) => {
  if (error instanceof HttpError) {
    return reply.status(error.statusCode).send({
      success: false,
      error: { code: error.code, message: error.message }
    });
  }
  
  if (error.validation) {
    return reply.status(400).send({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos' }
    });
  }
  
  return reply.status(500).send({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Error interno' }
  });
});
```

## Testing con Vitest

### Configuración

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    }
  }
});
```

### Unit Tests - Services

**Test de PasswordHasher:**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PasswordHasher } from './PasswordHasher.js';

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed_password'),
    compare: vi.fn().mockResolvedValue(true)
  }
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
    const hash = await passwordHasher.hash('testPassword');
    expect(hash).toBe('hashed_password');
  });
  
  it('should compare password with hash', async () => {
    const result = await passwordHasher.compare('password', 'hash');
    expect(result).toBe(true);
  });
});
```

**Test de AuthService:**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from './AuthService.js';

vi.mock('jsonwebtoken');
vi.mock('../repositories/PrismaRepository.js', () => ({
  userRepository: { findByUsername: vi.fn() }
}));
vi.mock('./PasswordHasher.js', () => ({
  passwordHasher: { compare: vi.fn() }
}));

describe('AuthService', () => {
  let authService: AuthService;
  
  beforeEach(() => {
    vi.clearAllMocks();
    authService = AuthService.getInstance();
  });
  
  it('should generate tokens on login', async () => {
    const mockUser = { id: 'user-123', username: 'admin', passwordHash: 'hash', role: 'ADMIN_SISTEMAS' };
    (userRepository.findByUsername as any).mockResolvedValue(mockUser);
    (passwordHasher.compare as any).mockResolvedValue(true);
    (jwt.sign as any).mockReturnValue('mocked_token');
    
    const result = await authService.login('admin', 'password');
    
    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
  });
  
  it('should throw error for invalid credentials', async () => {
    (userRepository.findByUsername as any).mockResolvedValue(null);
    
    await expect(authService.login('invalid', 'password')).rejects.toThrow('Credenciales inválidas');
  });
  
  it('should verify valid token', () => {
    const mockPayload = { userId: 'user-123', username: 'admin', role: 'ADMIN_SISTEMAS' };
    (jwt.verify as any).mockReturnValue(mockPayload);
    
    const result = authService.verify('valid_token');
    expect(result).toEqual(mockPayload);
  });
});
```

### Unit Tests - Repositories

**Test de PrismaDriverRepository:**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrismaDriverRepository } from './PrismaRepository.js';

vi.mock('@prisma/client', () => {
  const mockPrismaClient = {
    hardwareDriver: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }
  };
  return { PrismaClient: vi.fn(() => mockPrismaClient) };
});

describe('PrismaDriverRepository', () => {
  let repository: PrismaDriverRepository;
  let mockPrisma: any;
  
  const mockDriver = {
    id: 1,
    driverName: 'HP Driver',
    brand: 'HP',
    hardwareType: 'IMPRESORA'
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
    const prismaClient = new PrismaClient();
    mockPrisma = prismaClient as any;
    repository = new PrismaDriverRepository();
  });
  
  it('should create a driver', async () => {
    mockPrisma.hardwareDriver.create.mockResolvedValue(mockDriver);
    
    const result = await repository.create({
      driverName: 'HP Driver',
      brand: 'HP',
      hardwareType: 'IMPRESORA',
      driveFileId: 'file-123',
      fileExtension: '.exe',
      fileSize: 1000,
      uploadedById: 'user-123'
    });
    
    expect(result).toEqual(mockDriver);
  });
  
  it('should find driver by id', async () => {
    mockPrisma.hardwareDriver.findUnique.mockResolvedValue(mockDriver);
    
    const result = await repository.findById(1);
    expect(result).toEqual(mockDriver);
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
  });
});
```

## Scripts de Testing

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

## Configuración Necesaria

### Dependencies
```json
{
  "dependencies": {
    "@prisma/client": "^5.10.0",
    "bcryptjs": "^2.4.3",
    "fastify": "^4.26.0",
    "jsonwebtoken": "^9.0.2",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "prisma": "^5.10.0",
    "typescript": "^5.3.0",
    "vitest": "^1.2.0"
  }
}
```

### Variables de Entorno
```env
DATABASE_URL="postgresql://user:password@localhost:5432/db"
JWT_SECRET="your-secret-key"
PORT=3001
```

## Implementación Paso a Paso

1. **Inicializar proyecto:**
   ```bash
   mkdir packages/core-api
   cd packages/core-api
   npm init -y
   npm install fastify typescript prisma @prisma/client bcryptjs jsonwebtoken zod
   npm install -D typescript vitest @types/node @types/bcryptjs @types/jsonwebtoken tsx
   ```

2. **Configurar TypeScript:**
   ```bash
   npx tsc --init
   ```

3. **Crear estructura de carpetas:**
   ```
   src/
   ├── services/
   ├── repositories/
   ├── interfaces/
   ├── routes/
   ├── middleware/
   ├── dto/
   └── utils/
   ```

4. **Implementar schema Prisma y generar cliente:**
   ```bash
   npx prisma init
   npx prisma generate
   ```

5. **Crear servicios base:**
   - PasswordHasher (Singleton)
   - AuthService (JWT)
   - Error classes

6. **Implementar repositories:**
   - PrismaDriverRepository
   - PrismaUserRepository

7. **Crear rutas y middleware:**
   - Routes de auth, drivers, users
   - Middleware de autenticación

8. **Configurar servidor:**
   - Registrar plugins
   - Registrar rutas
   - Configurar error handler

## Links de Referencia

- [Fastify Documentation](https://fastify.dev/)
- [Fastify Plugins](https://www.fastify.dev/docs/latest/Reference/Plugins/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Vitest Documentation](https://vitest.dev/)
- [JWT.io](https://jwt.io/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## Validación

Para verificar la implementación:

```bash
# Generar cliente Prisma
npm run db:generate

# Aplicar cambios a DB
npm run db:push

# Poblar datos iniciales
npm run db:seed

# Ejecutar tests
npm test

# Iniciar en desarrollo
npm run dev
```