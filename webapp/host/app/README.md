# TRK Host frontend (placeholder)

This folder contains a minimal Next.js placeholder app used for local development. It also includes helper scripts to start the backend and run both servers together.

Quick start (from repo root):

1) Install dependencies (already done in this repo):

   cd webapp/host/app
   npm ci

2) Start both backend + frontend (recommended):

   cd webapp/host/app
   npm run dev:all

   - `dev:all` will attempt a short poll for the backend and then start the backend helper and Next concurrently.

3) Start only the frontend:

   npm run dev

4) Start the backend standalone (from repo root):

   chmod +x ./scripts/dev-backend.sh
   ./scripts/dev-backend.sh

Notes:
- Set `NEXT_PUBLIC_API_BASE` to `http://127.0.0.1:8000` if you need the frontend to call a local backend at that host/port.
- When the real frontend is available, replace the placeholder files in `app/`.
