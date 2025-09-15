from __future__ import annotations
from pathlib import Path
import json
from typing import Any

from .utils import ensure_dir

try:
    from pychord import Chord
    from pychord.constants import NOTE_VAL_DICT
except Exception:  # pragma: no cover
    Chord = None
    NOTE_VAL_DICT = {}


SEMITONES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]


def transpose_symbol(sym: str, semitones: int) -> str:
    if not sym or Chord is None:
        return sym
    try:
        c = Chord(sym)
        # Compute new root
        root = c.root_tone
        if root is None:
            return sym
        idx = SEMITONES.index(root)
        new_idx = (idx + semitones) % 12
        new_root = SEMITONES[new_idx]
        # Rebuild chord symbol
        suffix = c.chord_quality or ""
        if c.on_tone:
            bass_idx = SEMITONES.index(c.on_tone)
            bass_new = SEMITONES[(bass_idx + semitones) % 12]
            return f"{new_root}{suffix}/{bass_new}"
        return f"{new_root}{suffix}"
    except Exception:
        return sym


def _walk_and_transpose(data: Any, semitones: int) -> Any:
    if isinstance(data, dict):
        new = {}
        for k, v in data.items():
            if k == "chords" and isinstance(v, list):
                new[k] = [transpose_symbol(x, semitones) for x in v]
            else:
                new[k] = _walk_and_transpose(v, semitones)
        return new
    elif isinstance(data, list):
        return [_walk_and_transpose(x, semitones) for x in data]
    elif isinstance(data, str):
        # Single chord field
        return transpose_symbol(data, semitones)
    else:
        return data


def run(glob_pattern: str, root: Path, semitones: int, logger) -> None:
    for path in root.rglob("*.jcrd.json"):
        if not path.match(glob_pattern):
            continue
        try:
            content = json.loads(path.read_text(encoding="utf-8"))
            new_content = _walk_and_transpose(content, semitones)
            path.write_text(json.dumps(new_content, indent=2, ensure_ascii=False), encoding="utf-8")
            logger.info("Transposed chords: %s by %+d semitones", path.name, semitones)
        except Exception as e:
            logger.warning("Chord transpose failed for %s: %s", path.name, e)
