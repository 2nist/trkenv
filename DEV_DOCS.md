# Local dev notes

Quick steps to start the app locally and run tests.

Backend (FastAPI / uvicorn)
- From repo root:

```bash
cd apps/server
# Use the python you normally use for this project (pyenv/venv)
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Logs: I sometimes redirect logs to `/tmp/uvicorn.log` when starting servers from scripts.

Frontend (Next.js)
- From `webapp/host/app`:

```bash
npm install
npx next dev -H 127.0.0.1 -p 3000
```

Test: Playwright E2E

- Ensure backend (`127.0.0.1:8000`) and frontend (`127.0.0.1:3000`) are running.
- Run from `webapp/host/app`:

```bash
npx playwright install --with-deps
npm run test:e2e
```

CI notes
- There is a workflow `.github/workflows/e2e.yml` that can start the backend and frontend services in the runner and run Playwright tests. It uses Node and Python setup steps. See the workflow for details.
