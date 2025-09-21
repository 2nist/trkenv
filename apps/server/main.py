from __future__ import annotations
import sys, os, json, uuid, threading, queue, time, importlib.util
from pathlib import Path
from typing import Dict, Any
from fastapi import FastAPI, HTTPException, UploadFile, File, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, HTMLResponse, Response
from pydantic import BaseModel
import uvicorn

# Ensure repository root is on sys.path so local packages (services/...) can be imported
# When running from apps/server, Python's import path may not include the project root.
ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
from fastapi.responses import HTMLResponse, Response, StreamingResponse
from services.sdk_py.base import RunContext
from fastapi.staticfiles import StaticFiles
from services.lyrics_source import resolve_lyrics
from apps.server.models.palette import CanvasDoc, XY, Size, Node, Group  # type: ignore
try:
    from services.song_index import song_index as build_song_indices  # type: ignore
except Exception:
    build_song_indices = None  # type: ignore

# Helper: import an optional router module and return its `router` attr if present.
def _optional_import_router(module_path: str, attr: str = 'router'):
    try:
        # find_spec avoids importing packages that don't exist
        spec = importlib.util.find_spec(module_path)
        if not spec:
            return None
        mod = importlib.import_module(module_path)
        return getattr(mod, attr, None)
    except Exception as e:
        # Log briefly; avoid raising to keep server running in dev environments
        print(f"optional router import failed for {module_path}: {e}")
        return None

EXPS = ROOT / "experiments"
RUNS = ROOT / "runs"
WEB  = ROOT / "webapp" / "host"
THEME_DIR = ROOT / "webapp" / "theme"
THEMES = THEME_DIR / "themes"
PALETTES_DIR = ROOT / "data" / "palettes"
DRAFTS_DIR = ROOT / "datasets" / "drafts"
DRAFTS_DIR.mkdir(parents=True, exist_ok=True)
AA_DIR = ROOT / "experiments" / "audio-engine" / "audio-automation"
ART_DIR = ROOT / "artifacts"
SONG_ART_DIR = ART_DIR / "songs"

app = FastAPI(title="TRK Host")

# Allow local frontend dev (Next) to call the API during development.
# In production this should be tightened or driven by configuration.
app.add_middleware(
    CORSMiddleware,
    # Allow any localhost/127.0.0.1 origin in dev, regardless of port.
    # Note: allow_origin_regex matches full scheme+host+port. This is safer than "*" for cookies/auth.
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def _include_optional_routers(app: FastAPI, modules: list[str]):
    """Try to import and include routers from the given module paths.

    This function is idempotent and will skip modules that cannot be imported
    or that don't expose a `router` attribute.
    """
    included = []
    for mod_name in modules:
        r = _optional_import_router(mod_name)
        if r is None:
            continue
        try:
            app.include_router(r)
            included.append(mod_name)
        except Exception as e:
            print(f"include_router failed for {mod_name}: {e}")
    if included:
        print(f"Included routers: {', '.join(included)}")

# Include known optional routers under apps.server.routes (idempotent)
_include_optional_routers(app, [
    "apps.server.routes.registry",
    "apps.server.routes.songs_indices",
    "apps.server.routes.timeline",
    "apps.server.routes.sessions",
    "apps.server.routes.flows",
])

# Lightweight Job model from upstream retained for compatibility with simpler clients.
class SimpleJob(BaseModel):
    id: str
    exp_id: str
    inputs: Dict[str, Any]
    state: str = "queued"
    dir: str = ""
    logs: list[str] = []

SIMPLE_JOBS: Dict[str, SimpleJob] = {}
LOG_QUEUES: Dict[str, "queue.Queue[str]"] = {}

def load_exp_class(exp_id: str):
    py = EXPS / exp_id / "py" / "main.py"
    if not py.exists():
        raise HTTPException(404, f"Experiment {exp_id} not found")
    spec = importlib.util.spec_from_file_location(f"exp_{exp_id}", py)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)  # type: ignore
    return getattr(mod, "EXP")

@app.get("/api/health")
def health(): return {"ok": True, "version": "0.1.0"}

@app.get("/")
def index():
    idx = WEB / "index.html"
    return HTMLResponse(idx.read_text(encoding="utf-8")) if idx.exists() else HTMLResponse("<h3>TRK Host running</h3>")

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

## ---------------------- Unified Job API ----------------------

class Job:
    """Richer job model with streaming logs & status similar to earlier implementation.
    Combines earlier in-file job runner with upstream simpler model.
    """
    def __init__(self, job_id: str, exp_id: str, inputs: Dict[str, Any]):
        self.id = job_id
        self.exp_id = exp_id
        self.inputs = inputs
        self.dir = RUNS / f"job_{job_id}"
        self.dir.mkdir(parents=True, exist_ok=True)
        self.status = "pending"
        self.logs: list[str] = []
        self._log_q: "queue.Queue[str]" = queue.Queue()
        self._done = threading.Event()

    def log(self, msg: str):
        line = msg if msg.endswith("\n") else msg + "\n"
        self.logs.append(line.rstrip())
        try:
            self._log_q.put_nowait(line)
        except Exception:
            pass

JOBS: Dict[str, Job] = {}

def _load_exp(exp_id: str):
    return load_exp_class(exp_id)

def _run_job(job: Job):
    try:
        job.status = "running"
        EXP = _load_exp(job.exp_id)  # type: ignore
        ctx = RunContext(job.dir, job.inputs, logger=lambda m: job.log(f"[{job.exp_id}] {m}"))
        exp = EXP()  # type: ignore
        exp.validate(ctx)
        exp.run(ctx)
        job.status = "completed"
        job.log("Job completed")
    except Exception as e:
        job.status = "failed"
        job.log(f"ERROR: {e}")
    finally:
        job._done.set()

@app.post("/api/experiments/{exp_id}/jobs")
def start_job(exp_id: str, body: Dict[str, Any]):
    job_id = uuid.uuid4().hex[:12]
    job = Job(job_id, exp_id, body or {})
    JOBS[job_id] = job
    th = threading.Thread(target=_run_job, args=(job,), daemon=True)
    th.start()
    return {"jobId": job_id, "status": job.status}

# Convenience: start a custom background job with a callable instead of experiment
def start_custom_job(name: str, fn, inputs: Dict[str, Any]) -> str:
    job_id = uuid.uuid4().hex[:12]
    job = Job(job_id, name, inputs or {})
    JOBS[job_id] = job
    def _wrap():
        try:
            job.status = "running"
            fn(job)
            if job.status not in ("failed", "cancelled"):
                job.status = "completed"
        except Exception as e:
            job.status = "failed"
            job.log(f"ERROR: {e}")
        finally:
            job._done.set()
    th = threading.Thread(target=_wrap, daemon=True)
    th.start()
    return job_id
@app.get("/api/jobs/{job_id}/status")
def job_status(job_id: str):
    j = JOBS.get(job_id)
    if not j: raise HTTPException(404, "job not found")
    state = (
        "queued" if j.status in ("pending", "queued") else
        "running" if j.status == "running" else
        "done" if j.status in ("completed", "cancelled") else
        "error"
    )
    return {"jobId": j.id, "status": j.status, "state": state}

# Frontend-simple jobs status (alias) used by /pages/record.tsx
@app.get("/jobs/{job_id}")
def job_status_simple(job_id: str):
    j = JOBS.get(job_id)
    if not j:
        raise HTTPException(404, "job not found")
    # surface optional fields from inputs or side-effects
    payload: Dict[str, Any] = {"jobId": j.id, "status": "running" if j.status=="running" else ("done" if j.status in ("completed","cancelled") else ("error" if j.status=="failed" else j.status))}
    # Common fields we might set from job logic
    for k in ("draftId", "songId", "error"):
        if k in j.inputs:
            payload[k] = j.inputs[k]
    return payload

@app.get("/api/jobs/{job_id}/logs/stream")
def stream_logs(job_id: str):
    job = JOBS.get(job_id)
    if not job: raise HTTPException(404, "job not found")
    def gen():
        # Keep streaming until done and queue drained
        while True:
            try:
                line = job._log_q.get(timeout=0.25)
                yield f"data: {line}\n\n"
            except Exception:
                pass
            if job._done.is_set() and job._log_q.empty():
                yield f"data: [job:{job.id}] status={job.status}\n\n"
                break
            time.sleep(0.05)
    return StreamingResponse(gen(), media_type="text/event-stream")

@app.get("/api/jobs/{job_id}/artifacts")
def list_artifacts(job_id: str):
    job = JOBS.get(job_id)
    if not job: raise HTTPException(404, "job not found")
    art = job.dir / "artifacts"
    rows = []
    if art.exists():
        for fp in art.glob("**/*"):
            if fp.is_file():
                rel = fp.relative_to(job.dir)
                item = {
                    "name": fp.name,
                    "relpath": str(rel),
                    "relPath": str(rel),
                    "size": fp.stat().st_size,
                    "uri": fp.resolve().as_uri(),
                }
                rows.append(item)
    # Fallback: if no artifacts recorded yet, scan entire job dir for known outputs
    if not rows:
        for fp in job.dir.glob("**/*"):
            if fp.is_file() and fp.name.lower().endswith(("segments.json",".mid","words.json")):
                rel = fp.relative_to(job.dir)
                rows.append({
                    "name": fp.name,
                    "relpath": str(rel),
                    "relPath": str(rel),
                    "size": fp.stat().st_size,
                    "uri": fp.resolve().as_uri(),
                })
    return {"jobId": job.id, "status": job.status, "artifacts": rows, "items": rows}

@app.post("/api/uploads")
async def upload_file(file: UploadFile = File(...)):
    dest_dir = RUNS / "_uploads"
    dest_dir.mkdir(parents=True, exist_ok=True)
    safe_name = Path(file.filename).name
    dest = dest_dir / safe_name
    data = await file.read()
    dest.write_bytes(data)
    return {"name": safe_name, "bytes": len(data), "uri": dest.resolve().as_uri()}


# ---------------------- Simple Songs API (in-memory for dev) ----------------------
from uuid import uuid4
import sqlite3

# SQLite DB for songs (simple persistence)
# Store DB under repository datasets/ directory
DATASETS_DIR = ROOT / "datasets"
LIB_DIR = DATASETS_DIR / "library"
LIB_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = LIB_DIR / "songs.db"

# Migrate old DB locations if present
OLD_DB_APPS = Path(__file__).resolve().parents[1] / "songs.db"
OLD_DB_DATASETS = DATASETS_DIR / "songs.db"
for old in (OLD_DB_DATASETS, OLD_DB_APPS):
    if old.exists() and not DB_PATH.exists():
        try:
            old.replace(DB_PATH)
            break
        except Exception:
            pass


def get_db_conn():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db_conn()
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS songs (
            id TEXT PRIMARY KEY,
            title TEXT,
            source_json TEXT,
            lyrics TEXT
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS song_tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            song_id TEXT,
            tag TEXT,
            UNIQUE(song_id, tag)
        )
        """
    )
    # Palettes
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS palettes (
            id TEXT PRIMARY KEY,
            experiment_id TEXT,
            name TEXT,
            doc_json TEXT,
            created_at TEXT,
            updated_at TEXT
        )
        """
    )
    conn.commit()
    conn.close()


init_db()
def _write_jcrd_and_indices(song_id: str, data: Dict[str, Any] | None):
    try:
        if not data:
            return
        ART_DIR.mkdir(parents=True, exist_ok=True)
        base = SONG_ART_DIR / song_id
        base.mkdir(parents=True, exist_ok=True)
        jcrd_fp = base / "jcrd.json"
        # Normalize into a minimal jcrd-like structure
        payload = data if isinstance(data, dict) else {"raw": data}
        # Ensure metadata keys are at predictable places
        if "metadata" not in payload:
            meta = {}
            title = data.get("title") if isinstance(data, dict) else None  # type: ignore[attr-defined]
            artist = data.get("artist") if isinstance(data, dict) else None  # type: ignore[attr-defined]
            if title or artist:
                meta = {"title": title, "artist": artist}
            payload = {**payload, "metadata": {**meta}}
        jcrd_fp.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        # Compute indices if available
        if build_song_indices:
            try:
                build_song_indices(song_id)  # writes beatgrid/sections/chords under artifacts
            except Exception as e:
                print("song indices build failed", song_id, e)
    except Exception as e:
        print("write jcrd/indices failed", song_id, e)

def _db_get_song_source(song_id: str) -> Dict[str, Any]:
    conn = get_db_conn(); cur = conn.cursor()
    cur.execute('SELECT source_json FROM songs WHERE id = ?', (song_id,))
    r = cur.fetchone(); conn.close()
    return json.loads(r[0]) if (r and r[0]) else {}

def _indices_dir(song_id: str) -> Path:
    base = SONG_ART_DIR / song_id
    base.mkdir(parents=True, exist_ok=True)
    return base

def _load_indices(song_id: str) -> Dict[str, Any]:
    """Load indices from artifacts; if missing and builder available, build them."""
    base = _indices_dir(song_id)
    bg = base / 'beatgrid.json'; sec = base / 'sections.json'; ch = base / 'chords.json'
    if not (bg.exists() and sec.exists() and ch.exists()) and build_song_indices:
        try:
            build_song_indices(song_id)
        except Exception as e:
            print('indices build error', song_id, e)
    out: Dict[str, Any] = {}
    try:
        if bg.exists(): out['beatgrid'] = json.loads(bg.read_text(encoding='utf-8'))
        if sec.exists(): out['sections'] = json.loads(sec.read_text(encoding='utf-8'))
        if ch.exists(): out['chords'] = json.loads(ch.read_text(encoding='utf-8'))
    except Exception as e:
        print('indices read error', song_id, e)
    return out

@app.get('/api/songs/{song_id}/indices')
def api_song_indices(song_id: str):
    out = _load_indices(song_id)
    # Fallback: derive sections/chords from source if indices absent
    if not out.get('sections') or not out.get('chords'):
        src = _db_get_song_source(song_id)
        # sections
        if not out.get('sections'):
            sections = []
            for s in (src.get('sections') or []):
                try:
                    sections.append({
                        'sections': [], # placeholder to ensure schema
                    })
                except Exception:
                    pass
            # Better: map directly
            sections = []
            for s in (src.get('sections') or []):
                try:
                    start = float(s.get('start_s') or s.get('start') or 0)
                    end = float(s.get('end_s') or s.get('end') or start)
                    name = s.get('name') or s.get('label') or 'Section'
                    sections.append({'name': name, 'start_s': start, 'end_s': end})
                except Exception:
                    pass
            if sections:
                out['sections'] = { 'sections': sections }
        # chords
        if not out.get('chords'):
            chords = []
            cp = src.get('chord_progression') or []
            for c in cp:
                try:
                    if isinstance(c, dict):
                        t = float(c.get('time') or 0.0); sym = str(c.get('chord') or '')
                    elif isinstance(c, (list, tuple)):
                        t = float(c[0]) if len(c) > 0 else 0.0; sym = str(c[1]) if len(c) > 1 else ''
                    else:
                        continue
                    chords.append({'t': t, 'symbol': sym})
                except Exception:
                    pass
            if chords:
                out['chords'] = { 'chords': chords }
    return out

@app.post('/api/songs/{song_id}/indices')
def api_song_reindex(song_id: str):
    if not build_song_indices:
        raise HTTPException(500, 'indices builder not available')
    try:
        build_song_indices(song_id)
        return { 'ok': True }
    except Exception as e:
        raise HTTPException(500, f'indices build failed: {e}')

@app.get('/api/songs/{song_id}/context')
def api_song_context(song_id: str):
    # Prefer jcrd in artifacts; else source_json
    base = _indices_dir(song_id)
    jcrd = base / 'jcrd.json'
    src = None
    try:
        if jcrd.exists():
            src = json.loads(jcrd.read_text(encoding='utf-8'))
        else:
            src = _db_get_song_source(song_id)
    except Exception:
        src = _db_get_song_source(song_id)
    meta = (src or {}).get('metadata') or {}
    tempo = float(meta.get('tempo') or 120)
    ts = meta.get('time_signature') or '4/4'
    duration = float(meta.get('duration') or 0)
    # If duration missing, try beatgrid length
    try:
        idx = _load_indices(song_id)
        if (not duration) and idx.get('beatgrid') and idx['beatgrid'].get('beats'):
            beats = idx['beatgrid']['beats']
            if beats:
                duration = float(beats[-1].get('t') or 0)
    except Exception:
        pass
    return { 'tempo_bpm': tempo, 'time_signature': ts, 'duration_s': duration }


# Lyrics cache static mount
LYRICS_CACHE = ROOT / 'data' / 'lyrics_cache'
LYRICS_CACHE.mkdir(parents=True, exist_ok=True)
app.mount('/data/lyrics_cache', StaticFiles(directory=str(LYRICS_CACHE)), name='lyrics_cache')


@app.get("/songs")
def list_songs(q: str | None = None):
    conn = get_db_conn()
    cur = conn.cursor()
    if q:
        cur.execute("SELECT id, title FROM songs WHERE title LIKE ? LIMIT 200", (f"%{q}%",))
    else:
        cur.execute("SELECT id, title FROM songs ORDER BY rowid DESC LIMIT 200")
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return {"songs": rows}


@app.post("/songs")
def create_song(body: Dict[str, Any]):
    sid = uuid4().hex[:12]
    title = body.get("title") or body.get("metadata", {}).get("title") or f"Song {sid}"
    lyrics = body.get("lyrics") or body.get("metadata", {}).get("lyrics") or ""
    conn = get_db_conn()
    cur = conn.cursor()
    cur.execute("INSERT INTO songs (id, title, source_json, lyrics) VALUES (?, ?, ?, ?)", (sid, title, json.dumps(body), lyrics))
    conn.commit()
    conn.close()
    # Persist jcrd + indices for timeline if JSON resembles songdoc
    try:
        _write_jcrd_and_indices(sid, body)
    except Exception:
        pass
    return {"id": sid, "status": "created"}

# Import endpoint for binary files (.json/.jcrd/.mid/.mp3/.wav)
@app.post("/songs/import")
async def songs_import(file: UploadFile = File(...)):
    name = Path(file.filename).name
    ext = Path(name).suffix.lower()
    # Save under datasets/library/assets
    assets_dir = LIB_DIR / "assets"
    assets_dir.mkdir(parents=True, exist_ok=True)
    raw = await file.read()
    dest = assets_dir / name
    dest.write_bytes(raw)

    # If JSON-like, try parse and create richer song source
    sid = uuid.uuid4().hex[:12]
    title = Path(name).stem
    artist = "Unknown"
    source: Dict[str, Any] = {"assets": {}}
    try:
        if ext in (".json", ".jcrd") or name.endswith(".jcrd.json"):
            txt = raw.decode("utf-8", errors="ignore")
            data = json.loads(txt)
            title = data.get("metadata", {}).get("title") or data.get("title") or title
            artist = data.get("metadata", {}).get("artist") or data.get("artist") or artist
            source = data if isinstance(data, dict) else {"raw": data}
        elif ext in (".mid", ".midi"):
            source = {"metadata": {"title": title, "artist": artist}, "assets": {"midi": str(dest)}}
        elif ext in (".mp3", ".wav", ".ogg", ".webm"):
            source = {"metadata": {"title": title, "artist": artist}, "assets": {"audio": str(dest)}}
        else:
            source = {"metadata": {"title": title, "artist": artist}, "assets": {"file": str(dest)}}
    except Exception:
        source = {"metadata": {"title": title, "artist": artist}, "assets": {"file": str(dest)}}

    conn = get_db_conn(); cur = conn.cursor()
    cur.execute("INSERT INTO songs (id, title, source_json, lyrics) VALUES (?, ?, ?, ?)", (sid, title, json.dumps(source), ""))
    conn.commit(); conn.close()
    # If JSON/jcrd was provided, persist it to artifacts and compute indices
    try:
        if ext in (".json", ".jcrd") or name.endswith(".jcrd.json"):
            _write_jcrd_and_indices(sid, source if isinstance(source, dict) else None)
        else:
            # Write a minimal placeholder so beatgrid can be derived later
            _write_jcrd_and_indices(sid, {"metadata": {"title": title, "artist": artist}})
    except Exception:
        pass
    return {"id": sid, "title": title, "created": True}

# Alias under /api to avoid any conflicts with dynamic routes
@app.post("/api/songs/import")
async def songs_import_api(file: UploadFile = File(...)):
    return await songs_import(file)


@app.get("/songs/{song_id}")
def get_song(song_id: str):
    conn = get_db_conn()
    cur = conn.cursor()
    cur.execute("SELECT id, title, source_json, lyrics FROM songs WHERE id = ?", (song_id,))
    r = cur.fetchone()
    conn.close()
    if not r:
        raise HTTPException(404, "song not found")
    row = dict(r)
    row["source"] = json.loads(row.pop("source_json")) if row.get("source_json") else {}
    return row

# ---------------------- Recording upload → Draft pipeline ----------------------

def _write_draft(draft_id: str, meta: Dict[str, Any]) -> Path:
    """Persist a draft 'songdoc' JSON for review page."""
    DRAFTS_DIR.mkdir(parents=True, exist_ok=True)
    doc = {
        "id": draft_id,
        "meta": {
            "title": meta.get("title") or f"Recording {draft_id}",
            "artist": meta.get("artist") or "Unknown",
            "timeSig": meta.get("timeSig") or "4/4",
            "bpm": meta.get("bpm") or {"value": 120},
        },
        "sections": [],
        "lyrics": [],
        "assets": meta.get("assets") or {},
    }
    fp = DRAFTS_DIR / f"{draft_id}.json"
    fp.write_text(json.dumps(doc, indent=2), encoding="utf-8")
    return fp

@app.post("/recordings/upload")
async def recordings_upload(file: UploadFile = File(...)):
    # Save uploaded recording
    rec_dir = RUNS / "_recordings"
    rec_dir.mkdir(parents=True, exist_ok=True)
    base = Path(file.filename).name or "recording.webm"
    rec_id = uuid.uuid4().hex[:8]
    dest = rec_dir / f"{rec_id}_{base}"
    data = await file.read()
    dest.write_bytes(data)

    # Start background job to process recording: analyze with audio-engine, then create draft
    def _task(job: Job):
        job.log(f"processing recording: {dest}")
        
        # First, run audio-engine analysis on the recording
        try:
            job.log("running audio analysis...")
            # Create and start audio-engine job directly (can't call route handler as function)
            analysis_job_id = uuid.uuid4().hex[:12]
            analysis_job = Job(analysis_job_id, "audio-engine", {"audio": str(dest)})
            JOBS[analysis_job_id] = analysis_job
            analysis_thread = threading.Thread(target=_run_job, args=(analysis_job,), daemon=True)
            analysis_thread.start()
            
            # Wait for analysis to complete
            import time
            max_wait = 300  # 5 minutes timeout
            waited = 0
            while waited < max_wait:
                if analysis_job.status in ("completed", "failed"):
                    break
                time.sleep(2)
                waited += 2
            
            analysis_job = JOBS.get(analysis_job_id)
            if analysis_job and analysis_job.status == "completed":
                job.log("audio analysis completed")
                # Extract results from analysis job
                analysis_dir = analysis_job.dir
                segments_file = analysis_dir / "segments.json"
                lyrics_file = analysis_dir / "words.json"
                
                segments = []
                lyrics = []
                metadata = {"title": f"Recording {rec_id}", "artist": "Unknown"}
                
                if segments_file.exists():
                    try:
                        segments_data = json.loads(segments_file.read_text(encoding="utf-8"))
                        segments = segments_data.get("segments", [])
                        job.log(f"found {len(segments)} segments")
                    except Exception as e:
                        job.log(f"failed to parse segments: {e}")
                
                if lyrics_file.exists():
                    try:
                        lyrics_data = json.loads(lyrics_file.read_text(encoding="utf-8"))
                        lyrics = lyrics_data.get("words", [])
                        job.log(f"found {len(lyrics)} lyrics")
                    except Exception as e:
                        job.log(f"failed to parse lyrics: {e}")
                
                # Create draft with extracted data
                meta = {
                    "title": f"Recording {rec_id}",
                    "artist": "Unknown",
                    "assets": {"audio": str(dest)},
                }
                draft = {
                    "id": uuid.uuid4().hex[:12],
                    "meta": meta,
                    "sections": segments,
                    "lyrics": lyrics,
                    "assets": {"audio": str(dest)},
                }
                draft_id = draft["id"]
                _write_draft(draft_id, draft)
                job.inputs["draftId"] = draft_id
                job.log(f"draft ready with analysis: {draft_id}")
            else:
                job.log("audio analysis failed or timed out, creating basic draft")
                # Fallback: create basic draft without analysis
                meta = {
                    "title": f"Recording {rec_id}",
                    "artist": "Unknown",
                    "assets": {"audio": str(dest)},
                }
                draft_id = uuid.uuid4().hex[:12]
                _write_draft(draft_id, meta)
                job.inputs["draftId"] = draft_id
                job.log(f"basic draft ready: {draft_id}")
                
        except Exception as e:
            job.log(f"analysis failed: {e}, creating basic draft")
            # Fallback: create basic draft
            meta = {
                "title": f"Recording {rec_id}",
                "artist": "Unknown",
                "assets": {"audio": str(dest)},
            }
            draft_id = uuid.uuid4().hex[:12]
            _write_draft(draft_id, meta)
            job.inputs["draftId"] = draft_id
            job.log(f"basic draft ready: {draft_id}")

    job_id = start_custom_job("recording-upload", _task, {"path": str(dest)})
    return {"jobId": job_id}

@app.get("/drafts/{draft_id}/songdoc")
def drafts_songdoc(draft_id: str):
    fp = DRAFTS_DIR / f"{draft_id}.json"
    if not fp.exists():
        raise HTTPException(404, "draft not found")
    return json.loads(fp.read_text(encoding="utf-8"))

@app.post("/songs/from-draft")
def songs_from_draft(body: Dict[str, Any]):
    draft_id = body.get("draftId")
    if not draft_id:
        raise HTTPException(400, "draftId required")
    fp = DRAFTS_DIR / f"{draft_id}.json"
    if not fp.exists():
        raise HTTPException(404, "draft not found")
    draft = json.loads(fp.read_text(encoding="utf-8"))
    title = draft.get("meta", {}).get("title") or f"Song {draft_id}"
    artist = draft.get("meta", {}).get("artist") or "Unknown"
    # Build a simple source from draft
    source = {
        "metadata": {"title": title, "artist": artist},
        "assets": draft.get("assets") or {},
        "sections": draft.get("sections") or [],
        "lyrics": draft.get("lyrics") or [],
    }
    sid = uuid.uuid4().hex[:12]
    conn = get_db_conn(); cur = conn.cursor()
    cur.execute("INSERT INTO songs (id, title, source_json, lyrics) VALUES (?, ?, ?, ?)", (sid, title, json.dumps(source), json.dumps(source.get("lyrics") or [])))
    conn.commit(); conn.close()
    # Persist draft as jcrd and compute indices
    try:
        _write_jcrd_and_indices(sid, source)
    except Exception:
        pass
    return {"id": sid}

# ---------------------- Stream ingestion using audio-automation ----------------------

@app.post('/api/stream/ingest')
def api_stream_ingest(body: Dict[str, Any]):
    """Ingest a list of streaming URLs (YouTube, etc.), record to a mix file via
    audio-automation's record_stream, and create a song. Returns a jobId.

    Body fields:
      - urls: list of URLs or local file paths (required unless playlist provided)
      - playlist: optional playlist text (one URL/path per line)
      - mode: 'yt-dlp' | 'streamlink' (default 'yt-dlp')
      - audio_format: wav|mp3|ogg|webm (default 'wav')
      - sample_rate: default 44100
      - channels: default 2
      - title: optional song title
      - artist: optional artist
    """
    urls = body.get('urls') or []
    playlist_text = body.get('playlist')
    mode = body.get('mode') or 'yt-dlp'
    audio_format = body.get('audio_format') or 'wav'
    sample_rate = int(body.get('sample_rate') or 44100)
    channels = int(body.get('channels') or 2)
    title = (body.get('title') or '').strip()
    artist = (body.get('artist') or '').strip() or 'Unknown'

    if not playlist_text and (not isinstance(urls, list) or not urls):
        raise HTTPException(400, 'urls (list) or playlist (text) required')

    # Prepare session directory and playlist
    AA_DIR.mkdir(parents=True, exist_ok=True)
    work_dir = AA_DIR / 'work'
    work_dir.mkdir(parents=True, exist_ok=True)
    sess_dir = work_dir / (time.strftime('session-%Y%m%d-%H%M%S'))
    sess_dir.mkdir(parents=True, exist_ok=True)
    playlist_file = sess_dir / 'playlist.txt'
    if playlist_text:
        playlist_file.write_text(playlist_text, encoding='utf-8')
    else:
        playlist_file.write_text('\n'.join(urls) + '\n', encoding='utf-8')

    # Ensure audio-automation src on sys.path and import record_stream
    aa_src = AA_DIR
    if str(aa_src) not in sys.path:
        sys.path.insert(0, str(aa_src))
    try:
        import importlib
        rs = importlib.import_module('src.record_stream')
    except Exception as e:
        raise HTTPException(500, f'failed to load audio-automation: {e}')

    def _task(job: Job):
        try:
            job.log(f'recording from playlist: {playlist_file}')
            mix_path = rs.run(playlist_file=playlist_file, session_dir=sess_dir, mode=mode,
                              audio_format=audio_format, sample_rate=sample_rate, channels=channels,
                              logger=lambda m: job.log(str(m)))
            # Create song row
            song_title = title or f'Stream {mix_path.stem}'
            source = {"metadata": {"title": song_title, "artist": artist}, "assets": {"audio": str(mix_path)}}
            sid = uuid.uuid4().hex[:12]
            conn = get_db_conn(); cur = conn.cursor()
            cur.execute('INSERT INTO songs (id, title, source_json, lyrics) VALUES (?, ?, ?, ?)', (sid, song_title, json.dumps(source), ''))
            conn.commit(); conn.close()
            job.inputs['songId'] = sid
            job.log(f'created song: {sid}')
        except Exception as e:
            job.status = 'failed'
            job.log(f'ERROR: {e}')

    job_id = start_custom_job('stream-ingest', _task, {"session": str(sess_dir)})
    return {"jobId": job_id}


# ---------------------- Compatibility V1 API for frontend ----------------------
@app.get("/v1/songs/{song_id}/doc")
def get_song_doc(song_id: str):
    conn = get_db_conn()
    cur = conn.cursor()
    cur.execute("SELECT id, title, source_json, lyrics FROM songs WHERE id = ?", (song_id,))
    r = cur.fetchone()
    conn.close()
    if not r:
        raise HTTPException(404, "song not found")
    row = dict(r)
    # source_json stores original payload
    source = json.loads(row.pop("source_json")) if row.get("source_json") else {}

    # Build a 'doc' shape expected by the frontend
    doc: Dict[str, Any] = {}
    doc["id"] = row.get("id")
    doc["title"] = row.get("title") or source.get("metadata", {}).get("title")
    doc["artist"] = source.get("metadata", {}).get("artist") or source.get("artist")
    doc["timeSignature"] = source.get("metadata", {}).get("time_signature") or source.get("time_signature") or source.get("timeSignature") or "4/4"

    # Sections: pass through if present
    doc["sections"] = source.get("sections") or []

    # Chords: try to map chord_progression entries to {symbol, startBeat}
    chords = []
    for cp in source.get("chord_progression", []) or []:
        # cp may be a dict-like with keys 'time' and 'chord'
        try:
            t = cp.get("time") if isinstance(cp, dict) else (cp["time"] if isinstance(cp, (list, tuple)) and len(cp) > 0 else None)
            sym = cp.get("chord") if isinstance(cp, dict) else (cp["chord"] if isinstance(cp, (list, tuple)) and len(cp) > 1 else None)
            if t is None and isinstance(cp, dict) and "time" in cp:
                t = cp["time"]
            if sym is None and isinstance(cp, dict) and "chord" in cp:
                sym = cp["chord"]
            if t is not None:
                chords.append({"symbol": sym or "", "startBeat": float(t)})
        except Exception:
            # ignore malformed entries
            pass
    doc["chords"] = chords

    # Lyrics: try to parse JSON if stored as JSON array (from LRC parsing), otherwise split plain text
    lyrics_field = row.get("lyrics") or ""
    lyrics = []
    if lyrics_field:
        # detect JSON array
        try:
            parsed = json.loads(lyrics_field)
            if isinstance(parsed, list):
                # ensure each entry has text and optional beat
                for item in parsed:
                    if isinstance(item, dict) and item.get("text"):
                        lyrics.append({"text": item.get("text"), "beat": item.get("beat")})
            else:
                raise ValueError("not a list")
        except Exception:
            # fallback: plain text lines
            for ln in lyrics_field.splitlines():
                if ln.strip():
                    lyrics.append({"text": ln.strip(), "beat": None})
    doc["lyrics"] = lyrics

    # expose original source and assets so older frontend code can find cached VTTs
    doc["source"] = source
    doc["assets"] = source.get("assets", {})

    return doc


@app.post("/v1/songs/{song_id}/attach-lyrics")
def attach_lyrics(song_id: str, body: Dict[str, Any]):
    lines = body.get("lines")
    lrc_text = body.get("lrc")
    mode = body.get("mode") or "append"

    conn = get_db_conn()
    cur = conn.cursor()
    cur.execute("SELECT lyrics, source_json FROM songs WHERE id = ?", (song_id,))
    r = cur.fetchone()
    if not r:
        conn.close()
        raise HTTPException(404, "song not found")
    existing = r[0] or ""
    source_json = json.loads(r[1]) if r[1] else {}

    # Helper: convert seconds -> beats using tempo (BPM)
    def seconds_to_beats(sec: float, tempo: float) -> float:
        return sec * (tempo / 60.0)

    # If lrc_text provided, parse LRC format into timestamped lines
    parsed_lines = []
    if isinstance(lrc_text, str) and lrc_text.strip():
        import re

        timestamp_re = re.compile(r"\[(\d+):(\d{2}(?:\.\d+)?)\]")
        for raw in lrc_text.splitlines():
            raw = raw.strip()
            if not raw:
                continue
            times = timestamp_re.findall(raw)
            text = timestamp_re.sub("", raw).strip()
            if not times:
                # no timestamp, treat as untimed line
                parsed_lines.append({"text": text, "beat": None})
            else:
                for m in times:
                    mins = int(m[0])
                    secs = float(m[1])
                    total_sec = mins * 60 + secs
                    # determine tempo: prefer body tempo, otherwise metadata
                    tempo = float(body.get("tempo") or source_json.get("metadata", {}).get("tempo") or 120)
                    beat = seconds_to_beats(total_sec, tempo)
                    parsed_lines.append({"text": text, "beat": beat})

    # If lines list provided, normalize into list of dicts
    if isinstance(lines, list):
        for l in lines:
            if isinstance(l, dict) and l.get("text"):
                parsed_lines.append({"text": l.get("text"), "beat": l.get("beat")})
            elif isinstance(l, str) and l.strip():
                parsed_lines.append({"text": l.strip(), "beat": None})

    # Merge according to mode
    if parsed_lines:
        if mode == "replace":
            final_obj = parsed_lines
        else:
            # If existing is JSON array, merge; else append as text lines
            try:
                existing_parsed = json.loads(existing) if existing and existing.strip().startswith("[") else None
            except Exception:
                existing_parsed = None
            if isinstance(existing_parsed, list):
                final_obj = existing_parsed + parsed_lines
            else:
                # convert existing plain text into list
                existing_lines = [ {"text": ln, "beat": None} for ln in existing.splitlines() if ln.strip() ]
                final_obj = existing_lines + parsed_lines

        final = json.dumps(final_obj)
        cur.execute("UPDATE songs SET lyrics = ? WHERE id = ?", (final, song_id))
        conn.commit()
        conn.close()
        return {"song_id": song_id, "lines_added": len(parsed_lines)}

    # Fallback: no parsed lines, keep behavior for plain text lines param
    if isinstance(lines, list):
        new_text = "\n".join([l.get("text") if isinstance(l, dict) else str(l) for l in lines if (l and ((isinstance(l, dict) and l.get("text")) or (not isinstance(l, dict))))])
        if mode == "replace":
            final = new_text
        else:
            if existing and not existing.endswith("\n") and new_text:
                final = existing + "\n" + new_text
            else:
                final = existing + new_text
        cur.execute("UPDATE songs SET lyrics = ? WHERE id = ?", (final, song_id))
        conn.commit()
        conn.close()
        return {"song_id": song_id, "lines_added": len(lines)}

    conn.close()
    raise HTTPException(400, "no lyrics provided")


@app.get("/v1/lyrics/search")
def lyrics_search(title: str | None = None, artist: str | None = None):
    # Development stub: we don't have an external lyrics source here.
    # Return no match so frontend can handle fallback paths.
    return {"matched": False, "lines": []}


@app.get('/api/lyrics/resolve')
def api_lyrics_resolve(artist: str | None = None, title: str | None = None, duration: int | None = None, allowOnline: bool = True, prefer: str | None = None, songId: str | None = None):
    if not title:
        raise HTTPException(400, "title required")
    meta = {'artist': artist, 'title': title, 'duration': duration}
    result = resolve_lyrics(meta, cache_dir=str(LYRICS_CACHE), allow_online=allowOnline, prefer=prefer)
    # If songId given and vtt found, attach to song.source_json assets.lyrics_vtt
    if songId and result.get('vttPath'):
        try:
            conn = get_db_conn()
            cur = conn.cursor()
            cur.execute('SELECT source_json FROM songs WHERE id = ?', (songId,))
            r = cur.fetchone()
            if r:
                source = json.loads(r[0]) if r[0] else {}
                source = source or {}
                source.setdefault('assets', {})
                source['assets']['lyrics_vtt'] = result['vttPath']
                cur.execute('UPDATE songs SET source_json = ? WHERE id = ?', (json.dumps(source), songId))
                conn.commit()
            conn.close()
        except Exception as e:
            print('attach vtt to song failed', e)
    return result


@app.post('/api/lyrics/cache')
def api_lyrics_cache(body: Dict[str, Any]):
    artist = body.get('artist')
    title = body.get('title')
    duration = int(body.get('duration') or 0)
    lrc = body.get('lrc')
    if not title or not lrc:
        raise HTTPException(400, 'title and lrc required')
    slug = f"{(artist or '').lower().replace(' ', '-')}-{title.lower().replace(' ', '-')}-{duration}"
    base = LYRICS_CACHE / slug
    lrcp = base.with_suffix('.lrc')
    vttp = base.with_suffix('.vtt')
    jcrd = base.with_suffix('.jcrd.json')
    lrcp.write_text(lrc, encoding='utf-8')
    # simple vtt conversion: naive timestamp parse
    try:
        # reuse regex used elsewhere: convert [mm:ss.xx] to vtt cues
        import re
        lines = []
        ts_re = re.compile(r"\[(\d+):(\d{2}(?:\.\d+)?)\](.*)")
        for raw in lrc.splitlines():
            m = ts_re.match(raw)
            if m:
                mins = int(m.group(1)); secs = float(m.group(2)); text = m.group(3).strip()
                lines.append({'time': mins*60+secs, 'text': text})
        # build vtt
        v = ['WEBVTT','']
        i = 0
        for it in lines:
            start = it['time']
            end = start + 3
            v.append(str(i))
            v.append(f"{seconds_to_stamp(start)} --> {seconds_to_stamp(end)}")
            v.append(it['text'])
            v.append('')
            i += 1
        vtxt = '\n'.join(v)
        vttp.write_text(vtxt, encoding='utf-8')
        j = {"assets": {"lyrics_vtt": str(vttp)}}
        jcrd.write_text(json.dumps(j, indent=2), encoding='utf-8')
    except Exception as e:
        print('vtt conversion failed', e)
    return {"cached": True, "slug": slug, "lrcPath": str(lrcp), "vttPath": str(vttp)}

def seconds_to_stamp(s: float):
    hh = int(s//3600)
    mm = int((s%3600)//60)
    ss = int(s%60)
    ms = int((s - int(s)) * 1000)
    return f"{hh:02d}:{mm:02d}:{ss:02d}.{ms:03d}"

def _stamp_to_seconds(stamp: str) -> float:
    """Parse a VTT/WebVTT timestamp like HH:MM:SS.mmm into seconds."""
    try:
        parts = stamp.split(':')
        if len(parts) == 3:
            hh = int(parts[0]); mm = int(parts[1]); ss_ms = parts[2]
        elif len(parts) == 2:  # MM:SS.mmm
            hh = 0; mm = int(parts[0]); ss_ms = parts[1]
        else:
            return 0.0
        if '.' in ss_ms:
            ss, ms = ss_ms.split('.')
            sec = int(ss); msec = int(ms[:3].ljust(3,'0'))
        else:
            sec = int(ss_ms); msec = 0
        return hh*3600 + mm*60 + sec + msec/1000.0
    except Exception:
        return 0.0

@app.get('/api/lyrics/lines')
def api_lyrics_lines(songId: str):
    """Return parsed lyric lines from the song's attached VTT, if any.

    Response: { lines: [{ t: seconds, text: str }], count: int }
    """
    conn = get_db_conn(); cur = conn.cursor()
    cur.execute('SELECT source_json FROM songs WHERE id = ?', (songId,))
    r = cur.fetchone(); conn.close()
    if not r:
        raise HTTPException(404, 'song not found')
    source = json.loads(r[0]) if r[0] else {}
    assets = (source or {}).get('assets') or {}
    vtt_path = assets.get('lyrics_vtt')
    if not vtt_path:
        # Try list variant
        paths = assets.get('lyrics_vtts') or []
        if isinstance(paths, list) and paths:
            vtt_path = paths[0]
    if not vtt_path:
        return { 'lines': [], 'count': 0 }
    vp = Path(vtt_path)
    if not vp.exists():
        # Attempt to resolve relative to lyrics cache if stored as basename
        cand = list(LYRICS_CACHE.rglob(vp.name))
        if cand:
            vp = cand[0]
        else:
            return { 'lines': [], 'count': 0 }
    try:
        raw = vp.read_text(encoding='utf-8', errors='ignore').splitlines()
    except Exception:
        return { 'lines': [], 'count': 0 }

    lines = []
    i = 0
    while i < len(raw):
        line = raw[i].strip()
        i += 1
        if not line or line.upper().startswith('WEBVTT'):
            continue
        # Optional cue id line: numeric or arbitrary, followed by time line
        if '-->' not in line and i < len(raw) and '-->' in raw[i]:
            line = raw[i].strip(); i += 1
        if '-->' in line:
            try:
                start_stamp = line.split('-->')[0].strip()
                t = _stamp_to_seconds(start_stamp)
                # Next non-empty line(s) are text; take first
                text = ''
                while i < len(raw) and raw[i].strip() == '':
                    i += 1
                if i < len(raw):
                    text = raw[i].strip(); i += 1
                if text:
                    lines.append({ 't': round(t, 3), 'text': text })
                # Skip until blank line separating cues
                while i < len(raw) and raw[i].strip() != '':
                    i += 1
            except Exception:
                pass
    return { 'lines': lines, 'count': len(lines) }


@app.post('/api/experiments/publish-lyrics')
def publish_session_lyrics(body: Dict[str, Any]):
    """Publish the latest audio-automation session lyrics into the lyrics cache.

    Request body (all optional except when session is provided):
      - session: path to session directory under experiments/audio-engine/audio-automation/work
      - artist, title, duration: metadata used to build the cache slug
      - songId: optional song id to attach the vttPath into songs.source_json.assets.lyrics_vtt

    Behavior:
      - If session is omitted, the most recent session under work/ is used.
      - Looks for SEG00/lyrics/SEG00.vtt and .srt and SEG00.jcrd.json and copies them to data/lyrics_cache/<slug>.*
      - Upserts a song in the songs DB (matching by title if present) and sets source.assets.lyrics_vtt to the cached VTT path.
    """
    # Accept explicit session path (absolute or relative to audio-automation/work)
    work_root = EXPS / 'audio-engine' / 'audio-automation' / 'work'
    session = body.get('session')
    if session:
        sess_path = Path(session)
        if not sess_path.is_absolute():
            sess_path = work_root / session
        if not sess_path.exists() or not sess_path.is_dir():
            raise HTTPException(404, f"session not found: {session}")
    else:
        # choose latest session directory
        sessions = sorted([p for p in work_root.iterdir() if p.is_dir()], key=lambda p: p.stat().st_mtime, reverse=True)
        if not sessions:
            raise HTTPException(404, "no sessions found")
        sess_path = sessions[0]

    # Collect SEG* directories under the session and copy their lyrics artifacts
    seg_dirs = sorted([p for p in sess_path.iterdir() if p.is_dir() and p.name.lower().startswith('seg')], key=lambda p: p.name)
    if not seg_dirs:
        raise HTTPException(404, f"no SEG* directories found in session: {sess_path}")

    # Attempt to read metadata from first segment's jcrd if present
    meta = {}
    first_jcrd = seg_dirs[0] / 'SEG00.jcrd.json'
    if not first_jcrd.exists():
        # try any jcrd in segments
        for sd in seg_dirs:
            cand = sd / f"{sd.name}.jcrd.json"
            if cand.exists():
                first_jcrd = cand
                break
    if first_jcrd.exists():
        try:
            meta = json.loads(first_jcrd.read_text(encoding='utf-8'))
        except Exception:
            meta = {}

    artist = (body.get('artist') or meta.get('metadata', {}).get('artist') or meta.get('lyrics', {}).get('artist') or 'unknown').strip()
    title = (body.get('title') or meta.get('metadata', {}).get('title') or 'unknown-title').strip()
    duration = int(body.get('duration') or 0)

    # base slug and session-scoped suffix to avoid collisions
    base = f"{artist or 'unknown'}-{title or 'unknown'}-{duration}"
    base = base.lower().replace(' ', '-').replace('/', '-')
    sess_name = sess_path.name if sess_path.name else str(int(time.time()))
    slug_dir = f"{base}-{sess_name}"

    # Create a directory under LYRICS_CACHE for this session
    target_dir = LYRICS_CACHE / slug_dir
    target_dir.mkdir(parents=True, exist_ok=True)

    copied_vtts = []
    copied_srts = []
    copied_jcrds = []

    # Iterate segments and copy any lyric artifacts found
    for sd in seg_dirs:
        # support SEG00/lyrics/SEG00.vtt or SEG00.vtt at segment root
        seg_label = sd.name
        lyrics_subdir = sd / 'lyrics'
        # search for any .vtt in lyrics_subdir or at sd
        candidates = []
        if lyrics_subdir.exists() and lyrics_subdir.is_dir():
            candidates += list(lyrics_subdir.glob('*.vtt'))
            candidates += list(lyrics_subdir.glob('*.srt'))
        # also check root of segment
        candidates += list(sd.glob('*.vtt'))
        candidates += list(sd.glob('*.srt'))

        # jcrd may live at segment root
        jcrd_candidates = list(sd.glob('*.jcrd.json'))

        # Copy VTT and SRT files (if multiple, copy all and prefix with segment name)
        for v in [p for p in candidates if p.suffix.lower() == '.vtt']:
            dst = target_dir / f"{seg_label}{v.suffix}"
            try:
                dst.write_bytes(v.read_bytes())
                copied_vtts.append(str(dst))
            except Exception as e:
                print('copy vtt failed', v, e)
        for s in [p for p in candidates if p.suffix.lower() == '.srt']:
            dst = target_dir / f"{seg_label}{s.suffix}"
            try:
                dst.write_bytes(s.read_bytes())
                copied_srts.append(str(dst))
            except Exception as e:
                print('copy srt failed', s, e)
        for j in jcrd_candidates:
            dst = target_dir / f"{seg_label}.jcrd.json"
            try:
                dst.write_bytes(j.read_bytes())
                copied_jcrds.append(str(dst))
            except Exception as e:
                print('copy jcrd failed', j, e)

    # Ensure we have at least one VTT copied
    if not copied_vtts:
        raise HTTPException(404, f"no vtt artifacts found in session: {sess_path}")

    # Upsert song in DB and attach vtt paths + session directory info if songId provided
    conn = get_db_conn()
    cur = conn.cursor()
    songId = body.get('songId')
    # prepare assets object referencing the directory and vtts
    assets_obj = {'lyrics_dir': str(target_dir), 'vttPaths': copied_vtts, 'srtPaths': copied_srts, 'jcrdPaths': copied_jcrds}

    if songId:
        cur.execute('SELECT source_json FROM songs WHERE id = ?', (songId,))
        r = cur.fetchone()
        if not r:
            conn.close()
            raise HTTPException(404, 'songId not found')
        source = json.loads(r[0]) if r[0] else {}
        source = source or {}
        source.setdefault('assets', {})
        # attach directory and list of vtts
        source['assets']['lyrics_cache_dir'] = assets_obj['lyrics_dir']
        source['assets']['lyrics_vtts'] = assets_obj['vttPaths']
        if assets_obj['srtPaths']:
            source['assets']['lyrics_srts'] = assets_obj['srtPaths']
        if assets_obj['jcrdPaths']:
            source['assets']['lyrics_jcrds'] = assets_obj['jcrdPaths']
        cur.execute('UPDATE songs SET source_json = ? WHERE id = ?', (json.dumps(source), songId))
        conn.commit()
        conn.close()
        return {'cached': True, 'slug': slug_dir, 'vttPaths': copied_vtts, 'songId': songId}

    # If no songId: try to find by title; else create new song
    cur.execute('SELECT id, source_json FROM songs WHERE title = ?', (title,))
    r = cur.fetchone()
    if r:
        sid = r[0]
        source = json.loads(r[1]) if r[1] else {}
        source = source or {}
        source.setdefault('assets', {})
        source['assets']['lyrics_cache_dir'] = assets_obj['lyrics_dir']
        source['assets']['lyrics_vtts'] = assets_obj['vttPaths']
        if assets_obj['srtPaths']:
            source['assets']['lyrics_srts'] = assets_obj['srtPaths']
        if assets_obj['jcrdPaths']:
            source['assets']['lyrics_jcrds'] = assets_obj['jcrdPaths']
        cur.execute('UPDATE songs SET source_json = ? WHERE id = ?', (json.dumps(source), sid))
        conn.commit()
        conn.close()
        return {'cached': True, 'slug': slug_dir, 'vttPaths': copied_vtts, 'songId': sid}
    else:
        from uuid import uuid4
        sid = uuid4().hex[:12]
        source = {'metadata': {'artist': artist, 'title': title, 'duration': duration}, 'assets': {'lyrics_cache_dir': assets_obj['lyrics_dir'], 'lyrics_vtts': assets_obj['vttPaths']}}
        cur.execute('INSERT INTO songs (id, title, source_json, lyrics) VALUES (?, ?, ?, ?)', (sid, title, json.dumps(source), ''))
        conn.commit()
        conn.close()
        return {'cached': True, 'slug': slug_dir, 'vttPaths': copied_vtts, 'songId': sid}



@app.get("/songs/{song_id}/lyrics")
def get_song_lyrics(song_id: str):
    conn = get_db_conn()
    cur = conn.cursor()
    cur.execute("SELECT lyrics FROM songs WHERE id = ?", (song_id,))
    r = cur.fetchone()
    conn.close()
    if not r:
        raise HTTPException(404, "song not found")
    return {"song_id": song_id, "lyrics": r[0] or ""}


@app.get("/songs/{song_id}/tags")
def get_song_tags(song_id: str):
    conn = get_db_conn()
    cur = conn.cursor()
    cur.execute("SELECT tag FROM song_tags WHERE song_id = ?", (song_id,))
    tags = [r[0] for r in cur.fetchall()]
    conn.close()
    return {"song_id": song_id, "tags": tags}


@app.post("/songs/{song_id}/tags")
def add_song_tag(song_id: str, body: Dict[str, Any]):
    tag = body.get("tag")
    if not tag:
        raise HTTPException(400, "tag required")
    conn = get_db_conn()
    cur = conn.cursor()
    try:
        cur.execute("INSERT OR IGNORE INTO song_tags (song_id, tag) VALUES (?, ?)", (song_id, tag))
        conn.commit()
    finally:
        conn.close()
    return {"song_id": song_id, "tag": tag}


# Admin/export endpoints
@app.get("/admin/export")
def export_songs():
    conn = get_db_conn()
    cur = conn.cursor()
    cur.execute("SELECT id, title, source_json, lyrics FROM songs")
    rows = []
    for r in cur.fetchall():
        row = dict(r)
        row["source"] = json.loads(row.pop("source_json")) if row.get("source_json") else {}
        rows.append(row)
    conn.close()
    return {"exported": len(rows), "songs": rows}


@app.post("/admin/import")
def import_songs(body: Dict[str, Any]):
    data = body.get("songs")
    if not isinstance(data, list):
        raise HTTPException(400, "songs must be a list")
    conn = get_db_conn()
    cur = conn.cursor()
    added = 0
    for s in data:
        sid = s.get("id") or uuid4().hex[:12]
        title = s.get("title") or f"Song {sid}"
        source_json = json.dumps(s.get("source") or s)
        lyrics = s.get("lyrics") or s.get("source", {}).get("lyrics") or ""
        try:
            cur.execute("INSERT OR IGNORE INTO songs (id, title, source_json, lyrics) VALUES (?, ?, ?, ?)", (sid, title, source_json, lyrics))
            added += 1
        except Exception:
            pass
    conn.commit()
    conn.close()
    return {"imported": added}


@app.get("/admin/db/download")
def download_db():
    if not DB_PATH.exists():
        raise HTTPException(404, "db not found")
    return StreamingResponse(DB_PATH.open('rb'), media_type='application/octet-stream')


# ---------------------- Palettes (Canvas) API ----------------------

def _now_iso():
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

def _default_canvas_doc(palette_id: str, name: str, experiment_id: str | None = None) -> dict:
    return {
        "id": palette_id,
        "experiment_id": experiment_id,
        "name": name,
        "nodes": [],
        "groups": [],
        "grid_size": 8,
        "snap": True,
        "zoom": 1.0,
        "viewport": {"x": 0, "y": 0},
        "meta": {},
    }

def _palette_get_row(palette_id: str) -> dict | None:
    conn = get_db_conn(); cur = conn.cursor()
    cur.execute("SELECT id, experiment_id, name, doc_json, created_at, updated_at FROM palettes WHERE id = ?", (palette_id,))
    r = cur.fetchone(); conn.close()
    if not r:
        return None
    row = dict(r)
    try:
        row["doc"] = json.loads(row.get("doc_json") or "{}")
    except Exception:
        row["doc"] = {}
    return row

def _palette_save_row(palette_id: str, doc: dict, name: str | None = None, experiment_id: str | None = None) -> dict:
    now = _now_iso()
    conn = get_db_conn(); cur = conn.cursor()
    # Upsert
    cur.execute("SELECT id FROM palettes WHERE id = ?", (palette_id,))
    exists = cur.fetchone() is not None
    if exists:
        cur.execute(
            "UPDATE palettes SET experiment_id = COALESCE(?, experiment_id), name = COALESCE(?, name), doc_json = ?, updated_at = ? WHERE id = ?",
            (experiment_id, name, json.dumps(doc), now, palette_id)
        )
    else:
        cur.execute(
            "INSERT INTO palettes (id, experiment_id, name, doc_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            (palette_id, experiment_id, name or doc.get("name") or "Untitled", json.dumps(doc), now, now)
        )
    conn.commit(); conn.close()
    return {"id": palette_id, "doc": doc, "name": name or doc.get("name"), "experiment_id": experiment_id, "updated_at": now}

@app.get("/api/palettes")
def palette_list():
    conn = get_db_conn(); cur = conn.cursor()
    cur.execute("SELECT id, experiment_id, name, updated_at FROM palettes ORDER BY updated_at DESC")
    items = [dict(r) for r in cur.fetchall()]
    conn.close()
    return {"items": items, "total": len(items)}

@app.post("/api/palettes")
def palette_create(body: Dict[str, Any]):
    pid = uuid.uuid4().hex[:12]
    name = body.get("name") or f"Canvas {pid}"
    exp = body.get("experiment_id")
    doc = _default_canvas_doc(pid, name, exp)
    row = _palette_save_row(pid, doc, name=name, experiment_id=exp)
    return {"id": pid, "doc": row["doc"], "name": name, "experiment_id": exp}

@app.get("/api/palettes/{palette_id}")
def palette_get(palette_id: str):
    row = _palette_get_row(palette_id)
    if not row:
        raise HTTPException(404, "palette not found")
    # Attach ETag header with updated_at for optimistic concurrency
    resp = Response(content=json.dumps(row["doc"]), media_type="application/json")
    if row.get("updated_at"):
        resp.headers["ETag"] = row["updated_at"]
    return resp

@app.patch("/api/palettes/{palette_id}")
def palette_patch(palette_id: str, body: Dict[str, Any], if_match: str | None = Header(default=None, alias="If-Match")):
    row = _palette_get_row(palette_id)
    if not row:
        raise HTTPException(404, "palette not found")
    # If-Match handling (optimistic concurrency)
    if if_match and row.get("updated_at") and if_match.strip('"') != str(row["updated_at"]):
        raise HTTPException(status_code=409, detail="conflict: stale ETag")
    doc = row["doc"] or {}
    # Shallow updates for top-level fields
    for k in ("name", "experiment_id", "grid_size", "snap", "zoom", "viewport", "meta"):
        if k in body:
            doc[k] = body[k]
    # Full replacement of arrays if provided
    if "nodes" in body and isinstance(body["nodes"], list):
        doc["nodes"] = body["nodes"]
    if "groups" in body and isinstance(body["groups"], list):
        doc["groups"] = body["groups"]
    saved = _palette_save_row(palette_id, doc, name=doc.get("name"), experiment_id=doc.get("experiment_id"))
    resp = Response(content=json.dumps({"id": palette_id, "doc": doc}), media_type="application/json")
    if saved.get("updated_at"):
        resp.headers["ETag"] = saved["updated_at"]
    return resp

@app.delete("/api/palettes/{palette_id}")
def palette_delete(palette_id: str):
    conn = get_db_conn(); cur = conn.cursor()
    cur.execute("DELETE FROM palettes WHERE id = ?", (palette_id,))
    conn.commit(); conn.close()
    return {"deleted": True, "id": palette_id}

def _find_node(nodes: list[dict], node_id: str) -> int:
    for i, n in enumerate(nodes):
        if n.get("id") == node_id:
            return i
    return -1

@app.post("/api/palettes/{palette_id}/nodes")
def palette_add_node(palette_id: str, body: Dict[str, Any]):
    row = _palette_get_row(palette_id)
    if not row:
        raise HTTPException(404, "palette not found")
    doc = row["doc"] or {}
    nodes = doc.setdefault("nodes", [])
    nid = body.get("id") or uuid.uuid4().hex[:8]
    body["id"] = nid
    nodes.append(body)
    saved = _palette_save_row(palette_id, doc, name=doc.get("name"), experiment_id=doc.get("experiment_id"))
    resp = Response(content=json.dumps(body), media_type="application/json")
    if saved.get("updated_at"):
        resp.headers["ETag"] = saved["updated_at"]
    return resp

@app.patch("/api/palettes/{palette_id}/nodes/{node_id}")
def palette_patch_node(palette_id: str, node_id: str, body: Dict[str, Any], if_match: str | None = Header(default=None, alias="If-Match")):
    row = _palette_get_row(palette_id)
    if not row:
        raise HTTPException(404, "palette not found")
    # If-Match handling (optimistic concurrency)
    if if_match and row.get("updated_at") and if_match.strip('"') != str(row["updated_at"]):
        raise HTTPException(status_code=409, detail="conflict: stale ETag")
    doc = row["doc"] or {}
    nodes = doc.setdefault("nodes", [])
    idx = _find_node(nodes, node_id)
    if idx < 0:
        raise HTTPException(404, "node not found")
    node = nodes[idx]
    for k, v in body.items():
        if k == "id":
            continue
        node[k] = v
    nodes[idx] = node
    saved = _palette_save_row(palette_id, doc, name=doc.get("name"), experiment_id=doc.get("experiment_id"))
    resp = Response(content=json.dumps(node), media_type="application/json")
    if saved.get("updated_at"):
        resp.headers["ETag"] = saved["updated_at"]
    return resp

@app.delete("/api/palettes/{palette_id}/nodes/{node_id}")
def palette_delete_node(palette_id: str, node_id: str):
    row = _palette_get_row(palette_id)
    if not row:
        raise HTTPException(404, "palette not found")
    doc = row["doc"] or {}
    nodes = doc.setdefault("nodes", [])
    idx = _find_node(nodes, node_id)
    if idx < 0:
        raise HTTPException(404, "node not found")
    nodes.pop(idx)
    _palette_save_row(palette_id, doc, name=doc.get("name"), experiment_id=doc.get("experiment_id"))
    return {"deleted": True}

@app.post("/api/palettes/{palette_id}/snapshot")
def palette_snapshot(palette_id: str):
    row = _palette_get_row(palette_id)
    if not row:
        raise HTTPException(404, "palette not found")
    doc = row["doc"] or {}
    PALETTES_DIR.mkdir(parents=True, exist_ok=True)
    out_dir = PALETTES_DIR / palette_id
    out_dir.mkdir(parents=True, exist_ok=True)
    ts = time.strftime("%Y%m%d-%H%M%S")
    fp = out_dir / f"{ts}.json"
    fp.write_text(json.dumps(doc, indent=2), encoding="utf-8")
    return {"ok": True, "palette_id": palette_id, "snapshot": {"ts": ts, "path": str(fp)}}

@app.get("/api/palettes/{palette_id}/snapshots")
def palette_list_snapshots(palette_id: str, limit: int = 50, offset: int = 0):
    out_dir = PALETTES_DIR / palette_id
    items = []
    if out_dir.exists():
        files = sorted([p for p in out_dir.glob("*.json")], key=lambda p: p.name, reverse=True)
        total = len(files)
        for p in files[offset:offset+limit]:
            items.append({"ts": p.stem, "path": str(p)})
    else:
        total = 0
    return {"items": items, "total": total, "limit": limit, "offset": offset}

@app.post("/api/palettes/{palette_id}/restore")
def palette_restore(palette_id: str, body: Dict[str, Any]):
    """Restore a palette from a snapshot file.

    Body parameters:
      - ts: timestamp of the snapshot (preferred)
      - path: absolute path to a snapshot json (optional)
    """
    row = _palette_get_row(palette_id)
    if not row:
        raise HTTPException(404, "palette not found")

    ts = body.get("ts")
    path = body.get("path")
    fp: Path
    if ts:
        fp = (PALETTES_DIR / palette_id / f"{ts}.json")
    elif path:
        fp = Path(path)
    else:
        raise HTTPException(400, "ts or path required")
    if not fp.exists():
        raise HTTPException(404, "snapshot not found")
    try:
        doc = json.loads(fp.read_text(encoding="utf-8"))
    except Exception:
        raise HTTPException(400, "invalid snapshot contents")
    saved = _palette_save_row(palette_id, doc, name=doc.get("name"), experiment_id=doc.get("experiment_id"))
    resp = Response(content=json.dumps({"id": palette_id, "doc": doc}), media_type="application/json")
    if saved.get("updated_at"):
        resp.headers["ETag"] = saved["updated_at"]
    return resp


@app.get("/theme/{path:path}")
def theme_static(path: str):
    # Theme static assets are deprecated/archived. Prevent serving from this endpoint.
    # If you need to restore theme assets, re-enable serving from THEME_DIR or restore files from webapp/theme-archive/.
    raise HTTPException(status_code=404, detail="Theme assets removed")

@app.get("/api/theme/list")
def theme_list():
    # Theme API deprecated — return an empty set to indicate no server-managed themes.
    return {"themes": []}

@app.get("/api/theme/{name}.json")
def theme_get(name: str):
    # Theme retrieval disabled — respond with 404 for all theme requests.
    raise HTTPException(status_code=404, detail="Theme API disabled")

@app.post("/api/theme")
def theme_save(payload: Dict[str, Any]):
    # Theme saving disabled — refuse writes to theme store.
    raise HTTPException(status_code=404, detail="Theme API disabled")

if __name__ == "__main__":
    host = os.environ.get("TRK_HOST", "127.0.0.1")
    try:
        port = int(os.environ.get("TRK_PORT", "8000"))
    except Exception:
        port = 8000
    uvicorn.run(app, host=host, port=port)
