# ============================================================
# start-backend.ps1 - Levanta API + Admin Portal
# ============================================================
# Uso: .\deploy\start-backend.ps1
# Requiere: Ejecutar como Administrador
# Servicios: DriversAPI (5001) + DriversAdmin (5002)
# ============================================================

$ErrorActionPreference = "Stop"

$Services = @(
    @{ Name = "DriversAPI";   Port = 5001; HealthPath = "/health" },
    @{ Name = "DriversAdmin"; Port = 5002; HealthPath = "/" }
)

function Write-Header {
    param([string]$Message)
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host " $Message" -ForegroundColor Cyan
    Write-Host "========================================`n" -ForegroundColor Cyan
}

function Write-Success { param([string]$M) Write-Host "[OK] $M" -ForegroundColor Green }
function Write-Warn    { param([string]$M) Write-Host "[WARN] $M" -ForegroundColor Yellow }
function Write-Err     { param([string]$M) Write-Host "[ERROR] $M" -ForegroundColor Red }

function Test-Administrator {
    $principal = New-Object Security.Principal.WindowsPrincipal(
        [Security.Principal.WindowsIdentity]::GetCurrent()
    )
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Start-NSSMService {
    param([string]$Name)

    $svc = Get-Service -Name $Name -ErrorAction SilentlyContinue
    if (-not $svc) {
        Write-Err "Servicio '$Name' no encontrado. Ejecutar deploy.ps1 primero."
        return $false
    }

    if ($svc.Status -eq 'Running') {
        Write-Warn "$Name ya esta Running. Omitiendo inicio."
        return $true
    }

    Write-Host "  Iniciando $Name..." -ForegroundColor Gray
    & nssm start $Name 2>&1 | Out-Null

    # Esperar hasta Running
    $deadline = (Get-Date).AddSeconds(30)
    while ((Get-Date) -lt $deadline) {
        $svc = Get-Service -Name $Name -ErrorAction SilentlyContinue
        if ($svc -and $svc.Status -eq 'Running') {
            Write-Success "$Name esta Running"
            return $true
        }
        Start-Sleep -Seconds 2
    }

    Write-Err "$Name no alcanzo estado Running en 30s."
    return $false
}

function Test-ServiceHTTP {
    param([string]$Name, [int]$Port, [string]$Path, [int]$RetryCount = 6)

    $url = "http://localhost:$Port$Path"
    for ($i = 1; $i -le $RetryCount; $i++) {
        try {
            $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
            if ($r.StatusCode -lt 500) {
                Write-Success "$Name responde en $url (HTTP $($r.StatusCode))"
                return $true
            }
        } catch {
            Write-Host "  Intento $i/$RetryCount - $Name no responde aun..." -ForegroundColor Gray
            Start-Sleep -Seconds 5
        }
    }
    Write-Warn "$Name no responde en $url. Verificar en el Visor de Eventos."
    return $false
}

# ============================================================
# Principal
# ============================================================

Write-Header "Iniciando Backend - API + Admin Portal"

if (-not (Test-Administrator)) {
    Write-Err "Requiere permisos de administrador. Ejecutar PowerShell como Administrador."
    exit 1
}

if (-not (Get-Command nssm -ErrorAction SilentlyContinue)) {
    Write-Err "NSSM no encontrado en PATH. Ejecutar deploy.ps1 primero."
    exit 1
}

# Iniciar servicios
Write-Header "Iniciando servicios"

$allStarted = $true
foreach ($svc in $Services) {
    if (-not (Start-NSSMService -Name $svc.Name)) {
        $allStarted = $false
    }
}

# Verificar HTTP
Write-Header "Verificando respuesta HTTP"

foreach ($svc in $Services) {
    Test-ServiceHTTP -Name $svc.Name -Port $svc.Port -Path $svc.HealthPath | Out-Null
}

# Resumen
Write-Header "Estado final"

foreach ($svc in $Services) {
    $service = Get-Service -Name $svc.Name -ErrorAction SilentlyContinue
    $status  = if ($service) { $service.Status } else { "No encontrado" }
    $color   = if ($status -eq "Running") { "Green" } else { "Red" }
    Write-Host "  $($svc.Name): $status (Puerto $($svc.Port))" -ForegroundColor $color
}

Write-Host ""
Write-Host "URLs:" -ForegroundColor Cyan
Write-Host "  API:          http://localhost:5001" -ForegroundColor White
Write-Host "  Admin Portal: http://localhost:5002" -ForegroundColor White
Write-Host "  Swagger:      http://localhost:5001/docs" -ForegroundColor White
Write-Host ""
Write-Host "Visor de Eventos -> Registros de Windows -> Aplicacion" -ForegroundColor Gray
Write-Host "  Filtrar origen: DriversAPI | DriversAdmin" -ForegroundColor Gray

if (-not $allStarted) { exit 1 }
