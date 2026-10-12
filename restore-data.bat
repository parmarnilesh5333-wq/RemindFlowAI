@echo off
title RemindFlow AI - Restore Database
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\backup-restore.ps1" -Action restore %*
if %ERRORLEVEL% NEQ 0 (
    echo [!] Restore failed.
    pause
)
