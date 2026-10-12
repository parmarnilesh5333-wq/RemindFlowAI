param(
    [switch]$NoBrowser,
    [switch]$Background
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

$Port = 3000
$AppUrl = "http://localhost:$Port"
$DashboardUrl = "http://localhost:$Port/dashboard"
$LogFile = Join-Path $ProjectRoot "remindflow-server.log"
$ErrLogFile = Join-Path $ProjectRoot "remindflow-server.err.log"

# Detect local Wi-Fi / LAN IPv4 address for same-network phone/tablet access
$LanIp = $null
try {
    $LanIp = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" -and $_.PrefixOrigin -ne "WellKnown" } |
        Select-Object -First 1).IPAddress
} catch {}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  RemindFlow AI - Startup & Health Check Launcher" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Project Directory : $ProjectRoot" -ForegroundColor Gray
Write-Host "Consistent URL    : $AppUrl" -ForegroundColor Gray
if ($LanIp) {
    Write-Host "Same-WiFi URL     : http://${LanIp}:${Port}" -ForegroundColor Gray
}
Write-Host "Simulation Mode   : ENABLED (Safe Sandbox - No live messages)" -ForegroundColor Green
Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray

# 1. Verify Node.js and npm are installed
try {
    $nodeVersion = & node -v 2>$null
    $npmVersion = & npm.cmd -v 2>$null
    Write-Host "[OK] Node.js ($nodeVersion) and npm (v$npmVersion) detected." -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js or npm was not found in your system PATH." -ForegroundColor Red
    Write-Host "Please install Node.js LTS from https://nodejs.org/ and restart your terminal." -ForegroundColor Yellow
    exit 1
}

# 2. Verify .env file exists (never overwrite existing .env)
$envPath = Join-Path $ProjectRoot ".env"
$envExamplePath = Join-Path $ProjectRoot ".env.example"
if (-not (Test-Path $envPath)) {
    if (Test-Path $envExamplePath) {
        Write-Host "[INFO] .env file missing. Copying safe defaults from .env.example..." -ForegroundColor Yellow
        Copy-Item $envExamplePath $envPath
        Write-Host "[OK] Created .env with Simulation Mode defaults." -ForegroundColor Green
    } else {
        Write-Host "[WARNING] No .env file found. Creating safe default .env..." -ForegroundColor Yellow
        @(
            'DATABASE_URL="file:./dev.db"',
            'APP_URL="http://localhost:3000"',
            'NODE_ENV="development"',
            'NEXT_PUBLIC_APP_NAME="RemindFlow AI"'
        ) | Set-Content -Path $envPath -Encoding UTF8
    }
} else {
    Write-Host "[OK] Environment configuration (.env) found." -ForegroundColor Green
}

# 3. Check for missing dependencies (node_modules)
$nodeModulesPath = Join-Path $ProjectRoot "node_modules"
$nextBinPath = Join-Path $ProjectRoot "node_modules\next\dist\bin\next"
if (-not (Test-Path $nodeModulesPath) -or -not (Test-Path $nextBinPath)) {
    Write-Host "[INFO] Dependencies are missing or incomplete. Running 'npm.cmd install'..." -ForegroundColor Yellow
    & npm.cmd install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] 'npm install' failed. Check your internet connection and try again." -ForegroundColor Red
        exit 1
    }
    Write-Host "[INFO] Ensuring Prisma client is generated..." -ForegroundColor Yellow
    & npx.cmd prisma generate
    Write-Host "[OK] Dependencies installed successfully." -ForegroundColor Green
} else {
    Write-Host "[OK] Project dependencies (node_modules) verified." -ForegroundColor Green
}

# 4. Check if SQLite database exists (Preserve all existing data; never reset)
$dbPath = Join-Path $ProjectRoot "prisma\dev.db"
if (Test-Path $dbPath) {
    Write-Host "[OK] Existing SQLite database (prisma/dev.db) preserved." -ForegroundColor Green
} else {
    Write-Host "[INFO] Initializing SQLite schema (prisma/dev.db)..." -ForegroundColor Yellow
    & npx.cmd prisma db push
}

# 5. Helper function to test if RemindFlow AI is responding on http://localhost:3000
function Test-RemindFlowServer {
    try {
        $response = Invoke-WebRequest -Uri "$AppUrl/api/health" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        return ($response.StatusCode -eq 200)
    } catch {
        return $false
    }
}

# 5b. Ensure Local Server Controller (http://localhost:3030) is running for Browser Start/Stop controls
$ControllerPort = 3030
$ControllerUrl = "http://localhost:$ControllerPort"
$ControllerScript = Join-Path $ProjectRoot "scripts\server-controller.mjs"
if (Test-Path $ControllerScript) {
    $controllerListening = Get-NetTCPConnection -LocalPort $ControllerPort -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($null -eq $controllerListening) {
        Start-Process -FilePath "node" -ArgumentList "`"$ControllerScript`"" -WorkingDirectory $ProjectRoot -WindowStyle Hidden | Out-Null
        Start-Sleep -Milliseconds 500
    }
    Write-Host "[OK] Local Server Controller active at $ControllerUrl (enables browser Server ON / OFF)." -ForegroundColor Green
}

# 6. Check if server is already responding OR if port 3000 is held to prevent duplicate processes
if (Test-RemindFlowServer) {
    Write-Host ""
    Write-Host "[READY] RemindFlow AI is ALREADY running! No duplicate server started." -ForegroundColor Green
    Write-Host "  -> Landing Page   : $AppUrl" -ForegroundColor White
    Write-Host "  -> Dashboard      : $DashboardUrl" -ForegroundColor White
    Write-Host "  -> Server Control : $ControllerUrl" -ForegroundColor White
    if ($LanIp) {
        Write-Host "  -> Same Wi-Fi     : http://${LanIp}:${Port}" -ForegroundColor Gray
    }
    Write-Host ""
    if (-not $NoBrowser) {
        Write-Host "Opening $AppUrl in your default browser..." -ForegroundColor Cyan
        Start-Process $AppUrl
    }
    exit 0
}

$existingConn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($null -ne $existingConn) {
    $procId = $existingConn.OwningProcess
    Write-Host "[WARNING] Port $Port is held by an unresponsive process (PID $procId). Reclaiming port $Port..." -ForegroundColor Yellow
    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# 7. Start the Next.js development server on consistent port 3000
Write-Host "[STARTING] Launching RemindFlow AI server on $AppUrl..." -ForegroundColor Cyan

if ($Background) {
    $proc = Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev", "--", "-H", "0.0.0.0", "-p", "$Port" -WorkingDirectory $ProjectRoot -RedirectStandardOutput $LogFile -RedirectStandardError $ErrLogFile -WindowStyle Hidden -PassThru
    Write-Host "[INFO] Background server process started (PID: $($proc.Id)). Waiting for readiness..." -ForegroundColor Gray

    $maxAttempts = 30
    $ready = $false
    for ($i = 1; $i -le $maxAttempts; $i++) {
        Start-Sleep -Seconds 1
        if (Test-RemindFlowServer) {
            $ready = $true
            break
        }
    }

    if ($ready) {
        Write-Host ""
        Write-Host "[SUCCESS] RemindFlow AI is online and ready!" -ForegroundColor Green
        Write-Host "  -> Landing Page : $AppUrl" -ForegroundColor White
        Write-Host "  -> Dashboard    : $DashboardUrl" -ForegroundColor White
        if ($LanIp) {
            Write-Host "  -> Same Wi-Fi   : http://${LanIp}:${Port}" -ForegroundColor Gray
        }
        Write-Host "  -> Server Logs  : $LogFile" -ForegroundColor Gray
        Write-Host ""
        if (-not $NoBrowser) {
            Write-Host "Opening $AppUrl in your default browser..." -ForegroundColor Cyan
            Start-Process $AppUrl
        }
        exit 0
    } else {
        Write-Host "[ERROR] Server did not respond on $AppUrl within 30 seconds." -ForegroundColor Red
        if (Test-Path $ErrLogFile) {
            Write-Host "--- Error Log Output ---" -ForegroundColor Red
            Get-Content $ErrLogFile -Tail 20 | ForEach-Object { Write-Host $_ }
        }
        exit 1
    }
} else {
    if (-not $NoBrowser) {
        # Launch a lightweight background job that opens the browser as soon as port 3000 responds
        Start-Job -ScriptBlock {
            param($url)
            for ($i = 0; $i -lt 30; $i++) {
                Start-Sleep -Seconds 1
                try {
                    $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
                    if ($r.StatusCode -eq 200) {
                        Start-Process $url
                        break
                    }
                } catch {}
            }
        } -ArgumentList $AppUrl | Out-Null
    }

    Write-Host "Press Ctrl+C in this window at any time to stop the server." -ForegroundColor Gray
    Write-Host ""
    & npm.cmd run dev -- -H 0.0.0.0 -p $Port
}
