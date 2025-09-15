from __future__ import annotations
from pathlib import Path
import json, shutil

class RunContext:
    def __init__(self, job_dir: Path, inputs: dict, logger=print, cancel_fn=lambda: False):
        self.dir = Path(job_dir); self.inputs = inputs; self.log = logger; self._cancel = cancel_fn
    def input(self, key, default=None): return self.inputs.get(key, default)
    def input_file(self, key): return Path(self.inputs[key])
    def cancelled(self): return bool(self._cancel())
    def emit_artifact(self, name:str, path):
        art = self.dir / "artifacts"; art.mkdir(parents=True, exist_ok=True)
        dst = art / (name + "_" + Path(path).name)
        try: dst.symlink_to(Path(path))
        except Exception: shutil.copy2(Path(path), dst)
        return dst
    def emit_json(self, name:str, data:dict):
        p = self.dir / f"{name}.json"; p.write_text(json.dumps(data, indent=2), encoding="utf-8"); return p

class BaseExperiment:
    def validate(self, ctx:RunContext): return True
    def run(self, ctx:RunContext): raise NotImplementedError
