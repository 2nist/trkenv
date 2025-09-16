# scripts/refactor_to_lab.ps1 — usage

This repository includes `scripts/refactor_to_lab.ps1` to help scaffold a module layout under `modules/` from `experiments/` and to copy `.src` templates into real files when desired.

Important safety rules

- The script is a dry-run by default. Run with `-Apply` to actually modify the workspace and create backups.
- The script will create a backup folder under the repository root named `backup_pre_refactor_<timestamp>` when run with `-Apply`.
- We do NOT modify `apps/server/main.py` from this script. Router inclusion is handled at runtime by `apps/server/main.py`.
- If you accidentally run it and want to undo, use `scripts/revert_refactor_artifacts.ps1` to move created artifacts into a `.trash_refactor_*` folder.

Basic commands

Preview (dry-run):

```powershell
# show what would happen
powershell -ExecutionPolicy Bypass -File .\scripts\refactor_to_lab.ps1
```

Apply changes (make them):

```powershell
# this will copy templates and create backups
powershell -ExecutionPolicy Bypass -File .\scripts\refactor_to_lab.ps1 -Apply
```

Undo the script's produced artifacts (moves to .trash_refactor_<timestamp>):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\revert_refactor_artifacts.ps1
```

Notes

- The script only copies template files if the target does not already exist — it's safe to re-run as a way to populate missing files.
- Keep backups until you're sure the result is correct.
