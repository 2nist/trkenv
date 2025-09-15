from __future__ import annotations
from services.sdk_py.base import BaseExperiment, RunContext
from services.io.adapters import resolve_uri
from pathlib import Path
import subprocess, sys, shlex, json

class EXP(BaseExperiment):
    def run(self, ctx: RunContext):
        job = Path(ctx.dir); work = job/"work"; work.mkdir(parents=True, exist_ok=True)
        playlist = ctx.input("playlist"); audio = ctx.input("audio")
        # Resolve URIs to local paths if provided (supports file:/// and gdrive://)
        try:
            if isinstance(playlist, str) and playlist:
                playlist_path = resolve_uri(playlist, logger=ctx.log)
                playlist = str(playlist_path)
        except Exception as e:
            ctx.log(f"playlist resolve failed: {e}")
        try:
            if isinstance(audio, str) and audio:
                audio_path = resolve_uri(audio, logger=ctx.log)
                audio = str(audio_path)
        except Exception as e:
            ctx.log(f"audio resolve failed: {e}")
        engine_root = Path(__file__).resolve().parents[1]
        orch = engine_root/"src"/"orchestrate.py"
        if orch.exists():
            arg = str(playlist or audio or "")
            cmd = [sys.executable, str(orch), "--playlist", arg]
            ctx.log("Running: " + " ".join(shlex.quote(c) for c in cmd))
            proc = subprocess.run(cmd, cwd=str(engine_root), capture_output=True, text=True)
            ctx.log(proc.stdout)
            if proc.returncode != 0:
                ctx.log(proc.stderr)
                raise RuntimeError("audio-engine orchestration failed")
        else:
            ctx.log("No orchestrate.py found; emitting dummy segments.json")
            (job/"segments.json").write_text(json.dumps({"segments":[]}, indent=2), encoding="utf-8")

        seg = next(job.glob("**/segments.json"), None)
        if seg: ctx.emit_json("segments", json.loads(seg.read_text(encoding="utf-8")))
        mid = next(job.glob("**/*.mid"), None)
        if mid: ctx.emit_artifact("midi", mid)
        lyr = next(job.glob("**/*words*.json"), None)
        if lyr: ctx.emit_json("lyrics", json.loads(lyr.read_text(encoding="utf-8")))
        ctx.emit_json("metadata", {"engine_root": str(engine_root)})
