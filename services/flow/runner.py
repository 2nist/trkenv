from __future__ import annotations
import sys, yaml, uuid, importlib.util
from pathlib import Path
from services.sdk_py.base import RunContext

RUNS = Path("runs")


def load_exp(exp_id:str):
    py = Path(f"experiments/{exp_id}/py/main.py")
    spec = importlib.util.spec_from_file_location(f"exp_{exp_id}", py)
    mod = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(mod)  # type: ignore
    return getattr(mod, "EXP")


def main(profile_path:str):
    prof = yaml.safe_load(Path(profile_path).read_text(encoding="utf-8"))
    job = RUNS / (Path(profile_path).stem + "_" + uuid.uuid4().hex[:8])
    job.mkdir(parents=True, exist_ok=True)
    for step in prof.get("steps", []):
        EXP = load_exp(step["op"])  # type: ignore
        ctx = RunContext(job, step.get("in", {}), logger=lambda m: print(f"[{step['op']}] {m}"))
        exp = EXP()  # type: ignore
        exp.validate(ctx)
        exp.run(ctx)
    print("DONE:", job)


if __name__ == "__main__":
    main(sys.argv[1])
