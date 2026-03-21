# Repositorio Público - Boxito Drivers

Interfaz pública para buscar y descargar drivers.

## Configuración

1. Copiar `.env.local.example` a `.env.local`
2. Configurar `NEXT_PUBLIC_API_URL` con la URL del core-api

## Desarrollo

```bash
npm install
npm run dev
```

## Estructura

```
src/
├── app/               # Páginas Next.js App Router
│   ├── layout.tsx     # Layout principal con Header
│   ├── page.tsx       # Página de búsqueda
│   └── driver/[id]/   # Detalle del driver
├── components/
│   ├── layout/        # Header
│   ├── drivers/       # SearchBar, FilterBar, DriverCard
│   └── ui/            # Button, Input, Badge, Card
└── lib/
    └── api.ts         # Cliente API
```
