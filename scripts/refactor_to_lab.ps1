Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backup = ".\backup_pre_refactor_$stamp"
New-Item -ItemType Directory -Force -Path $backup | Out-Null
"modules\panels","modules\tools","modules\jobs","modules\devices","modules\datasets","modules\exporters","apps\server\routes","flows","profiles",".trash" | % { New-Item -ItemType Directory -Force -Path $_ | Out-Null }
$expRoot = "experiments"
if (Test-Path $expRoot) {
  Get-ChildItem -Path $expRoot -Directory | % {
    $expId = $_.Name; $man = Join-Path $_.FullName "manifest.json"
    Copy-Item -Recurse -Force $_.FullName $backup\experiments_$expId | Out-Null
    $kind = "panel"
    if (Test-Path $man) { try { $kind = (Get-Content -Raw $man | ConvertFrom-Json).kind } catch {} }
    switch ($kind) {
      "tool" { $cat="tools" }
      "job" { $cat="jobs" }
      "device" { $cat="devices" }
      "dataset" { $cat="datasets" }
      "exporter" { $cat="exporters" }
      default { $cat="panels" }
    }
    $dest = "modules\$cat\$expId"; New-Item -ItemType Directory -Force -Path $dest | Out-Null
    if (Test-Path "$($_.FullName)\ui") { New-Item -ItemType Directory -Force -Path "$dest\ui" | Out-Null; Copy-Item -Recurse -Force "$($_.FullName)\ui\*" "$dest\ui" -ErrorAction SilentlyContinue }
    if (Test-Path "$($_.FullName)\py") { New-Item -ItemType Directory -Force -Path "$dest\py" | Out-Null; Copy-Item -Recurse -Force "$($_.FullName)\py\*" "$dest\py" -ErrorAction SilentlyContinue }
    if (Test-Path $man) { Copy-Item -Force $man "$dest\manifest.json" }
  }
}
# Schemas src -> real if missing
if (!(Test-Path "schemas\manifest.schema.json") -and (Test-Path "schemas\manifest.schema.json.src")) { Copy-Item "schemas\manifest.schema.json.src" "schemas\manifest.schema.json" }
if (!(Test-Path "schemas\flow.schema.json") -and (Test-Path "schemas\flow.schema.json.src")) { Copy-Item "schemas\flow.schema.json.src" "schemas\flow.schema.json" }
# Add routes if missing
function Ensure-File { param($Path,$Src) if (!(Test-Path $Path) -and (Test-Path $Src)) { Copy-Item $Src $Path; Write-Host "Created: $Path" } else { Write-Host "Exists: $Path" } }
Ensure-File "apps\server\routes\registry.py" "apps\server\routes\registry.py.src"
Ensure-File "apps\server\routes\sessions.py" "apps\server\routes\sessions.py.src"
Ensure-File "apps\server\routes\flows.py"    "apps\server\routes\flows.py.src"
# Note: routing is handled dynamically at runtime by apps/server/main.py
# via the _include_optional_routers helper. We do not inject Python into
# main.py from this script anymore to avoid accidental duplication.
Write-Host "Skipping any automatic edits to apps/server/main.py; runtime will include optional routers when available."
# Home panel
if (!(Test-Path "modules\panels\home")) {
  New-Item -ItemType Directory -Force -Path "modules\panels\home\ui" | Out-Null
  if (Test-Path "modules\panels\home\ui\index.html.src") { Copy-Item "modules\panels\home\ui\index.html.src" "modules\panels\home\ui\index.html" }
  if (Test-Path "modules\panels\home\manifest.json.src") { Copy-Item "modules\panels\home\manifest.json.src" "modules\panels\home\manifest.json" }
}
# Host helpers
if (!(Test-Path "webapp\host\lab-menu.js") -and (Test-Path "webapp\host\lab-menu.js.src")) {
  Copy-Item "webapp\host\lab-menu.js.src" "webapp\host\lab-menu.js"
  Copy-Item "webapp\host\HOST_SIDEBAR_SNIPPET.html" "webapp\host\HOST_SIDEBAR_SNIPPET.html"
}
# Sample flow + profiles
if (!(Test-Path "flows\audio_to_midi_with_lyrics.json") -and (Test-Path "flows\audio_to_midi_with_lyrics.json.src")) { Copy-Item "flows\audio_to_midi_with_lyrics.json.src" "flows\audio_to_midi_with_lyrics.json" }
"jam","research","build" | % {
  if (!(Test-Path "profiles\$_.yml") -and (Test-Path "profiles\$_.yml.src")) { Copy-Item "profiles\$_.yml.src" "profiles\$_.yml" }
}
Write-Host "`nRefactor complete. Backup at $backup. Add <script type='module' src='/lab-menu.js'></script> into your sidebar template (or paste HOST_SIDEBAR_SNIPPET.html)."
