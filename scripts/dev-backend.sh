#!/usr/bin/env sh
# Start backend using test venv's python if available
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="$ROOT/apps/server"
cd "$APP_DIR" || exit 1
if [ -f "$ROOT/.venv_test/bin/activate" ]; then
  exec "$ROOT/.venv_test/bin/python" -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
else
  exec python3 -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
fi
