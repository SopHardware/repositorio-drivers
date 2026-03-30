# Boxito Deployment Script
# Despliega core-api, admin-portal y public-repo

$ErrorActionPreference = "Stop"

$ProjectRoot = "E:\Proyectos\ReposGitHub\repositorio-drivers"
$DeployRoot = "E:\Proyectos\ReposGitHub\repositorio-drivers\deploy"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Boxito Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Compilar proyectos
Write-Host "[1/7] Compilando proyectos..." -ForegroundColor Yellow
Set-Location $ProjectRoot\packages\core-api
npm run build
if ($LASTEXITCODE -ne 0) { throw "Error compilando core-api" }

Set-Location $ProjectRoot\packages\admin-portal
npm run build
if ($LASTEXITCODE -ne 0) { throw "Error compilando admin-portal" }

Set-Location $ProjectRoot\packages\public-repo
npm run build
if ($LASTEXITCODE -ne 0) { throw "Error compilando public-repo" }

Write-Host "Proyectos compilados correctamente" -ForegroundColor Green
Write-Host ""

# 2. Copiar archivos Core-API
Write-Host "[2/7] Copiando Core-API..." -ForegroundColor Yellow
robocopy "$ProjectRoot\packages\core-api\dist" 'C:\inetpub\wwwroot\drivers-api\dist' /MIR /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
robocopy "$ProjectRoot\packages\core-api\start.bat" 'C:\inetpub\wwwroot\drivers-api\start.bat' /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null

# Install dotenv if needed
Set-Location C:\inetpub\wwwroot\drivers-api
if (-not (Test-Path node_modules\dotenv)) {
    pnpm install dotenv --legacy-peer-deps
}

Write-Host "Core-API copiado" -ForegroundColor Green
Write-Host ""

# 3. Copiar Admin-Portal
Write-Host "[3/7] Copiando Admin-Portal..." -ForegroundColor Yellow
robocopy "$ProjectRoot\packages\admin-portal\.next" 'C:\inetpub\wwwroot\drivers-admin\.next' /MIR /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
robocopy "$ProjectRoot\packages\admin-portal\start.bat" 'C:\inetpub\wwwroot\drivers-admin\start.bat' /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
Write-Host "Admin-Portal copiado" -ForegroundColor Green
Write-Host ""

# 4. Copiar Public-Repo
Write-Host "[4/7] Copiando Public-Repo..." -ForegroundColor Yellow
robocopy "$ProjectRoot\packages\public-repo\.next" 'C:\inetpub\wwwroot\drivers-public\.next' /MIR /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
robocopy "$ProjectRoot\packages\public-repo\start.bat" 'C:\inetpub\wwwroot\drivers-public\start.bat' /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
Write-Host "Public-Repo copiado" -ForegroundColor Green
Write-Host ""

# 5. Agregar CORS para Public-Repo
Write-Host "[5/7] Configurando CORS..." -ForegroundColor Yellow
$envFile = "C:\inetpub\wwwroot\drivers-api\.env"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw
    if ($envContent -notmatch "PUBLIC_REPO_ORIGINS") {
        Add-Content $envFile "`nPUBLIC_REPO_ORIGINS=*"
        Write-Host "CORS configurado" -ForegroundColor Green
    } else {
        Write-Host "CORS ya configurado" -ForegroundColor Green
    }
}
Write-Host ""

# 6. Reinstalar servicios
Write-Host "[6/7] Reinstalando servicios..." -ForegroundColor Yellow

$services = @(
    @{ Name="DriversAPI"; Path="C:\inetpub\wwwroot\drivers-api"; Port="5001" },
    @{ Name="DriversAdmin"; Path="C:\inetpub\wwwroot\drivers-admin"; Port="5002" },
    @{ Name="DriversPublic"; Path="C:\inetpub\wwwroot\drivers-public"; Port="5003" }
)

foreach ($svc in $services) {
    Write-Host "Procesando $($svc.Name)..." -ForegroundColor Cyan
    
    # Stop
    & "$DeployRoot\nssm.exe" stop $svc.Name 2>$null
    Start-Sleep -Seconds 2
    
    # Remove
    & "$DeployRoot\nssm.exe" remove $svc.Name confirm 2>$null
    
    # Install
    Set-Location $svc.Path
    & "$DeployRoot\nssm.exe" install $svc.Name "E:\Program Files\nodejs\node.exe" "start.bat"
    & "$DeployRoot\nssm.exe" set $svc.Name AppDirectory $svc.Path
    
    # Start
    & "$DeployRoot\nssm.exe" start $svc.Name
    Start-Sleep -Seconds 5
    
    $status = & "$DeployRoot\nssm.exe" status $svc.Name
    if ($status -match "Running") {
        Write-Host "  $($svc.Name): Running" -ForegroundColor Green
    } else {
        Write-Host "  $($svc.Name): $status" -ForegroundColor Red
    }
}

Write-Host ""

# 7. Verificar
Write-Host "[7/7] Verificando servicios..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

$endpoints = @(
    @{ Url="http://localhost:5001/health"; Name="Core-API" },
    @{ Url="http://localhost:5002"; Name="Admin-Portal" },
    @{ Url="http://localhost:5003"; Name="Public-Repo" }
)

foreach ($ep in $endpoints) {
    try {
        $response = Invoke-WebRequest -Uri $ep.Url -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
        Write-Host "  $($ep.Name): $($response.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "  $($ep.Name): Error" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Despliegue completado" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
