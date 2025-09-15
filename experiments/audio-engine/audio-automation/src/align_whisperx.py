from pathlib import Path
from typing import List, Dict, Any, Optional


def try_imports() -> bool:
    try:
        import whisperx  # noqa: F401
        return True
    except Exception:
        return False


def align_words(audio_path: Path, transcript_segments: List[Dict[str, Any]], lang: Optional[str], diarize: bool, word_conf_min: float) -> Dict[str, Any]:
    """
    Inputs:
      - audio_path: wav to align
      - transcript_segments: [{"start": float, "end": float, "text": str}, ...]
      - lang: ISO code or None
      - diarize: enable pyannote diarization
      - word_conf_min: drop words below confidence
    Returns:
      {"words": [{"t0": float, "t1": float, "text": str, "speaker": Optional[str], "conf": float}, ...]}
    """
    import whisperx
    import torch

    device = "cuda" if torch.cuda.is_available() else "cpu"

    # Load alignment model only (avoid loading ASR)
    align_lang = (lang or "en")
    # API compatibility: use language_code for current whisperx version
    model_a, metadata = whisperx.load_align_model(language_code=align_lang, device=device)

    # Prepare transcript for aligner (list of dicts with start/end/text)
    segs = [{"start": float(s["start"]), "end": float(s["end"]), "text": s["text"]} for s in transcript_segments]
    # Try to load audio via whisperx (ffmpeg). Fallback to librosa if ffmpeg missing.
    try:
        audio = whisperx.load_audio(str(audio_path))
    except Exception:
        try:
            import librosa
            y, _sr = librosa.load(str(audio_path), sr=16000, mono=True)
            audio = y
        except Exception as e:
            raise RuntimeError(f"Failed to load audio for alignment: {e}")

    aligned = whisperx.align(segs, model_a, metadata, audio, device)

    if diarize:
        try:
            # Avoid requiring auth token; users can set env if needed
            diar = whisperx.DiarizationPipeline()
            diar_segments = diar(str(audio_path))
            aligned = whisperx.assign_word_speakers(diar_segments, aligned)
        except Exception:
            # Diarization optional; proceed without speakers
            pass

    words = []
    for w in aligned.get("word_segments", []):
        conf = float(w.get("score", 1.0))
        if conf < word_conf_min:
            continue
        text = w.get("word") or w.get("text") or ""
        words.append({
            "t0": float(w.get("start", 0.0)),
            "t1": float(w.get("end", 0.0)),
            "text": text,
            "speaker": w.get("speaker"),
            "conf": conf,
        })
    return {"words": words}
