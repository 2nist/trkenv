from pathlib import Path
import json
from typing import Optional, Dict, Any
from .lrclib import lrclib_get_synced
from .convert import lrc_to_vtt, add_vtt_to_jcrd
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[3]

def slug_for(meta: Dict[str, Any]) -> str:
    artist = (meta.get('artist') or '').lower().replace(' ', '-')
    title = (meta.get('title') or '').lower().replace(' ', '-')
    duration = int(meta.get('duration') or 0)
    return f"{artist}-{title}-{duration}"

def resolve_lyrics(meta: Dict[str, Any], cache_dir: Optional[str]=None, allow_online: bool=True, prefer: Optional[str]=None) -> Dict[str, Any]:
    cache = Path(cache_dir or (ROOT / 'data' / 'lyrics_cache'))
    cache.mkdir(parents=True, exist_ok=True)
    slug = slug_for(meta)
    base = cache / slug
    lrc_path = base.with_suffix('.lrc')
    vtt_path = base.with_suffix('.vtt')
    jcrd_path = base.with_suffix('.jcrd.json')

    # 1) cache
    if jcrd_path.exists() or vtt_path.exists() or lrc_path.exists():
        return {'source': 'cache', 'vttPath': str(vtt_path) if vtt_path.exists() else None, 'lrcPath': str(lrc_path) if lrc_path.exists() else None}

    # 2) lrclib online
    if allow_online and prefer != 'whisperx':
        try:
            data = lrclib_get_synced(meta.get('title') or meta.get('name') or '', meta.get('artist'), meta.get('album'), meta.get('duration'))
            if data and (data.get('lrc') or data.get('vtt')):
                if data.get('lrc'):
                    lrc_path.write_text(data.get('lrc'), encoding='utf-8')
                if data.get('vtt'):
                    vtt_path.write_text(data.get('vtt'), encoding='utf-8')
                j = add_vtt_to_jcrd({}, str(vtt_path) if vtt_path.exists() else None)
                jcrd_path.write_text(json.dumps(j, indent=2), encoding='utf-8')
                return {'source': 'lrclib', 'vttPath': str(vtt_path) if vtt_path.exists() else None, 'lrcPath': str(lrc_path) if lrc_path.exists() else None}
        except Exception as e:
            print('lrclib failed', e)

    # 3) fallback to whisperx offline runner
    vocal_path = meta.get('vocalPath') or None
    if vocal_path and Path(vocal_path).exists():
        try:
            script = ROOT / 'services' / 'asr' / 'whisperx_run.py'
            subprocess.run([sys.executable, str(script), '--input', str(vocal_path), '--out-vtt', str(vtt_path)], check=True)
            if vtt_path.exists():
                j = add_vtt_to_jcrd({}, str(vtt_path))
                jcrd_path.write_text(json.dumps(j, indent=2), encoding='utf-8')
                return {'source': 'whisperx', 'vttPath': str(vtt_path), 'lrcPath': None}
        except Exception as e:
            print('whisperx failed', e)

    return {'source': 'none', 'vttPath': None, 'lrcPath': None}
