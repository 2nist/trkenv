from __future__ import annotations
"""
I/O adapters for resolving URIs to local files.

Supported schemes:
- file:///C:/path/to/file.ext -> Path on Windows
- gdrive://file/<ID> or gdrive://<ID> -> Downloads via Google Drive v3 using API key

Credentials:
- .env at repo root with GDRIVE_API_KEY=...  (public or link-shared files only)

Notes:
- This is a stub for rapid iteration. For private files or service accounts,
  extend this to use google-auth and googleapiclient when available.
"""
import os
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
import json

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / "runs" / "_cache"


def _load_dotenv(env_path: Path | None = None) -> None:
    """Very small .env loader (KEY=VALUE lines). Does not overwrite existing env."""
    p = env_path or (ROOT / ".env")
    if not p.exists():
        return
    try:
        for line in p.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" not in line:
                continue
            k, v = line.split("=", 1)
            k = k.strip(); v = v.strip().strip('"').strip("'")
            if k and (k not in os.environ):
                os.environ[k] = v
    except Exception:
        # Non-fatal
        pass


def _to_local_from_file_uri(uri: str) -> Path:
    """Convert file:/// URI to a Windows path.

    Example: file:///C:/Users/name/file.wav -> C:\\Users\\name\\file.wav
    """
    pr = urlparse(uri)
    if pr.scheme != "file":
        raise ValueError("not a file:// URI")
    # On Windows, pr.path starts with /C:/...
    path = pr.path
    if os.name == "nt" and path.startswith("/") and len(path) > 2 and path[2] == ":":
        path = path[1:]
    return Path(path)


def _gdrive_filename(file_id: str, api_key: str) -> str:
    meta_url = f"https://www.googleapis.com/drive/v3/files/{file_id}?fields=name&key={api_key}"
    try:
        with urlopen(meta_url) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            name = data.get("name")
            if isinstance(name, str) and name.strip():
                return name
    except Exception:
        pass
    return f"{file_id}.bin"


def _download_gdrive_file(file_id: str, api_key: str, dest_dir: Path, logger=print) -> Path:
    dest_dir.mkdir(parents=True, exist_ok=True)
    name = _gdrive_filename(file_id, api_key)
    dest = dest_dir / name
    if dest.exists() and dest.stat().st_size > 0:
        logger(f"[io] using cached file: {dest}")
        return dest
    url = f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media&key={api_key}"
    req = Request(url)
    try:
        logger(f"[io] start download: gdrive:{file_id} -> {dest}")
        with urlopen(req) as resp, open(dest, "wb") as f:
            total = 0
            while True:
                chunk = resp.read(1024 * 64)
                if not chunk:
                    break
                f.write(chunk)
                total += len(chunk)
                if total % (1024 * 1024) < 65536:  # approx every ~1MB
                    logger(f"[io] downloaded ~{total/1024/1024:.1f} MB...")
        logger(f"[io] download complete: {dest} ({dest.stat().st_size} bytes)")
        return dest
    except HTTPError as e:
        raise RuntimeError(f"Google Drive download failed: HTTP {e.code} {e.reason}")
    except URLError as e:
        raise RuntimeError(f"Google Drive download failed: {e}")


def resolve_uri(uri: str, logger=print) -> Path:
    """Resolve a supported URI to a local file path.

    For gdrive://file/<ID> or gdrive://<ID>, uses GDRIVE_API_KEY from .env.
    For file:///, returns the local path.
    For plain paths, returns Path as-is if exists.
    """
    if not uri:
        raise ValueError("empty uri")

    # fast-path for existing local path
    p = Path(uri)
    if p.exists():
        return p

    pr = urlparse(uri)
    scheme = (pr.scheme or "").lower()
    if scheme == "file":
        p = _to_local_from_file_uri(uri)
        logger(f"[io] resolved file uri -> {p}")
        return p

    if scheme == "gdrive":
        # Accept gdrive://file/<id> or gdrive://<id>
        file_id = pr.netloc
        if file_id == "file":
            file_id = pr.path.lstrip("/")
        if not file_id:
            raise ValueError("gdrive uri missing file id: expected gdrive://file/<ID> or gdrive://<ID>")
        _load_dotenv()
        api_key = os.environ.get("GDRIVE_API_KEY")
        if not api_key:
            raise RuntimeError("GDRIVE_API_KEY not set in environment or .env; cannot fetch from Google Drive")
        cache_dir = CACHE / "gdrive" / file_id
    logger(f"[io] resolve gdrive file {file_id} -> {cache_dir}")
    return _download_gdrive_file(file_id, api_key, cache_dir, logger=logger)

    # Unknown scheme -> return as path if exists
    if Path(pr.path).exists():
        return Path(pr.path)
    raise ValueError(f"unsupported or not found uri/path: {uri}")
