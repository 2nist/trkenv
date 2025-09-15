import tempfile, wave, time, json
from pathlib import Path
from fastapi.testclient import TestClient
import sys

# ensure project root
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from apps.server import main

client = TestClient(main.app)

def make_wav(path: Path):
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(8000)
        w.writeframes(b'\x00\x00' * 800)

def test_audio_engine_smoke(tmp_path: Path):
    wav = tmp_path / 'tone.wav'
    make_wav(wav)
    audio_uri = f"file:///{wav.resolve().as_posix()}"

    r = client.get('/api/health')
    assert r.status_code == 200

    exps = client.get('/api/experiments').json().get('experiments', [])
    ids = [e['id'] for e in exps]
    assert 'audio-engine' in ids

    job = client.post('/api/experiments/audio-engine/jobs', json={'audio': audio_uri}).json()
    job_id = job.get('jobId') or job.get('id')
    assert job_id

    deadline = time.time() + 15
    state = None
    while time.time() < deadline:
        st = client.get(f'/api/jobs/{job_id}/status').json()
        if st.get('state') != state:
            state = st.get('state')
        if state in ('done','error'):
            break
        time.sleep(0.25)

    assert state == 'done'
    arts = client.get(f'/api/jobs/{job_id}/artifacts').json()
    assert any(p['relPath'].endswith('segments.json') for p in arts.get('items', []))