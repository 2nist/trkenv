#!/usr/bin/env bash
# Minimal local setup for development (macOS / Linux)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
VENV_DIR="$ROOT_DIR/.venv"

echo "Creating virtualenv at $VENV_DIR"
python3 -m venv "$VENV_DIR"
echo "Activating venv and upgrading pip..."
source "$VENV_DIR/bin/activate"
python -m pip install --upgrade pip

if [ -f "$ROOT_DIR/dev-requirements.txt" ]; then
  echo "Installing dev requirements..."
  pip install -r "$ROOT_DIR/dev-requirements.txt"
else
  echo "dev-requirements.txt not found; consider creating it or installing requirements.txt"
fi

echo "Setup complete. To activate the venv run:"
echo "  source $VENV_DIR/bin/activate"
echo "Then start the backend:"
echo "  python -m uvicorn apps.server.main:app --reload"
