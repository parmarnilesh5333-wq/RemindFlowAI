@echo off
title RemindFlow AI - Stop Server (Server OFF)
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\stop-remindflow.ps1" %*
