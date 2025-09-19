param(
  [string]$Base = "http://127.0.0.1:8000",
  [int]$Duration = 120,
  [double]$Interval = 1.0,
  [string]$Audio = "file:///C:/Windows/Media/Windows%20Background.wav"
)

Write-Host "[resilience] Starting backend..."
$backend = Start-Process -FilePath "pwsh" -ArgumentList "-NoLogo","-NoProfile","-Command","./scripts/run_server.ps1 -Backend" -PassThru
Start-Sleep -Seconds 1

Write-Host "[resilience] Waiting for health..."
$deadline = (Get-Date).AddSeconds(45)
$healthy = $false
while((Get-Date) -lt $deadline){
  try { $r = Invoke-RestMethod "$Base/api/health" -TimeoutSec 2; if($r.ok){ $healthy = $true; break } } catch { Start-Sleep -Milliseconds 500 }
}
if(-not $healthy){
  Write-Error "[resilience] Backend did not become healthy at $Base within timeout."
  try { $backend | Stop-Process -Force } catch {}
  exit 1
}

Write-Host "[resilience] Running probe ($Duration s, interval $Interval s)..."
if (Test-Path .\.venv\Scripts\Activate.ps1) { . .\.venv\Scripts\Activate.ps1 }
if (Test-Path .\.venv\Scripts\python.exe) {
  .\.venv\Scripts\python.exe scripts/resilience_probe.py --base $Base --duration $Duration --interval $Interval --audio $Audio
} else {
  python scripts/resilience_probe.py --base $Base --duration $Duration --interval $Interval --audio $Audio
}
$code = $LASTEXITCODE

Write-Host "[resilience] Attempting to stop backend..."
try { $backend | Stop-Process -Force } catch {}

if($code -ne 0){ exit $code } else { Write-Host "[resilience] Probe completed" }
