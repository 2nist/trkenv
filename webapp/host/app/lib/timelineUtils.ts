import type { SongTimeline } from "@/types/timeline";

export function secToBeat(sec: number, timeline: SongTimeline): number {
  // Assume constant tempo from first tempo mark for now
  const bpm = timeline.tempoMap?.[0]?.bpm || timeline.bpmDefault || 120;
  return (sec * bpm) / 60;
}

export function beatToSec(beat: number, timeline: SongTimeline): number {
  const bpm = timeline.tempoMap?.[0]?.bpm || timeline.bpmDefault || 120;
  return (beat * 60) / bpm;
}

export function computeLastBeat(t: SongTimeline): number {
  let maxBeat = 0;
  for (const c of t.chords || []) {
    if (c.atBeat != null) {
      const end = c.atBeat + (c.durationBeats || 0);
      if (end > maxBeat) maxBeat = end;
    }
  }
  for (const l of t.lyrics || [])
    if (l.atBeat != null && l.atBeat > maxBeat) maxBeat = l.atBeat;
  for (let i = 0; i < (t.sections || []).length; i++) {
    const s = t.sections[i];
    const startBeat = secToBeat(s.startSec, t);
    const endSec = s.endSec != null ? s.endSec : t.sections[i + 1]?.startSec;
    const endBeat = endSec != null ? secToBeat(endSec, t) : startBeat;
    if (endBeat > maxBeat) maxBeat = endBeat;
  }
  return Math.max(32, Math.ceil(maxBeat * 4) / 4); // pad & snap to quarter
}

export function sectionBeats(t: SongTimeline) {
  return (t.sections || []).map((s, idx) => {
    const startBeat = secToBeat(s.startSec, t);
    const nextStart = t.sections[idx + 1]?.startSec;
    const endSec = s.endSec != null ? s.endSec : nextStart;
    const endBeat = endSec != null ? secToBeat(endSec, t) : startBeat + 4;
    return { ...s, startBeat, lengthBeats: Math.max(1, endBeat - startBeat) };
  });
}

// Derive chord progression slices per section, including carry-in / carry-out flags.
export function sectionChordProgressions(t: SongTimeline) {
  const bpm = t.tempoMap?.[0]?.bpm || t.bpmDefault || 120;
  const beatDurSec = 60 / bpm;
  const chords = t.chords || [];
  const sections = t.sections || [];
  return sections.map((s, idx) => {
    const startSec = s.startSec;
    const nextStart = sections[idx + 1]?.startSec;
    const endSec = s.endSec != null ? s.endSec : nextStart;
    const secEnd = endSec != null ? endSec : startSec; // fallback
    const slice = chords
      .map((c) => {
        const cStart = (c as any).atSec ?? 0;
        // Derive end sec: prefer explicit, else durationBeats.
        let cEnd: number | undefined = (c as any).endSec;
        if (cEnd == null) {
          if (c.durationBeats != null)
            cEnd = cStart + c.durationBeats * beatDurSec;
        }
        if (cEnd == null) return null; // skip if no span info
        // Overlap test
        if (cStart >= secEnd || cEnd <= startSec) return null;
        const clipStart = Math.max(cStart, startSec);
        const clipEnd = Math.min(cEnd, secEnd);
        return {
          symbol: c.symbol,
          originalStartSec: cStart,
          startSec: clipStart,
          // length clipped to section
          endSec: clipEnd,
          carryIn: cStart < startSec,
          carryOut: cEnd > secEnd,
        };
      })
      .filter(Boolean);
    return { section: s, chords: slice };
  });
}
