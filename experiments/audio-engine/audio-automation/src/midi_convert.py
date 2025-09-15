from pathlib import Path
from typing import List

from .utils import ensure_dir
import inspect

try:
    from basic_pitch.inference import predict_and_save
except Exception:  # pragma: no cover
    predict_and_save = None

# Best-effort default model path for Basic Pitch. Newer versions expose it at the top-level package.
try:  # pragma: no cover - environment dependent
    from basic_pitch import ICASSP_2022_MODEL_PATH  # type: ignore
except Exception:  # pragma: no cover
    ICASSP_2022_MODEL_PATH = None  # type: ignore


def _call_basic_pitch(audio_path: Path, out_dir: Path, logger) -> bool:
    """Attempt to call basic_pitch.predict_and_save across versions.

    Returns True if call appears to have succeeded (no TypeError raised), False otherwise.
    """
    if predict_and_save is None:
        return False

    # Strategy:
    # 1) Inspect signature and build the list of required positional args in order.
    # 2) Provide sensible defaults for known flags and model path (ICASSP_2022_MODEL_PATH) when required.
    # 3) Fall back to a couple of known historical call patterns if needed.
    try:
        sig = inspect.signature(predict_and_save)
        required_params = []
        for p in sig.parameters.values():
            # stop collecting when we reach the first parameter with a default value
            if p.default is not inspect._empty:
                break
            required_params.append(p.name)

        # Map of known values
        values = {
            "audio_path_list": [str(audio_path)],
            "output_directory": str(out_dir),
            "save_midi": True,
            "sonify_midi": False,
            "save_model_outputs": False,
            "save_notes": False,
            "model_or_model_path": ICASSP_2022_MODEL_PATH,
        }

        # Build positional args for required parameters in order
        args = []
        for name in required_params:
            if name not in values:
                # Provide minimal safe defaults if a surprising required param appears
                if name in ("onset_threshold", "frame_threshold"):
                    args.append(0.5 if name == "onset_threshold" else 0.3)
                elif name == "minimum_note_length":
                    args.append(127.7)
                else:
                    # Unknown required param; abort to fallback paths
                    raise TypeError(f"Unsupported required parameter: {name}")
            else:
                val = values[name]
                if name == "model_or_model_path" and val is None:
                    # If default model path isn't available, fail to fallback paths
                    raise TypeError("No default Basic Pitch model path available")
                args.append(val)

        predict_and_save(*args)
        return True
    except TypeError as te:
        # Fall back to explicit modern call form first if possible
        try:
            if ICASSP_2022_MODEL_PATH is not None:
                predict_and_save([str(audio_path)], str(out_dir), True, False, False, False, ICASSP_2022_MODEL_PATH)
                return True
        except TypeError:
            pass
        # Older minimal variants
        try:
            predict_and_save([str(audio_path)], str(out_dir))
            return True
        except TypeError:
            pass
        logger.debug("basic-pitch call attempts failed with TypeError chain: %s", te)
        return False


def run(target_wavs: List[Path], midi_root: Path, logger) -> List[Path]:
    """Convert target WAVs to MIDI using Basic Pitch. Returns list of created MIDI files."""
    ensure_dir(midi_root)
    created: List[Path] = []
    for wav in target_wavs:
        out_dir = ensure_dir(midi_root / wav.stem)
        try:
            if predict_and_save:
                ok = _call_basic_pitch(wav, out_dir, logger)
                if ok:
                    for m in out_dir.glob("*.mid"):
                        created.append(m)
                else:
                    logger.warning("basic-pitch predict_and_save signature mismatch; skipping MIDI for %s", wav.name)
            else:
                logger.warning("basic-pitch not available; skipping MIDI for %s", wav.name)
        except Exception as e:  # continue on errors
            logger.warning("MIDI conversion failed for %s: %s", wav.name, e)
    return created
