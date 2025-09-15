# Audio Automation Pipeline

End-to-end pipeline: download/record playlist → split into songs → stem separation → audio→MIDI → chord transpose → identify tracks → neatly organized outputs. Start it, come back later, it’s done.

## Quickstart

1) Install system deps:
- ffmpeg
- chromaprint (fpcalc)

2) Create/activate a Python 3.10+ venv.

3) Install python deps:

```sh
make install
```

4) Put URLs into `playlist.txt` (one per line).

5) Run the pipeline:

```sh
make run
```

Outputs land under `./output` using the organize pattern. Working files live under `./work/session-*/`.

## Config

See `config.yaml` with defaults:

```yaml
output_root: "./output"
recording:
  mode: "yt-dlp"  # yt-dlp | streamlink
  audio_format: "wav"
  sample_rate: 44100
  channels: 2
splitting:
  enabled: true
  silence_threshold_db: -35
  min_silence_dur_sec: 1.5
  min_track_len_sec: 30
stems:
  enabled: true
  engine: "demucs"
  model: "htdemucs"
midi:
  enabled: true
  targets: ["vocals", "other", "mix"]
chords:
  enabled: true
  transpose_semitones: 2
  glob: "**/*.jcrd.json"
identify:
  enabled: true
  use_beets: false
organize:
  pattern: "{artist}/{album}/{tracknum:02d} - {title}"
  copy_original: true
  copy_stems: true
  copy_midi: true
  copy_chords: true
```

## Troubleshooting

- No audio: ensure ffmpeg is installed and on PATH.
- No stems: demucs model may need to download on first run; check network.
- AcoustID timeouts: ensure internet; you can set `ACOUSTID_API_KEY` in `.env`.
- Basic Pitch errors: some files fail—pipeline continues; see `session.log`.
- Long paths on Windows: keep repo close to drive root.

## Development

- Run tests: `make test`
- VS Code tasks exist to install and run.

## License

MIT
