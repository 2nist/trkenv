#!/usr/bin/env python3
"""
Simple smoke test for TRK Host APIs.

Usage:
  python scripts/smoke_api.py --base http://127.0.0.1:8000 --audio "file:///C:/path/to/audio.wav"

- --base: Base URL of the running TRK host (default: http://127.0.0.1:8000)
- --audio: file:/// URI of an audio file to run through the audio-engine experiment (required)

This script will:
  1) GET /api/health
  2) GET /api/experiments
  3) POST /api/experiments/audio-engine/jobs with the provided audio URI
  4) Poll /api/jobs/{id}/status until completed/failed or timeout
  5) GET /api/jobs/{id}/artifacts and print results

No external dependencies required (uses urllib from Python stdlib).
"""
from __future__ import annotations
import argparse, json, sys, time
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError


def http_get(url: str):
    try:
        with urlopen(url) as resp:
            data = resp.read()
            ct = resp.headers.get("content-type", "")
            if "application/json" in ct or url.endswith("/health") or url.endswith("/experiments"):
                return json.loads(data.decode("utf-8"))
            return data
    except HTTPError as e:
        raise SystemExit(f"HTTP {e.code} GET {url}: {e.read().decode('utf-8', 'ignore')}")
    except URLError as e:
        raise SystemExit(f"GET {url} failed: {e}")


def http_post_json(url: str, payload: dict):
    body = json.dumps(payload).encode("utf-8")
    req = Request(url, data=body, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urlopen(req) as resp:
            data = resp.read()
            ct = resp.headers.get("content-type", "")
            if "application/json" in ct:
                return json.loads(data.decode("utf-8"))
            return data
    except HTTPError as e:
        raise SystemExit(f"HTTP {e.code} POST {url}: {e.read().decode('utf-8', 'ignore')}")
    except URLError as e:
        raise SystemExit(f"POST {url} failed: {e}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://127.0.0.1:8000")
    ap.add_argument("--audio", required=True, help="file:/// URI to audio file")
    args = ap.parse_args()

    base = args.base.rstrip("/")

    print("HEALTH:")
    print(json.dumps(http_get(f"{base}/api/health"), indent=2))

    print("\nEXPERIMENTS:")
    exps = http_get(f"{base}/api/experiments")
    print(json.dumps(exps, indent=2))

    print("\nTHEME ENDPOINTS:")
    try:
        theme_list = http_get(f"{base}/api/theme/list")
        print("/api/theme/list:", json.dumps(theme_list, indent=2))
    except SystemExit as e:
        print("/api/theme/list failed:", e)
    try:
        current = http_get(f"{base}/api/theme/current.json")
        print("/api/theme/current.json:", json.dumps(current, indent=2))
    except SystemExit as e:
        print("/api/theme/current.json failed:", e)
    # Static assets sanity check
    try:
        tokens_css = http_get(f"{base}/theme/tokens.css")
        print("/theme/tokens.css bytes:", len(tokens_css) if isinstance(tokens_css, (bytes, bytearray)) else 0)
    except SystemExit as e:
        print("/theme/tokens.css failed:", e)
    try:
        loader_js = http_get(f"{base}/theme/theme-loader.js")
        print("/theme/theme-loader.js bytes:", len(loader_js) if isinstance(loader_js, (bytes, bytearray)) else 0)
    except SystemExit as e:
        print("/theme/theme-loader.js failed:", e)

    print("\nSTART JOB (audio-engine):")
    job = http_post_json(f"{base}/api/experiments/audio-engine/jobs", {"audio": args.audio})
    print(json.dumps(job, indent=2))
    job_id = job.get("jobId") or job.get("id")
    if not job_id:
        print("No jobId in response", file=sys.stderr)
        sys.exit(2)

    print("\nPOLL STATUS:")
    deadline = time.time() + 60
    last = None
    while time.time() < deadline:
        st = http_get(f"{base}/api/jobs/{job_id}/status")
        state = st.get("state") or st.get("status")
        if state != last:
            print(st)
            last = state
        if state in {"completed", "failed"}:
            break
        time.sleep(1)

    print("\nARTIFACTS:")
    arts = http_get(f"{base}/api/jobs/{job_id}/artifacts")
    print(json.dumps(arts, indent=2))


if __name__ == "__main__":
    main()
