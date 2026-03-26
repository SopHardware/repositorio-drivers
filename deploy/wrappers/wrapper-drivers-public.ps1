# ============================================================
# Wrapper - Drivers Boxito Public Repo (public-repo)
# ============================================================
# Ejecutado por NSSM como proceso del servicio Windows.
# Lanza Node.js como proceso hijo y escribe TODOS los eventos
# al Visor de Eventos bajo Source="DriversPublic".
# NSSM no escribe directamente al Event Log.
# ============================================================

$EventSource    = "DriversPublic"
$EventLog       = "Application"
$AppDirectory   = "C:\inetpub\wwwroot\drivers-public"
$NodeArguments  = "node_modules\next\dist\bin\next start -p 5003"

# Registrar fuente en Event Log si no existe
if (-not [System.Diagnostics.EventLog]::SourceExists($EventSource)) {
    try {
        New-EventLog -LogName $EventLog -Source $EventSource
    } catch {
        # Puede fallar si ya existe en otro log — continuar
    }
}

function Write-AppEvent {
    param(
        [string]$Message,
        [ValidateSet("Information", "Warning", "Error")]
        [string]$EntryType = "Information",
        [int]$EventId = 1000
    )
    try {
        Write-EventLog -LogName $EventLog -Source $EventSource `
            -EventId $EventId -EntryType $EntryType -Message $Message
    } catch {
        # Silenciar fallos del Event Log para no interrumpir el servicio
    }
}

# Resolver ruta absoluta de node.exe (la cuenta SYSTEM puede no tener el PATH del usuario)
try {
    $NodeExecutable = (Get-Command node -ErrorAction Stop).Source
} catch {
    $candidates = @(
        "C:\Program Files\nodejs\node.exe",
        "C:\Program Files (x86)\nodejs\node.exe"
    )
    $NodeExecutable = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
    if (-not $NodeExecutable) {
        Write-AppEvent "No se encontro node.exe en PATH ni en rutas conocidas." -EntryType Error -EventId 9001
        exit 1
    }
}

Write-AppEvent "Servicio iniciando. node.exe: $NodeExecutable | Directorio: $AppDirectory" `
    -EntryType Information -EventId 1001

try {
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName               = $NodeExecutable
    $psi.Arguments              = $NodeArguments
    $psi.WorkingDirectory       = $AppDirectory
    $psi.UseShellExecute        = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError  = $true
    $psi.CreateNoWindow         = $true

    $proc = New-Object System.Diagnostics.Process
    $proc.StartInfo = $psi

    # stdout → Information en Event Log
    $proc.add_OutputDataReceived({
        param($sender, $e)
        if ($e.Data -and $e.Data.Trim()) {
            Write-AppEvent $e.Data -EntryType Information -EventId 1000
        }
    })

    # stderr → Error en Event Log
    $proc.add_ErrorDataReceived({
        param($sender, $e)
        if ($e.Data -and $e.Data.Trim()) {
            Write-AppEvent $e.Data -EntryType Error -EventId 2000
        }
    })

    $proc.Start() | Out-Null
    $proc.BeginOutputReadLine()
    $proc.BeginErrorReadLine()

    Write-AppEvent "Proceso Node.js iniciado. PID: $($proc.Id)" -EntryType Information -EventId 1002

    $proc.WaitForExit()

    $exitCode = $proc.ExitCode
    $entryType = if ($exitCode -eq 0) { "Information" } else { "Warning" }
    Write-AppEvent "Proceso terminado. Codigo de salida: $exitCode" -EntryType $entryType -EventId 1003

    exit $exitCode

} catch {
    Write-AppEvent "Error fatal en wrapper: $_" -EntryType Error -EventId 9999
    exit 1
}
