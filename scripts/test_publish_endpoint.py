"""Test the publish_session_lyrics function by importing it and calling with a simple body.
This avoids HTTP and runs the same logic as the endpoint.
"""
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from apps.server.main import publish_session_lyrics

def run():
    body = {}
    res = publish_session_lyrics(body)
    print('publish result:', json.dumps(res, indent=2))

if __name__ == '__main__':
    run()
