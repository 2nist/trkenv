from __future__ import annotations
from fastapi import APIRouter, HTTPException
from pathlib import Path
import json
from typing import Any, Dict

router = APIRouter(prefix="/api/songs", tags=["songs"])

ROOT = Path(__file__).resolve().parents[3]
ART = ROOT / "artifacts"
SONGS = ART / "songs"


def _song_dir(song_id: str) -> Path:
    return SONGS / song_id


def _read_json(fp: Path) -> Dict[str, Any] | None:
    if not fp.exists():
        return None
    try:
        return json.loads(fp.read_text(encoding="utf-8"))
    except Exception:
        return None


@router.get("/{song_id}/jcrd")
def get_jcrd(song_id: str):
    fp = _song_dir(song_id) / "jcrd.json"
    data = _read_json(fp)
    if data is None:
        raise HTTPException(404, "jcrd not found")
    return data


@router.get("/{song_id}/context")
def get_context(song_id: str):
    jcrd = _read_json(_song_dir(song_id) / "jcrd.json") or {}
    meta = jcrd.get("metadata", {})
    tempo = float(meta.get("tempo") or 120)
    ts = meta.get("time_signature") or "4/4"
    duration = float(jcrd.get("duration") or 0)
    return {"tempo_bpm": tempo, "time_signature": ts, "duration_s": duration}


@router.get("/{song_id}/indices")
def get_indices(song_id: str):
    base = _song_dir(song_id)
    beatgrid = _read_json(base / "beatgrid.json") or {}
    sections = _read_json(base / "sections.json") or {}
    chords = _read_json(base / "chords.json") or {}
    return {"beatgrid": beatgrid, "sections": sections, "chords": chords}
