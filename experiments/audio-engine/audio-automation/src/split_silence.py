from __future__ import annotations
from dataclasses import dataclass
from pathlib import Path
from typing import List, Tuple
import json

from .utils import ensure_dir, run_cmd, write_json


@dataclass
class Segment:
    start: float
    end: float
    peak_dbfs: float | None = None


def parse_silencedetect(stderr_text: str) -> List[Tuple[str, float]]:
    """Parse ffmpeg silencedetect messages into events: (type, time).
    type is 'start' or 'end'.
    """
    events: List[Tuple[str, float]] = []
    for line in stderr_text.splitlines():
        line = line.strip()
        if "silence_start:" in line:
            try:
                t = float(line.split("silence_start:")[-1].strip())
                events.append(("start", t))
            except Exception:
                pass
        elif "silence_end:" in line and "silence_duration:" in line:
            try:
                # silence_end: 6.2 | silence_duration: 1.5
                parts = line.split("silence_end:")[-1].strip().split("|")
                t = float(parts[0].strip())
                events.append(("end", t))
            except Exception:
                pass
    return events


def detect_and_split(mix_path: Path, out_dir: Path, threshold_db: int, min_silence: float,
                     min_track_len: float, logger) -> tuple[list[Segment], Path]:
    """Detect silences and cut segments into out_dir. Returns (segments, segments_json_path).
    If no silences, return single segment spanning whole file.
    """
    ensure_dir(out_dir)
    cmd = [
        "ffmpeg", "-hide_banner", "-i", str(mix_path),
        "-af", f"silencedetect=noise={threshold_db}dB:d={min_silence}",
        "-f", "null", "-"
    ]
    res = run_cmd(cmd, logger=logger)
    events = parse_silencedetect(res.stderr)

    # Build cut points
    duration = None
    from .utils import ffprobe_duration
    duration = ffprobe_duration(mix_path, logger=logger)

    cuts: List[float] = [0.0]
    sil_start = None
    for typ, t in events:
        if typ == "start":
            sil_start = t
        elif typ == "end" and sil_start is not None:
            # If silence long enough already ensured by filter
            cuts.append(sil_start)
            cuts.append(t)
            sil_start = None
    if duration is not None:
        cuts.append(duration)
    cuts = sorted(set([round(c, 3) for c in cuts if c is not None]))

    # Merge into non-silent regions: between (end of silence) and (start of next silence)
    segs: List[Segment] = []
    if len(cuts) <= 2:
        if duration is None:
            duration = 0.0
        segs = [Segment(0.0, float(duration))]
    else:
        # cuts like [0, sil_start1, sil_end1, sil_start2, sil_end2, ..., duration]
        # Non-silent regions: [0, sil_start1], [sil_end1, sil_start2], ..., [sil_endN, duration]
        last_end = 0.0
        i = 1
        while i < len(cuts) - 1:
            # cuts[i] is a silence start, cuts[i+1] is silence end
            sil_s = cuts[i]
            segs.append(Segment(last_end, sil_s))
            last_end = cuts[i + 1]
            i += 2
        # tail
        if duration and last_end < duration:
            segs.append(Segment(last_end, duration))

    # Enforce min_track_len
    segs = [s for s in segs if (s.end - s.start) >= min_track_len]
    if not segs and duration is not None and duration > 0:
        segs = [Segment(0.0, duration)]

    # Export wavs
    realized: List[Segment] = []
    for idx, s in enumerate(segs):
        out_path = out_dir / f"seg_{idx:02d}.wav"
        cmd = [
            "ffmpeg", "-y", "-i", str(mix_path), "-ss", str(s.start), "-to", str(s.end),
            "-c", "copy", str(out_path)
        ]
        run_cmd(cmd, logger=logger)
        realized.append(s)

    seg_json = out_dir / "segments.json"
    write_json(seg_json, {
        "source": str(mix_path),
        "segments": [{"start": s.start, "end": s.end, "peak_dbfs": s.peak_dbfs} for s in realized]
    })

    return realized, seg_json
