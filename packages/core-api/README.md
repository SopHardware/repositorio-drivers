# Core API - Paquete del Nucleo

Este paquete contiene el nucleo del sistema de repositorio de drivers.

## Estructura

```
src/
  interfaces/   # Contratos (IRepository)
  repositories/ # Implementaciones Prisma
  services/      # Logica de negocio (PasswordHasher)
  config/        # Configuraciones
  utils/         # Utilidades
```

## Configuracion

1. Copiar `.env.example` a `.env`
2. Configurar `DATABASE_URL` con la conexion PostgreSQL
3. Configurar credenciales de Google Drive

## Comandos

```bash
npm run db:generate   # Generar cliente Prisma
npm run db:push       # Sincronizar esquema con DB
npm run db:seed       # Poblar usuarios iniciales
npm run dev           # Iniciar en desarrollo
```
