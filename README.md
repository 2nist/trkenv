# TRK Lab

**TRK Lab** is a minimal audio/music production platform built with FastAPI backend, Next.js frontend (with live CSS edit mode + theming), optional flow runner, and a JUCE desktop shell. It provides a plugin-based architecture for audio processing workflows and experiment/job management.

[![CI](https://github.com/2nist/trkenv/actions/workflows/ci.yml/badge.svg)](https://github.com/2nist/trkenv/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![Node.js 16+](https://img.shields.io/badge/node.js-16+-green.svg)](https://nodejs.org/)

## 🏗️ Architecture

```text
TRK Lab/
├── apps/server/          # FastAPI backend server
│   ├── main.py           # Main application entry point
│   ├── routes/           # API route handlers
│   └── tests/            # Backend tests
├── webapp/app/           # Next.js frontend application
│   ├── src/              # React components and pages
│   ├── public/           # Static assets
│   └── styles/           # CSS and styling
├── modules/              # Plugin modules (panels, tools, devices)
├── experiments/          # Audio processing experiments
├── services/             # Core services (SDK, flow runner, lyrics)
├── runs/                 # Experiment run outputs
└── scripts/              # Build and utility scripts
```

## 🚀 Quick Start

### Prerequisites

- **Python 3.8+** with pip
- **Node.js 16+** with npm
- **Git** for version control

### Development Setup

1. **Clone and setup:**

   ```bash
   git clone https://github.com/2nist/trkenv.git
   cd trkenv
   .\scripts\setup_dev.ps1
   ```

2. **Start development servers:**

   ```bash
   # Start both backend and frontend
   npm run dev:full

   # Or start individually:
   npm run dev:backend    # FastAPI server on :8000
   npm run dev:frontend   # Next.js app on :3000
   ```

3. **Open your browser:**
   - Frontend: <http://localhost:3000>
   - API Docs: <http://localhost:8000/docs>

### One-command local validation

You can run an end-to-end check (start backend, run smoke, run pytest) with:

```powershell
pwsh -NoProfile -File scripts/run_all_checks.ps1
```

VS Code tasks (Terminal → Run Task):

- `Smoke` — runs the API smoke test (expects backend running on `127.0.0.1:8000`).
- `Test` — runs `pytest` using `.venv` if present (falls back to `python`).
- `Smoke+Test` — runs the full local validation via the script above.
- `backend: uvicorn` — starts the backend with auto-reload in a new panel.
- `frontend: next dev` — starts the Next.js dev server.

### CI

GitHub Actions workflow `CI` runs on push/PR to `main`/`master`:

- `tests` job: matrix on OS and Python (Ubuntu/Windows/macOS × 3.10/3.11/3.12), installs deps and runs pytest with coverage; publishes `coverage.xml` and `htmlcov/` as artifacts.
- `smoke` job: runs on Ubuntu/Windows/macOS, generates a 1s WAV, starts the backend with `uvicorn`, waits for `/api/health`, runs the smoke script, uploads `uvicorn.log` on failure, and shuts down.

After CI completes, download the coverage artifact named like `coverage-<os>-py<version>` to view `htmlcov/` and `coverage.xml`.

## 📚 API Documentation

### Core Endpoints

#### Songs Management

- `GET /songs` - List/search songs
- `GET /songs/{id}` - Get song details
- `POST /songs/{id}/tags` - Add tags to song
- `POST /songs/{id}/attach-lyrics` - Attach lyrics to song

#### Experiments

- `GET /experiments` - List available experiments
- `POST /experiments/{name}/run` - Execute experiment

### SDK Usage

```python
from services.sdk_py.base import RunContext

# Create experiment context
ctx = RunContext(experiment_name="audio-engine")

# Access services
lyrics = ctx.get_service("lyrics_source")
result = lyrics.resolve_lyrics(song_id="song-123")
```

## 🛠️ Development

### Project Structure

- **`apps/server/`** - FastAPI backend with automatic API documentation
- **`webapp/app/`** - Next.js frontend with TypeScript and Tailwind CSS
- **`modules/`** - Plugin system for extending functionality
- **`experiments/`** - Audio processing workflows and experiments
- **`services/`** - Core business logic and utilities

### Available Commands

```bash
# Development
npm run dev:full          # Start both backend and frontend
npm run dev:backend       # Start only backend
npm run dev:frontend      # Start only frontend

# Quality & Testing
npm run quality           # Run all quality checks
npm run lint              # Lint code
npm run test              # Run tests
npm run lint:fix          # Auto-fix linting issues

# Building
npm run build:full        # Build both backend and frontend
npm run build:backend     # Build backend
npm run build:frontend    # Build frontend

# Deployment
.\scripts\build.ps1 -Deploy  # Create deployment package

### Server Quickstart (Direct)

```powershell
 . .\.venv\Scripts\Activate.ps1
 $env:TRK_PORT = '8000'
 python -m apps.server.main
 # browse http://127.0.0.1:$env:TRK_PORT
```

Health probe examples:

```powershell
Invoke-RestMethod http://127.0.0.1:$env:TRK_PORT/api/health | ConvertTo-Json -Depth 4
Invoke-RestMethod http://127.0.0.1:$env:TRK_PORT/api/experiments | ConvertTo-Json -Depth 8
```

### Live CSS Edit Mode (Design Layer)

An in-browser visual CSS editing system is bundled with the frontend. It lets you click any element, live‑edit common CSS properties, tokenize values into reusable CSS custom properties, undo/redo changes, and export the resulting overrides.

Quick usage:

1. Toggle the edit mode UI (the layout mounts a `CssEditProvider`).
2. Hover to highlight elements; click to open the inspector panel.
3. Change properties (background, color, spacing, etc.).
4. Use `Tokenize` to convert literal values into `:root` level tokens (e.g. `--background-1`).
5. Edit or delete tokens in the floating Tokens panel (deleting expands usages back to literal values).
6. `Undo` / `Redo` (stack capped at 15) to traverse history of overrides + token changes.
7. `Filter` mode restricts clickable targets to those with `data-css-editable` for focused workflows.
8. `Paste` will parse CSS from your clipboard and merge rules into overrides.
9. `CSS` / `JSON` buttons copy the full current state (including `:root` token block) to clipboard.
10. `Reset` clears all overrides and tokens (still undoable unless you prefer hard reset—can be changed).

Exported CSS structure:

```css
:root {
   --token-name: value;
}
/* Example selector */
.some-element {
   prop: value;
}
```

Developer notes:

- Provider: `CssEditProvider` wraps the app layout; controls injected `<style id="css-edit-overrides">`.
- Persistence: localStorage keys `css-edit-overrides` & `css-edit-tokens`.
- Attribute hinting: Add `data-css-editable` to constrain selection when Filter mode is active.
- History: Bounded (15). Each mutation (prop change, token update, deletion) records a snapshot.

See `docs/css-edit-mode.md` for full reference & extension guidance.

### Unified Dev Launcher (run_server.ps1)

The PowerShell script `scripts/run_server.ps1` starts backend, frontend, and optional flow loop with consistent environment variable wiring.

Usage examples:

```pwsh
# Backend + Frontend (default when no flags specified)
./scripts/run_server.ps1 -All

# Backend only with auto-reload
./scripts/run_server.ps1 -Backend -Reload

# Custom ports & host
./scripts/run_server.ps1 -Backend -Frontend -ApiPort 8010 -WebPort 3100 -BindHost 0.0.0.0

# Include flow runner using a profile
./scripts/run_server.ps1 -Backend -Frontend -Flow -Profile profiles/hello.yaml

# Provide a .env file
./scripts/run_server.ps1 -All -EnvFile .env
```

Flags:

- `-Backend` start FastAPI (uvicorn) (`--reload` optional)
- `-Frontend` start Next.js dev server (`next dev -H <BindHost> -p <WebPort>`)
- `-Flow` run a persistent loop executing the specified profile
- `-All` convenience alias for `-Backend -Frontend`
- `-BindHost` interface (default `127.0.0.1`)
- `-ApiPort` backend port (default 8000)
- `-WebPort` frontend port (default 3000)
- `-Profile` flow profile yaml path
- `-EnvFile` load environment variables (simple KEY=VALUE lines)

Runtime shortcuts (while running):

- Press `s` to show active processes.
- Press `q` to quit and gracefully stop all services.

Environment variables exposed to the frontend:

- `NEXT_PUBLIC_API_BASE` → `http://<BindHost>:<ApiPort>`

The flow runner auto-restarts the profile script with a 5s delay after each run.

### Code Quality

TRK Lab uses comprehensive code quality tools:

- **Python**: Black, Flake8, isort, mypy
- **JavaScript/TypeScript**: ESLint, Prettier
- **Pre-commit hooks**: Automatic quality checks on commit

Run quality checks:

```bash
npm run quality
```

### Testing

```bash
# Run all tests
npm run test

# Run backend tests only
npm run test:backend

# Run frontend tests only
npm run test:frontend
```

Run Python tests with coverage locally:

```powershell
python -m pip install pytest-cov
pytest -q --cov=apps --cov=services --cov=scripts --cov-report=term-missing --cov-report=html
# Open the HTML report:
# Windows
start .\htmlcov\index.html
# macOS
open ./htmlcov/index.html
# Linux
xdg-open ./htmlcov/index.html || true
```

## 🔌 Plugin System

TRK Lab supports a modular plugin architecture:

### Module Types

- **Panels**: UI components for the web interface
- **Tools**: Audio processing utilities
- **Devices**: Hardware integrations
- **Exporters**: Output format handlers

### Creating a Plugin

1. Create module in `modules/your-plugin/`
2. Implement required interfaces
3. Register in `modules/__init__.py`

## 🎵 Audio Processing

### Supported Formats

- MP3, WAV, FLAC
- LRC lyrics files
- MIDI sequences

### Experiment Types

- **Audio Engine**: Core audio processing pipeline
- **Lyrics Processing**: Automated lyrics attachment and synchronization
- **Quality Analysis**: Audio quality metrics and recommendations

## 📦 Deployment

### Production Build

```bash
# Create optimized build
.\scripts\build.ps1 -Clean -Test -Deploy

# The dist/ directory will contain the deployment package
```

### Docker Deployment

```bash
# Build Docker image
docker build -t trk-lab .

# Run container
docker run -p 8000:8000 -p 3000:3000 trk-lab
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Run quality checks: `npm run quality`
4. Commit changes: `git commit -m "Add your feature"`
5. Push to branch: `git push origin feature/your-feature`
6. Create a Pull Request

### Development Guidelines

- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Ensure all quality checks pass

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [FastAPI](https://fastapi.tiangolo.com/) and [Next.js](https://nextjs.org/)
- Audio processing powered by [librosa](https://librosa.org/) and [demucs](https://github.com/facebookresearch/demucs)
- UI components styled with [Tailwind CSS](https://tailwindcss.com/)

### Run a flow

```powershell
python -m services.flow.runner profiles\hello.yaml
python -m services.flow.runner profiles\rehearsal.yaml
```

### Start an audio job via API

```powershell
$audioPath = 'C:\Users\CraftAuto-Sales\Downloads\your-file.mp3'
$uri = 'file:///' + ($audioPath -replace '\\','/')
$body = @{ audio = $uri } | ConvertTo-Json
$job  = Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:$env:TRK_PORT/api/experiments/audio-engine/jobs" -Body $body -ContentType "application/json"
$job

1..60 | % { Start-Sleep 1; Invoke-RestMethod "http://127.0.0.1:$env:TRK_PORT/api/jobs/$($job.jobId)/status" } | ft state,id

Invoke-RestMethod "http://127.0.0.1:$env:TRK_PORT/api/jobs/$($job.jobId)/artifacts" | ConvertTo-Json -Depth 6
```

Endpoints:

- `GET /api/jobs/{jobId}/status`
- `GET /api/jobs/{jobId}/artifacts`
- `POST /api/jobs/{jobId}/cancel`
- `GET /api/jobs/last`

## Google Drive adapter (stub)

Resolve `gdrive://file/<ID>` or `gdrive://<ID>` to a local cached file (public/link-shared files supported with API key):

1. Create `.env` at repo root:

```bash
GDRIVE_API_KEY=YOUR_KEY
```

1. Use a GDrive URI as input (in API body or UI):

```json
{ "audio": "gdrive://file/1AbCDefGhIjKlMnOPqRStuVwxYz" }
```

Adapter logs will appear in job logs, e.g.: `"[io] start download: gdrive:..."`, `"[io] downloaded ~1.0 MB..."`, `"[io] using cached file: ..."`.

## Smoke script

Quick end-to-end API smoke:

```powershell
python scripts/smoke_api.py --base "http://127.0.0.1:$env:TRK_PORT" --audio $uri
```

## Desktop (JUCE) Build and Run

Prerequisites: CMake, MSVC Build Tools (VS 2022), and Edge WebView2 runtime recommended.

Install (one-time) using winget:

```powershell
winget install --id Kitware.CMake -e --source winget
winget install --id Microsoft.VisualStudio.2022.BuildTools -e --source winget
winget install --id Microsoft.EdgeWebView2Runtime -e --source winget   # optional
```

Open a NEW PowerShell so PATH updates apply, then:

```powershell
cmake --version
where cmake
```

Configure and build:

```powershell
# From repo root
mkdir build
cd build
cmake -G "Visual Studio 17 2022" -A x64 ..\apps\desktop-juce
cmake --build . --config Release

# Run
$env:TRK_DESKTOP_HOST = "http://127.0.0.1:8000"   # optional
.\Release\trk_desktop.exe
```

Desktop menu:

- Start Rehearsal Flow → POST `/api/flows/run`
- Start Audio Job… → choose a file, calls POST `/api/experiments/audio-engine/jobs`
- Stop Last Job → POST `/api/jobs/{id}/cancel`
- Open Audio Panel → `/experiments/audio-engine/ui/index.html`
- Last Job Info → GET `/api/jobs/last`

Troubleshooting:

- `cmake` not found → re-open PowerShell after winget install, ensure `C:\\Program Files\\CMake\\bin` on PATH.
- Build toolchain missing → install Visual Studio 2022 Build Tools (C++ workload). You can use the “Developer PowerShell for VS 2022”.
- WebView blank → install WebView2 runtime or it may fall back to legacy engine.
