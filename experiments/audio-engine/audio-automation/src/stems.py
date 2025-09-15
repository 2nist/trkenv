from pathlib import Path
import sys
from .utils import ensure_dir, run_cmd


def run(segment_wav: Path, stems_root: Path, model: str, logger) -> Path:
    """Run demucs to separate stems for given segment.
    Returns the directory containing stems for this segment.
    """
    seg_id = segment_wav.stem
    out_dir = ensure_dir(stems_root / seg_id)
    # Prefer running demucs via Python module to avoid PATH issues on Windows
    cmd = [sys.executable, "-m", "demucs.separate", "-n", model, "-o", str(out_dir), str(segment_wav)]
    res = run_cmd(cmd, logger=logger)
    if res.returncode != 0:
        # Fallback to CLI if available
        cmd_cli = ["demucs", "-n", model, "-o", str(out_dir), str(segment_wav)]
        run_cmd(cmd_cli, logger=logger)

    # Try common demucs output structures
    # demucs writes: out_dir / model / <filename without ext> / {vocals.wav, other.wav, ...}
    # We'll locate the innermost dir and ensure vocals.wav exists.
    candidate = out_dir / model / segment_wav.stem
    if not candidate.exists():
        # Sometimes demucs names folder with full name
        for p in out_dir.rglob("vocals.wav"):
            candidate = p.parent
            break
    return candidate
