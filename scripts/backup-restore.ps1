param(
    [ValidateSet("backup", "restore", "list")]
    [string]$Action = "backup",
    [string]$BackupFile = ""
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$DbPath = Join-Path $ProjectRoot "prisma\dev.db"
$BackupDir = Join-Path $ProjectRoot "backups"

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  RemindFlow AI - Safe Database Backup & Restore Utility" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

if ($Action -eq "list") {
    $files = Get-ChildItem -Path $BackupDir -Filter "*.db" | Sort-Object LastWriteTime -Descending
    if ($files.Count -eq 0) {
        Write-Host "[INFO] No backups found in $BackupDir" -ForegroundColor Yellow
    } else {
        Write-Host "Available Backups in ${BackupDir}:" -ForegroundColor Green
        foreach ($f in $files) {
            Write-Host ("  - {0} ({1:N1} KB, Created: {2})" -f $f.Name, ($f.Length / 1KB), $f.LastWriteTime)
        }
    }
    exit 0
}

if ($Action -eq "backup") {
    if (-not (Test-Path $DbPath)) {
        Write-Host "[ERROR] Database file not found at $DbPath" -ForegroundColor Red
        exit 1
    }

    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $destFile = Join-Path $BackupDir "remindflow-backup-$timestamp.db"
    Copy-Item -Path $DbPath -Destination $destFile -Force

    # Also keep a "remindflow-latest.db" copy for convenience
    $latestFile = Join-Path $BackupDir "remindflow-latest.db"
    Copy-Item -Path $DbPath -Destination $latestFile -Force

    $sizeKb = [Math]::Round(((Get-Item $destFile).Length / 1KB), 1)
    Write-Host "[SUCCESS] Database backed up safely!" -ForegroundColor Green
    Write-Host "  -> Source      : $DbPath" -ForegroundColor Gray
    Write-Host "  -> Backup File : $destFile ($sizeKb KB)" -ForegroundColor White
    Write-Host "  -> Latest Copy : $latestFile" -ForegroundColor Gray
    Write-Host ""
    exit 0
}

if ($Action -eq "restore") {
    if ([string]::IsNullOrWhiteSpace($BackupFile)) {
        $latestFile = Join-Path $BackupDir "remindflow-latest.db"
        if (Test-Path $latestFile) {
            $BackupFile = $latestFile
        } else {
            Write-Host "[ERROR] Please specify -BackupFile <path-to-backup.db>" -ForegroundColor Red
            exit 1
        }
    } elseif (-not (Test-Path $BackupFile)) {
        $candidate = Join-Path $BackupDir $BackupFile
        if (Test-Path $candidate) {
            $BackupFile = $candidate
        } else {
            Write-Host "[ERROR] Backup file not found: $BackupFile" -ForegroundColor Red
            exit 1
        }
    }

    # Always create a pre-restore safety snapshot of current dev.db if it exists
    if (Test-Path $DbPath) {
        $preRestore = Join-Path $BackupDir ("pre-restore-safety-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".db")
        Copy-Item -Path $DbPath -Destination $preRestore -Force
        Write-Host "[INFO] Saved safety snapshot of current DB to: $preRestore" -ForegroundColor Yellow
    }

    Copy-Item -Path $BackupFile -Destination $DbPath -Force
    Write-Host "[SUCCESS] Database restored from: $BackupFile" -ForegroundColor Green
    Write-Host ""
    exit 0
}
