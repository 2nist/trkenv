from typing import List, Dict, Any

def seconds_to_stamp(s: float) -> str:
    hh = int(s // 3600)
    mm = int((s % 3600) // 60)
    ss = int(s % 60)
    ms = int((s - int(s)) * 1000)
    return f"{hh:02d}:{mm:02d}:{ss:02d}.{ms:03d}"

def lrc_to_vtt(lines: List[Dict[str, Any]]) -> str:
    out = ["WEBVTT", ""]
    idx = 0
    for ln in lines:
        start = ln.get('time')
        if start is None:
            start_s = 0.0
        else:
            start_s = float(start)
        end_s = start_s + 3.0
        out.append(str(idx))
        out.append(f"{seconds_to_stamp(start_s)} --> {seconds_to_stamp(end_s)}")
        out.append(ln.get('text', ''))
        out.append("")
        idx += 1
    return "\n".join(out)

def add_vtt_to_jcrd(jcrd: Dict[str, Any], vtt_path: str) -> Dict[str, Any]:
    j = dict(jcrd or {})
    j.setdefault('assets', {})
    j['assets']['lyrics_vtt'] = vtt_path
    return j
