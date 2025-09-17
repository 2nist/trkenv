<#
.SYNOPSIS
    Run all code quality checks for TRK Lab

.DESCRIPTION
    This script runs linting, formatting, and type checking for both
    Python and JavaScript/TypeScript code in the project.

.PARAMETER Fix
    Automatically fix issues where possible

.EXAMPLE
    .\scripts\quality_check.ps1
    .\scripts\quality_check.ps1 -Fix
#>

param(
    [switch]$Fix
)

$RootDir = Split-Path $PSScriptRoot -Parent

Write-Host "🔍 Running TRK Lab Code Quality Checks..." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Python checks
Write-Host "`n🐍 Python Code Quality:" -ForegroundColor Yellow
Write-Host "----------------------" -ForegroundColor Yellow

if ($Fix) {
    Write-Host "Running black (auto-fix)..." -ForegroundColor Gray
    & python -m black $RootDir

    Write-Host "Running isort (auto-fix)..." -ForegroundColor Gray
    & python -m isort $RootDir
} else {
    Write-Host "Checking black formatting..." -ForegroundColor Gray
    & python -m black --check $RootDir

    Write-Host "Checking isort imports..." -ForegroundColor Gray
    & python -m isort --check-only $RootDir
}

Write-Host "Running flake8 linting..." -ForegroundColor Gray
& python -m flake8 $RootDir

# JavaScript/TypeScript checks
Write-Host "`n⚛️  JavaScript/TypeScript Code Quality:" -ForegroundColor Yellow
Write-Host "-------------------------------------" -ForegroundColor Yellow

Push-Location "$RootDir\webapp\app"

if ($Fix) {
    Write-Host "Running ESLint (auto-fix)..." -ForegroundColor Gray
    & npx eslint . --ext .ts,.tsx,.js,.jsx --fix

    Write-Host "Running Prettier (auto-fix)..." -ForegroundColor Gray
    & npx prettier --write .
} else {
    Write-Host "Running ESLint..." -ForegroundColor Gray
    & npx eslint . --ext .ts,.tsx,.js,.jsx

    Write-Host "Checking Prettier formatting..." -ForegroundColor Gray
    & npx prettier --check .
}

Write-Host "Running TypeScript type check..." -ForegroundColor Gray
& npx tsc --noEmit

Pop-Location

# Pre-commit checks
Write-Host "`n🔗 Pre-commit Checks:" -ForegroundColor Yellow
Write-Host "--------------------" -ForegroundColor Yellow

Push-Location $RootDir
Write-Host "Running pre-commit..." -ForegroundColor Gray
& python -m precommit run --all-files
Pop-Location

Write-Host "`n✅ Code quality checks complete!" -ForegroundColor Green

if (-not $Fix) {
    Write-Host "`n💡 Tip: Run with -Fix to automatically fix issues" -ForegroundColor Blue
}