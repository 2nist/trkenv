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
