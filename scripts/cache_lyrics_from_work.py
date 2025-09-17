"""
Copy generated lyrics artifacts from the latest audio-automation work session into data/lyrics_cache
and update or create a song record in datasets/library/songs.db to reference the cached VTT.
This script is safe to run repeatedly; it will overwrite cache files and upsert the song entry.
"""
from pathlib import Path
import sqlite3
import json
import shutil

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / 'experiments' / 'audio-engine' / 'audio-automation' / 'work'
LYRICS_CACHE = ROOT / 'data' / 'lyrics_cache'
LIB_DIR = ROOT / 'datasets' / 'library'
DB_PATH = LIB_DIR / 'songs.db'

# Choose latest session directory by modified time
sessions = sorted([p for p in WORK.iterdir() if p.is_dir()], key=lambda p: p.stat().st_mtime, reverse=True)
if not sessions:
    print('No sessions found under', WORK)
    raise SystemExit(1)

latest = sessions[0]
print('Using session:', latest)

# Find SEG00 lyrics outputs if present
seg_dir = latest / 'SEG00'
lyrics_dir = seg_dir / 'lyrics'
if not lyrics_dir.exists():
    print('No lyrics dir at', lyrics_dir)
    raise SystemExit(1)

vtt_src = lyrics_dir / 'SEG00.vtt'
srt_src = lyrics_dir / 'SEG00.srt'
jcrd_src = seg_dir / 'SEG00.jcrd.json'

if not vtt_src.exists():
    print('No vtt found at', vtt_src)
    raise SystemExit(1)

# Read jcrd to extract metadata (if any)
meta = {}
if jcrd_src.exists():
    try:
        meta = json.loads(jcrd_src.read_text(encoding='utf-8'))
    except Exception:
        meta = {}

artist = (meta.get('metadata', {}).get('artist') or meta.get('lyrics', {}).get('artist') or 'unknown').strip()
# fallback: try to extract from mp3 tags in session.log? skip
title = (meta.get('metadata', {}).get('title') or 'unknown-title').strip()
# duration: try to read segments.json
duration = 0
seg_json = latest / 'segments' / 'segments.json'
if seg_json.exists():
    try:
        sj = json.loads(seg_json.read_text(encoding='utf-8'))
        duration = int(float(sj.get('duration') or 0))
    except Exception:
        pass

# Normalize slug like API: artist-title-duration
slug = f"{artist or 'unknown'}-{title or 'unknown'}-{duration}"
slug = slug.lower().replace(' ', '-').replace('/', '-')
LYRICS_CACHE.mkdir(parents=True, exist_ok=True)

vtt_dst = LYRICS_CACHE / f"{slug}.vtt"
srt_dst = LYRICS_CACHE / f"{slug}.srt"
jcrd_dst = LYRICS_CACHE / f"{slug}.jcrd.json"

shutil.copy2(vtt_src, vtt_dst)
print('Copied', vtt_src, '->', vtt_dst)
if srt_src.exists():
    shutil.copy2(srt_src, srt_dst)
    print('Copied', srt_src, '->', srt_dst)
if jcrd_src.exists():
    shutil.copy2(jcrd_src, jcrd_dst)
    print('Copied', jcrd_src, '->', jcrd_dst)

# Update or insert song record in DB
LIB_DIR.mkdir(parents=True, exist_ok=True)
if not DB_PATH.exists():
    print('Database not found at', DB_PATH)
    raise SystemExit(1)

conn = sqlite3.connect(str(DB_PATH))
conn.row_factory = sqlite3.Row
cur = conn.cursor()
# Look for existing song by title
cur.execute('SELECT id, title, source_json FROM songs WHERE title = ?', (title,))
row = cur.fetchone()
if row:
    sid = row['id']
    print('Found existing song id', sid)
    source = json.loads(row['source_json']) if row['source_json'] else {}
    source = source or {}
    source.setdefault('assets', {})
    source['assets']['lyrics_vtt'] = str(vtt_dst)
    cur.execute('UPDATE songs SET source_json = ? WHERE id = ?', (json.dumps(source), sid))
    conn.commit()
    print('Updated song', sid, 'with lyrics_vtt ->', vtt_dst)
else:
    from uuid import uuid4
    sid = uuid4().hex[:12]
    source = {'metadata': {'artist': artist, 'title': title, 'duration': duration}, 'assets': {'lyrics_vtt': str(vtt_dst)}}
    cur.execute('INSERT INTO songs (id, title, source_json, lyrics) VALUES (?, ?, ?, ?)', (sid, title, json.dumps(source), ''))
    conn.commit()
    print('Created song', sid, 'title', title)

conn.close()
print('Done')
