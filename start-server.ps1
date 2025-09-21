# TRK Server Starter
# This script starts both the backend and frontend servers for development

Write-Host "Starting TRK Development Servers..." -ForegroundColor Cyan
Write-Host ""

# Run the PowerShell launcher from the scripts directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$scriptsPath = Join-Path $scriptDir "scripts\run_server.ps1"

if (Test-Path $scriptsPath) {
    & $scriptsPath -All
} else {
    Write-Host "Error: Could not find run_server.ps1 in scripts directory" -ForegroundColor Red
    Read-Host "Press Enter to exit"
}

Write-Host ""
Write-Host "Servers stopped." -ForegroundColor Yellow