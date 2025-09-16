from fastapi import APIRouter, HTTPException
from pathlib import Path
import json

router = APIRouter(prefix="/api")

ROOT = Path(__file__).resolve().parents[3]
MODULES = ROOT / "modules"

@router.get('/registry')
def registry():
    """Discover modules under `modules/*/*/manifest.json` and group them by kind.

    Returns a JSON object with keys like 'panels', 'tools', etc., each an array of manifest objects.
    """
    out = {"panels": [], "tools": [], "jobs": [], "devices": [], "datasets": [], "exporters": []}
    if not MODULES.exists():
        return out
    for man in MODULES.glob("**/manifest.json"):
        try:
            data = json.loads(man.read_text(encoding='utf-8'))
        except Exception:
            continue
        kind = data.get('kind') or 'panel'
        if kind == 'tool':
            out['tools'].append(data)
        elif kind == 'job':
            out['jobs'].append(data)
        elif kind == 'device':
            out['devices'].append(data)
        elif kind == 'dataset':
            out['datasets'].append(data)
        elif kind == 'exporter':
            out['exporters'].append(data)
        else:
            out['panels'].append(data)
    return out
