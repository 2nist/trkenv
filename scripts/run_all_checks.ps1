param(
  [string]$Base = "http://127.0.0.1:8000",
  [string]$Audio = "file:///C:/Windows/Media/Windows%20Background.wav",
  [switch]$NoFrontend
)

Write-Host "[run_all_checks] Starting backend..."
$backend = Start-Process -FilePath "pwsh" -ArgumentList "-NoLogo","-NoProfile","-Command","./scripts/run_server.ps1 -Backend" -PassThru
Start-Sleep -Seconds 1

Write-Host "[run_all_checks] Waiting for health..."
$deadline = (Get-Date).AddSeconds(45)
$healthy = $false
while((Get-Date) -lt $deadline){
  try {
    $r = Invoke-RestMethod "$Base/api/health" -TimeoutSec 2
    if($r.ok){ $healthy = $true; break }
  } catch { Start-Sleep -Milliseconds 500 }
}
if(-not $healthy){
  Write-Error "[run_all_checks] Backend did not become healthy at $Base within timeout."
  try { $backend | Stop-Process -Force } catch {}
  exit 1
}

Write-Host "[run_all_checks] Running smoke..."
if (Test-Path .\.venv\Scripts\Activate.ps1) { . .\.venv\Scripts\Activate.ps1 }
if (Test-Path .\.venv\Scripts\python.exe) { .\.venv\Scripts\python.exe scripts/smoke_api.py --base $Base --audio $Audio } else { python scripts/smoke_api.py --base $Base --audio $Audio }
if($LASTEXITCODE -ne 0){ Write-Error "Smoke failed ($LASTEXITCODE)"; exit $LASTEXITCODE }

Write-Host "[run_all_checks] Running pytest..."
if (Test-Path .\.venv\Scripts\python.exe) { .\.venv\Scripts\python.exe -m pytest -q } else { python -m pytest -q }
$code = $LASTEXITCODE

Write-Host "[run_all_checks] Attempting to stop backend..." 
try { $backend | Stop-Process -Force } catch {}

if($code -ne 0){ exit $code } else { Write-Host "[run_all_checks] All checks passed" }