import json
from pathlib import Path
import webvtt
import pysrt


def write_vtt_and_merge_json(seg_dir, asr_res, cfg):
    seg_dir = Path(seg_dir)
    lyr_dir = seg_dir / cfg["lyrics"]["vtt_relpath"]
    lyr_dir.mkdir(parents=True, exist_ok=True)
    base = seg_dir.name
    vtt_path = lyr_dir / f"{base}.vtt"
    srt_path = (seg_dir / cfg["lyrics"]["srt_relpath"]) / f"{base}.srt"

    # Build cues
    segments = asr_res.get("segments", [])
    if not segments:
        segments = [{"start": 0.0, "end": 5.0, "text": "♪ (instrumental)"}]

    # VTT
    vtt = webvtt.WebVTT()
    for s in segments:
        vtt.captions.append(webvtt.Caption(_fmt(s["start"]), _fmt(s["end"]), s["text"]))
    vtt.save(str(vtt_path))

    # SRT (optional)
    if cfg["lyrics"].get("export_srt", True):
        srt_path.parent.mkdir(parents=True, exist_ok=True)
        subs = pysrt.SubRipFile()
        for i, s in enumerate(segments, 1):
            sub = pysrt.SubRipItem(
                index=i,
                start=_srt_time(s["start"]),
                end=_srt_time(s["end"]),
                text=s["text"]
            )
            subs.append(sub)
        subs.save(str(srt_path), encoding="utf-8")
    else:
        srt_path = None

    # Merge words + paths into track JSON
    json_path = next(seg_dir.glob("*.jcrd.json"), None) or (seg_dir / f"{base}.jcrd.json")
    data = {}
    if json_path.exists():
        data = json.loads(json_path.read_text(encoding="utf-8"))

    key = cfg["lyrics"]["json_key"]
    data.setdefault(key, {})
    preview = [c.text for c in vtt if c.text][:6]
    data[key].update({
        "vtt_path": str(vtt_path.relative_to(seg_dir)),
        "srt_path": (str(srt_path.relative_to(seg_dir)) if srt_path else None),
        "language": asr_res.get("language", "und"),
        "generator": "faster-whisper+whisperx" if asr_res.get("words") else "faster-whisper",
        "lines_preview": preview
    })

    if cfg["lyrics"].get("json_include_words", True) and asr_res.get("words"):
        data[key]["words"] = asr_res["words"]

    json_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return vtt_path


def _fmt(t):
    ms = int(round((t - int(t)) * 1000))
    s = int(t) % 60
    m = (int(t) // 60) % 60
    h = int(t) // 3600
    return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"


ess = ":"  # delimiter

def _srt_time(t):
    ms = int(round((t - int(t)) * 1000))
    s = int(t) % 60
    m = (int(t) // 60) % 60
    h = int(t) // 3600
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
