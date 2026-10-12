$ErrorActionPreference = "Continue"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

$Port = 3000
$ControllerPort = 3030

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  RemindFlow AI - Stop Server (Server OFF)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Try stopping cleanly via the Local Server Controller on port 3030
try {
    $res = Invoke-RestMethod -Uri "http://127.0.0.1:$ControllerPort/stop" -Method Post -TimeoutSec 4 -ErrorAction Stop
    if ($res.state -eq "STOPPED" -or -not $res.running) {
        Write-Host "[OK] RemindFlow AI server on port $Port stopped cleanly (Status: Stopped)." -ForegroundColor Green
        Write-Host "  -> To start the server again, run 'start-remindflow.bat' or click 'Start Server (Server ON)' at http://localhost:$ControllerPort" -ForegroundColor Gray
        exit 0
    }
} catch {
    # Fallback to direct port 3000 process termination
}

# 2. Direct port 3000 process check & stop
$existingConn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($null -ne $existingConn) {
    $procId = $existingConn.OwningProcess
    Write-Host "[STOPPING] Stopping RemindFlow AI server process on port $Port (PID: $procId)..." -ForegroundColor Yellow
    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
    Write-Host "[OK] RemindFlow AI server is now STOPPED (Server OFF)." -ForegroundColor Green
} else {
    Write-Host "[INFO] RemindFlow AI server is already STOPPED on port $Port." -ForegroundColor Green
}
Write-Host "  -> To start again, double-click 'start-remindflow.bat' or run 'npm run server:start'." -ForegroundColor Gray
Write-Host ""
exit 0
