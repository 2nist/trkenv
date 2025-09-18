<#
.SYNOPSIS
    Development environment setup for TRK Lab

.DESCRIPTION
    Sets up the complete development environment including
    Python virtual environment, Node.js dependencies,
    and development tools.

.PARAMETER SkipVenv
    Skip Python virtual environment creation

.PARAMETER SkipPreCommit
    Skip pre-commit hook installation

.EXAMPLE
    .\scripts\setup_dev.ps1
    .\scripts\setup_dev.ps1 -SkipPreCommit
#>

param(
    [switch]$SkipVenv,
    [switch]$SkipPreCommit
)

$ErrorActionPreference = "Stop"
$RootDir = Split-Path $PSScriptRoot -Parent

Write-Host "🚀 Setting up TRK Lab Development Environment" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Check Python
Write-Host "`n🐍 Checking Python..." -ForegroundColor Yellow
$pythonVersion = python --version 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Python found: $pythonVersion" -ForegroundColor Green
} else {
    Write-Host "Python not found. Please install Python 3.8+ first." -ForegroundColor Red
    exit 1
}

# Check Node.js
Write-Host "`n📦 Checking Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Node.js found: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "Node.js not found. Please install Node.js 16+ first." -ForegroundColor Red
    exit 1
}

# Setup Python virtual environment
if (-not $SkipVenv) {
    Write-Host "`n🔧 Setting up Python virtual environment..." -ForegroundColor Yellow
    if (Test-Path "$RootDir\.venv") {
        Write-Host "Virtual environment already exists" -ForegroundColor Gray
    } else {
        python -m venv "$RootDir\.venv"
        Write-Host "Virtual environment created" -ForegroundColor Green
    }

    # Activate and install dependencies
    Write-Host "Installing Python dependencies..." -ForegroundColor Gray
    & "$RootDir\.venv\Scripts\Activate.ps1"
    pip install -r "$RootDir\requirements.txt"
    if ($LASTEXITCODE -ne 0) { throw "Python dependency installation failed" }
}

# Install Node.js dependencies
Write-Host "`n📦 Installing Node.js dependencies..." -ForegroundColor Yellow
Push-Location $RootDir
npm install
if ($LASTEXITCODE -ne 0) { throw "Node.js dependency installation failed" }

# Install workspace dependencies
Write-Host "Installing workspace dependencies..." -ForegroundColor Gray
npm install --workspace=webapp/app
if ($LASTEXITCODE -ne 0) { throw "Workspace dependency installation failed" }
Pop-Location

# Setup pre-commit hooks
if (-not $SkipPreCommit) {
    Write-Host "`n🔗 Setting up pre-commit hooks..." -ForegroundColor Yellow
    & "$RootDir\.venv\Scripts\Activate.ps1"
    pre-commit install
    if ($LASTEXITCODE -ne 0) { throw "Pre-commit setup failed" }
    Write-Host "Pre-commit hooks installed" -ForegroundColor Green
}

# Create .env file if it doesn't exist
Write-Host "`n📝 Setting up environment configuration..." -ForegroundColor Yellow
$envFile = "$RootDir\.env"
if (-not (Test-Path $envFile)) {
    $envContent = @"
# TRK Lab Environment Configuration

# API Configuration
API_HOST=127.0.0.1
API_PORT=8000

# Frontend Configuration
NEXT_PUBLIC_API_BASE=http://localhost:8000

# Development Settings
NODE_ENV=development
"@
    $envContent | Out-File -FilePath $envFile -Encoding UTF8
    Write-Host "Created .env file with default configuration" -ForegroundColor Green
} else {
    Write-Host ".env file already exists" -ForegroundColor Gray
}

# Final setup verification
Write-Host "`n✅ Development environment setup complete!" -ForegroundColor Green
Write-Host "`n🎯 Next steps:" -ForegroundColor Cyan
Write-Host "1. Activate virtual environment: .\.venv\Scripts\Activate.ps1" -ForegroundColor White
Write-Host "2. Start development: npm run dev:full" -ForegroundColor White
Write-Host "3. Open browser: http://localhost:3000" -ForegroundColor White
Write-Host "`n📚 Available commands:" -ForegroundColor Cyan
Write-Host "- npm run dev:full          # Start both backend and frontend" -ForegroundColor White
Write-Host "- npm run quality           # Run all quality checks" -ForegroundColor White
Write-Host "- npm run test              # Run all tests" -ForegroundColor White
Write-Host "- .\scripts\build.ps1       # Build the project" -ForegroundColor White