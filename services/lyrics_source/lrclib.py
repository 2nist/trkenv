import requests
from typing import Optional, Dict, Any

def lrclib_get_synced(title: str, artist: Optional[str]=None, album: Optional[str]=None, duration: Optional[int]=None) -> Dict[str, Any]:
    params = {"track_name": title}
    if artist: params["artist_name"] = artist
    if album: params["album_name"] = album
    if duration is not None: params["duration"] = str(int(duration))
    r = requests.get("https://lrclib.net/api/get", params=params, timeout=10)
    r.raise_for_status()
    return r.json()
