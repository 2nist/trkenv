# Run the quick smoke test against a running host (default 8000)
param(
    [string]$Base = "http://127.0.0.1:8000",
    [string]$Audio = "file:///C:/path/to/audio.mp3"
)
. .\.venv\Scripts\Activate.ps1
python scripts/smoke_api.py --base $Base --audio $Audio
