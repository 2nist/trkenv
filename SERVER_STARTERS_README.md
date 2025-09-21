# TRK Server Starters

Quick ways to start the TRK development servers from the main directory.

## Files

- `start-server.bat` - Windows batch file (double-click to run)
- `start-server.ps1` - PowerShell script (run with PowerShell)

## What it does

Both scripts will:

1. Start the Python backend server (FastAPI) on port 8000
2. Start the Next.js frontend server on port 3000
3. Keep both servers running until you press 'q' to quit
4. Handle graceful shutdown when exiting

## Usage

### Option 1: Batch file (easiest)

Double-click `start-server.bat` in Windows Explorer.

### Option 2: PowerShell

Right-click `start-server.ps1` and select "Run with PowerShell", or run:

```powershell
.\start-server.ps1
```

### Option 3: Command line

```batch
start-server.bat
```

or

```powershell
.\start-server.ps1
```

## Advanced Usage

For more control, use the full script in the `scripts/` directory:

```powershell
.\scripts\run_server.ps1 -All
```

See `scripts/run_server.ps1` for all available options like custom ports, reload mode, etc.

## URLs

Once started:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`
