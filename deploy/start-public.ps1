# ============================================================
# start-public.ps1 - Levanta Public Repo
# ============================================================
# Uso: .\deploy\start-public.ps1
# Requiere: Ejecutar como Administrador
# Servicio: DriversPublic (5003)
# ============================================================

$ErrorActionPreference = "Stop"

$ServiceName = "DriversPublic"
$ServicePort = 5003

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

# ============================================================
# Principal
# ============================================================

Write-Header "Iniciando Public Repo"

if (-not (Test-Administrator)) {
    Write-Err "Requiere permisos de administrador. Ejecutar PowerShell como Administrador."
    exit 1
}

if (-not (Get-Command nssm -ErrorAction SilentlyContinue)) {
    Write-Err "NSSM no encontrado en PATH. Ejecutar deploy.ps1 primero."
    exit 1
}

$svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if (-not $svc) {
    Write-Err "Servicio '$ServiceName' no encontrado. Ejecutar deploy.ps1 primero."
    exit 1
}

if ($svc.Status -eq 'Running') {
    Write-Warn "$ServiceName ya esta Running."
} else {
    Write-Host "  Iniciando $ServiceName..." -ForegroundColor Gray
    & nssm start $ServiceName 2>&1 | Out-Null

    # Esperar hasta Running
    $deadline = (Get-Date).AddSeconds(30)
    $running  = $false
    while ((Get-Date) -lt $deadline) {
        $svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
        if ($svc -and $svc.Status -eq 'Running') {
            $running = $true
            break
        }
        Start-Sleep -Seconds 2
    }

    if (-not $running) {
        Write-Err "$ServiceName no alcanzo estado Running en 30s."
        Write-Host "Revisar en Visor de Eventos -> Aplicacion -> Origen: DriversPublic" -ForegroundColor Yellow
        exit 1
    }

    Write-Success "$ServiceName esta Running"
}

# Verificar HTTP
Write-Header "Verificando respuesta HTTP"

$url = "http://localhost:$ServicePort"
$responded = $false
for ($i = 1; $i -le 6; $i++) {
    try {
        $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        if ($r.StatusCode -lt 500) {
            Write-Success "$ServiceName responde en $url (HTTP $($r.StatusCode))"
            $responded = $true
            break
        }
    } catch {
        Write-Host "  Intento $i/6 - $ServiceName no responde aun..." -ForegroundColor Gray
        Start-Sleep -Seconds 5
    }
}

if (-not $responded) {
    Write-Warn "$ServiceName no responde en $url. Verificar en el Visor de Eventos."
}

# Resumen
Write-Header "Estado final"

$svc    = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
$status = if ($svc) { $svc.Status } else { "No encontrado" }
$color  = if ($status -eq "Running") { "Green" } else { "Red" }
Write-Host "  $ServiceName: $status (Puerto $ServicePort)" -ForegroundColor $color
Write-Host ""
Write-Host "URL: http://localhost:$ServicePort" -ForegroundColor White
Write-Host ""
Write-Host "Visor de Eventos -> Registros de Windows -> Aplicacion" -ForegroundColor Gray
Write-Host "  Filtrar origen: DriversPublic" -ForegroundColor Gray
