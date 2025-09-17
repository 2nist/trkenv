#!/usr/bin/env python3
"""
Read all .jcrd.json files from datasets/beatles and POST them to the backend /admin/import endpoint as a list.
"""
import json
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[1]
BEATLES_DIR = ROOT / 'datasets' / 'beatles'
API = 'http://localhost:8000'

files = list(BEATLES_DIR.glob('*.jcrd.json'))
print(f'Found {len(files)} files in {BEATLES_DIR}')

songs = []
for f in files:
    try:
        data = json.loads(f.read_text(encoding='utf-8'))
    except Exception as e:
        print('Failed to read', f, e)
        continue
    # Keep the original filename as a fallback title if metadata missing
    if isinstance(data, dict):
        # ensure each song has a source wrapper
        songs.append({'source': data, 'title': data.get('metadata', {}).get('title') or data.get('title') or f.stem})

if not songs:
    print('No song objects to import')
    raise SystemExit(1)

print(f'Posting {len(songs)} songs to {API}/admin/import')
resp = requests.post(f'{API}/admin/import', json={'songs': songs})
print('Status:', resp.status_code)
try:
    print(resp.json())
except Exception:
    print(resp.text)
