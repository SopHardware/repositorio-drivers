# Despliegue Drivers Boxito - NSSM

## Requisitos Previos

| Software | Versión | Notas |
|----------|---------|-------|
| Windows Server | 2016+ o Windows 10/11 | — |
| Node.js | 18+ | https://nodejs.org |
| pnpm | Última | `npm install -g pnpm` |
| NSSM | 2.24 | Auto-instalado por el script; o colocar `nssm.exe` en `deploy\tools\` |
| IIS + URL Rewrite + ARR | Opcional | Solo si se usa IIS como reverse proxy |

> **NSSM** (Non-Sucking Service Manager) gestiona los tres servicios Node.js como Windows Services. No se requiere httpPlatformHandler.

## Estructura de Archivos

```
deploy/
├── deploy.ps1                         # Script principal de despliegue
├── wrappers/
│   ├── wrapper-drivers-api.ps1        # Wrapper NSSM para core-api
│   ├── wrapper-drivers-admin.ps1      # Wrapper NSSM para admin-portal
│   └── wrapper-drivers-public.ps1     # Wrapper NSSM para public-repo
├── iis/
│   ├── core-api/web.config            # Reverse proxy IIS → puerto 5001 (opcional)
│   ├── admin-portal/web.config        # Reverse proxy IIS → puerto 5002 (opcional)
│   └── public-repo/web.config         # Reverse proxy IIS → puerto 5003 (opcional)
└── env-examples/
    ├── core-api.env.example
    ├── admin-portal.env.example
    └── public-repo.env.example
```

Los wrappers se copian automáticamente a `C:\ProgramData\DriversBoxito\wrappers\` durante el deploy.

## Instrucciones de Despliegue

### 1. Preparar Variables de Entorno

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
# Ejecutar PowerShell como Administrador
.\deploy\deploy.ps1 -Environment QA
```

El script realiza:
1. Verificar prerrequisitos (Node.js, pnpm, NSSM)
2. Instalar NSSM automáticamente si no está disponible
3. Registrar fuentes en el Visor de Eventos (DriversAPI, DriversAdmin, DriversPublic)
4. Compilar las 3 aplicaciones
5. Para cada servicio: detener → desplegar archivos → instalar/actualizar NSSM → iniciar
6. Verificar estado HTTP

### 3. Verificar Servicios

```powershell
# Estado de los tres servicios
Get-Service DriversAPI, DriversAdmin, DriversPublic

# Probar endpoints
Invoke-WebRequest http://localhost:5001/health -UseBasicParsing
Invoke-WebRequest http://localhost:5002 -UseBasicParsing
Invoke-WebRequest http://localhost:5003 -UseBasicParsing
```

## URLs de Acceso

| Servicio | URL |
|----------|-----|
| API | http://localhost:5001 |
| Admin Portal | http://localhost:5002 |
| Public Repo | http://localhost:5003 |
| Swagger UI | http://localhost:5001/docs |
| Health Check | http://localhost:5001/health |

## Gestión de Servicios NSSM

```powershell
# Estado de todos los servicios
Get-Service DriversAPI, DriversAdmin, DriversPublic

# Iniciar / detener / reiniciar un servicio
nssm start   DriversAPI
nssm stop    DriversAPI
nssm restart DriversAPI

# Ver configuración completa de un servicio
nssm dump DriversAPI

# Editar configuración con GUI
nssm edit DriversAPI
```

## Visor de Eventos

Todos los mensajes del servicio se registran bajo el nombre de la aplicación como fuente — no aparece "nssm".

```
eventvwr.msc
  └── Registros de Windows
        └── Aplicacion
              └── Filtrar origen: DriversAPI | DriversAdmin | DriversPublic
```

| EventId | Tipo | Descripción |
|---------|------|-------------|
| 1000 | Information | Línea de stdout de Node.js |
| 1001 | Information | Servicio iniciando |
| 1002 | Information | Proceso Node.js arrancó (incluye PID) |
| 1003 | Information/Warning | Proceso terminó (incluye exit code) |
| 2000 | Error | Línea de stderr de Node.js |
| 9001 | Error | No se encontró node.exe |
| 9999 | Error | Error fatal en el wrapper |

## Troubleshooting

### El servicio no inicia

```powershell
# Ver estado y último error
nssm status DriversAPI

# Ver logs del Visor de Eventos
Get-EventLog -LogName Application -Source DriversAPI -Newest 20

# Verificar que node.exe es accesible
(Get-Command node).Source
```

### Servicio en estado "Paused" o loop de reinicios

```powershell
# Ver conteo de reinicios
nssm dump DriversAPI

# Reiniciar manualmente
nssm stop DriversAPI
nssm start DriversAPI
```

### CORS Error

1. Verificar que los puertos 5002 y 5003 están en la lista de CORS en `server.ts`
2. Recompilar y redesplegar core-api

### Google Drive Error

1. Verificar que `src/config/secret/credentials.json` existe en el directorio desplegado
2. Verificar `GOOGLE_DRIVE_FOLDER_ID` en el `.env`
3. Verificar permisos de la Service Account en el Shared Drive

### node.exe no encontrado en cuenta SYSTEM

El wrapper resuelve la ruta de `node.exe` automáticamente. Si falla (EventId 9001):

```powershell
# Verificar que Node.js está en el PATH del sistema (no solo del usuario)
[System.Environment]::GetEnvironmentVariable("Path", "Machine")
# Si no aparece la ruta de Node.js, agregarla a las variables de sistema
```
