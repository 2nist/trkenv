import sys
from pathlib import Path
# ensure project root is on sys.path so imports like `apps.server` resolve
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from fastapi.testclient import TestClient
from apps.server import main

client = TestClient(main.app)
resp = client.get('/api/health')
print(resp.status_code)
print(resp.json())
