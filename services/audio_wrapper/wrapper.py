"""Thin CLI wrapper to run the audio-automation orchestrator as a microkernel job.
This is a minimal skeleton: it accepts a JSON contract on stdin or via --infile,
runs the orchestrator (shells out), and writes a result JSON to stdout or --out.

We keep this minimal and synchronous so it can be used by other services.
"""
import argparse
import json
import subprocess
from pathlib import Path

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--infile', help='JSON input contract file (defaults to stdin)')
    p.add_argument('--out', help='result json output file (defaults to stdout)')
    args = p.parse_args()
    if args.infile:
        data = json.loads(Path(args.infile).read_text(encoding='utf-8'))
    else:
        data = json.load(sys.stdin)

    # example expected fields: audio_path, session_dir, config
    audio = data.get('audio')
    session = data.get('session') or 'work/session-auto'

    # run orchestrator: (caller should ensure environment and dependencies are present)
    cmd = [str(Path(__file__).resolve().parents[2] / 'experiments' / 'audio-engine' / 'audio-automation' / '.venv' / 'Scripts' / 'python.exe'), '-m', 'src.orchestrate', '--playlist', audio or '', '--config', 'config.yaml']
    try:
        subprocess.check_call(cmd, cwd=str(Path(__file__).resolve().parents[2] / 'experiments' / 'audio-engine' / 'audio-automation'))
    except Exception as e:
        res = {'ok': False, 'error': str(e)}
        if args.out:
            Path(args.out).write_text(json.dumps(res), encoding='utf-8')
        else:
            print(json.dumps(res))
        return

    # on success, write a stub result (caller should inspect work/ or output/)
    res = {'ok': True, 'session': session}
    if args.out:
        Path(args.out).write_text(json.dumps(res), encoding='utf-8')
    else:
        print(json.dumps(res))

if __name__ == '__main__':
    import sys
    main()
