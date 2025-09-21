$src = Join-Path -Path (Resolve-Path ..\.next).Path -ChildPath 'static'
$dest = Join-Path -Path (Resolve-Path ..\.next).Path -ChildPath 'standalone\_next\static'

if (-not (Test-Path $src)) {
    Write-Error "Source not found: $src"
    exit 1
}

New-Item -ItemType Directory -Force -Path $dest | Out-Null
Get-ChildItem -Path $src -Recurse | ForEach-Object {
    $target = Join-Path $dest ($_.FullName.Substring($src.Length).TrimStart('\'))
    $tdir = Split-Path $target -Parent
    if (-not (Test-Path $tdir)) { New-Item -ItemType Directory -Path $tdir -Force | Out-Null }
    Copy-Item -Path $_.FullName -Destination $target -Force
}
Write-Host "Copied $src to $dest"
exit 0
