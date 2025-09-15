Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Write-Host 'Starting TRK server in background...'
$server = Start-Process -FilePath python -ArgumentList '-m','apps.server.main' -PassThru
Start-Sleep -Seconds 2
try {
  if (Test-Path 'C:\Windows\Media\tada.wav') { $audio = 'file:///C:/Windows/Media/tada.wav' } else { $audio = 'file:///C:/path/to/audio.wav'; Write-Host 'No default sample found; edit the script to point to a real audio file.' }
  Write-Host "Running smoke: base=http://127.0.0.1:8000 audio=$audio"
  & python .\scripts\smoke_api.py --base 'http://127.0.0.1:8000' --audio $audio
} finally {
  Write-Host 'Stopping server...'
  try { Stop-Process -Id $server.Id -ErrorAction SilentlyContinue } catch { }
}
Write-Host 'Done.'
