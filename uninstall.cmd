@echo off
rem Double-click to remove Kompass. Your data stays in %APPDATA%\Kompass.
node "%~dp0install.mjs" --uninstall
echo.
pause
