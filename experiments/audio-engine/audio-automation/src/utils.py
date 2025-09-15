import json
import os
import re
import shutil
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Optional, Tuple

import yaml
from rich.console import Console
from rich.logging import RichHandler
import logging

console = Console()


@dataclass
class RunResult:
    returncode: int
    stdout: str
    stderr: str


def setup_logging(log_file: Path) -> logging.Logger:
    """Setup rich console logging + file logging."""
    logger = logging.getLogger("audio_automation")
    logger.setLevel(logging.INFO)
    logger.handlers.clear()

    ch = RichHandler(console=console, show_path=False, rich_tracebacks=True)
    ch.setLevel(logging.INFO)
    fh = logging.FileHandler(log_file, encoding="utf-8")
    fh.setLevel(logging.INFO)
    formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s")
    fh.setFormatter(formatter)

    logger.addHandler(ch)
    logger.addHandler(fh)
    return logger


def slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9\-_. ]+", "", value)
    value = value.replace(" ", "-")
    value = re.sub(r"-+", "-", value)
    return value[:128]


def run_cmd(cmd: List[str], cwd: Optional[Path] = None, env: Optional[dict] = None,
            logger: Optional[logging.Logger] = None, check: bool = False) -> RunResult:
    if logger:
        logger.info(f"$ {' '.join(cmd)}")
    proc = subprocess.Popen(
        cmd,
        cwd=str(cwd) if cwd else None,
        env={**os.environ, **(env or {})},
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    out, err = proc.communicate()
    if logger:
        if out:
            logger.info(out.strip())
        if err:
            logger.warning(err.strip())
    if check and proc.returncode != 0:
        raise RuntimeError(f"Command failed: {' '.join(cmd)}\n{err}")
    return RunResult(proc.returncode, out, err)


def load_config(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def ensure_dir(p: Path) -> Path:
    p.mkdir(parents=True, exist_ok=True)
    return p


def ffprobe_duration(path: Path, logger: Optional[logging.Logger] = None) -> Optional[float]:
    cmd = [
        "ffprobe",
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        str(path),
    ]
    res = run_cmd(cmd, logger=logger)
    try:
        return float(res.stdout.strip())
    except Exception:
        return None


def write_json(path: Path, data: dict) -> None:
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def read_lines(path: Path) -> List[str]:
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8") as f:
        return [l.strip() for l in f if l.strip() and not l.strip().startswith("#")]


def safe_copy(src: Path, dst: Path, logger: Optional[logging.Logger] = None) -> None:
    ensure_dir(dst.parent)
    if logger:
        logger.info(f"Copy: {src} -> {dst}")
    shutil.copy2(src, dst)


def timestamp() -> str:
    return time.strftime("%Y%m%d-%H%M%S")
