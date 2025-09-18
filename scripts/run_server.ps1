<#!
.SYNOPSIS
	Unified development launcher for TRK (backend API + frontend Next.js + optional flow runner)

.DESCRIPTION
	Starts one or more dev services and keeps them attached. Provides graceful shutdown and
	simple health/status reporting. Designed for local development convenience.

.PARAMETER Backend
	Start the FastAPI backend (uvicorn) on the specified API port.

.PARAMETER Frontend
	Start the Next.js frontend dev server on the specified Web port.

.PARAMETER Flow
	(Optional) Start a background flow runner tailing a profile (demo / hot loop).

.PARAMETER All
	Convenience switch equal to -Backend -Frontend.

.PARAMETER ApiPort
	Port for backend API (default 8000)

.PARAMETER WebPort
	Port for frontend dev server (default 3000)

.PARAMETER Host
	Host/interface to bind (default 127.0.0.1)

.PARAMETER Reload
	Use uvicorn --reload for backend (auto-reload on code changes)

.PARAMETER Profile
	Flow profile (YAML) to loop-run when -Flow is specified (e.g. profiles/hello.yaml)

.PARAMETER EnvFile
	Path to .env file to source environment variables from before launching services.

.EXAMPLE
	# Start backend + frontend
	./scripts/run_server.ps1 -All

.EXAMPLE
	# Backend only with reload
	./scripts/run_server.ps1 -Backend -Reload

.EXAMPLE
	# Backend + frontend specifying custom ports
	./scripts/run_server.ps1 -Backend -Frontend -ApiPort 8010 -WebPort 3100

.EXAMPLE
	# Backend + flow runner loop
	./scripts/run_server.ps1 -Backend -Flow -Profile profiles/hello.yaml
#>

[CmdletBinding()] param(
	[switch]$Backend,
	[switch]$Frontend,
	[switch]$Flow,
	[switch]$All,
	[int]$ApiPort = 8000,
	[int]$WebPort = 3000,
	[string]$Host = '127.0.0.1',
	[switch]$Reload,
	[string]$Profile = 'profiles/hello.yaml',
	[string]$EnvFile = '.env'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Resolve repository root (one level up from scripts folder)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
Set-Location $RootDir

Write-Host "TRK Dev Launcher" -ForegroundColor Cyan
Write-Host "Root: $RootDir" -ForegroundColor DarkGray

if ($All) { $Backend = $true; $Frontend = $true }
if (-not ($Backend -or $Frontend -or $Flow)) { Write-Host "No service flags supplied; defaulting to -Backend -Frontend" -ForegroundColor Yellow; $Backend = $true; $Frontend = $true }

$Procs = @()
$StopRequested = $false

function Add-Proc {
	param($Proc, [string]$Name)
	if ($null -ne $Proc) {
		$global:Procs += [pscustomobject]@{ Name=$Name; PID=$Proc.Id; Proc=$Proc }
		Write-Host "Started $Name (PID $($Proc.Id))" -ForegroundColor Green
	}
}

function Invoke-EnvFile {
	param([string]$Path)
	if (Test-Path $Path) {
		Write-Host "Loading env vars from $Path" -ForegroundColor DarkGray
		Get-Content $Path | Where-Object { $_ -match '^[A-Za-z_][A-Za-z0-9_]*=' } | ForEach-Object {
			$k,$v = $_.Split('=',2); if ($v.StartsWith('"') -and $v.EndsWith('"')) { $v = $v.Trim('"') }
			$env:$k = $v
		}
	}
}

function Ensure-Venv {
	if (Test-Path '.venv/Scripts/Activate.ps1') {
		& .\.venv\Scripts\Activate.ps1
	} else {
		Write-Host 'Virtual environment not found (.venv). Consider running scripts/setup_dev.ps1' -ForegroundColor Yellow
	}
}

function Ensure-NodeModules {
	if ($Frontend -and -not (Test-Path 'webapp/app/node_modules')) {
		Write-Host 'Installing frontend dependencies (webapp/app/node_modules missing)...' -ForegroundColor Yellow
		pushd webapp/app
		npm install
		popd
	}
}

function Ensure-PythonDeps {
	if ($Backend) {
		try {
			$null = python -c "import fastapi, uvicorn" 2>$null
		} catch {
			Write-Host 'FastAPI / uvicorn not importable. Installing apps/server/requirements.txt...' -ForegroundColor Yellow
			if (Test-Path 'apps/server/requirements.txt') { pip install -r apps/server/requirements.txt }
		}
	}
}

function Wait-Port {
	param([string]$Host, [int]$Port, [int]$TimeoutSec = 20, [string]$Label = 'service')
	$deadline = (Get-Date).AddSeconds($TimeoutSec)
	while ((Get-Date) -lt $deadline) {
		try {
			$tcp = Test-NetConnection -ComputerName $Host -Port $Port -InformationLevel Quiet
			if ($tcp) { Write-Host ("✔ {0} ready on {1}:{2}" -f $Label, $Host, $Port) -ForegroundColor Green; return $true }
		} catch {}
		Start-Sleep -Milliseconds 500
	}
	Write-Host ("⚠ Timeout waiting for {0} on {1}:{2}" -f $Label, $Host, $Port) -ForegroundColor Yellow
	return $false
}

function Start-Backend {
	Write-Host "Launching backend (port $ApiPort)" -ForegroundColor Cyan
	Ensure-Venv
	Ensure-PythonDeps
	$env:TRK_HOST = $Host
	$env:TRK_PORT = $ApiPort
	$env:NEXT_PUBLIC_API_BASE = "http://$Host:$ApiPort"
	if ($Reload) {
		$cmd = 'uvicorn'
		$args = "apps.server.main:app --host $Host --port $ApiPort --reload"
	} else {
		# Use python -m so import side effects mimic production start
		$cmd = 'python'
		$args = "-m apps.server.main"
	}
	$p = Start-Process -PassThru -NoNewWindow -FilePath $cmd -ArgumentList $args
	Add-Proc $p 'backend'
}

function Start-Frontend {
	Write-Host "Launching frontend (port $WebPort)" -ForegroundColor Cyan
	Ensure-NodeModules
	$env:NEXT_PUBLIC_API_BASE = "http://$Host:$ApiPort"
	pushd webapp/app
	# Directly run next dev with explicit host/port (avoid argument flattening issues)
	$nextArgs = @('next','dev','-H', $Host, '-p', "$WebPort")
	$p = Start-Process -PassThru -NoNewWindow -FilePath npx -ArgumentList $nextArgs
	popd
	Add-Proc $p 'frontend'
}

function Start-FlowRunner {
	if (-not (Test-Path $Profile)) { Write-Host "Profile not found: $Profile" -ForegroundColor Red; return }
	Write-Host "Launching flow runner (profile $Profile)" -ForegroundColor Cyan
	Ensure-Venv
	$script = @"
import time, subprocess, sys
profile = sys.argv[1]
while True:
		print(f"[flow] running profile {profile}")
		r = subprocess.run([sys.executable, '-m', 'services.flow.runner', profile])
		print(f"[flow] exit code {r.returncode}; sleeping 5s")
		time.sleep(5)
"@
	$tempPy = Join-Path $env:TEMP "trk_flow_loop_$([guid]::NewGuid().ToString('N')).py"
	Set-Content -Path $tempPy -Value $script -Encoding UTF8
	$p = Start-Process -PassThru -NoNewWindow -FilePath python -ArgumentList @($tempPy, $Profile)
	Add-Proc $p 'flow'
}

function Show-Status {
	Write-Host "\nActive services:" -ForegroundColor Cyan
	foreach ($p in $Procs) {
		if (Get-Process -Id $p.PID -ErrorAction SilentlyContinue) {
			Write-Host (" - {0,-8} PID {1}" -f $p.Name, $p.PID) -ForegroundColor Green
		} else {
			Write-Host (" - {0,-8} (exited)" -f $p.Name) -ForegroundColor Red
		}
	}
}

function Stop-All {
	if ($StopRequested) { return }
	$global:StopRequested = $true
	Write-Host "\nStopping services..." -ForegroundColor Yellow
	foreach ($p in $Procs) {
		try {
			if (Get-Process -Id $p.PID -ErrorAction SilentlyContinue) {
				Stop-Process -Id $p.PID -Force -ErrorAction SilentlyContinue
			}
		} catch {}
	}
	Write-Host "All services stopped." -ForegroundColor Green
}

Register-EngineEvent PowerShell.Exiting -Action { Stop-All } | Out-Null
trap { Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red; Stop-All; break }

Invoke-EnvFile -Path $EnvFile

if ($Backend) { Start-Backend }
if ($Frontend) { Start-Frontend }
if ($Flow) { Start-FlowRunner }

Show-Status
Write-Host "\nPress: 's' = status, 'q' = quit" -ForegroundColor DarkGray

while (-not $StopRequested) {
	if ($Host.UI.RawUI.KeyAvailable) {
		$key = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
		switch ($key.Character) {
			'q' { break }
			's' { Show-Status }
		}
	}
	Start-Sleep -Milliseconds 300
	# Auto-exit if all processes died
	if ($Procs.Count -gt 0 -and ($Procs | Where-Object { Get-Process -Id $_.PID -ErrorAction SilentlyContinue }).Count -eq 0) {
		Write-Host "All services exited." -ForegroundColor Yellow
		break
	}
}

Stop-All
exit 0

