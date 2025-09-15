Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Variables (pre-filled)
$LOCAL_WEBAPP_PATH       = "C:\\Users\\CraftAuto-Sales\\dawsheet\\webapp\\web"
$LOCAL_AUDIO_ENGINE_PATH = "C:\\Users\\CraftAuto-Sales\\Downloads\\Git\\trkaudio"
$SAMPLE_AUDIO            = "C:\\Users\\CraftAuto-Sales\\Downloads\\cinematic-whoosh-boom-jam-fx-1-00-05.mp3"
$GITHUB_REPO_URL         = "https:\/\/github.com\/2nist\/trkenv"

Write-Host "Working dir: $(Get-Location)"

# 1) Create tree
$dirs = @(
  "apps\\server","apps\\desktop-juce\\Source",
  "services\\sdk_py","services\\adapters","services\\flow",
  "experiments\\hello\\py","experiments\\hello\\ui",
  "webapp\\host","schemas","profiles","datasets",
  "scripts","docs",".devcontainer",".github\\workflows",
  "runs","models",".cache"
)
$dirs | ForEach-Object { New-Item -ItemType Directory -Force -Path $_ | Out-Null }

# Python package markers
if (!(Test-Path "apps\\__init__.py")) { "" | Set-Content -Encoding UTF8 apps\\__init__.py }
if (!(Test-Path "apps\\server\\__init__.py")) { "" | Set-Content -Encoding UTF8 apps\\server\\__init__.py }
if (!(Test-Path "services\\__init__.py")) { "" | Set-Content -Encoding UTF8 services\\__init__.py }
if (!(Test-Path "services\\sdk_py\\__init__.py")) { "" | Set-Content -Encoding UTF8 services\\sdk_py\\__init__.py }
if (!(Test-Path "services\\flow\\__init__.py")) { "" | Set-Content -Encoding UTF8 services\\flow\\__init__.py }

# JUCE stub (placeholder files; integrate with your JUCE setup separately)
@'
# TRK Desktop (JUCE) Stub

This is a placeholder for a JUCE desktop host. Add your JUCE project files here.
'@ | Set-Content -Encoding UTF8 apps/desktop-juce/README.md

@'
cmake_minimum_required(VERSION 3.20)
project(trk_desktop_stub)

add_executable(trk_desktop_stub
  Source/Main.cpp
)

target_compile_features(trk_desktop_stub PRIVATE cxx_std_17)
'@ | Set-Content -Encoding UTF8 apps/desktop-juce/CMakeLists.txt

@'
#include <iostream>
int main() {
  std::cout << "TRK Desktop JUCE stub (replace with JUCE app)\n";
  return 0;
}
'@ | Set-Content -Encoding UTF8 apps/desktop-juce/Source/Main.cpp

# 2) .gitignore
@'
.venv/
__pycache__/
node_modules/
webapp/**/dist/
runs/
work/
output/
models/
.cache/
.DS_Store
.env
'@ | Set-Content -Encoding UTF8 .gitignore

# 3) Minimal FastAPI host
@'
fastapi==0.111.0
uvicorn[standard]==0.30.1
pydantic==2.8.2
pyyaml==6.0.2
jsonschema==4.22.0
'@ | Set-Content -Encoding UTF8 apps/server/requirements.txt

@'
from __future__ import annotations
import json
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, Response

ROOT = Path(__file__).resolve().parents[2]
EXPS = ROOT / "experiments"
WEB  = ROOT / "webapp" / "host"

app = FastAPI(title="TRK Host")

@app.get("/api/health")
def health(): return {"ok": True, "version": "0.1.0"}

@app.get("/")
def index():
    idx = WEB / "index.html"
    return HTMLResponse(idx.read_text(encoding="utf-8")) if idx.exists() else HTMLResponse("<h3>TRK Host</h3>")

@app.get("/api/experiments")
def list_experiments():
    rows=[]
    for man in EXPS.glob("**/manifest.json"):
        data=json.loads(man.read_text(encoding="utf-8")); data["path"]=str(man.parent)
        rows.append(data)
    return {"experiments": rows}

@app.get("/experiments/{exp_id}/ui/{path:path}")
def exp_ui(exp_id:str, path:str="index.html"):
    base = EXPS / exp_id / "ui"; fp = base / (path or "index.html")
    if fp.is_dir(): fp = fp / "index.html"
    if not fp.exists(): raise HTTPException(404)
    ct = "text/html" if fp.suffix==".html" else "application/javascript" if fp.suffix==".js" else "text/css" if fp.suffix==".css" else "application/octet-stream"
    return Response(content=fp.read_bytes(), media_type=ct)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
'@ | Set-Content -Encoding UTF8 apps/server/main.py

# 4) SDK (BaseExperiment/RunContext)
@'
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
'@ | Set-Content -Encoding UTF8 services/sdk_py/base.py

# 5) Flow/DAG runner (simple)
@'
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
'@ | Set-Content -Encoding UTF8 services/flow/runner.py

# 6) Hello experiment (reference plugin)
@'
{
  "id":"hello","version":"0.1.0","interfaceVersion":"1.0",
  "kind":"job","entryFrontend":"ui/index.html","entryBackend":"py/main.py",
  "capabilities":["fs:read","fs:write"],
  "inputs":{"message":{"type":"string","default":"Hello TRK!"}},
  "outputs":{"json":{"type":"json"}}
}
'@ | Set-Content -Encoding UTF8 experiments/hello/manifest.json

@'
from services.sdk_py.base import BaseExperiment, RunContext
class EXP(BaseExperiment):
    def run(self, ctx:RunContext):
        ctx.log("Hello from plugin")
        ctx.emit_json("hello", {"ok": True})
'@ | Set-Content -Encoding UTF8 experiments/hello/py/main.py

@'
<!doctype html><meta charset="utf-8"/>
<body style="font-family:sans-serif">
  <h3>Hello Experiment</h3>
  <p>Use the flow runner or the API to start jobs.</p>
</body>
'@ | Set-Content -Encoding UTF8 experiments/hello/ui/index.html

# 7) Web UI host shell (lists experiments, mounts panel)
@'
<!doctype html><meta charset="utf-8"/>
<style>body{margin:0;display:grid;grid-template-columns:260px 1fr;height:100vh;font-family:system-ui,sans-serif}aside{background:#111;color:#eee;padding:10px}main{padding:10px}iframe{width:100%;height:calc(100vh - 20px);border:0}.btn{display:block;width:100%;margin:6px 0;padding:8px;background:#222;color:#eee;border:1px solid #333;border-radius:6px;text-align:left}</style>
<body>
  <aside><h3>Experiments</h3><div id="exps"></div></aside>
  <main><iframe id="panel" srcdoc="<h3>Select an experiment</h3>"></iframe></main>
<script>
(async()=>{
  const r=await fetch('/api/experiments'); const {experiments=[]}=await r.json();
  const el=document.getElementById('exps'); el.innerHTML='';
  for(const e of experiments){
    const b=document.createElement('button'); b.className='btn'; b.textContent=e.id + (e.entryFrontend?'':' (no UI)');
    b.onclick=()=>document.getElementById('panel').src='/experiments/'+e.id+'/ui/index.html';
    el.appendChild(b);
  }
})();
</script>
</body>
'@ | Set-Content -Encoding UTF8 webapp/host/index.html

# 8) Import your webapp (exclude node_modules/dist/.git) into subfolder to preserve shell index
New-Item -ItemType Directory -Force -Path "webapp/host/app" | Out-Null
try {
  robocopy $LOCAL_WEBAPP_PATH "webapp\host\app" /MIR /XD node_modules dist .git  | Out-Null
} catch { Write-Host "robocopy webapp skipped: $($_.Exception.Message)" }

# 9) Import your audio engine
try {
  robocopy $LOCAL_AUDIO_ENGINE_PATH "experiments\audio-engine" /MIR /XD .git .venv __pycache__  | Out-Null
} catch { Write-Host "robocopy audio-engine skipped: $($_.Exception.Message)" }

# 10) Audio-engine plugin shim (manifest + wrapper + minimal UI)
@'
{
  "id":"audio-engine","version":"0.1.0","interfaceVersion":"1.0",
  "kind":"job","entryBackend":"py/main.py","entryFrontend":"ui/index.html",
  "capabilities":["fs:read","fs:write","net","gpu"],
  "inputs":{
    "playlist":{"type":"asset","mime":"text/uri-list","optional":true},
    "audio":{"type":"asset","mime":"audio/wav","optional":true}
  },
  "outputs":{
    "segments":{"type":"json","typeId":"trk.segment.list@1"},
    "midi":{"type":"asset","mime":"audio/midi"},
    "lyrics":{"type":"json","typeId":"trk.lyrics.words@1"},
    "metadata":{"type":"json"}
  }
}
'@ | Set-Content -Encoding UTF8 experiments/audio-engine/manifest.json

New-Item -ItemType Directory -Force -Path experiments/audio-engine/py | Out-Null
@'
from __future__ import annotations
from services.sdk_py.base import BaseExperiment, RunContext
from pathlib import Path
import subprocess, sys, shlex, json

class EXP(BaseExperiment):
    def run(self, ctx: RunContext):
        job = Path(ctx.dir); work = job/"work"; work.mkdir(parents=True, exist_ok=True)
        playlist = ctx.input("playlist"); audio = ctx.input("audio")
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
'@ | Set-Content -Encoding UTF8 experiments/audio-engine/py/main.py

New-Item -ItemType Directory -Force -Path experiments/audio-engine/ui | Out-Null
@'
<!doctype html><meta charset="utf-8"/>
<body style="font-family:sans-serif">
  <h3>Audio Engine</h3>
  <p>Use the flow profile to run the engine.</p>
</body>
'@ | Set-Content -Encoding UTF8 experiments/audio-engine/ui/index.html

# 11) Flow profiles
$SAMPLE_AUDIO_URI = ("file:///" + ($SAMPLE_AUDIO -replace '\\','/'))
@"
version: 1
steps:
  - id: audio
    op: audio-engine
    in:
      audio: "$SAMPLE_AUDIO_URI"
    out: {}
"@ | Set-Content -Encoding UTF8 profiles/rehearsal.yaml

@'
version: 1
steps:
  - id: hello
    op: hello
    in:
      message: "Hello TRK!"
    out: {}
'@ | Set-Content -Encoding UTF8 profiles/hello.yaml

# 12) README
@'
# TRK Lab

Minimal TRK host (FastAPI) with plugins and simple flow runner.

- Server: `apps/server/main.py`
- SDK: `services/sdk_py/base.py`
- Flow runner: `services/flow/runner.py`
- Experiments: `experiments/*`

## Quickstart

```
.\.venv\Scripts\Activate.ps1
python -m apps.server.main
# open http://127.0.0.1:8000
```

Run a flow:

```
python -m services.flow.runner profiles\hello.yaml
python -m services.flow.runner profiles\rehearsal.yaml
```
'@ | Set-Content -Encoding UTF8 README.md

# 13) Python env + deps
$venvExists = Test-Path ".\.venv"
if (-not $venvExists) {
  $py = Get-Command py -ErrorAction SilentlyContinue
  if ($py) { py -3 -m venv .venv } else { python -m venv .venv }
}
& .\.venv\Scripts\Activate.ps1
if (-not $env:TRK_SKIP_PIP_UPGRADE -or $env:TRK_SKIP_PIP_UPGRADE -ne '1') {
  try { python -m pip install --upgrade pip } catch { Write-Warning "pip upgrade skipped: $($_.Exception.Message)" }
}
pip install -r apps/server/requirements.txt

# 14) Quick server health check via uvicorn
$proc = Start-Process -PassThru -NoNewWindow -FilePath python -ArgumentList "-m uvicorn apps.server.main:app --host 127.0.0.1 --port 8000"
Start-Sleep -Seconds 2
try {
  $resp = Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/api/health
  Write-Host "Health:" $resp.Content
} catch {
  Write-Warning "Health check failed: $($_.Exception.Message)"
} finally {
  try { $proc | Stop-Process -Force } catch {}
}

# 15) Init git and set remote
if (-not (Test-Path ".git")) { git init | Out-Null }
git add .
try { git commit -m "chore: bootstrap TRK lab; import webapp + audio-engine" | Out-Null } catch {}
if ($GITHUB_REPO_URL) {
  git branch -M main
  git remote remove origin 2>$null
  git remote add origin $GITHUB_REPO_URL
  Write-Host "Remote set to $GITHUB_REPO_URL"
}

Write-Host "`nAll set. Run:"
Write-Host "  `> .\\.venv\\Scripts\\Activate.ps1"
Write-Host "  `> python -m apps.server.main   # open http://127.0.0.1:8000"
Write-Host "Or run flows:"
Write-Host "  `> python -m services.flow.runner profiles\\hello.yaml"
Write-Host "  `> python -m services.flow.runner profiles\\rehearsal.yaml"