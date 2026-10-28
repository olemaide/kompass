@echo off
rem Double-click to install or update Kompass. Needs Node.js from https://nodejs.org
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is missing. Please install the current LTS version from https://nodejs.org and run this file again.
  echo Node.js fehlt. Bitte die aktuelle LTS-Version von https://nodejs.org installieren und diese Datei erneut starten.
  echo.
  pause
  exit /b 1
)
node "%~dp0install.mjs" %*
echo.
pause
