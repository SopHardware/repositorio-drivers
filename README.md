# Repositorio de Drivers Boxito

Sistema de gestión y distribución de drivers de hardware con arquitectura de triple capa.

## Arquitectura

```mermaid
flowchart TB
    subgraph Capas_Públicas
        A[admin-portal<br/>Next.js:3002]
        P[public-repo<br/>Next.js:3000]
    end
    
    subgraph Capas_Core
        API[core-api<br/>Fastify:3001]
        DB[(PostgreSQL<br/>Prisma)]
        GD[Google Drive<br/>Storage]
    end
    
    A -->|JWT Auth| API
    P -->|Publico| API
    API --> DB
    API --> GD
    
    style A fill:#fff,stroke:#EA0B2A,stroke-width:2px
    style P fill:#fff,stroke:#EA0B2A,stroke-width:2px
    style API fill:#EA0B2A,stroke:#333,stroke-width:2px
    style DB fill:#e1f5fe,stroke:#0277bd
    style GD fill:#e8f5e9,stroke:#2e7d32
```

## Arquitectura de Datos

```mermaid
flowchart LR
    subgraph Flujo_Datos
        S[Upload<br/>Admin] --> API --> GD[Google Drive]
        R[Download<br/>Public] --> API --> GD
    end
    
    subgraph Capas
        P[Presentation<br/>Next.js]
        B[Business<br/>Fastify]
        D[Data<br/>Prisma]
    end
    
    P --> B
    B --> D
    
    style P fill:#fff,stroke:#EA0B2A
    style B fill:#EA0B2A,stroke:#333,color:#fff
    style D fill:#f3e5f5,stroke:#7b1fa2
```

## Paquetes

| Paquete | Descripción | Puerto |
|---------|-------------|--------|
| [core-api](./packages/core-api) | API REST - Nucleo del sistema | 3001 |
| [admin-portal](./packages/admin-portal) | Panel de administración | 3002 |
| [public-repo](./packages/public-repo) | Repositorio público | 3000 |

## Stack Tecnológico

- **Backend**: Node.js + Fastify + TypeScript
- **Base de Datos**: PostgreSQL + Prisma ORM
- **Auth**: JWT + bcryptjs
- **Storage**: Google Drive API (streams para archivos grandes)
- **Frontend**: Next.js 14 + React + Tailwind CSS

## Paleta de Colores

| Color | Hex | Uso |
|-------|-----|-----|
| Rojo Primario | `#EA0B2A` | Botones, logo, acentos |
| Fondo Principal | `#FFFCFD` | Fondo general |
| Negro Profundo | `#000000` | Títulos |
| Gris Soporte | `#6B7280` | Textos secundarios |
| Gris Borde | `#E5E7EB` | Divisores |
| Blanco Puro | `#FFFFFF` | Tarjetas |

##快速开始 (Quick Start)

```bash
# Instalar dependencias
npm install

# Configurar core-api
cd packages/core-api
cp .env.example .env
# Editar .env con tus credenciales

# Generar cliente Prisma y crear tablas
npm run db:push

# Poblar usuarios iniciales
npm run db:seed

# Iniciar desarrollo
npm run dev
```

## Desarrollo

```bash
# Iniciar todos los paquetes (requiere configuración previa)
npm run dev:core-api   # Puerto 3001
npm run dev:admin      # Puerto 3002
npm run dev:public     # Puerto 3000
```

## Estructura de Carpetas

```mermaid
graph TD
    R[repositorio-drivers] --> P[packages]
    P --> C[core-api]
    P --> A[admin-portal]
    P --> U[public-repo]
    
    C --> CP[prisma/]
    C --> CS[src/]
    CS --> SS[services/]
    CS --> SR[routes/]
    CS --> SI[interfaces/]
    CS --> SM[middleware/]
    CS --> SD[dto/]
    CS --> SU[utils/]
    
    style R font-weight:bold
    style C fill:#EA0B2A,color:#fff
    style A fill:#fff,stroke:#EA0B2A
    style U fill:#fff,stroke:#EA0B2A
```

## Modelo de Datos (Prisma)

```mermaid
erDiagram
    USER {
        string id PK
        string username UK
        string passwordHash
        string role
        datetime createdAt
        datetime updatedAt
    }
    
    HARDWARE_DRIVER {
        int id PK
        string driverName
        string brand
        string model
        string version
        string hardwareType
        string driveFileId
        string fileExtension
        int fileSize
        string uploadedById FK
        datetime createdAt
        datetime updatedAt
    }
    
    USER ||--o{ HARDWARE_DRIVER : uploads
```

## Flujo de Autenticación

```mermaid
sequenceDiagram
    participant U as Usuario
    participant A as admin-portal
    participant C as core-api
    
    U->>A: Login (username/password)
    A->>C: POST /auth/login
    C->>C: Verificar credenciales
    C->>A: JWT tokens
    A->>U: Sesión iniciada
    
    Note over U,A: Requests subsecuentes incluyen JWT
    U->>A: Request protegido
    A->>C: Request + Authorization header
    C->>C: Validar JWT
    C->>A: Response
```

## Usuarios Iniciales

Tras ejecutar el seed:

| Username | Password | Rol |
|----------|----------|-----|
| admin_sistemas | AdminSistemas2024! | ADMIN_SISTEMAS |
| soporte_wp | SoporteWP2024! | SOPORTE_WP |

## API Endpoints

### Autenticación
- `POST /auth/login` - Iniciar sesión
- `POST /auth/refresh` - Refrescar token

### Drivers
- `GET /drivers` - Listar (cursor pagination)
- `GET /drivers/:id` - Obtener por ID
- `POST /drivers` - Crear driver
- `PUT /drivers/:id` - Actualizar driver
- `DELETE /drivers/:id` - Eliminar driver
- `POST /drivers/upload` - Subir archivo
- `GET /drivers/:id/download` - Descargar (proxy)

### Usuarios (solo ADMIN_SISTEMAS)
- `GET /users` - Listar usuarios
- `POST /users` - Crear usuario
- `DELETE /users/:id` - Eliminar usuario

## Principios de Diseño

- **SOLID**: Patrones Repository, Service, Singleton
- **Zero Trust**: Solo core-api tiene acceso a DB y Google Drive
- **Open/Closed**: Interfaz IStorage para cambio de proveedor
- **Clean Code**: Componentes UI solo renderizan, lógica en services

## Licencia

© 2026 Soporte Técnico e Infraestructura.