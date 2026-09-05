@echo off
chcp 65001 >nul
title Fiste guiden REV 24
cd /d "%~dp0"

where node >nul 2>nul
if not %errorlevel%==0 goto no_node

if not exist "node_modules\pngjs\package.json" (
  echo Forste oppstart: installerer nodvendige pakker...
  call npm install --no-audit --no-fund
  if not %errorlevel%==0 (
    echo.
    echo Installasjonen feilet. Kontroller internettforbindelsen og prov igjen.
    pause
    exit /b 1
  )
)

echo Starter Fiste guiden REV 24...
start "Fiste guiden-server" /min cmd /c "node server.js"
timeout /t 2 /nobreak >nul
start "" http://localhost:3000
echo.
echo Appen er startet: http://localhost:3000
echo Du kan lukke dette vinduet. Serveren kjorer i et eget minimert vindu.
pause
exit /b 0

:no_node
echo.
echo Node.js 20 eller nyere er ikke installert pa denne PC-en.
echo Installer LTS-versjonen fra https://nodejs.org/ og kjor START-HER.bat pa nytt.
echo.
start "" https://nodejs.org/
pause
