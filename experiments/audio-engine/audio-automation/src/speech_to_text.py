from __future__ import annotations
from pathlib import Path
from typing import Dict, Any, List

from .align_whisperx import try_imports as _whisperx_avail, align_words

try:
    from faster_whisper import WhisperModel
except Exception:  # pragma: no cover
    WhisperModel = None  # type: ignore


def _do_faster_whisper(audio_path: Path, cfg: Dict[str, Any]) -> Dict[str, Any]:
    model_size = cfg.get("asr", {}).get("model_size", "large-v3")
    compute_type = cfg.get("asr", {}).get("compute_type", "int8")
    language = cfg.get("asr", {}).get("language") or None
    if WhisperModel is None:
        # Fallback: dummy segments
        return {
            "language": language or "en",
            "segments": [{"start": 0.0, "end": 2.0, "text": "la la la"}],
        }
    model = WhisperModel(model_size, device="auto", compute_type=compute_type)
    segments, info = model.transcribe(str(audio_path), language=language)
    segs = [{"start": float(s.start), "end": float(s.end), "text": s.text.strip()} for s in segments]
    return {"language": info.language or language or "en", "segments": segs}


def transcribe_to_vtt(segment_wav: Path, stems_dir: Path, cfg: Dict[str, Any]) -> Dict[str, Any]:
    """Transcribe and optionally align words; return ASR result dict."""
    res = _do_faster_whisper(segment_wav, cfg)

    if cfg.get("asr", {}).get("align", False) and _whisperx_avail():
        target = Path(stems_dir) / "vocals.wav"
        audio = target if target.exists() else Path(segment_wav)
        aligned = align_words(
            audio_path=audio,
            transcript_segments=res.get("segments", []),
            lang=res.get("language"),
            diarize=bool(cfg.get("asr", {}).get("diarize", False)),
            word_conf_min=float(cfg.get("lyrics", {}).get("word_conf_min", 0.0)),
        )
        res["words"] = aligned.get("words", [])
    else:
        res["words"] = []
    return res
