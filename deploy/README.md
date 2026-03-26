# Despliegue Drivers Boxito - IIS

## Requisitos Previos

### Software Necesario

| Software | Versión | Descarga |
|----------|---------|----------|
| Windows Server | 2016+ o Windows 10/11 | - |
| IIS | Con rol Web Server | Windows Features |
| httpPlatformHandler | Última | https://www.iis.net/downloads/microsoft/httpplatformhandler |
| Node.js | 18+ | https://nodejs.org |
| pnpm | Última | `npm install -g pnpm` |

### Instalar httpPlatformHandler

1. Descargar de https://www.iis.net/downloads/microsoft/httpplatformhandler
2. Ejecutar el instalador
3. Reiniciar IIS: `iisreset`

### Habilitar IIS

1. Panel de Control -> Programas -> Activar o desactivar características de Windows
2. Marcar "Internet Information Services"
3. Aceptar y esperar la instalación

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

El script realizará las siguientes acciones:
1. Verificar prerrequisitos (Node.js, pnpm, IIS)
2. Compilar las 3 aplicaciones
3. Desplegar archivos a `C:\inetpub\wwwroot\`
4. Crear sitios en IIS con httpPlatformHandler
5. Reiniciar IIS

### 3. Verificar Sitios IIS

```powershell
# Verificar sitios creados
Get-Website | Where-Object {$_.Name -like "drivers*"}

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

## Gestión de Sitios IIS

### Desde IIS Manager

1. Abrir IIS Manager
2. Expandir el servidor
3. Click en "Sites"
4. Ver los sitios: `drivers-api`, `drivers-admin`, `drivers-public`

### Desde PowerShell

```powershell
# Ver sitios
Get-Website -Name "drivers*"

# Iniciar sitio
Start-Website -Name "drivers-api"

# Detener sitio
Stop-Website -Name "drivers-api"

# Reiniciar IIS completo
iisreset /restart
```

## Troubleshooting

### El sitio no inicia

1. Verificar logs en `C:\inetpub\wwwroot\drivers-api\logs\`
2. Verificar que el .env está configurado correctamente
3. Verificar que la base de datos está accesible
4. Verificar que httpPlatformHandler está instalado
5. Verificar en IIS Manager que el Application Pool está corriendo

### Error 500 - Internal Server Error

1. Revisar logs de stdout en `.\logs\stdout`
2. Verificar variables de entorno en el web.config
3. Verificar permisos de la carpeta de despliegue

### CORS Error

1. Verificar que los puertos 5002 y 5003 están en la lista de CORS en `server.ts`
2. Verificar que el core-api fue recompilado después del cambio

### Google Drive Error

1. Verificar que el archivo de credenciales existe en `src/config/secret/credentials.json`
2. Verificar que el `GOOGLE_DRIVE_FOLDER_ID` es correcto
3. Verificar que la Service Account tiene permisos en el Shared Drive

### httpPlatformHandler no funciona

1. Verificar que httpPlatformHandler está instalado
2. Verificar que el web.config tiene la configuración correcta
3. Reiniciar IIS: `iisreset`
4. Verificar que Node.js está en el PATH del sistema
