# ============================================================
# Script de Despliegue - Drivers Boxito (NSSM)
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

$DeployRoot  = "C:\inetpub\wwwroot"
$WrapperRoot = "C:\ProgramData\DriversBoxito\wrappers"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

$Services = @(
    @{
        Name        = "DriversAPI"
        DisplayName = "Drivers Boxito - API"
        SourceDir   = Join-Path $ProjectRoot "packages\core-api"
        DeployDir   = Join-Path $DeployRoot "drivers-api"
        Port        = 5001
        EnvFile     = ".env"
        WrapperSrc  = Join-Path $ProjectRoot "deploy\wrappers\wrapper-drivers-api.ps1"
        WrapperDst  = Join-Path $WrapperRoot "wrapper-drivers-api.ps1"
        StopTimeout = 20000
    },
    @{
        Name        = "DriversAdmin"
        DisplayName = "Drivers Boxito - Admin Portal"
        SourceDir   = Join-Path $ProjectRoot "packages\admin-portal"
        DeployDir   = Join-Path $DeployRoot "drivers-admin"
        Port        = 5002
        EnvFile     = ".env.local"
        WrapperSrc  = Join-Path $ProjectRoot "deploy\wrappers\wrapper-drivers-admin.ps1"
        WrapperDst  = Join-Path $WrapperRoot "wrapper-drivers-admin.ps1"
        StopTimeout = 30000
    },
    @{
        Name        = "DriversPublic"
        DisplayName = "Drivers Boxito - Public Repo"
        SourceDir   = Join-Path $ProjectRoot "packages\public-repo"
        DeployDir   = Join-Path $DeployRoot "drivers-public"
        Port        = 5003
        EnvFile     = ".env.local"
        WrapperSrc  = Join-Path $ProjectRoot "deploy\wrappers\wrapper-drivers-public.ps1"
        WrapperDst  = Join-Path $WrapperRoot "wrapper-drivers-public.ps1"
        StopTimeout = 30000
    }
)

# ============================================================
# Funciones - Utilidades
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

function Write-Warn {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Err {
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
        Write-Err "Node.js no encontrado. Por favor instalar Node.js 18+"
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
        Write-Err "pnpm no encontrado. Por favor instalar: npm install -g pnpm"
        return $false
    }
}

# ============================================================
# Funciones - NSSM
# ============================================================

function Invoke-NSSM {
    param([string[]]$Arguments)
    $output = & nssm $Arguments 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "NSSM fallo (exit $LASTEXITCODE): nssm $($Arguments -join ' ')`n$output"
    }
    return $output
}

function Install-NSSM {
    # Intentar desde directorio tools del proyecto primero (sin internet)
    $localNssm = Join-Path $ProjectRoot "deploy\tools\nssm.exe"
    if (Test-Path $localNssm) {
        Copy-Item $localNssm "C:\Windows\System32\nssm.exe" -Force
        Write-Success "NSSM instalado desde deploy\tools\"
        return
    }

    # Descargar desde nssm.cc
    $nssmVersion = "2.24"
    $nssmZip     = "$env:TEMP\nssm-$nssmVersion.zip"
    $nssmExtract = "$env:TEMP\nssm-$nssmVersion"
    $nssmDest    = "C:\Windows\System32\nssm.exe"

    Write-Host "  Descargando NSSM $nssmVersion..." -ForegroundColor Gray
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri "https://nssm.cc/release/nssm-$nssmVersion.zip" `
            -OutFile $nssmZip -UseBasicParsing
        Expand-Archive -Path $nssmZip -DestinationPath $nssmExtract -Force

        $arch = if ([Environment]::Is64BitOperatingSystem) { "win64" } else { "win32" }
        $binary = Join-Path $nssmExtract "nssm-$nssmVersion\$arch\nssm.exe"
        Copy-Item $binary $nssmDest -Force

        Write-Success "NSSM $nssmVersion instalado en $nssmDest"
    } catch {
        throw "No se pudo instalar NSSM: $_`nInstalar manualmente desde https://nssm.cc/download y colocar nssm.exe en deploy\tools\"
    } finally {
        Remove-Item $nssmZip    -ErrorAction SilentlyContinue
        Remove-Item $nssmExtract -Recurse -ErrorAction SilentlyContinue
    }
}

function Test-NSSMAvailable {
    $nssm = Get-Command nssm -ErrorAction SilentlyContinue
    if ($nssm) {
        Write-Success "NSSM encontrado: $($nssm.Source)"
        return
    }
    Write-Warn "NSSM no encontrado. Instalando automaticamente..."
    Install-NSSM
    # Refrescar PATH tras instalacion
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + $env:Path
    if (-not (Get-Command nssm -ErrorAction SilentlyContinue)) {
        throw "NSSM no disponible despues de la instalacion."
    }
}

function Register-EventLogSources {
    $sources = @("DriversAPI", "DriversAdmin", "DriversPublic")
    foreach ($source in $sources) {
        if (-not [System.Diagnostics.EventLog]::SourceExists($source)) {
            try {
                New-EventLog -LogName Application -Source $source
                Write-Success "Fuente Event Log registrada: $source"
            } catch {
                Write-Warn "No se pudo registrar fuente '$source': $_"
            }
        } else {
            Write-Host "  Fuente '$source' ya registrada" -ForegroundColor Gray
        }
    }
}

function Get-EnvVarsForNSSM {
    param([string]$EnvFilePath)
    $vars = @()
    if (-not (Test-Path $EnvFilePath)) { return $vars }
    Get-Content $EnvFilePath | Where-Object {
        $_ -notmatch '^\s*#' -and $_ -match '='
    } | ForEach-Object {
        $vars += $_.Trim()
    }
    return $vars
}

function Stop-NSSMService {
    param([string]$Name)
    $svc = Get-Service -Name $Name -ErrorAction SilentlyContinue
    if (-not $svc) { return }

    Write-Host "  Deteniendo servicio $Name..." -ForegroundColor Gray
    & nssm stop $Name 2>&1 | Out-Null

    $deadline = (Get-Date).AddSeconds(15)
    while ((Get-Date) -lt $deadline) {
        $svc = Get-Service -Name $Name -ErrorAction SilentlyContinue
        if (-not $svc -or $svc.Status -eq 'Stopped') { break }
        Start-Sleep -Seconds 1
    }

    # Forzar parada si sigue corriendo
    $svc = Get-Service -Name $Name -ErrorAction SilentlyContinue
    if ($svc -and $svc.Status -ne 'Stopped') {
        & nssm stop $Name confirm 2>&1 | Out-Null
        Start-Sleep -Seconds 2
    }
    Write-Host "  Servicio $Name detenido" -ForegroundColor Gray
}

function Remove-NSSMService {
    param([string]$Name)
    $svc = Get-Service -Name $Name -ErrorAction SilentlyContinue
    if (-not $svc) { return }
    & nssm remove $Name confirm 2>&1 | Out-Null
    Write-Host "  Servicio $Name eliminado" -ForegroundColor Gray
}

function Install-NSSMService {
    param([hashtable]$Service)

    $psExe      = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
    $psArgs     = "-ExecutionPolicy Bypass -NonInteractive -NoProfile -File `"$($Service.WrapperDst)`""
    $envFile    = Join-Path $Service.DeployDir $Service.EnvFile

    Invoke-NSSM @("install", $Service.Name, $psExe)
    Invoke-NSSM @("set", $Service.Name, "AppParameters",    $psArgs)
    Invoke-NSSM @("set", $Service.Name, "AppDirectory",     $Service.DeployDir)
    Invoke-NSSM @("set", $Service.Name, "DisplayName",      $Service.DisplayName)
    Invoke-NSSM @("set", $Service.Name, "Description",      "Drivers Boxito - $($Service.Name) en puerto $($Service.Port)")
    Invoke-NSSM @("set", $Service.Name, "Start",            "SERVICE_AUTO_START")
    Invoke-NSSM @("set", $Service.Name, "AppExit",          "Default", "Restart")
    Invoke-NSSM @("set", $Service.Name, "AppRestartDelay",  "5000")
    Invoke-NSSM @("set", $Service.Name, "AppThrottle",      "30000")
    Invoke-NSSM @("set", $Service.Name, "AppStopMethodTimeout", "$($Service.StopTimeout)")

    # Variables de entorno desde .env desplegado
    $envVars = Get-EnvVarsForNSSM $envFile
    if ($envVars.Count -gt 0) {
        Invoke-NSSM (@("set", $Service.Name, "AppEnvironmentExtra") + $envVars)
    }

    Write-Success "Servicio $($Service.Name) instalado en NSSM"
}

function Update-NSSMService {
    param([hashtable]$Service)

    $psExe      = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
    $psArgs     = "-ExecutionPolicy Bypass -NonInteractive -NoProfile -File `"$($Service.WrapperDst)`""
    $envFile    = Join-Path $Service.DeployDir $Service.EnvFile

    Invoke-NSSM @("set", $Service.Name, "Application",      $psExe)
    Invoke-NSSM @("set", $Service.Name, "AppParameters",    $psArgs)
    Invoke-NSSM @("set", $Service.Name, "AppDirectory",     $Service.DeployDir)
    Invoke-NSSM @("set", $Service.Name, "AppStopMethodTimeout", "$($Service.StopTimeout)")

    $envVars = Get-EnvVarsForNSSM $envFile
    if ($envVars.Count -gt 0) {
        Invoke-NSSM (@("set", $Service.Name, "AppEnvironmentExtra") + $envVars)
    }

    Write-Success "Servicio $($Service.Name) actualizado en NSSM"
}

function Wait-ServiceRunning {
    param([string]$Name, [int]$TimeoutSeconds = 30)
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        $svc = Get-Service -Name $Name -ErrorAction SilentlyContinue
        if ($svc -and $svc.Status -eq 'Running') { return $true }
        Start-Sleep -Seconds 2
    }
    return $false
}

function Test-ServiceHTTP {
    param([string]$Name, [int]$Port, [int]$RetryCount = 6)
    $path = if ($Name -eq "DriversAPI") { "/health" } else { "/" }
    $url  = "http://localhost:$Port$path"

    for ($i = 1; $i -le $RetryCount; $i++) {
        try {
            $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
            if ($response.StatusCode -lt 500) {
                Write-Success "$Name responde en $url (HTTP $($response.StatusCode))"
                return $true
            }
        } catch {
            Write-Host "  Intento $i/$RetryCount - $Name no responde aun..." -ForegroundColor Gray
            Start-Sleep -Seconds 5
        }
    }
    Write-Warn "$Name no responde en $url despues de $RetryCount intentos. Verificar manualmente."
    return $false
}

# ============================================================
# Funciones - Build y Deploy
# ============================================================

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
            Write-Host "  Limpiando node_modules y cache pnpm..." -ForegroundColor Gray
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
        Write-Err "Error compilando ${Name} - $_"
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

    if (-not (Test-Path $DeployDir)) {
        New-Item -ItemType Directory -Path $DeployDir -Force | Out-Null
    }

    if ($Name -eq "DriversAPI") {
        $items = @("dist", "node_modules", "package.json", ".env", "src\config")
    } else {
        $items = @(".next", "node_modules", "package.json", ".env.local", "public")
    }

    foreach ($item in $items) {
        $source = Join-Path $SourceDir $item
        $dest   = Join-Path $DeployDir $item

        if (Test-Path $source) {
            $destDir = Split-Path $dest -Parent
            if (-not (Test-Path $destDir)) {
                New-Item -ItemType Directory -Path $destDir -Force | Out-Null
            }

            if (Test-Path $source -PathType Container) {
                robocopy $source $dest /MIR /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
            } else {
                Copy-Item $source $dest -Force
            }
        }
    }

    Write-Success "$Name desplegado correctamente"
}

# ============================================================
# Script Principal
# ============================================================

Write-Header "Despliegue Drivers Boxito - $Environment"

# 1. Verificar permisos de administrador
if (-not (Test-Administrator)) {
    Write-Err "Este script requiere permisos de administrador"
    Write-Host "Por favor ejecutar PowerShell como Administrador"
    exit 1
}

# 2. Verificar prerrequisitos
Write-Header "Verificando prerrequisitos"

$nodeInstalled = Test-NodeInstalled
$pnpmInstalled = Test-PnpmInstalled

if (-not $nodeInstalled -or -not $pnpmInstalled) {
    Write-Err "Prerrequisitos obligatorios no cumplidos. Por favor instalar Node.js y pnpm."
    exit 1
}

Test-NSSMAvailable

# 3. Crear directorio de wrappers
if (-not (Test-Path $WrapperRoot)) {
    New-Item -ItemType Directory -Path $WrapperRoot -Force | Out-Null
}

# 4. Registrar fuentes en Event Log
Write-Header "Registrando fuentes en Visor de Eventos"
Register-EventLogSources

# 5. Compilar aplicaciones
Write-Header "Compilando aplicaciones"

foreach ($service in $Services) {
    Build-Application -Name $service.Name -SourceDir $service.SourceDir
}

# 6. Para cada servicio: detener → desplegar → configurar → iniciar
Write-Header "Desplegando y configurando servicios"

foreach ($service in $Services) {
    Write-Host "`n--- $($service.Name) ---" -ForegroundColor Cyan

    $serviceExists = (Get-Service -Name $service.Name -ErrorAction SilentlyContinue) -ne $null

    # Detener ANTES de copiar archivos (evitar locks de Windows)
    if ($serviceExists) {
        Stop-NSSMService -Name $service.Name
    }

    # Copiar archivos compilados
    Deploy-Application -Name $service.Name -SourceDir $service.SourceDir -DeployDir $service.DeployDir

    # Copiar wrapper al destino de producción
    Copy-Item $service.WrapperSrc $service.WrapperDst -Force
    Write-Host "  Wrapper copiado a $($service.WrapperDst)" -ForegroundColor Gray

    # Instalar o actualizar servicio NSSM
    if ($serviceExists) {
        Update-NSSMService -Service $service
    } else {
        Install-NSSMService -Service $service
    }

    # Iniciar servicio
    Write-Host "  Iniciando $($service.Name)..." -ForegroundColor Gray
    & nssm start $service.Name 2>&1 | Out-Null

    # Verificar que el servicio Windows quedo Running
    if (Wait-ServiceRunning -Name $service.Name -TimeoutSeconds 30) {
        Write-Success "$($service.Name) esta Running"
    } else {
        Write-Warn "$($service.Name) no alcanzo estado Running en 30s. Revisar con: nssm status $($service.Name)"
    }
}

# 7. Verificar respuesta HTTP
Write-Header "Verificando respuesta HTTP"

foreach ($service in $Services) {
    Test-ServiceHTTP -Name $service.Name -Port $service.Port
}

# 8. Resumen
Write-Header "Despliegue completado"

Write-Host "Estado de servicios:" -ForegroundColor Cyan
foreach ($service in $Services) {
    $svc    = Get-Service -Name $service.Name -ErrorAction SilentlyContinue
    $status = if ($svc) { $svc.Status } else { "No encontrado" }
    $color  = if ($status -eq "Running") { "Green" } else { "Red" }
    Write-Host "  $($service.Name): $status (Puerto $($service.Port))" -ForegroundColor $color
}

Write-Host ""
Write-Host "URLs de acceso:" -ForegroundColor Cyan
Write-Host "  - API:          http://localhost:5001" -ForegroundColor White
Write-Host "  - Admin Portal: http://localhost:5002" -ForegroundColor White
Write-Host "  - Public Repo:  http://localhost:5003" -ForegroundColor White
Write-Host ""
Write-Host "Documentacion API:  http://localhost:5001/docs" -ForegroundColor White
Write-Host "Health Check:       http://localhost:5001/health" -ForegroundColor White
Write-Host ""
Write-Host "Gestion de servicios:" -ForegroundColor Cyan
Write-Host "  nssm status  DriversAPI|DriversAdmin|DriversPublic" -ForegroundColor White
Write-Host "  nssm stop    DriversAPI" -ForegroundColor White
Write-Host "  nssm start   DriversAPI" -ForegroundColor White
Write-Host "  nssm restart DriversAPI" -ForegroundColor White
Write-Host ""
Write-Host "Visor de Eventos:" -ForegroundColor Cyan
Write-Host "  eventvwr.msc -> Registros de Windows -> Aplicacion" -ForegroundColor White
Write-Host "  Filtrar por origen: DriversAPI | DriversAdmin | DriversPublic" -ForegroundColor White
