from __future__ import annotations
from pathlib import Path
from typing import Dict, Optional
import json
import os

from .utils import run_cmd

try:
    import acoustid
except Exception:  # pragma: no cover
    acoustid = None


DEFAULT_MB_USERAGENT = "audio-automation/0.1 (example@example.com)"


def fingerprint(wav_path: Path, logger) -> Optional[Dict]:
    """Run fpcalc and query AcoustID, returning best result dict or None."""
    api_key = os.environ.get("ACOUSTID_API_KEY")
    if acoustid is None or not api_key:
        # Try cached sample
        samples = Path(__file__).resolve().parents[1] / "samples" / "acoustid_sample_response.json"
        if samples.exists():
            try:
                data = json.loads(samples.read_text(encoding="utf-8"))
                r = (data.get("results") or [{}])[0]
                if r:
                    return {"artist": r.get("artist") or None, "title": r.get("title") or None}
            except Exception:
                pass
        logger.warning("pyacoustid or ACOUSTID_API_KEY missing; skipping ID for %s", wav_path.name)
        return None
    try:
        results = list(acoustid.match(api_key, str(wav_path)))
        if not results:
            return None
        score, rid, title, artist = None, None, None, None
        best = results[0]
        # results: (score, recording_id, title, artist)
        if isinstance(best, tuple) and len(best) >= 4:
            score, rid, title, artist = best[:4]
        if score is not None and score >= 0.5:
            return {"artist": artist or None, "title": title or None}
    except Exception as e:
        logger.warning("AcoustID lookup failed: %s", e)
    return None


def best_guess(idx: int) -> Dict:
    nn = idx + 1
    return {
        "artist": "Unknown Artist",
        "title": f"Segment {nn:02d}",
        "album": "Unknown Album",
        "tracknum": nn,
    }
