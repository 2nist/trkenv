from __future__ import annotations
from fastapi import APIRouter, HTTPException
from typing import Optional
from pathlib import Path
import json

from apps.server.models.timeline import TimelineConfig

# Optional storage helpers
try:
    from apps.server.storage.files import artifact_relpath, write_text
except Exception:  # pragma: no cover
    def artifact_relpath(feature: str, experiment_id: Optional[str] = None, job_id: Optional[str] = None, name: Optional[str] = None) -> Path:
        parts = [feature, experiment_id or "_", job_id or "_"]
        if name:
            parts.append(name)
        return Path(*parts)
    def write_text(rel: Path, text: str, encoding: str = "utf-8") -> Path:
        base = Path("artifacts")
        path = base / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding=encoding)
        return path

def _read_text(rel: Path, encoding: str = "utf-8") -> Optional[str]:
    base = Path("artifacts")
    path = base / rel
    if not path.exists():
        return None
    return path.read_text(encoding=encoding)

router = APIRouter(prefix="/api/timeline", tags=["timeline"]) 

@router.get("/{song_id}/config", response_model=TimelineConfig)
def get_timeline_config(song_id: str):
    rel = artifact_relpath("timeline", song_id, None, "config.json")
    txt = _read_text(rel)
    if not txt:
        return TimelineConfig(song_id=song_id)
    try:
        data = json.loads(txt)
        return TimelineConfig(**data)
    except Exception as e:
        raise HTTPException(status_code=400, detail={"code": "bad_config", "message": str(e)})

@router.put("/{song_id}/config", response_model=TimelineConfig)
@router.patch("/{song_id}/config", response_model=TimelineConfig)
def save_timeline_config(song_id: str, payload: TimelineConfig):
    if payload.song_id != song_id:
        raise HTTPException(status_code=400, detail={"code": "song_mismatch", "message": "song_id mismatch"})
    rel = artifact_relpath("timeline", song_id, None, "config.json")
    # Use Pydantic v2 JSON helper for deterministic JSON export
    write_text(rel, payload.model_dump_json(indent=2))
    return payload
