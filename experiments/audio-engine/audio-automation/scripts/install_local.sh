#!/usr/bin/env bash
set -euo pipefail

python -m pip install -r requirements.txt

echo "Remember to install system tools: ffmpeg and chromaprint (fpcalc)." 
echo "Optionally export ACOUSTID_API_KEY for identification."
