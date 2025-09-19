#!/usr/bin/env python3
"""
Resilience probe: exercise TRK host across intermittent outages and idle periods.

Usage:
  python scripts/resilience_probe.py --base http://127.0.0.1:8000 --duration 60 --interval 1.0 \
    --audio "file:///C:/Windows/Media/Windows%20Background.wav"

Behavior (looped until duration elapses):
  - GET /api/health
  - Occasionally GET /api/experiments
  - Start a job (audio-engine) if none; poll status and log transitions
  - Periodically perform palette CRUD + snapshot + restore

All requests are best-effort: network errors are logged and retried on the next iteration.
"""
from __future__ import annotations
import argparse, json, sys, time, random
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

def http_get_json(url: str, timeout: float = 3.0):
    try:
        with urlopen(url, timeout=timeout) as resp:
            data = resp.read()
            ct = resp.headers.get("content-type", "")
            if "application/json" in ct or url.endswith("/health") or url.endswith("/experiments"):
                return json.loads(data.decode("utf-8"))
            return json.loads(data.decode("utf-8"))
    except (HTTPError, URLError, TimeoutError) as e:
        raise RuntimeError(f"GET {url} failed: {e}")

def http_post_json(url: str, payload: dict, timeout: float = 5.0, headers: dict | None = None):
    body = json.dumps(payload).encode("utf-8")
    req = Request(url, data=body, headers={"Content-Type": "application/json", **(headers or {})}, method="POST")
    try:
        with urlopen(req, timeout=timeout) as resp:
            data = resp.read()
            ct = resp.headers.get("content-type", "")
            if "application/json" in ct:
                return json.loads(data.decode("utf-8")), dict(resp.headers)
            return json.loads(data.decode("utf-8")), dict(resp.headers)
    except (HTTPError, URLError, TimeoutError) as e:
        raise RuntimeError(f"POST {url} failed: {e}")

def http_patch_json(url: str, payload: dict, timeout: float = 5.0, headers: dict | None = None):
    body = json.dumps(payload).encode("utf-8")
    req = Request(url, data=body, headers={"Content-Type": "application/json", **(headers or {})}, method="PATCH")
    try:
        with urlopen(req, timeout=timeout) as resp:
            data = resp.read()
            ct = resp.headers.get("content-type", "")
            if "application/json" in ct:
                return json.loads(data.decode("utf-8")), dict(resp.headers)
            return json.loads(data.decode("utf-8")), dict(resp.headers)
    except HTTPError as e:
        # Useful to surface conflicts or 5xx
        raise RuntimeError(f"PATCH {url} failed: HTTP {e.code} {e.reason}")
    except (URLError, TimeoutError) as e:
        raise RuntimeError(f"PATCH {url} failed: {e}")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://127.0.0.1:8000")
    ap.add_argument("--duration", type=int, default=60)
    ap.add_argument("--interval", type=float, default=1.0)
    ap.add_argument("--audio", default="file:///C:/Windows/Media/Windows%20Background.wav")
    args = ap.parse_args()

    base = args.base.rstrip("/")
    until = time.time() + args.duration
    job_id: str | None = None
    etag: str | None = None
    palette_id: str | None = None
    last_state: str | None = None
    it = 0

    def log(msg: str):
        ts = time.strftime("%H:%M:%S")
        print(f"[{ts}] {msg}")

    while time.time() < until:
        it += 1
        # 1) Health
        try:
            h = http_get_json(f"{base}/api/health")
            if not h.get("ok"): log("health not ok")
        except Exception as e:
            log(f"health error: {e}")

        # 2) Occasionally experiments
        if it % 10 == 1:
            try:
                _ = http_get_json(f"{base}/api/experiments")
            except Exception as e:
                log(f"experiments error: {e}")

        # 3) Ensure a job exists
        if not job_id and it % 3 == 1:
            try:
                r, _ = http_post_json(f"{base}/api/experiments/audio-engine/jobs", {"audio": args.audio})
                job_id = r.get("jobId") or r.get("id")
                log(f"started job {job_id}")
            except Exception as e:
                log(f"start job failed: {e}")

        # 4) Poll job status
        if job_id:
            try:
                st = http_get_json(f"{base}/api/jobs/{job_id}/status")
                state = st.get("state") or st.get("status")
                if state != last_state:
                    log(f"job {job_id} -> {state}")
                    last_state = state
                if state in {"done", "completed", "failed", "error"}:
                    job_id = None
                    last_state = None
            except Exception as e:
                log(f"status error: {e}")

        # 5) Periodic palette exercise
        if it % 15 == 2:
            try:
                # create
                r, _ = http_post_json(f"{base}/api/palettes", {"name": f"ResTest-{random.randint(100,999)}"})
                pid = r.get("id")
                # get (capture ETag)
                try:
                    # raw GET to capture headers isn't implemented here; skip capturing ETag
                    pass
                except Exception:
                    pass
                # add node
                node, hdrs = http_post_json(f"{base}/api/palettes/{pid}/nodes", {
                    "feature": "panel", "component": "Text", "position": {"x": 20, "y": 20}, "size": {"w": 200, "h": 100},
                    "props_overrides": {"text": "Resilience"}
                })
                et = hdrs.get("ETag")
                # patch node with If-Match if available
                try:
                    _updated, _hdr = http_patch_json(
                        f"{base}/api/palettes/{pid}/nodes/{node.get('id')}",
                        {"position": {"x": 30, "y": 30}},
                        headers=({"If-Match": et} if et else None)
                    )
                except Exception as e:
                    log(f"palette patch error: {e}")
                # snapshot
                try:
                    _snap, _ = http_post_json(f"{base}/api/palettes/{pid}/snapshot", {})
                except Exception as e:
                    log(f"snapshot error: {e}")
                # cleanup
                try:
                    # delete palette (best-effort)
                    req = Request(f"{base}/api/palettes/{pid}", method="DELETE")
                    try:
                        urlopen(req, timeout=3.0).read()
                    except Exception:
                        pass
                except Exception:
                    pass
            except Exception as e:
                log(f"palette cycle error: {e}")

        time.sleep(args.interval)

    log("probe finished")

if __name__ == "__main__":
    main()
