from __future__ import annotations
import sys, os, json, uuid, threading, queue, time, importlib.util
from pathlib import Path
from typing import Dict, Any
from fastapi import FastAPI, HTTPException, UploadFile, File
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

app = FastAPI(title="TRK Host")

# Allow local frontend dev (Next) to call the API during development.
# In production this should be tightened or driven by configuration.
app.add_middleware(
    CORSMiddleware,
    # Allow local frontend dev servers (3000 and 3001) and loopback variants.
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001"],
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
@app.get("/api/jobs/{job_id}/status")
def job_status(job_id: str):
    j = JOBS.get(job_id)
    if not j: raise HTTPException(404, "job not found")
    return {"jobId": j.id, "status": j.status}

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
                rows.append({
                    "name": fp.name,
                    "relpath": str(fp.relative_to(job.dir)),
                    "size": fp.stat().st_size,
                    "uri": fp.resolve().as_uri(),
                })
    return {"jobId": job.id, "status": job.status, "artifacts": rows}

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
    conn.commit()
    conn.close()


init_db()


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
    return {"id": sid, "status": "created"}


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


@app.get("/theme/{path:path}")
def theme_static(path: str):
    base = THEME_DIR
    fp = base / path
    if fp.is_dir():
        fp = fp / "index.html"
    if not fp.exists():
        raise HTTPException(404)
    ct = (
        "text/css" if fp.suffix == ".css" else
        "application/javascript" if fp.suffix == ".js" else
        "application/json" if fp.suffix == ".json" else
        "application/octet-stream"
    )
    return Response(content=fp.read_bytes(), media_type=ct)

@app.get("/api/theme/list")
def theme_list():
    THEMES.mkdir(parents=True, exist_ok=True)
    names = ["current"] + [p.stem for p in THEMES.glob("*.json")]
    return {"themes": sorted(set(names))}

@app.get("/api/theme/{name}.json")
def theme_get(name: str):
    THEMES.mkdir(parents=True, exist_ok=True)
    fp = THEMES / f"{name}.json"
    if name == "current" and not fp.exists():
        fp = THEMES / "midnight.json"
    if not fp.exists():
        raise HTTPException(404)
    return json.loads(fp.read_text(encoding="utf-8"))

@app.post("/api/theme")
def theme_save(payload: Dict[str, Any]):
    THEMES.mkdir(parents=True, exist_ok=True)
    name = payload.get("name", "user-theme").strip().replace("..", "")
    vars = payload.get("vars", {})
    current = {}
    cf = THEMES / "current.json"
    if cf.exists():
        try:
            current = json.loads(cf.read_text(encoding="utf-8")).get("vars", {})
        except Exception:
            current = {}
    current.update(vars)
    data = {"name": name, "vars": current}
    fp = THEMES / f"{name}.json"
    fp.write_text(json.dumps(data, indent=2), encoding="utf-8")
    (THEMES / "current.json").write_text(json.dumps(data, indent=2), encoding="utf-8")
    return {"ok": True, "name": name}

if __name__ == "__main__":
    host = os.environ.get("TRK_HOST", "127.0.0.1")
    try:
        port = int(os.environ.get("TRK_PORT", "8000"))
    except Exception:
        port = 8000
    uvicorn.run(app, host=host, port=port)
