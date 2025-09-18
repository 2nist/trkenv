<#
.SYNOPSIS
    Clean up old run directories based on age and size limits

.DESCRIPTION
    This script removes run directories that are older than a specified number of days
    or exceed a maximum size limit. It preserves recent runs and provides logging.

.PARAMETER DaysOld
    Remove directories older than this many days (default: 30)

.PARAMETER MaxSizeGB
    Remove directories larger than this size in GB (default: 5)

.PARAMETER DryRun
    Show what would be deleted without actually deleting (default: false)

.PARAMETER Force
    Skip confirmation prompts (default: false)

.EXAMPLE
    .\cleanup_runs.ps1 -DaysOld 7 -DryRun
    .\cleanup_runs.ps1 -MaxSizeGB 2 -Force
#>

param(
    [int]$DaysOld = 30,
    [double]$MaxSizeGB = 5,
    [switch]$DryRun,
    [switch]$Force
)

$RunsPath = Join-Path $PSScriptRoot "runs"
$LogFile = Join-Path $PSScriptRoot "cleanup_runs.log"

function Write-Log {
    param([string]$Message)
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogMessage = "[$Timestamp] $Message"
    Write-Host $LogMessage
    Add-Content -Path $LogFile -Value $LogMessage
}

function Get-DirectorySize {
    param([string]$Path)
    $Size = (Get-ChildItem -Path $Path -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    return [math]::Round($Size / 1GB, 2)
}

function Remove-OldRuns {
    if (-not (Test-Path $RunsPath)) {
        Write-Log "Runs directory not found: $RunsPath"
        return
    }

    $CutoffDate = (Get-Date).AddDays(-$DaysOld)
    Write-Log "Starting cleanup of runs older than $DaysOld days or larger than $MaxSizeGB GB"
    Write-Log "Cutoff date: $CutoffDate"

    $RunDirectories = Get-ChildItem -Path $RunsPath -Directory | Where-Object {
        $_.Name -match "^(audio-engine|rehearsal)_[a-f0-9]+$"
    }

    $TotalRemoved = 0
    $TotalSpaceFreed = 0

    foreach ($Dir in $RunDirectories) {
        $ShouldRemove = $false
        $Reason = ""

        # Check age
        if ($Dir.CreationTime -lt $CutoffDate) {
            $ShouldRemove = $true
            $Reason = "older than $DaysOld days"
        }

        # Check size
        $SizeGB = Get-DirectorySize $Dir.FullName
        if ($SizeGB -gt $MaxSizeGB) {
            $ShouldRemove = $true
            $Reason = "larger than $MaxSizeGB GB ($SizeGB GB)"
        }

        if ($ShouldRemove) {
            if ($DryRun) {
                Write-Log "[DRY RUN] Would remove: $($Dir.Name) - $Reason"
            } else {
                if (-not $Force) {
                    $Confirm = Read-Host "Remove $($Dir.Name)? ($Reason) [y/N]"
                    if ($Confirm -ne 'y' -and $Confirm -ne 'Y') {
                        Write-Log "Skipped: $($Dir.Name)"
                        continue
                    }
                }

                try {
                    Remove-Item -Path $Dir.FullName -Recurse -Force
                    Write-Log "Removed: $($Dir.Name) - $Reason - Freed: $SizeGB GB"
                    $TotalRemoved++
                    $TotalSpaceFreed += $SizeGB
                } catch {
                    Write-Log "Error removing $($Dir.Name): $($_.Exception.Message)"
                }
            }
        }
    }

    if ($DryRun) {
        Write-Log "[DRY RUN] Would remove $TotalRemoved directories, freeing approximately $TotalSpaceFreed GB"
    } else {
        Write-Log "Cleanup complete: Removed $TotalRemoved directories, freed $TotalSpaceFreed GB"
    }
}

# Main execution
Write-Log "=== Runs Cleanup Script Started ==="
Write-Log "Parameters: DaysOld=$DaysOld, MaxSizeGB=$MaxSizeGB, DryRun=$DryRun, Force=$Force"

Remove-OldRuns

Write-Log "=== Runs Cleanup Script Completed ==="