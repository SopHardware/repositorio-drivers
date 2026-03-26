# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Monorepo (pnpm workspaces) for "Boxito" — a hardware driver distribution system. Three packages:

| Package | Tech | Dev Port | Prod Port |
|---------|------|----------|-----------|
| `packages/core-api` | Express.js + Prisma + TypeScript | 8000 | 5001 |
| `packages/admin-portal` | Next.js 14 + Tailwind | 3000 | 5002 |
| `packages/public-repo` | Next.js 14 + Tailwind | 3002 | 5003 |

Storage: PostgreSQL (metadata) + Google Drive API v3 (files). Deployment: IIS on Windows Server via `httpPlatformHandler`.

## Commands

### Development (from repo root)
```bash
npm run dev:core-api   # Express API on port 8000
npm run dev:admin      # Admin portal on port 3000
npm run dev:public     # Public repo on port 3002
```

### core-api
```bash
cd packages/core-api
npm run dev            # tsx watch
npm run build          # tsc → dist/
npm run start          # node dist/server.js
npm test               # Vitest (run once)
npm run test:watch     # Vitest watch mode
npm run test:coverage  # Coverage report (target >70%)
```

### Database (Prisma — run inside packages/core-api)
```bash
npm run db:generate    # Regenerate Prisma client
npm run db:migrate     # Create + apply migrations
npm run db:push        # Sync schema without migrations (dev only)
npm run db:seed        # Seed initial data
```

### Frontends (admin-portal / public-repo)
```bash
npm run dev            # Development server
npm run build          # Production build (standalone output for IIS)
npm run lint           # Next.js linting
```

### Deployment (Windows PowerShell)
```powershell
.\deploy\deploy.ps1 -Environment QA         # QA deployment
.\deploy\deploy.ps1 -Environment Production  # Production deployment
```

## Architecture

### Triple-Layer Separation (enforced — see prompt-maestro.md)

**`core-api` (ONLY this package can):**
- Connect to PostgreSQL via Prisma
- Call Google Drive API
- Issue/validate JWT tokens
- Protect routes by role
- Proxy file downloads (never expose Drive URLs directly)

**`admin-portal` / `public-repo` (frontends CANNOT):**
- Import `@prisma/client`
- Access the database directly
- Call Google Drive API
- Store credentials in code

Frontends communicate with `core-api` only via `fetch()`.

### User Roles
| Role | Access |
|------|--------|
| `ADMIN_SISTEMAS` | Full access: users + drivers |
| `SOPORTE_WP` | Driver CRUD only |
| `CONSULTA` | Read-only (not yet implemented) |

### Data Flow
- **Upload**: admin-portal → core-api → Google Drive + PostgreSQL record
- **Search**: public-repo → core-api → PostgreSQL (cursor-based pagination)
- **Download**: client → core-api → proxied Google Drive stream

### core-api Internal Structure
```
src/
  config/        # Swagger YAML, secrets path
  dto/           # Validation schemas (express-validator)
  interfaces/    # IRepository, IStorage contracts
  middleware/    # authMiddleware, requireRole
  repositories/  # PrismaRepository (DB access)
  routes/        # Express route handlers
  services/      # AuthService, PasswordHasher, GoogleDriveStorage
  utils/         # Error handling, logging
  server.ts      # Entry point
prisma/
  schema.prisma  # User + HardwareDriver models
```

## Key Constraints

- **No credentials in code** — use `.env` / `.env.local` exclusively
- **No Axios** — use native `fetch()` in all packages
- **No Sequelize / MongoDB / SQLite** — only Prisma + PostgreSQL
- **TypeScript strict mode** — no `any` without justification
- Before modifying a package, read the related skill doc in `docs/skills/`
- All new services require unit tests; all new endpoints require verification

## Commit Format

Conventional commits scoped to package:
```
feat(core-api): add download endpoint
fix(admin-portal): correct token refresh logic
chore(public-repo): update dependencies
```

## Design System

Brand color: `#EA0B2A` (Boxito red) — used for buttons, logo, accents. Background: `#FFFCFD`. Implemented via Tailwind CSS custom config.
