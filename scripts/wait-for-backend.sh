#!/usr/bin/env sh
# Wait for backend /api/health to respond (simple poll)
# Usage: wait-for-backend.sh [url] [timeout_seconds]
URL=${1:-http://127.0.0.1:8000/api/health}
TIMEOUT=${2:-30}
echo "Waiting for backend at $URL (timeout ${TIMEOUT}s)..."
count=0
while [ $count -lt $TIMEOUT ]; do
  status=$(curl -sS -o /dev/null -w "%{http_code}" "$URL" || true)
  if [ "$status" = "200" ]; then
    echo "Backend is up"
    exit 0
  fi
  count=$((count + 1))
  sleep 1
done
echo "Timeout waiting for backend at $URL" >&2
exit 1
