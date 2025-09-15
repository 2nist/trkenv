Param()
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

python -m pip install -r requirements.txt

$session = Join-Path $root 'work/lyrics-demo'
New-Item -ItemType Directory -Force -Path (Join-Path $session 'segments') | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $session 'stems/SEG00') | Out-Null
Copy-Item (Join-Path $root 'samples/short_vocal.wav') (Join-Path $session 'segments/seg_00.wav') -Force
Copy-Item (Join-Path $root 'samples/short_vocal.wav') (Join-Path $session 'stems/SEG00/vocals.wav') -Force

# Ensure Transformers does not try to import TensorFlow
$env:TRANSFORMERS_NO_TF = '1'

$here = @'
import os
os.environ["TRANSFORMERS_NO_TF"] = "1"
from pathlib import Path
from src.speech_to_text import transcribe_to_vtt
from src.lyrics_utils import write_vtt_and_merge_json
import yaml
from shutil import copyfile

cfg = yaml.safe_load(open('config.yaml', 'r', encoding='utf-8'))
# Force safe ASR settings for demo (CPU-friendly, avoid TF)
cfg.setdefault('asr', {})
cfg['asr']['align'] = True
cfg['asr']['model_size'] = cfg['asr'].get('model_size', 'large-v3')
cfg['asr']['compute_type'] = cfg['asr'].get('compute_type', 'int8')
cfg['asr']['language'] = cfg['asr'].get('language', 'en')
seg_dir = Path('work/lyrics-demo/SEG00')
seg_dir.mkdir(parents=True, exist_ok=True)
copyfile('work/lyrics-demo/segments/seg_00.wav', seg_dir/'seg_00.wav')
stem_dir = Path('work/lyrics-demo/stems/SEG00')
res = transcribe_to_vtt(seg_dir/'seg_00.wav', stem_dir, cfg)
vtt = write_vtt_and_merge_json(seg_dir, res, cfg)
print('VTT:', vtt)
print('JSON:', next(seg_dir.glob('*.jcrd.json')))
'@

$here | python -

Write-Host "Done. Check work/lyrics-demo/SEG00/lyrics and JSON."
