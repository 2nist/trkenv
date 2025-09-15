import json
from pathlib import Path


def test_vtt_srt_and_json_words_exist(tmp_path):
    # Assume demo script has been run
    root = Path(".")
    seg = root / "work" / "lyrics-demo" / "SEG00"
    vtt = seg / "lyrics" / "SEG00.vtt"
    srt = seg / "lyrics" / "SEG00.srt"
    jsn = next(seg.glob("*.jcrd.json"), None)
    assert vtt.exists(), "VTT not generated"
    assert srt.exists(), "SRT not generated"
    assert jsn and jsn.exists(), "Track JSON not written"
    data = json.loads(jsn.read_text(encoding="utf-8"))
    lyr = data.get("lyrics") or {}
    assert "vtt_path" in lyr and "srt_path" in lyr
    assert isinstance(lyr.get("lines_preview", []), list)
