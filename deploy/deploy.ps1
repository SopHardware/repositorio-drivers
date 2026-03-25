# ============================================================
# Script de Despliegue - Drivers Boxito (IIS)
# ============================================================
# Uso: .\deploy.ps1 -Environment QA|Production
# Requiere: Ejecutar como Administrador
# ============================================================

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("QA", "Production")]
    [string]$Environment = "QA"
)

$ErrorActionPreference = "Stop"

# ============================================================
# Configuración
# ============================================================

$DeployRoot = "C:\inetpub\wwwroot"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

$Services = @(
    @{
        Name = "DriversAPI"
        DisplayName = "Drivers Boxito - API"
        SourceDir = Join-Path $ProjectRoot "packages\core-api"
        DeployDir = Join-Path $DeployRoot "drivers-api"
        NodePort = 5001
        Executable = "node.exe"
        Arguments = "dist\server.js"
    },
    @{
        Name = "DriversAdmin"
        DisplayName = "Drivers Boxito - Admin Portal"
        SourceDir = Join-Path $ProjectRoot "packages\admin-portal"
        DeployDir = Join-Path $DeployRoot "drivers-admin"
        NodePort = 5002
        Executable = "node.exe"
        Arguments = "node_modules\next\dist\bin\next start -p 5002"
    },
    @{
        Name = "DriversPublic"
        DisplayName = "Drivers Boxito - Public Repo"
        SourceDir = Join-Path $ProjectRoot "packages\public-repo"
        DeployDir = Join-Path $DeployRoot "drivers-public"
        NodePort = 5003
        Executable = "node.exe"
        Arguments = "node_modules\next\dist\bin\next start -p 5003"
    }
)

# ============================================================
# Funciones
# ============================================================

function Write-Header {
    param([string]$Message)
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host " $Message" -ForegroundColor Cyan
    Write-Host "========================================`n" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Test-NodeInstalled {
    try {
        $version = node --version
        Write-Success "Node.js instalado: $version"
        return $true
    } catch {
        Write-Error "Node.js no encontrado. Por favor instalar Node.js 18+"
        return $false
    }
}

function Test-PnpmInstalled {
    try {
        $version = pnpm --version
        Write-Success "pnpm instalado: $version"
        return $true
    } catch {
        Write-Error "pnpm no encontrado. Por favor instalar: npm install -g pnpm"
        return $false
    }
}

function Test-NSSMInstalled {
    try {
        $null = Get-Command nssm -ErrorAction Stop
        Write-Success "NSSM encontrado"
        return $true
    } catch {
        Write-Warning "NSSM no encontrado en PATH. Descargar de https://nssm.cc/download"
        return $false
    }
}

function Build-Application {
    param(
        [string]$Name,
        [string]$SourceDir
    )
    
    Write-Host "Compilando $Name..." -ForegroundColor Yellow
    
    Push-Location $SourceDir
    try {
        if ($Name -eq "DriversAPI") {
            pnpm run build
        } else {
            pnpm run build
        }
        Write-Success "$Name compilado correctamente"
    } catch {
        Write-Error "Error compilando ${Name} - $_"
        throw
    } finally {
        Pop-Location
    }
}

function Deploy-Application {
    param(
        [string]$Name,
        [string]$SourceDir,
        [string]$DeployDir
    )
    
    Write-Host "Desplegando $Name a $DeployDir..." -ForegroundColor Yellow
    
    # Crear directorio de despliegue
    if (-not (Test-Path $DeployDir)) {
        New-Item -ItemType Directory -Path $DeployDir -Force | Out-Null
    }
    
    # Copiar archivos
    if ($Name -eq "DriversAPI") {
        # Para Express.js, copiar dist, node_modules, package.json, .env
        $items = @("dist", "node_modules", "package.json", ".env", "src\config\secret")
    } else {
        # Para Next.js, copiar .next, node_modules, package.json, .env.local, public
        $items = @(".next", "node_modules", "package.json", ".env.local", "public")
    }
    
    foreach ($item in $items) {
        $source = Join-Path $SourceDir $item
        $dest = Join-Path $DeployDir $item
        
        if (Test-Path $source) {
            $destDir = Split-Path $dest -Parent
            if (-not (Test-Path $destDir)) {
                New-Item -ItemType Directory -Path $destDir -Force | Out-Null
            }
            
            if (Test-Path $source -PathType Container) {
                # Es un directorio, usar robocopy
                robocopy $source $dest /MIR /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
            } else {
                # Es un archivo
                Copy-Item $source $dest -Force
            }
        }
    }
    
    # Copiar web.config de IIS
    $webConfig = Join-Path $ProjectRoot "deploy\iis\$($Name.ToLower().Replace('drivers', ''))\web.config"
    if (Test-Path $webConfig) {
        Copy-Item $webConfig (Join-Path $DeployDir "web.config") -Force
    }
    
    Write-Success "$Name desplegado correctamente"
}

function Install-NSSMService {
    param(
        [string]$Name,
        [string]$DisplayName,
        [string]$DeployDir,
        [string]$Arguments
    )
    
    $nodePath = (Get-Command node).Source
    
    # Verificar si el servicio ya existe
    $existingService = Get-Service -Name $Name -ErrorAction SilentlyContinue
    
    if ($existingService) {
        Write-Warning "Servicio $Name ya existe. Deteniendo..."
        nssm stop $Name 2>$null
        nssm remove $Name confirm 2>$null
    }
    
    # Instalar servicio
    Write-Host "Instalando servicio $Name..." -ForegroundColor Yellow
    
    nssm install $Name $nodePath $Arguments
    nssm set $Name AppDirectory $DeployDir
    nssm set $Name DisplayName $DisplayName
    nssm set $Name Description "Servicio del sistema Drivers Boxito"
    nssm set $Name Start SERVICE_AUTO_START
    nssm set $Name AppStdout (Join-Path $DeployDir "logs\stdout.log")
    nssm set $Name AppStderr (Join-Path $DeployDir "logs\stderr.log")
    nssm set $Name AppRotateFiles 1
    nssm set $Name AppRotateBytes 10485760
    
    # Crear directorio de logs
    $logsDir = Join-Path $DeployDir "logs"
    if (-not (Test-Path $logsDir)) {
        New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
    }
    
    Write-Success "Servicio $Name instalado"
}

function Start-NSSMService {
    param([string]$Name)
    
    Write-Host "Iniciando servicio $Name..." -ForegroundColor Yellow
    
    try {
        nssm start $Name
        Start-Sleep -Seconds 3
        
        $status = nssm status $Name
        if ($status -eq "SERVICE_RUNNING") {
            Write-Success "Servicio $Name iniciado correctamente"
        } else {
            Write-Warning "Servicio $Name estado: $status"
        }
    } catch {
        Write-Error "Error iniciando servicio ${Name} - $_"
    }
}

# ============================================================
# Script Principal
# ============================================================

Write-Header "Despliegue Drivers Boxito - $Environment"

# Verificar permisos de administrador
if (-not (Test-Administrator)) {
    Write-Error "Este script requiere permisos de administrador"
    Write-Host "Por favor ejecutar PowerShell como Administrador"
    exit 1
}

# Verificar prerrequisitos
Write-Header "Verificando prerrequisitos"

$prerequisites = @(
    (Test-NodeInstalled),
    (Test-PnpmInstalled),
    (Test-NSSMInstalled)
)

if ($prerequisites -contains $false) {
    Write-Error "Prerrequisitos no cumplidos. Por favor instalar dependencias faltantes."
    exit 1
}

# Compilar aplicaciones
Write-Header "Compilando aplicaciones"

foreach ($service in $Services) {
    Build-Application -Name $service.Name -SourceDir $service.SourceDir
}

# Desplegar aplicaciones
Write-Header "Desplegando aplicaciones"

foreach ($service in $Services) {
    Deploy-Application -Name $service.Name -SourceDir $service.SourceDir -DeployDir $service.DeployDir
}

# Instalar servicios NSSM
Write-Header "Instalando servicios Windows"

foreach ($service in $Services) {
    $nodePath = (Get-Command node).Source
    Install-NSSMService -Name $service.Name -DisplayName $service.DisplayName -DeployDir $service.DeployDir -Arguments $service.Arguments
}

# Iniciar servicios
Write-Header "Iniciando servicios"

foreach ($service in $Services) {
    Start-NSSMService -Name $service.Name
}

# Verificar estado
Write-Header "Verificando estado de servicios"

foreach ($service in $Services) {
    $status = nssm status $service.Name 2>$null
    $port = $service.NodePort
    
    Write-Host "$($service.Name): $status (Puerto $port)" -ForegroundColor $(if ($status -eq "SERVICE_RUNNING") { "Green" } else { "Yellow" })
}

# Resumen
Write-Header "Despliegue completado"

Write-Host "URLs de acceso:" -ForegroundColor Cyan
Write-Host "  - API:          http://localhost:5001" -ForegroundColor White
Write-Host "  - Admin Portal: http://localhost:5002" -ForegroundColor White
Write-Host "  - Public Repo:  http://localhost:5003" -ForegroundColor White
Write-Host ""
Write-Host "Documentación API: http://localhost:5001/docs" -ForegroundColor White
Write-Host "Health Check:      http://localhost:5001/health" -ForegroundColor White
