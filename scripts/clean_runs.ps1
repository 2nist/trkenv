<#
.SYNOPSIS
    Clean up old run directories based on age
.DESCRIPTION
    Removes run directories older than specified number of days
.PARAMETER Days
    Number of days to keep (default: 30)
.PARAMETER WhatIf
    Show what would be deleted without actually deleting
.EXAMPLE
    .\clean_runs.ps1 -Days 7
    .\clean_runs.ps1 -WhatIf
#>
param(
    [int]$Days = 30,
    [switch]$WhatIf
)

$RunsPath = Join-Path $PSScriptRoot "runs"
$CutoffDate = (Get-Date).AddDays(-$Days)

Write-Host "Cleaning runs older than $Days days ($CutoffDate)..." -ForegroundColor Yellow
Write-Host "Runs directory: $RunsPath" -ForegroundColor Gray

if (-not (Test-Path $RunsPath)) {
    Write-Host "Runs directory not found: $RunsPath" -ForegroundColor Red
    exit 1
}

$OldRuns = Get-ChildItem -Path $RunsPath -Directory |
    Where-Object { $_.LastWriteTime -lt $CutoffDate }

if ($OldRuns.Count -eq 0) {
    Write-Host "No old runs to clean up." -ForegroundColor Green
    exit 0
}

Write-Host "Found $($OldRuns.Count) old run(s) to clean up:" -ForegroundColor Yellow
$OldRuns | ForEach-Object {
    Write-Host "  - $($_.Name) ($($_.LastWriteTime))" -ForegroundColor Gray
}

if ($WhatIf) {
    Write-Host "`nWhatIf mode - no changes made." -ForegroundColor Cyan
    exit 0
}

$OldRuns | ForEach-Object {
    Write-Host "Removing $($_.Name)..." -ForegroundColor Yellow
    try {
        Remove-Item $_.FullName -Recurse -Force
        Write-Host "  ✓ Removed $($_.Name)" -ForegroundColor Green
    }
    catch {
        Write-Host "  ✗ Failed to remove $($_.Name): $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`nCleanup complete!" -ForegroundColor Green