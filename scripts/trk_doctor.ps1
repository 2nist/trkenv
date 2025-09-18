Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "== TRK Doctor =="
Write-Host "Working dir: $(Get-Location)"

# 0) Ensure basic tree
$dirs = @(
  "apps/server","services/sdk_py","services/flow",
  "experiments/hello/{py,ui}".Split(","), # hint only
  "webapp/host","webapp/theme/{themes,skins}".Split(","),
  "experiments/theme-lab/ui","runs",".cache","profiles","scripts"
) | ForEach-Object { $_ -replace "{.*}" } # (no-op, just keeping comment)
"apps/server","services/sdk_py","services/flow","experiments/hello/py","experiments/hello/ui",
"webapp/host","webapp/theme/themes","webapp/theme/skins","experiments/theme-lab/ui","profiles","scripts","runs",".cache" |
  ForEach-Object { New-Item -ItemType Directory -Force -Path $_ | Out-Null }

# 1) .gitignore (append-safe)
$gitignore = @'
.venv/
__pycache__/
node_modules/
webapp/**/dist/
runs/
models/
.cache/
.DS_Store
.env
'@
if (-not (Test-Path ".gitignore")) { $gitignore | Set-Content -Encoding UTF8 .gitignore }

# 2) Server: write a known-good main.py (jobs + SSE + theme + UI static)
$serverPath = "apps/server/main.py"
@'
from __future__ import annotations
import os, json, uuid, threading, queue, importlib.util
from pathlib import Path
from typing import Dict, Any
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse, HTMLResponse, Response
from pydantic import BaseModel
import uvicorn

ROOT = Path(__file__).resolve().parents[2]
EXPS = ROOT / "experiments"
RUNS = ROOT / "runs"
WEB  = ROOT / "webapp" / "host"
THEME_DIR = ROOT / "webapp" / "theme"
THEMES = THEME_DIR / "themes"

app = FastAPI(title="TRK Host")

class Job(BaseModel):
    id: str
    exp_id: str
    inputs: Dict[str, Any]
    state: str = "queued"
    dir: str = ""
    logs: list[str] = []

JOBS: Dict[str, Job] = {}
LOG_QUEUES: Dict[str, "queue.Queue[str]"] = {}

def load_exp_class(exp_id: str):
    py = EXPS / exp_id / "py" / "main.py"
    if not py.exists():
        raise HTTPException(404, f"Experiment {exp_id} not found")
    spec = importlib.util.spec_from_file_location(f"exp_{exp_id}", py)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)  # type: ignore
    return getattr(mod, "EXP")

n@app.get("/api/health")
def health(): return {"ok": True, "version": "0.1.0"}

n@app.get("/")
def index():
    idx = WEB / "index.html"
    return HTMLResponse(idx.read_text(encoding="utf-8")) if idx.exists() else HTMLResponse("<h3>TRK Host running</h3>")

n@app.get("/api/experiments")
def list_experiments():
    rows=[]
    for man in EXPS.glob("**/manifest.json"):
        data=json.loads(man.read_text(encoding="utf-8")); data["path"]=str(man.parent)
        rows.append(data)
    return {"experiments": rows}

n@app.get("/experiments/{exp_id}/ui/{path:path}")
def exp_ui(exp_id:str, path:str="index.html"):
    base = EXPS / exp_id / "ui"; fp = base / (path or "index.html")
    if fp.is_dir(): fp = fp / "index.html"
    if not fp.exists(): raise HTTPException(404)
    ct = "text/html" if fp.suffix==".html" else "application/javascript" if fp.suffix==".js" else "text/css" if fp.suffix==".css" else "application/octet-stream"
    return Response(content=fp.read_bytes(), media_type=ct)

n@app.get("/theme/{path:path}")
def theme_static(path: str):
    base = THEME_DIR
    fp = base / path
    if fp.is_dir(): fp = fp / "index.html"
    if not fp.exists(): raise HTTPException(404)
    ct = "text/css" if fp.suffix==".css" else "application/javascript" if fp.suffix==".js" else "application/json" if fp.suffix==".json" else "application/octet-stream"
    return Response(content=fp.read_bytes(), media_type=ct)

n@app.get("/api/theme/list")
def theme_list():
    THEMES.mkdir(parents=True, exist_ok=True)
    names = ["current"] + [p.stem for p in THEMES.glob("*.json")]
    return {"themes": sorted(set(names))}

n@app.get("/api/theme/{name}.json")
def theme_get(name: str):
    THEMES.mkdir(parents=True, exist_ok=True)
    fp = THEMES / f"{name}.json"
    if name == "current" and not fp.exists():
        fp = THEMES / "midnight.json"
    if not fp.exists(): raise HTTPException(404)
    return json.loads(fp.read_text(encoding="utf-8"))

n@app.post("/api/theme")
def theme_save(payload: Dict[str, Any]):
    THEMES.mkdir(parents=True, exist_ok=True)
    name = payload.get("name","user-theme").strip().replace("..","")
    vars = payload.get("vars", {})
    current = {}
    cf = THEMES / "current.json"
    if cf.exists():
        try: current = json.loads(cf.read_text(encoding="utf-8")).get("vars", {})
        except: current = {}
    current.update(vars)
    data = {"name": name, "vars": current}
    fp = THEMES / f"{name}.json"
    fp.write_text(json.dumps(data, indent=2), encoding="utf-8")
    (THEMES / "current.json").write_text(json.dumps(data, indent=2), encoding="utf-8")
    return {"ok": True, "name": name}

n@app.post("/api/experiments/{exp_id}/jobs")
def start_job(exp_id: str, inputs: Dict[str, Any]):
    job_id = uuid.uuid4().hex[:8]
    job_dir = RUNS / f"{exp_id}_{job_id}"
    job_dir.mkdir(parents=True, exist_ok=True)
    job = Job(id=job_id, exp_id=exp_id, inputs=inputs, state="running", dir=str(job_dir))
    JOBS[job_id] = job
    q: "queue.Queue[str]" = queue.Queue()
    LOG_QUEUES[job_id] = q

n    def runner():
        try:
            from services.sdk_py.base import RunContext
            EXP = load_exp_class(exp_id)
            ctx = RunContext(job_dir=job_dir, inputs=inputs, logger=lambda m: (q.put(str(m)), job.logs.append(str(m))))
            exp = EXP(); exp.validate(ctx); exp.run(ctx)
            job.state = "done"; q.put("[done]")
        except Exception as e:
            job.state = "error"; msg = f"[error] {e}"
            q.put(msg); job.logs.append(msg)

n    threading.Thread(target=runner, daemon=True).start()
    return {"jobId": job_id}

n@app.get("/api/jobs/{job_id}/status")
def job_status(job_id: str):
    j = JOBS.get(job_id)
    if not j: raise HTTPException(404)
    return j.model_dump()

n@app.get("/api/jobs/{job_id}/logs/stream")
def job_logs(job_id: str):
    q = LOG_QUEUES.get(job_id)
    if not q: raise HTTPException(404)
    def gen():
        while True:
            line = q.get()
            yield f"data: {line}\n\n"
            if line == "[done]": break
    return StreamingResponse(gen(), media_type="text/event-stream")

n@app.get("/api/jobs/{job_id}/artifacts")
def job_artifacts(job_id: str):
    j = JOBS.get(job_id)
    if not j: raise HTTPException(404)
    job_dir = Path(j.dir)
    items = []
    for p in job_dir.glob("**/*"):
        if p.is_file() and p.suffix.lower() in (".json",".vtt",".srt",".mid",".wav",".txt"):
            items.append({"relPath": str(p.relative_to(job_dir)), "bytes": p.stat().st_size})
    return {"root": str(job_dir), "items": items}

n@app.post("/api/uploads")
async def upload(file: UploadFile = File(...)):
    up_root = RUNS / "_uploads"
    up_root.mkdir(parents=True, exist_ok=True)
    safe = "".join(ch for ch in file.filename if ch.isalnum() or ch in ("-", "_", ".", " "))
    import uuid as _u
    dest = up_root / f"{_u.uuid4().hex[:8]}_{safe or 'file'}"
    dest.write_bytes(await file.read())
    return {"uri": "file:///" + str(dest.resolve()).replace("\\","/").replace("\\","/")}

nif __name__ == "__main__":
    uvicorn.run("apps.server.main:app", host="127.0.0.1", port=8000, reload=False)
'@ | Set-Content -Encoding UTF8 $serverPath
