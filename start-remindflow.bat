@echo off
title RemindFlow AI - Local Server Launcher
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-remindflow.ps1" %*
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] RemindFlow AI encountered a startup issue. Please review the messages above.
    pause
)
