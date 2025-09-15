from src.split_silence import parse_silencedetect


def test_parse_basic():
    stderr = """
[silencedetect @ 0x] silence_start: 6.2
[silencedetect @ 0x] silence_end: 7.7 | silence_duration: 1.5
"""
    ev = parse_silencedetect(stderr)
    assert ("start", 6.2) in ev
    assert ("end", 7.7) in ev
