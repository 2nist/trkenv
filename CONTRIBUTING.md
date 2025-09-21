 # TRK Lab - Contributing

Guidelines:

- Use the provided `scripts/run_server.ps1` to start the server during development.
- Run tests and smoke scripts before committing.
- Follow code style: format on save is enabled in the workspace settings.

Pull requests should include a short description and the testing steps.

Local developer quickstart (macOS / Linux):

1. Create virtualenv and install dev requirements:

	./scripts/setup_local.sh

2. Activate the venv:

	. .venv/bin/activate

3. Run tests:

	make test

- Notes:
- Prefer Python 3.10+ for local development. This project now uses Pydantic v2 which
- relies on newer typing/stdlib improvements available in Python 3.10 and later.
- If you must run on Python 3.8 or 3.9, install `eval_type_backport` and `typing_extensions` in your venv but consider upgrading for best compatibility.
- The project's `requirements.txt` requires `pydantic>=2.0`.
- The included `Makefile` provides `setup` and `test` targets for convenience.

Frontend dev (Next.js)

1. Install frontend deps:

	cd webapp/host/app
	npm ci

2. Start both backend and frontend (recommended):

	cd webapp/host/app
	npm run dev:all

	- `dev:all` will perform a short poll for the backend and then start the backend helper and Next concurrently. If port 8000 is already in use, stop the process (see `lsof` / `kill`).

3. Start frontend only:

	npm run dev

4. Start backend manually (from repo root):

	chmod +x ./scripts/dev-backend.sh
	./scripts/dev-backend.sh
