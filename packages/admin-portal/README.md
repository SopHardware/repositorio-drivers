# Admin Portal - Boxito Drivers

Panel de administración para gestionar drivers y usuarios.

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
├── app/
│   ├── login/page.tsx      # Login con diseño especificado
│   ├── page.tsx            # Dashboard con lista de drivers
│   ├── drivers/new/        # Crear driver
│   ├── drivers/[id]/edit/  # Editar driver
│   └── users/page.tsx      # Gestión de usuarios (solo ADMIN)
├── components/
│   ├── layout/Header.tsx  # Header con logo Boxito
│   └── ui/                 # Button, Input, Badge, Card
├── context/AuthContext.tsx # Auth con cookies
└── lib/api.ts             # Cliente API
```

## Roles

- **ADMIN_SISTEMAS**: Acceso total (users, drivers)
- **SOLICITUD_WP**: Solo drivers (crear/editar)
- **CONSULTA**: Solo ver (no implementado)