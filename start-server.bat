@echo off
REM TRK Server Starter
REM This script starts both the backend and frontend servers for development

echo Starting TRK Development Servers...
echo.

REM Change to the scripts directory and run the PowerShell launcher
cd /d "%~dp0scripts"
powershell.exe -ExecutionPolicy Bypass -File "run_server.ps1" -All

echo.
echo Servers stopped.
pause