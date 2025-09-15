from __future__ import annotations
from pathlib import Path
from typing import Dict, Optional
import shutil

from .utils import ensure_dir, safe_copy, slugify, write_json
import json


def apply_pattern(info: Dict, pattern: str) -> str:
    defaults = {
        "artist": info.get("artist") or "Unknown Artist",
        "album": info.get("album") or "Unknown Album",
        "tracknum": info.get("tracknum") or 1,
        "title": info.get("title") or "Untitled",
    }
    # Support {tracknum:02d}
    path = pattern
    path = path.replace("{artist}", slugify(str(defaults["artist"])) or "unknown-artist")
    path = path.replace("{album}", slugify(str(defaults["album"])) or "unknown-album")
    tn = int(defaults["tracknum"]) if str(defaults["tracknum"]).isdigit() else 1
    path = path.replace("{tracknum:02d}", f"{tn:02d}")
    path = path.replace("{title}", slugify(str(defaults["title"])) or "untitled")
    return path


def run(segment_wav: Path, seg_idx: int, stems_dir: Optional[Path], midi_dir: Optional[Path],
        chords_root: Path, out_root: Path, organize_cfg: Dict, info: Dict, logger) -> Path:
    rel = apply_pattern(info, organize_cfg.get("pattern", "{artist}/{album}/{tracknum:02d} - {title}"))
    dest_dir = ensure_dir(out_root / rel)

    # Copy/move according to config
    if organize_cfg.get("copy_original", True):
        safe_copy(segment_wav, dest_dir / segment_wav.name, logger=logger)
    if stems_dir and organize_cfg.get("copy_stems", True) and stems_dir.exists():
        for p in stems_dir.glob("*.wav"):
            safe_copy(p, dest_dir / "stems" / p.name, logger=logger)
    if midi_dir and organize_cfg.get("copy_midi", True) and midi_dir.exists():
        for p in midi_dir.rglob("*.mid"):
            relp = p.relative_to(midi_dir)
            safe_copy(p, dest_dir / "midi" / relp, logger=logger)
    if organize_cfg.get("copy_chords", True):
        for p in chords_root.rglob("*.jcrd.json"):
            safe_copy(p, dest_dir / "chords" / p.name, logger=logger)

    # Lyrics (VTT/SRT) copied from the segment work dir using paths embedded in the SEGXX jcrd JSON
    if organize_cfg.get("copy_lyrics", True):
        try:
            seg_dir = chords_root / f"SEG{seg_idx:02d}"
            # Find the SEGXX jcrd.json (it should have lyrics paths populated by lyrics_utils)
            jcrd = next(seg_dir.glob("*.jcrd.json"), None)
            if jcrd and jcrd.exists():
                data = json.loads(jcrd.read_text(encoding="utf-8"))
                # Look for any section that contains vtt_path/srt_path
                for k, v in (data.items() if isinstance(data, dict) else []):
                    if isinstance(v, dict):
                        vtt_rel = v.get("vtt_path")
                        srt_rel = v.get("srt_path")
                        if vtt_rel:
                            vtt_src = seg_dir / vtt_rel
                            if vtt_src.exists():
                                safe_copy(vtt_src, dest_dir / "lyrics" / vtt_src.name, logger=logger)
                        if srt_rel:
                            srt_src = seg_dir / srt_rel
                            if srt_src.exists():
                                safe_copy(srt_src, dest_dir / "lyrics" / srt_src.name, logger=logger)
        except Exception as e:
            logger.warning("Failed to copy lyrics for segment %02d: %s", seg_idx, e)

    # metadata.json
    write_json(dest_dir / "metadata.json", info)
    return dest_dir
