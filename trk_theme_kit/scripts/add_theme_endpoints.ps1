Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$SERVER = "apps/server/main.py"
if (!(Test-Path $SERVER)) { throw "Server not found at $SERVER" }
$content = Get-Content $SERVER -Raw
if ($content -match "/api/theme/list") { Write-Host "Theme endpoints already present."; exit 0 }
$append = @'
from typing import Dict
THEME_DIR = (ROOT / "webapp" / "theme")
THEMES = (THEME_DIR / "themes")

@app.get("/theme/{path:path}")
def theme_static(path: str):
    base = THEME_DIR
    fp = base / path
    if fp.is_dir(): fp = fp / "index.html"
    if not fp.exists(): raise HTTPException(404)
    ct = "text/css" if fp.suffix==".css" else "application/javascript" if fp.suffix==".js" else "application/json" if fp.suffix==".json" else "application/octet-stream"
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
    if not fp.exists(): raise HTTPException(404)
    return json.loads(fp.read_text(encoding="utf-8"))

@app.post("/api/theme")
def theme_save(payload: Dict):
    THEMES.mkdir(parents=True, exist_ok=True)
    name = payload.get("name","user-theme").strip().replace("..","")
    vars = payload.get("vars", {})
    # merge with current so unspecified vars persist
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
'@
Add-Content -Path $SERVER -Value "`n`n$append"
Write-Host "Theme endpoints added to $SERVER"
