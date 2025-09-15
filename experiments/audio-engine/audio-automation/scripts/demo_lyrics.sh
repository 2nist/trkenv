#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Ensure deps
python -m pip install -r requirements.txt

# Make a tiny session folder
SESSION="work/lyrics-demo"
mkdir -p "$SESSION/segments" "$SESSION/stems/SEG00"
cp samples/short_vocal.wav "$SESSION/segments/seg_00.wav"
# Optionally duplicate as vocals stem to simulate prior stem separation
cp samples/short_vocal.wav "$SESSION/stems/SEG00/vocals.wav"

# Build a SEG00 view and run asr utils
python - <<'PY'
from pathlib import Path
from src.speech_to_text import transcribe_to_vtt
from src.lyrics_utils import write_vtt_and_merge_json
import yaml
from shutil import copyfile

cfg = yaml.safe_load(open("config.yaml", "r", encoding="utf-8"))
seg_dir = Path("work/lyrics-demo/SEG00")
seg_dir.mkdir(parents=True, exist_ok=True)
copyfile("work/lyrics-demo/segments/seg_00.wav", seg_dir/"seg_00.wav")
stem_dir = Path("work/lyrics-demo/stems/SEG00")
res = transcribe_to_vtt(seg_dir/"seg_00.wav", stem_dir, cfg)
vtt = write_vtt_and_merge_json(seg_dir, res, cfg)
print("VTT:", vtt)
print("JSON:", next(seg_dir.glob("*.jcrd.json")))
PY

echo "Done. Check work/lyrics-demo/SEG00/lyrics and JSON."
