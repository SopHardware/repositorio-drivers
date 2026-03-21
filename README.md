# Repositorio Drivers Boxito - Monorepo

## Paquetes

- [core-api](./packages/core-api) - Nucleo del sistema (API, DB, Google Drive)
- [admin-portal](./packages/admin-portal) - Panel de administracion
- [public-repo](./packages/public-repo) - Repositorio publico

## Configuracion Global

```bash
npm install
cd packages/core-api
cp .env.example .env
# Editar .env con credenciales
npm run db:push
npm run db:seed
npm run dev
```
