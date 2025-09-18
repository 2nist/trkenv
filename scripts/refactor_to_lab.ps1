param(
  [switch]$Apply
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backup = ".\backup_pre_refactor_$stamp"
$DoApply = [bool]$Apply

function DoAction {
  param(
    [scriptblock]$Action,
    [string]$Desc
  )
  if ($DoApply) {
    & $Action
  } else {
    Write-Host "[DRYRUN] $Desc"
  }
}

DoAction { New-Item -ItemType Directory -Force -Path $backup | Out-Null } "Create backup: $backup"

$dirs = @(
  'modules\panels','modules\tools','modules\jobs','modules\devices','modules\datasets','modules\exporters','apps\server\routes','flows','profiles','.trash'
)
foreach ($d in $dirs) { DoAction { New-Item -ItemType Directory -Force -Path $d | Out-Null } "Ensure directory: $d" }

$expRoot = "experiments"
if (Test-Path $expRoot) {
  Get-ChildItem -Path $expRoot -Directory | % {
    $expId = $_.Name; $man = Join-Path $_.FullName "manifest.json"
    DoAction { Copy-Item -Recurse -Force $_.FullName "$backup\experiments_$expId" } "Backup experiment $expId to $backup"
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
    $dest = "modules\$cat\$expId"
    DoAction { New-Item -ItemType Directory -Force -Path $dest | Out-Null } "Create module dest: $dest"
    if (Test-Path "$($_.FullName)\ui") { DoAction { New-Item -ItemType Directory -Force -Path "$dest\ui" | Out-Null; Copy-Item -Recurse -Force "$($_.FullName)\ui\*" "$dest\ui" -ErrorAction SilentlyContinue } "Copy UI for $expId" }
    if (Test-Path "$($_.FullName)\py") { DoAction { New-Item -ItemType Directory -Force -Path "$dest\py" | Out-Null; Copy-Item -Recurse -Force "$($_.FullName)\py\*" "$dest\py" -ErrorAction SilentlyContinue } "Copy py for $expId" }
    if (Test-Path $man) { DoAction { Copy-Item -Force $man "$dest\manifest.json" } "Copy manifest for $expId" }
  }
}

# Schemas src -> real if missing
if (!(Test-Path "schemas\manifest.schema.json") -and (Test-Path "schemas\manifest.schema.json.src")) { DoAction { Copy-Item "schemas\manifest.schema.json.src" "schemas\manifest.schema.json" } "Create schemas\manifest.schema.json from .src" }
if (!(Test-Path "schemas\flow.schema.json") -and (Test-Path "schemas\flow.schema.json.src")) { DoAction { Copy-Item "schemas\flow.schema.json.src" "schemas\flow.schema.json" } "Create schemas\flow.schema.json from .src" }

# Add routes if missing
function Ensure-File { param($Path,$Src) if (!(Test-Path $Path) -and (Test-Path $Src)) { DoAction { Copy-Item $Src $Path; Write-Host "Created: $Path" } "Create file $Path from $Src" } else { Write-Host "Exists: $Path" } }
Ensure-File "apps\server\routes\registry.py" "apps\server\routes\registry.py.src"
Ensure-File "apps\server\routes\sessions.py" "apps\server\routes\sessions.py.src"
Ensure-File "apps\server\routes\flows.py"    "apps\server\routes\flows.py.src"

# Note: routing is handled dynamically at runtime by apps/server/main.py
# via the _include_optional_routers helper. We do not inject Python into
# main.py from this script anymore to avoid accidental duplication.
Write-Host "Skipping any automatic edits to apps/server/main.py; runtime will include optional routers when available."

# Home panel
if (!(Test-Path "modules\panels\home")) {
  DoAction { New-Item -ItemType Directory -Force -Path "modules\panels\home\ui" | Out-Null } "Create modules\panels\home\ui"
  if (Test-Path "modules\panels\home\ui\index.html.src") { DoAction { Copy-Item "modules\panels\home\ui\index.html.src" "modules\panels\home\ui\index.html" } "Create home index.html" }
  if (Test-Path "modules\panels\home\manifest.json.src") { DoAction { Copy-Item "modules\panels\home\manifest.json.src" "modules\panels\home\manifest.json" } "Create home manifest" }
}

# Host helpers
if (!(Test-Path "webapp\host\lab-menu.js") -and (Test-Path "webapp\host\lab-menu.js.src")) {
  DoAction { Copy-Item "webapp\host\lab-menu.js.src" "webapp\host\lab-menu.js" } "Create webapp\host\lab-menu.js"
  DoAction { Copy-Item "webapp\host\HOST_SIDEBAR_SNIPPET.html" "webapp\host\HOST_SIDEBAR_SNIPPET.html" } "Copy HOST_SIDEBAR_SNIPPET.html"
}

# Sample flow + profiles
if (!(Test-Path "flows\audio_to_midi_with_lyrics.json") -and (Test-Path "flows\audio_to_midi_with_lyrics.json.src")) { DoAction { Copy-Item "flows\audio_to_midi_with_lyrics.json.src" "flows\audio_to_midi_with_lyrics.json" } "Create sample flow" }
"jam","research","build" | % {
  if (!(Test-Path "profiles\$_.yml") -and (Test-Path "profiles\$_.yml.src")) { DoAction { Copy-Item "profiles\$_.yml.src" "profiles\$_.yml" } "Create profiles\$_.yml" }
}

if ($DoApply) { Write-Host "`nRefactor complete. Backup at $backup. Add <script type='module' src='/lab-menu.js'></script> into your sidebar template (or paste HOST_SIDEBAR_SNIPPET.html)." } else { Write-Host "Dry run: no changes were made. Re-run with -Apply to execute actions." }
