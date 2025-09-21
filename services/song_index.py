from __future__ import annotations
from pathlib import Path
from typing import Any, Dict, List, Tuple
import json

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "artifacts"
SONGS = ART / "songs"


def _parse_time_signature(ts: str | None) -> Tuple[int, int]:
    try:
        if not ts:
            return (4, 4)
        a, b = ts.split("/")
        return (int(a), int(b))
    except Exception:
        return (4, 4)


def compute_beatgrid(tempo_bpm: float, time_signature: str, duration_s: float) -> Dict[str, Any]:
    """Compute a simple beat grid with bars and beats up to duration_s.

    Returns a dict {"beats": [{"t": seconds, "bar": n, "beat": k}]}
    """
    tempo_bpm = float(tempo_bpm or 120)
    beats_per_sec = tempo_bpm / 60.0
    (num, denom) = _parse_time_signature(time_signature)
    # beats per bar assuming denom is quarter note baseline
    beat_unit = 4 / max(1, denom)
    beats_per_bar = int(round(num * beat_unit))
    beats: List[Dict[str, Any]] = []
    t = 0.0
    idx = 0
    while t <= max(0.0, float(duration_s or 0)) + 1e-6:
        bar = idx // max(1, beats_per_bar)
        beat_in_bar = idx % max(1, beats_per_bar)
        beats.append({"t": round(t, 6), "bar": int(bar), "beat": int(beat_in_bar)})
        idx += 1
        t = idx / beats_per_sec
    return {"beats": beats, "beats_per_bar": beats_per_bar, "tempo_bpm": tempo_bpm, "time_signature": time_signature}


def derive_sections(jcrd: Dict[str, Any]) -> Dict[str, Any]:
    sections = []
    for s in (jcrd.get("sections") or []):
        try:
            start = float(s.get("start_s") or s.get("start") or 0)
            end = float(s.get("end_s") or s.get("end") or start)
            name = s.get("name") or s.get("label") or "Section"
            sections.append({"name": name, "start_s": start, "end_s": end})
        except Exception:
            pass
    return {"sections": sections}


def derive_chords(jcrd: Dict[str, Any]) -> Dict[str, Any]:
    chords = []
    for cp in (jcrd.get("chord_progression") or []):
        try:
            if isinstance(cp, dict):
                t = float(cp.get("time") or cp.get("t") or 0)
                sym = str(cp.get("chord") or cp.get("symbol") or "")
            elif isinstance(cp, (list, tuple)):
                t = float(cp[0]) if len(cp) > 0 else 0.0
                sym = str(cp[1]) if len(cp) > 1 else ""
            else:
                continue
            chords.append({"t": t, "symbol": sym})
        except Exception:
            pass
    return {"chords": chords}


def song_index(song_id: str) -> Dict[str, Any]:
    """Read jcrd and write indices (beatgrid, sections, chords) under artifacts/songs/<id>/.
    Returns a summary of what was written.
    """
    base = SONGS / song_id
    base.mkdir(parents=True, exist_ok=True)
    jcrd_fp = base / "jcrd.json"
    if not jcrd_fp.exists():
        raise FileNotFoundError(f"jcrd not found for song {song_id}")
    jcrd = json.loads(jcrd_fp.read_text(encoding="utf-8"))
    meta = jcrd.get("metadata", {})
    tempo = float(meta.get("tempo") or 120)
    ts = meta.get("time_signature") or "4/4"
    duration = float(jcrd.get("duration") or 0)

    beatgrid = compute_beatgrid(tempo, ts, duration)
    (base / "beatgrid.json").write_text(json.dumps(beatgrid, indent=2), encoding="utf-8")

    sections = derive_sections(jcrd)
    (base / "sections.json").write_text(json.dumps(sections, indent=2), encoding="utf-8")

    chords = derive_chords(jcrd)
    (base / "chords.json").write_text(json.dumps(chords, indent=2), encoding="utf-8")

    return {"beatgrid": True, "sections": True, "chords": True}
