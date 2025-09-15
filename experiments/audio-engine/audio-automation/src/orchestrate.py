from __future__ import annotations
import argparse
from pathlib import Path

from tqdm import tqdm

from . import record_stream, split_silence, stems as stems_mod, midi_convert, transpose_chords, identify_track, post_process
from . import speech_to_text, lyrics_utils
from .utils import ensure_dir, load_config, setup_logging, timestamp


def main():
    parser = argparse.ArgumentParser(description="Audio automation pipeline")
    parser.add_argument("--playlist", required=True, help="Path to playlist.txt")
    parser.add_argument("--config", required=True, help="Path to config.yaml")
    args = parser.parse_args()

    playlist = Path(args.playlist)
    config = load_config(Path(args.config))

    # Dry run: empty playlist
    urls = []
    if playlist.exists():
        urls = [l.strip() for l in playlist.read_text(encoding="utf-8").splitlines() if l.strip() and not l.strip().startswith("#")]
    if not urls:
        print("playlist.txt is empty. Add some URLs and re-run. Exiting gracefully.")
        return 0

    work_root = ensure_dir(Path("work") / f"session-{timestamp()}")
    log = setup_logging(work_root / "session.log")
    log.info("Starting session in %s", work_root)

    # 1) Record / download
    rec_cfg = config.get("recording", {})
    mode = rec_cfg.get("mode", "yt-dlp")
    audio_format = rec_cfg.get("audio_format", "wav")
    sample_rate = int(rec_cfg.get("sample_rate", 44100))
    channels = int(rec_cfg.get("channels", 2))

    mix_path = record_stream.run(playlist, work_root, mode, audio_format, sample_rate, channels, log)
    if not mix_path.exists():
        log.warning("No mix file created; aborting.")
        return 1

    # 2) Split by silence
    split_cfg = config.get("splitting", {})
    segs: list[split_silence.Segment] = []
    seg_dir = ensure_dir(work_root / "segments")
    if split_cfg.get("enabled", True):
        segs, seg_json = split_silence.detect_and_split(
            mix_path,
            seg_dir,
            int(split_cfg.get("silence_threshold_db", -35)),
            float(split_cfg.get("min_silence_dur_sec", 1.5)),
            float(split_cfg.get("min_track_len_sec", 30)),
            log,
        )
    else:
        segs = [split_silence.Segment(0.0, 0.0)]
        (seg_dir / "seg_00.wav").write_bytes(mix_path.read_bytes())

    if not segs:
        log.warning("No segments found; treating entire mix as one segment.")
        segs = [split_silence.Segment(0.0, 0.0)]
        (seg_dir / "seg_00.wav").write_bytes(mix_path.read_bytes())

    stems_root = ensure_dir(work_root / "stems")
    midi_root = ensure_dir(work_root / "midi")

    # 3) Per-segment processing
    id_cfg = config.get("identify", {})
    stems_cfg = config.get("stems", {})
    midi_cfg = config.get("midi", {})
    chords_cfg = config.get("chords", {})

    results = []

    for idx, seg in enumerate(tqdm(segs, desc="Segments")):
        seg_path = seg_dir / f"seg_{idx:02d}.wav"
        # Create a per-segment work dir (SEGXX) to store lyrics and JSON
        seg_work_dir = ensure_dir(work_root / f"SEG{idx:02d}")
        # ensure seg wav present under seg_work_dir for co-located artifacts
        try:
            (seg_work_dir / seg_path.name).write_bytes(seg_path.read_bytes())
        except Exception:
            pass
        seg_info = identify_track.best_guess(idx)

        # Stems
        seg_stems_dir = None
        if stems_cfg.get("enabled", True):
            try:
                seg_stems_dir = stems_mod.run(seg_path, stems_root, stems_cfg.get("model", "htdemucs"), log)
            except Exception as e:
                log.warning("Stems failed for %s: %s", seg_path.name, e)
                seg_stems_dir = None

        # MIDI
        seg_midi_dir = None
        if midi_cfg.get("enabled", True):
            try:
                targets = midi_cfg.get("targets", ["vocals", "other", "mix"])
                wavs = []
                if seg_stems_dir and seg_stems_dir.exists():
                    for t in targets:
                        p = seg_stems_dir / f"{t}.wav"
                        if p.exists():
                            wavs.append(p)
                if "mix" in targets or not wavs:
                    wavs.append(seg_path)
                seg_midi_dir = midi_root / f"SEG{idx:02d}"
                midi_convert.run(wavs, seg_midi_dir, log)
            except Exception as e:
                log.warning("MIDI failed for %s: %s", seg_path.name, e)
                seg_midi_dir = None

        # Chords transpose (in place) within work_root
        if chords_cfg.get("enabled", True):
            try:
                transpose_chords.run(
                    chords_cfg.get("glob", "**/*.jcrd.json"),
                    work_root,
                    int(chords_cfg.get("transpose_semitones", 0)),
                    log,
                )
            except Exception as e:
                log.warning("Chord transpose failed: %s", e)

        # Identification
        if id_cfg.get("enabled", True):
            try:
                id_res = identify_track.fingerprint(seg_path, log)
                if id_res:
                    seg_info.update(id_res)
            except Exception as e:
                log.warning("Identification failed for %s: %s", seg_path.name, e)

        # Lyrics / ASR
        try:
            asr_res = speech_to_text.transcribe_to_vtt(
                segment_wav=seg_path,
                stems_dir=seg_stems_dir or stems_root / f"SEG{idx:02d}",
                cfg=config,
            )
            lyrics_utils.write_vtt_and_merge_json(seg_work_dir, asr_res, config)
        except Exception as e:
            log.warning("Lyrics/ASR failed for %s: %s", seg_path.name, e)

        # Post process
        out_root = ensure_dir(Path(config.get("output_root", "output")))
        dest = post_process.run(
            segment_wav=seg_path,
            seg_idx=idx,
            stems_dir=seg_stems_dir,
            midi_dir=seg_midi_dir,
            chords_root=work_root,
            out_root=out_root,
            organize_cfg=config.get("organize", {}),
            info=seg_info,
            logger=log,
        )
        results.append(dest)

    log.info("Completed: %d tracks processed. Output at %s", len(results), config.get("output_root", "output"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
