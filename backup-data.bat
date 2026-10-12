@echo off
title RemindFlow AI - Backup Database
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\backup-restore.ps1" -Action backup
if %ERRORLEVEL% NEQ 0 (
    echo [!] Backup failed.
    pause
)
