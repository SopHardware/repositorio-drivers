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

# Refrescar variables de entorno (PATH)
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

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
        IISAppName = "drivers-api"
        Port = 5001
    },
    @{
        Name = "DriversAdmin"
        DisplayName = "Drivers Boxito - Admin Portal"
        SourceDir = Join-Path $ProjectRoot "packages\admin-portal"
        DeployDir = Join-Path $DeployRoot "drivers-admin"
        IISAppName = "drivers-admin"
        Port = 5002
    },
    @{
        Name = "DriversPublic"
        DisplayName = "Drivers Boxito - Public Repo"
        SourceDir = Join-Path $ProjectRoot "packages\public-repo"
        DeployDir = Join-Path $DeployRoot "drivers-public"
        IISAppName = "drivers-public"
        Port = 5003
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
        $null = Get-Command pnpm -ErrorAction Stop
        $version = (pnpm --version).Trim()
        Write-Success "pnpm instalado: $version"
        return $true
    } catch {
        Write-Error "pnpm no encontrado. Por favor instalar: npm install -g pnpm"
        return $false
    }
}

function Test-IISInstalled {
    try {
        $null = Get-Command Get-IISSite -ErrorAction Stop
        Write-Success "IIS PowerShell module encontrado"
        return $true
    } catch {
        try {
            # Verificar si IIS está instalado
            $iisFeature = Get-WindowsFeature -Name Web-Server -ErrorAction Stop
            if ($iisFeature.Installed) {
                Write-Success "IIS instalado"
                return $true
            }
        } catch {
            Write-Warning "No se pudo verificar IIS. Continuando..."
            return $true
        }
    }
    return $true
}

function Build-Application {
    param(
        [string]$Name,
        [string]$SourceDir
    )
    
    Write-Host "Compilando $Name..." -ForegroundColor Yellow
    
    Push-Location $SourceDir
    try {
        # Para paquetes Next.js, reinstalar con --shamefully-hoist y limpiar caché
        if ($Name -ne "DriversAPI") {
            Write-Host "  Limpiando node_modules y caché pnpm..." -ForegroundColor Gray
            Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
            Remove-Item -Force "pnpm-lock.yaml" -ErrorAction SilentlyContinue
            pnpm store prune | Out-Null
            Write-Host "  Reinstalando dependencias..." -ForegroundColor Gray
            pnpm install --shamefully-hoist
        }
        
        Write-Host "  Ejecutando build..." -ForegroundColor Gray
        pnpm run build
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
    
    # Crear directorio de logs
    $logsDir = Join-Path $DeployDir "logs"
    if (-not (Test-Path $logsDir)) {
        New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
    }
    
    # Copiar archivos
    if ($Name -eq "DriversAPI") {
        # Para Express.js, copiar dist, node_modules, package.json, .env, config
        $items = @("dist", "node_modules", "package.json", ".env", "src\config")
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

function Create-IISSite {
    param(
        [string]$Name,
        [string]$DeployDir,
        [string]$IISAppName,
        [int]$Port
    )
    
    Write-Host "Configurando IIS Site: $IISAppName en puerto $Port..." -ForegroundColor Yellow
    
    try {
        Import-Module WebAdministration -ErrorAction Stop
        
        # Verificar si el sitio ya existe
        $existingSite = Get-Website -Name $IISAppName -ErrorAction SilentlyContinue
        
        if ($existingSite) {
            Write-Warning "Sitio $IISAppName ya existe. Deteniendo..."
            Stop-Website -Name $IISAppName -ErrorAction SilentlyContinue
            Remove-Website -Name $IISAppName -ErrorAction SilentlyContinue
        }
        
        # Crear Application Pool
        $poolName = "$IISAppName-pool"
        $existingPool = Get-IISAppPool -Name $poolName -ErrorAction SilentlyContinue
        
        if ($existingPool) {
            Remove-WebAppPool -Name $poolName -ErrorAction SilentlyContinue
        }
        
        New-WebAppPool -Name $poolName
        Set-ItemProperty "IIS:\AppPools\$poolName" -Name "managedRuntimeVersion" -Value ""
        Set-ItemProperty "IIS:\AppPools\$poolName" -Name "startMode" -Value "AlwaysRunning"
        
        # Crear sitio web
        New-Website -Name $IISAppName -PhysicalPath $DeployDir -Port $Port -ApplicationPool $poolName
        
        # Iniciar el sitio
        Start-Website -Name $IISAppName
        
        Write-Success "Sitio IIS $IISAppName creado y configurado"
        return $true
    } catch {
        Write-Error "Error configurando IIS Site ${IISAppName} - $_"
        return $false
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

$nodeInstalled = Test-NodeInstalled
$pnpmInstalled = Test-PnpmInstalled
$iisInstalled = Test-IISInstalled

if (-not $nodeInstalled -or -not $pnpmInstalled) {
    Write-Error "Prerrequisitos obligatorios no cumplidos. Por favor instalar Node.js y pnpm."
    exit 1
}

if (-not $iisInstalled) {
    Write-Warning "No se pudo verificar IIS. Asegúrese de que IIS esté instalado."
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

# Configurar IIS Sites
Write-Header "Configurando IIS Sites"

foreach ($service in $Services) {
    Create-IISSite -Name $service.Name -DeployDir $service.DeployDir -IISAppName $service.IISAppName -Port $service.Port
}

# Reiniciar IIS
Write-Header "Reiniciando IIS"

try {
    iisreset /restart | Out-Null
    Write-Success "IIS reiniciado correctamente"
} catch {
    Write-Warning "No se pudo reiniciar IIS automáticamente. Reiniciar manualmente con: iisreset"
}

# Verificar estado
Write-Header "Verificando estado de sitios"

foreach ($service in $Services) {
    try {
        Import-Module WebAdministration -ErrorAction Stop
        $site = Get-Website -Name $service.IISAppName -ErrorAction SilentlyContinue
        if ($site) {
            $status = $site.State
            Write-Host "$($service.IISAppName): $status (Puerto $($service.Port))" -ForegroundColor $(if ($status -eq "Started") { "Green" } else { "Yellow" })
        } else {
            Write-Host "$($service.IISAppName): No encontrado" -ForegroundColor Red
        }
    } catch {
        Write-Warning "No se pudo verificar el estado de $($service.IISAppName)"
    }
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
Write-Host ""
Write-Host "Administrar sitios IIS:" -ForegroundColor Cyan
Write-Host "  - IIS Manager -> Sites" -ForegroundColor White
Write-Host "  - Reiniciar: iisreset" -ForegroundColor White
