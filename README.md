# TRK Lab

**TRK Lab** is a minimal audio/music production platform built with FastAPI backend and Next.js frontend. It provides a plugin-based architecture for audio processing workflows and experiment management.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![Node.js 16+](https://img.shields.io/badge/node.js-16+-green.svg)](https://nodejs.org/)

## 🏗️ Architecture

```
TRK Lab/
├── apps/server/          # FastAPI backend server
│   ├── main.py          # Main application entry point
│   ├── routes/          # API route handlers
│   └── tests/           # Backend tests
├── webapp/app/          # Next.js frontend application
│   ├── src/             # React components and pages
│   ├── public/          # Static assets
│   └── styles/          # CSS and styling
├── modules/             # Plugin modules (panels, tools, devices)
├── experiments/         # Audio processing experiments
├── services/            # Core services (SDK, flow runner, lyrics)
├── runs/                # Experiment run outputs
└── scripts/             # Build and utility scripts
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
   - Frontend: http://localhost:3000
   - API Docs: http://localhost:8000/docs

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
```

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

### Experiments
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
