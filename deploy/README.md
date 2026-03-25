# Despliegue Drivers Boxito - IIS

## Requisitos Previos

### Software Necesario

| Software | Versión | Descarga |
|----------|---------|----------|
| Windows Server | 2016+ o Windows 10/11 | - |
| IIS | Con rol Web Server | Windows Features |
| Node.js | 18+ | https://nodejs.org |
| pnpm | Última | `npm install -g pnpm` |
| NSSM | Última | https://nssm.cc/download |
| URL Rewrite | Última | https://www.iis.net/downloads/microsoft/url-rewrite |
| ARR | Última | https://www.iis.net/downloads/microsoft/application-request-routing |

### Habilitar ARR en IIS

1. Abrir IIS Manager
2. Seleccionar el servidor (nivel superior)
3. Doble clic en "Application Request Routing Cache"
4. Click en "Server Proxy Settings..."
5. Marcar "Enable proxy"
6. Click en "Apply"

## Estructura de Archivos

```
deploy/
├── deploy.ps1                    # Script principal de despliegue
├── iis/
│   ├── core-api/web.config       # Configuración IIS para API
│   ├── admin-portal/web.config   # Configuración IIS para Admin
│   └── public-repo/web.config    # Configuración IIS para Public
└── env-examples/
    ├── core-api.env.example      # Variables de entorno API
    ├── admin-portal.env.example  # Variables de entorno Admin
    └── public-repo.env.example   # Variables de entorno Public
```

## Instrucciones de Despliegue

### 1. Preparar Variables de Entorno

Copiar los archivos .env.example a .env y configurar:

```powershell
# Core API
Copy-Item deploy\env-examples\core-api.env.example packages\core-api\.env
# Editar packages\core-api\.env con valores reales

# Admin Portal
Copy-Item deploy\env-examples\admin-portal.env.example packages\admin-portal\.env.local
# Editar packages\admin-portal\.env.local con valores reales

# Public Repo
Copy-Item deploy\env-examples\public-repo.env.example packages\public-repo\.env.local
# Editar packages\public-repo\.env.local con valores reales
```

### 2. Ejecutar Script de Despliegue

```powershell
# Ejecutar como Administrador
.\deploy\deploy.ps1 -Environment QA
```

### 3. Verificar Servicios

```powershell
# Verificar estado
nssm status DriversAPI
nssm status DriversAdmin
nssm status DriversPublic

# Verificar puertos
netstat -ano | findstr :5001
netstat -ano | findstr :5002
netstat -ano | findstr :5003

# Probar endpoints
curl http://localhost:5001/health
curl http://localhost:5002
curl http://localhost:5003
```

## URLs de Acceso

| Servicio | URL |
|----------|-----|
| API | http://localhost:5001 |
| Admin Portal | http://localhost:5002 |
| Public Repo | http://localhost:5003 |
| Swagger UI | http://localhost:5001/docs |
| Health Check | http://localhost:5001/health |

## Comandos Útiles NSSM

```powershell
# Ver estado de todos los servicios
nssm status DriversAPI
nssm status DriversAdmin
nssm status DriversPublic

# Reiniciar un servicio
nssm restart DriversAPI

# Detener un servicio
nssm stop DriversAPI

# Ver logs
nssm get DriversAPI AppStdout
nssm get DriversAPI AppStderr

# Eliminar servicio
nssm remove DriversAPI confirm
```

## Troubleshooting

### El servicio no inicia

1. Verificar logs en `C:\inetpub\wwwroot\drivers-api\logs\`
2. Verificar que el .env está configurado correctamente
3. Verificar que la base de datos está accesible
4. Verificar que el puerto no está en uso: `netstat -ano | findstr :5001`

### CORS Error

1. Verificar que los puertos 5002 y 5003 están en la lista de CORS en `server.ts`
2. Verificar que el core-api fue recompilado después del cambio

### Google Drive Error

1. Verificar que el archivo de credenciales existe en `src/config/secret/credentials.json`
2. Verificar que el `GOOGLE_DRIVE_FOLDER_ID` es correcto
3. Verificar que la Service Account tiene permisos en el Shared Drive

### IIS Reverse Proxy no funciona

1. Verificar que URL Rewrite está instalado
2. Verificar que ARR está habilitado (Enable proxy)
3. Verificar que el web.config está en la carpeta correcta
4. Reiniciar IIS: `iisreset`
