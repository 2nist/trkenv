from __future__ import annotations
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def check_manifests() -> int:
    rc = 0
    for mf in (ROOT / 'experiments').glob('**/manifest.json'):
        try:
            data = json.loads(mf.read_text(encoding='utf-8'))
            for k in ('id','version','interfaceVersion'):
                if k not in data:
                    print(f"[manifest] missing {k}: {mf}")
                    rc = 1
        except Exception as e:
            print(f"[manifest] invalid JSON: {mf}: {e}")
            rc = 1
    return rc

def main() -> int:
    rc = 0
    rc |= check_manifests()
    return rc

if __name__ == '__main__':
    sys.exit(main())
