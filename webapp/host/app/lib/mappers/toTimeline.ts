import {
  SongTimeline,
  Section,
  TempoMark,
  TimeSigMark,
  ChordEvent,
  LyricEvent,
  TimelineValidationWarning,
} from "@/types/timeline";

// Local copy of server mapper so the client bundle can construct timelines without cross-boundary import issues.

interface RawSongSource {
  id: string;
  title: string;
  artist?: string;
  bpm?: number;
  timeSig?: { num: number; den: number };
  chords?: Array<{
    symbol: string;
    timeSec?: number; // legacy
    durationSec?: number; // legacy
    startBeat?: number; // authoritative if present
    lengthBeats?: number; // authoritative if present
    durationBeats?: number; // alias support
  }>;
  lyrics?: Array<{
    timeSec?: number; // legacy (seconds)
    beat?: number; // authoritative if present
    text: string;
    id?: string;
  }>; // from LRC (per-line)
  sections?: Array<{
    name: string;
    startSec?: number; // legacy
    endSec?: number; // legacy
    startBeat?: number; // authoritative if present
    lengthBeats?: number; // authoritative if present
  }>;
  analysis?: { bpm?: number; key?: string; mode?: string };
}

interface MapOptions {
  fallbackBpm?: number; // default if not found
  fallbackTimeSig?: { num: number; den: number };
  snap?: number; // beats
}

const DEFAULT_BPM = 120;
const DEFAULT_SIG = { num: 4, den: 4 };

function secToBeats(sec: number, tempoMap: TempoMark[]): number {
  if (tempoMap.length === 1) return (sec * tempoMap[0].bpm) / 60;
  let beats = 0;
  for (let i = 0; i < tempoMap.length; i++) {
    const cur = tempoMap[i];
    const next = tempoMap[i + 1];
    const segEnd = next ? next.atSec : sec;
    if (sec <= cur.atSec) break;
    const effectiveEnd = Math.min(sec, segEnd);
    const dur = Math.max(0, effectiveEnd - cur.atSec);
    beats += (dur * cur.bpm) / 60;
    if (!next || sec < segEnd) break;
  }
  return beats;
}
function beatsToSec(beats: number, tempoMap: TempoMark[]): number {
  if (!tempoMap.length) return 0;
  return (beats * 60) / tempoMap[0].bpm;
}
function quantizeBeat(beat: number, snap: number) {
  return Math.round(beat / snap) * snap;
}

// Simple 4-gram hash for chord symbols
function chordGramHash(symbols: string[], i: number) {
  return symbols.slice(i, i + 4).join("|");
}

function guessSections(chords: ChordEvent[], lyrics: LyricEvent[]): Section[] {
  if (!chords.length) return [];
  const symbols = chords.map((c) => c.symbol);
  const hashes: Record<string, number> = {};
  for (let i = 0; i + 4 <= symbols.length; i++) {
    const h = chordGramHash(symbols, i);
    hashes[h] = (hashes[h] || 0) + 1;
  }
  const entries = Object.entries(hashes).sort((a, b) => b[1] - a[1]);
  const primary = new Set(entries.slice(0, 2).map((e) => e[0]));
  const sections: Section[] = [];
  if (!entries.length) {
    sections.push({
      kind: "Verse",
      startSec: chords[0].atSec,
      inferred: true,
    } as Section);
    return sections;
  }
  let currentStart = chords[0].atSec;
  let lastHash = chordGramHash(symbols, 0);
  for (let i = 4; i < symbols.length; i++) {
    const h = chordGramHash(symbols, i - 3);
    if (h !== lastHash) {
      const segEndSec = chords[i - 3].atSec;
      sections.push({
        kind: primary.has(lastHash) ? "Verse" : "Chorus",
        startSec: currentStart,
        endSec: segEndSec,
        inferred: true,
      });
      currentStart = segEndSec;
      lastHash = h;
    }
  }
  sections.push({
    kind: primary.has(lastHash) ? "Verse" : "Chorus",
    startSec: currentStart,
    inferred: true,
  });
  return sections;
}

export function toTimeline(
  raw: RawSongSource,
  opts: MapOptions = {}
): { timeline: SongTimeline; warnings: TimelineValidationWarning[] } {
  const warnings: TimelineValidationWarning[] = [];
  const bpm = raw.bpm || raw.analysis?.bpm || opts.fallbackBpm || DEFAULT_BPM;
  const timeSig = raw.timeSig || opts.fallbackTimeSig || DEFAULT_SIG;
  if (!raw.bpm && raw.analysis?.bpm)
    warnings.push({ code: "bpm.inferred", message: "Using analysis BPM" });
  if (!raw.timeSig)
    warnings.push({
      code: "timesig.default",
      message: "Default time signature used",
    });
  const tempoMap: TempoMark[] = [{ atSec: 0, bpm }];
  const timeSigMap: TimeSigMark[] = [
    { atSec: 0, num: timeSig.num, den: timeSig.den },
  ];
  const snap = opts.snap ?? 0.25; // quarter beat

  const normalizeSectionKind = (name?: string): Section["kind"] => {
    if (!name) return "Verse";
    const n = name.toLowerCase();
    if (n.includes("chorus")) return "Chorus";
    if (n.includes("bridge")) return "Bridge";
    if (n.includes("intro")) return "Intro";
    if (n.includes("outro")) return "Outro";
    if (n.includes("pre")) return "PreChorus";
    if (n.includes("solo")) return "Solo";
    if (n.includes("instr")) return "Instrumental";
    return (name as Section["kind"]) || "Verse";
  };

  // Sections
  let sections: Section[] = [];
  if (raw.sections?.length) {
    sections = raw.sections.map((s) => {
      let startSec: number | undefined = s.startSec;
      let endSec: number | undefined = s.endSec;
      if (typeof s.startBeat === "number")
        startSec = beatsToSec(s.startBeat, tempoMap);
      if (typeof s.lengthBeats === "number")
        endSec = beatsToSec((s.startBeat || 0) + s.lengthBeats, tempoMap);
      return {
        kind: normalizeSectionKind(s.name),
        startSec: startSec ?? 0,
        endSec,
        name: s.name,
      };
    });
  }

  // Chords
  let chords: ChordEvent[] = (raw.chords || []).map((c) => {
    const hasBeat = typeof c.startBeat === "number";
    const atBeatRaw = hasBeat
      ? (c.startBeat as number)
      : secToBeats(c.timeSec || 0, tempoMap);
    const atBeat = quantizeBeat(atBeatRaw, snap);
    const atSec = hasBeat ? beatsToSec(atBeat, tempoMap) : c.timeSec || 0;
    let durationBeats = c.lengthBeats ?? c.durationBeats;
    if (durationBeats == null && c.durationSec != null)
      durationBeats = secToBeats(c.durationSec, tempoMap);
    return { symbol: c.symbol, atSec, atBeat, durationBeats } as ChordEvent;
  });
  chords.sort((a, b) => (a.atBeat ?? 0) - (b.atBeat ?? 0));
  for (let i = 0; i < chords.length; i++) {
    const ch = chords[i];
    if (ch.durationBeats == null) {
      const next = chords[i + 1];
      if (next?.atBeat != null && ch.atBeat != null)
        ch.durationBeats = Math.max(0.25, next.atBeat - ch.atBeat);
    }
  }

  // Lyrics
  const lyrics: LyricEvent[] = (raw.lyrics || []).map((l) => {
    const hasBeat = typeof l.beat === "number";
    const atBeatRaw = hasBeat
      ? (l.beat as number)
      : secToBeats(l.timeSec || 0, tempoMap);
    const atBeat = quantizeBeat(atBeatRaw, snap);
    const atSec = hasBeat ? beatsToSec(atBeat, tempoMap) : l.timeSec || 0;
    return {
      atSec,
      atBeat,
      text: l.text,
      id: l.id || (hasBeat ? `b${atBeat}` : String(l.timeSec)),
    };
  });

  if (!sections.length) {
    sections = guessSections(chords, lyrics);
    if (sections.some((s) => (s as any).inferred))
      warnings.push({
        code: "sections.inferred",
        message: "Sections inferred heuristically",
      });
  }

  // Pair chords to nearest lyric within 1 beat
  if (lyrics.length && chords.length) {
    const lyricByBeat = lyrics
      .slice()
      .sort((a, b) => (a.atBeat ?? 0) - (b.atBeat ?? 0));
    for (const ch of chords) {
      if (ch.atBeat == null) continue;
      let best: LyricEvent | undefined;
      let bestDist = Infinity;
      for (const ly of lyricByBeat) {
        if (ly.atBeat == null) continue;
        const d = Math.abs(ly.atBeat - ch.atBeat);
        if (d < bestDist) {
          bestDist = d;
          best = ly;
          if (d === 0) break;
        }
        if (ly.atBeat > ch.atBeat + 1) break;
      }
      if (best && bestDist <= 1) (ch as any).lyricId = best.id;
    }
  }

  // Orphan chord warning
  if (sections.length && !sections.some((s) => (s as any).inferred)) {
    const outOfSection = chords.filter(
      (c) =>
        !sections.find(
          (s) =>
            c.atSec >= s.startSec && (s.endSec == null || c.atSec < s.endSec)
        )
    );
    if (outOfSection.length)
      warnings.push({
        code: "chords.orphan",
        message: `${outOfSection.length} chord(s) outside any section`,
      });
  }

  const timeline: SongTimeline = {
    id: raw.id,
    title: raw.title,
    artist: raw.artist,
    bpmDefault: bpm,
    timeSigDefault: timeSig,
    tempoMap,
    timeSigMap,
    sections,
    chords,
    lyrics,
    key: raw.analysis?.key,
    mode: raw.analysis?.mode,
  };
  return { timeline, warnings };
}

export function validateTimeline(t: SongTimeline): TimelineValidationWarning[] {
  const out: TimelineValidationWarning[] = [];
  if (!t.bpmDefault || t.bpmDefault <= 0)
    out.push({ code: "bpm.missing", message: "Missing BPM" });
  if (!t.timeSigDefault)
    out.push({ code: "timesig.missing", message: "Missing time signature" });
  if (!t.chords.length)
    out.push({ code: "chords.empty", message: "No chords present" });
  if (!t.lyrics.length)
    out.push({ code: "lyrics.empty", message: "No lyrics present" });
  return out;
}
