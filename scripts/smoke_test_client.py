"""In-process smoke test using FastAPI TestClient.

This starts the app in-process (no uvicorn child), POSTs a job to audio-engine with a temporary audio file,
polls status until done, and asserts that expected artifacts exist in the run directory.
"""
from __future__ import annotations
import tempfile, wave, os, json, time
from pathlib import Path
from fastapi.testclient import TestClient

# ensure project root on path
ROOT = Path(__file__).resolve().parents[1]
import sys
sys.path.insert(0, str(ROOT))

from apps.server import main

client = TestClient(main.app)

# create a tiny WAV file
tmp = tempfile.mkdtemp(prefix="trk-smoke-")
wav_path = Path(tmp) / "tone.wav"
with wave.open(str(wav_path), 'wb') as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(8000)
    # 0.1s of silence
    w.writeframes(b'\x00\x00' * 800)

audio_uri = f"file:///{wav_path.resolve().as_posix()}"
print('Using audio:', audio_uri)

# sanity checks
r = client.get('/api/health'); assert r.status_code == 200
exps = client.get('/api/experiments').json().get('experiments', [])
ids = [e['id'] for e in exps]
assert 'audio-engine' in ids, f"audio-engine not found in experiments: {ids}"

# start job
print('Starting job...')
job = client.post('/api/experiments/audio-engine/jobs', json={'audio': audio_uri}).json()
job_id = job.get('jobId') or job.get('id')
assert job_id, 'no job id'
print('Job id', job_id)

# poll
deadline = time.time() + 30
state = None
while time.time() < deadline:
    st = client.get(f'/api/jobs/{job_id}/status').json()
    if st.get('state') != state:
        state = st.get('state'); print('state', state)
    if state in ('done','error'):
        break
    time.sleep(0.5)

arts = client.get(f'/api/jobs/{job_id}/artifacts').json()
print(json.dumps(arts, indent=2))
items = arts.get('items', [])
assert any(p['relPath'].endswith('segments.json') for p in items), 'segments.json not produced'
print('Smoke test passed.')
