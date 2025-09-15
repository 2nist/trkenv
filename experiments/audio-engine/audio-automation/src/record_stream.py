from pathlib import Path
from typing import List
import sys

from .utils import run_cmd, ensure_dir


def run(playlist_file: Path, session_dir: Path, mode: str, audio_format: str,
        sample_rate: int, channels: int, logger) -> Path:
    """Download/record URLs to a single mix.wav, concatenating if multiple.
    Returns path to mix.wav.
    """
    urls = []
    if playlist_file.exists():
        urls = [l.strip() for l in playlist_file.read_text(encoding="utf-8").splitlines()
                if l.strip() and not l.strip().startswith("#")]
    if not urls:
        return session_dir / f"mix.{audio_format}"

    tmp_dir = ensure_dir(session_dir / "downloads")
    parts: List[Path] = []

    for idx, entry in enumerate(urls):
        # Accept local file paths in playlist for offline runs
        entry_path = Path(entry)
        if not entry_path.is_absolute():
            # Resolve relative to playlist file directory
            entry_path = (playlist_file.parent / entry_path).resolve()

        if entry_path.exists():
            # Local file: transcode to desired format/sample rate/channels
            out_local = tmp_dir / f"item_{idx:02d}.{audio_format}"
            ffm_local = [
                "ffmpeg", "-y", "-i", str(entry_path),
                "-ac", str(channels), "-ar", str(sample_rate), str(out_local),
            ]
            run_cmd(ffm_local, logger=logger)
            if out_local.exists():
                parts.append(out_local)
            continue

        # Remote URL: use downloader per mode
        outpath = tmp_dir / f"item_{idx:02d}.%(ext)s"
        if mode == "yt-dlp":
            # Best audio, convert to desired format via yt-dlp/ffmpeg
            cmd = [
                sys.executable, "-m", "yt_dlp", entry,
                "-f", "bestaudio/best",
                "-x", "--audio-format", audio_format,
                "-o", str(outpath),
            ]
            run_cmd(cmd, logger=logger)
            # yt-dlp writes with proper ext; collect all created files for this idx
            for p in tmp_dir.glob(f"item_{idx:02d}.*"):
                if p.suffix.lower().lstrip('.') == audio_format.lower():
                    parts.append(p)
        else:
            # streamlink → save to temp file then convert via ffmpeg
            ts_path = tmp_dir / f"item_{idx:02d}.ts"
            wav_path = tmp_dir / f"item_{idx:02d}.{audio_format}"
            sl_cmd = [sys.executable, "-m", "streamlink", entry, "best", "-o", str(ts_path)]
            run_cmd(sl_cmd, logger=logger)
            ffm = [
                "ffmpeg", "-y", "-i", str(ts_path),
                "-ac", str(channels), "-ar", str(sample_rate), str(wav_path),
            ]
            run_cmd(ffm, logger=logger)
            parts.append(wav_path)

    # Concatenate
    mix_path = session_dir / f"mix.{audio_format}"
    if len(parts) == 1:
        parts[0].replace(mix_path)
        return mix_path

    concat_list = session_dir / "concat.txt"
    with concat_list.open("w", encoding="utf-8") as f:
        for p in parts:
            f.write(f"file '{p.as_posix()}'\n")
    cmd = ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat_list), "-c", "copy", str(mix_path)]
    run_cmd(cmd, logger=logger)
    return mix_path
