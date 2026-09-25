@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title Fiste - automatisk GitHub og Render oppdatering
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy-fiste.ps1"
set RC=%ERRORLEVEL%
if not "%RC%"=="0" (
  echo.
  echo Oppdateringen stoppet med feil. Se meldingen over.
  echo.
  pause
)
exit /b %RC%
