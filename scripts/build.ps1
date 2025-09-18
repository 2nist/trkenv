<#
.SYNOPSIS
    Complete build script for TRK Lab

.DESCRIPTION
    Builds both backend and frontend, runs quality checks,
    and prepares for deployment.

.PARAMETER Clean
    Clean build artifacts before building

.PARAMETER Test
    Run tests after building

.PARAMETER Deploy
    Prepare for deployment (create dist directory)

.PARAMETER SkipQuality
    Skip quality checks (linting, formatting)

.EXAMPLE
    .\scripts\build.ps1 -Clean -Test
    .\scripts\build.ps1 -Deploy
#>

param(
    [switch]$Clean,
    [switch]$Test,
    [switch]$Deploy,
    [switch]$SkipQuality
)

$ErrorActionPreference = "Stop"
$RootDir = Split-Path $PSScriptRoot -Parent

Write-Host "🏗️  Building TRK Lab..." -ForegroundColor Cyan
Write-Host "====================" -ForegroundColor Cyan

# Clean step
if ($Clean) {
    Write-Host "`n🧹 Cleaning build artifacts..." -ForegroundColor Yellow
    & npm run clean
    if ($LASTEXITCODE -ne 0) { throw "Clean failed" }
}

# Quality checks
if (-not $SkipQuality) {
    Write-Host "`n🔍 Running quality checks..." -ForegroundColor Yellow
    & npm run quality
    if ($LASTEXITCODE -ne 0) { throw "Quality checks failed" }
}

# Build backend
Write-Host "`n🐍 Building backend..." -ForegroundColor Yellow
& npm run build:backend
if ($LASTEXITCODE -ne 0) { throw "Backend build failed" }

# Build frontend
Write-Host "`n⚛️  Building frontend..." -ForegroundColor Yellow
& npm run build:frontend
if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }

# Run tests
if ($Test) {
    Write-Host "`n🧪 Running tests..." -ForegroundColor Yellow
    & npm run test
    if ($LASTEXITCODE -ne 0) { throw "Tests failed" }
}

# Deployment preparation
if ($Deploy) {
    Write-Host "`n📦 Preparing deployment..." -ForegroundColor Yellow

    $DistDir = Join-Path $RootDir "dist"
    if (Test-Path $DistDir) {
        Remove-Item $DistDir -Recurse -Force
    }
    New-Item -ItemType Directory -Path $DistDir | Out-Null

    # Copy backend files
    Write-Host "Copying backend files..." -ForegroundColor Gray
    Copy-Item -Path "$RootDir\apps\server\*" -Destination $DistDir -Recurse -Exclude @("*.pyc", "__pycache__", ".pytest_cache")

    # Copy frontend build
    Write-Host "Copying frontend build..." -ForegroundColor Gray
    Copy-Item -Path "$RootDir\webapp\app\.next\*" -Destination "$DistDir\frontend" -Recurse

    # Copy requirements and package files
    Copy-Item -Path "$RootDir\requirements.txt" -Destination $DistDir
    Copy-Item -Path "$RootDir\package.json" -Destination $DistDir

    # Create deployment script
    $DeployScript = @"
#!/bin/bash
# TRK Lab Deployment Script

echo "🚀 Starting TRK Lab deployment..."

# Install Python dependencies
pip install -r requirements.txt

# Install Node.js dependencies (if needed for runtime)
npm install --production

# Start the application
echo "Starting TRK Lab..."
npm run start:full
"@
    $DeployScript | Out-File -FilePath "$DistDir\deploy.sh" -Encoding UTF8

    Write-Host "Deployment package created in: $DistDir" -ForegroundColor Green
}

Write-Host "`n✅ Build completed successfully!" -ForegroundColor Green

if ($Deploy) {
    Write-Host "`n📋 Deployment Summary:" -ForegroundColor Cyan
    Write-Host "- Backend: Ready" -ForegroundColor White
    Write-Host "- Frontend: Built and optimized" -ForegroundColor White
    Write-Host "- Tests: $(if ($Test) { 'Passed' } else { 'Skipped' })" -ForegroundColor White
    Write-Host "- Quality: $(if (-not $SkipQuality) { 'Passed' } else { 'Skipped' })" -ForegroundColor White
    Write-Host "- Package: Created in dist/" -ForegroundColor White
}