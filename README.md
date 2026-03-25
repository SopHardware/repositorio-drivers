# Repositorio de Drivers Boxito

## Introducción

Repositorio de Drivers Boxito es un sistema integral de gestión y distribución de drivers de hardware diseñado para soportar la infraestructura de la organización. Este proyecto facilita el control centralizado de drivers de dispositivos, permitiendo a los equipos de soporte técnico almacenar, catalogar y distribuir drivers de forma eficiente.

### Objetivo

Proveer una plataforma centralizada y segura para:
- Almacenar drivers de hardware (impresoras, escáneres, tarjetas de red, etc.)
- Gestionar versiones y actualizaciones de drivers
- Facilitar la búsqueda y descarga de drivers por usuarios autorizados
- Mantener un historial de cambios y auditoría de uploads

### Alcance

El sistema cubre:
- **Gestión de Drivers**: CRUD completo con soporte para archivos adjuntos
- **Autenticación y Autorización**: Sistema de roles (ADMIN_SISTEMAS, SOPORTE_WP, CONSULTA)
- **Almacenamiento**: Integración con Google Drive para archivos grandes
- **Búsqueda**: Filtros por marca, modelo, tipo de hardware y texto libre
- **Paginación**: Sistema de cursor para listas largas
- **API RESTful**: Documentación interactiva con Swagger

### Propósito

- Reducir el tiempo de búsqueda de drivers en soporte técnico
- Centralizar la gestión de drivers de hardware
- Controlar el acceso mediante roles de usuario
- Mantener un registro de cambios y auditoría
- Facilitar la distribución de drivers a usuarios autorizados

## Arquitectura

```mermaid
flowchart TB
    subgraph Frontend
        A[admin-portal<br/>Next.js:3000]
        P[public-repo<br/>Next.js:3002]
    end
    
    subgraph Backend
        API[core-api<br/>Express.js:8000]
        DB[(PostgreSQL<br/>Prisma)]
        GD[Google Drive<br/>Storage]
    end
    
    A -->|JWT Auth| API
    P -->|API Key| API
    API --> DB
    API --> GD
```

## Stack Tecnológico

| Componente | Tecnología |
|------------|------------|
| Backend | Node.js + Express.js + TypeScript |
| Base de Datos | PostgreSQL + Prisma ORM |
| Auth | JWT + bcryptjs + API Keys |
| Security | helmet, express-rate-limit, cors |
| Storage | Google Drive API |
| Frontend | Next.js 14 + React + Tailwind CSS |

## Servicios y Puertos

| Servicio | Puerto | URL |
|----------|--------|-----|
| core-api | 8000 | http://localhost:8000 |
| admin-portal | 3000 | http://localhost:3000 |
| public-repo | 3002 | http://localhost:3002 |

## Requisitos Previos

- Node.js 18+
- pnpm (recomendado) o npm
- PostgreSQL

## Instalación y Configuración

### 1. Clonar repositorio e instalar dependencias

```bash
git clone <url-repositorio>
cd repositorio-drivers
pnpm install
```

### 2. Configurar core-api

```bash
cd packages/core-api
cp .env.example .env
```

Editar `.env` con tus credenciales:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/drivers_db"
JWT_SECRET="tu-jwt-secret-seguro"
GOOGLE_DRIVE_CREDENTIALS_PATH="ruta/a/credenciales.json"
GOOGLE_DRIVE_FOLDER_ID="tu-folder-id"
API_KEY_ADMIN_PORTAL="tu-admin-api-key"
API_KEY_PUBLIC_REPO="tu-public-api-key"
PORT=8000
```

### 3. Configurar admin-portal

```bash
cd packages/admin-portal
cp .env.local.example .env.local
```

Editar `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_PUBLIC_REPO_URL=http://localhost:3002
```

### 4. Configurar public-repo

```bash
cd packages/public-repo
cp .env.local.example .env.local
```

Editar `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_API_KEY=tu-public-api-key
```

### 5. Iniciar base de datos

```bash
cd packages/core-api
pnpm run db:push
pnpm run db:seed
```

### 6. Iniciar servicios

En 3 terminales diferentes:

```bash
# Terminal 1
cd packages/core-api
pnpm run dev

# Terminal 2
cd packages/admin-portal
pnpm run dev

# Terminal 3
cd packages/public-repo
pnpm run dev
```

## Seguridad Implementada

```mermaid
graph TD
    A[Request] --> B[Helmet]
    B --> C[Rate Limit /auth]
    C --> D[CORS]
    D --> E[JWT Auth]
    E --> F[API Key Auth]
    F --> G[Endpoint]
```

| Capa | Descripción |
|------|-------------|
| Helmet | Headers de seguridad HTTP |
| Rate Limit | 10 intentos login / 15 min |
| CORS | Solo orígenes permitidos |
| JWT | Token de autenticación admin |
| API Keys | Acceso public-repo |

## Documentación de API

- **Swagger UI**: http://localhost:8000/docs
- **Health check**: http://localhost:8000/health

## Flujo de Autenticación

```mermaid
sequenceDiagram
    participant U as Usuario
    participant A as admin-portal
    participant C as core-api
    
    U->>A: Login (username/password)
    A->>C: POST /auth/login
    C->>A: JWT tokens
    A->>U: Sesión iniciada
    Note over A: Si token expira
    A->>C: POST /auth/refresh
    C->>A: Nuevo access token
```

## Licencia

© 2026 Soporte Técnico e Infraestructura.
