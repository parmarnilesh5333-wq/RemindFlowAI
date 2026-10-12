@echo off
title RemindFlow AI - Server Control Panel (Server ON / Server OFF)
cd /d "%~dp0"
echo ============================================================
echo   RemindFlow AI - Server Control Panel (Port 3030)
echo ============================================================
echo Starting Local Server Controller and RemindFlow AI Server...
start "" "http://localhost:3030"
node "%~dp0scripts\server-controller.mjs" --autostart
