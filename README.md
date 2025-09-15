# TRK Lab / trkenv

Microkernel plugin host with a ports & adapters layer and a flow-based DAG executor.

Minimal TRK host (FastAPI) with plugins and a simple flow runner.

- Server: `apps/server/main.py`
- SDK: `services/sdk_py/base.py`
- Flow runner: `services/flow/runner.py`
- Experiments: `experiments/*`

## Quickstart

PowerShell (Windows):

```
.\.venv\Scripts\Activate.ps1
python -m apps.server.main
# open http://127.0.0.1:8000
```

Run a flow:

```
python -m services.flow.runner profiles\hello.yaml
python -m services.flow.runner profiles\rehearsal.yaml
```
