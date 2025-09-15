from pathlib import Path
import json

from src.transpose_chords import _walk_and_transpose


def test_transpose_nested(tmp_path: Path):
    data = {
        "sections": [
            {"chords": ["C", "G", "Am", "F"]},
            {"lines": [{"chords": ["F", "G", "Em", "Am"]}]},
        ]
    }
    out = _walk_and_transpose(data, 2)
    # simple smoke: C->D, G->A
    assert out["sections"][0]["chords"][0] in ("D", "Dmaj", "Dmajor")
