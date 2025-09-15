import { FEATURE_PROG_MATCH, FEATURE_CADENCE_TAGS } from "./featureFlags";
import { buildCatalog } from "./progressionLibrary";
import { romanizeChords, RomanToken } from "./romanizer";
import { matchProgressions, MatchSpan } from "./matcher";
import { detectCadences, CadenceMarker } from "./cadences";
import type { Mode } from "./harmony";

export type ProgressionAnalysis = {
  start: number; // beat index
  end: number; // beat index
  pattern_id: string;
  name: string;
  roman_seq: string[];
  confidence: number;
  explanation: string;
};

export type CadenceAnalysis = {
  time: number; // beat index (arrival)
  type: CadenceMarker["type"];
  local_key: string; // key at that point (approx current section key)
  confidence: number;
  evidence: { chords: string[] };
};

export type SectionSuggestion = {
  start: number;
  end: number;
  suggested: "intro" | "verse" | "pre-chorus" | "chorus" | "bridge" | "outro";
  confidence: number;
  reasons: string[];
};

export function analyzeSection(
  key: string,
  mode: Mode,
  section: { startBeat: number; lengthBeats: number },
  chords: Array<{ symbol: string; startBeat: number }>
) {
  // slice chords in window
  const inWin = chords
    .filter(
      (c) =>
        c.startBeat >= section.startBeat &&
        c.startBeat < section.startBeat + section.lengthBeats
    )
    .sort((a, b) => a.startBeat - b.startBeat);
  const romans: RomanToken[] = romanizeChords(key, mode, inWin);
  const catalog = buildCatalog();
  const progressions: ProgressionAnalysis[] = [];
  const cadences: CadenceAnalysis[] = [];
  const section_suggestions: SectionSuggestion[] = [];
  if (FEATURE_PROG_MATCH) {
    const spans: MatchSpan[] = matchProgressions(romans, catalog);
    for (const s of spans) {
      const start = inWin[s.startIndex]?.startBeat ?? section.startBeat;
      const end =
        inWin[s.endIndex]?.startBeat ??
        section.startBeat + section.lengthBeats - 1;
      progressions.push({
        start,
        end,
        pattern_id: s.pattern_id,
        name: s.name,
        roman_seq: s.roman_seq,
        confidence: s.confidence,
        explanation: s.explanation,
      });
    }
  }
  if (FEATURE_CADENCE_TAGS) {
    const markers = detectCadences(romans);
    for (const m of markers) {
      const time = inWin[m.index]?.startBeat ?? section.startBeat;
      cadences.push({
        time,
        type: m.type,
        local_key: `${key} ${mode}`,
        confidence: m.confidence,
        evidence: m.evidence,
      });
    }
  }
  // Soft section heuristics (very light):
  if (FEATURE_PROG_MATCH || FEATURE_CADENCE_TAGS) {
    const reasons: string[] = [];
    let suggested: SectionSuggestion["suggested"] = "verse";
    const hasAuth = cadences.some(
      (c) => c.type === "authentic" && c.confidence > 0.8
    );
    const hasPlagal = cadences.some(
      (c) => c.type === "plagal" && c.confidence > 0.7
    );
    if (hasAuth) {
      suggested = "chorus";
      reasons.push("authentic cadence present");
    }
    if (!hasAuth && cadences.some((c) => c.type === "half")) {
      suggested = "pre-chorus";
      reasons.push("half cadence common pre-chorus");
    }
    if (hasPlagal) {
      suggested = "outro";
      reasons.push("plagal cadence common outro");
    }
    section_suggestions.push({
      start: section.startBeat,
      end: section.startBeat + section.lengthBeats,
      suggested,
      confidence: Math.min(
        1,
        (hasAuth ? 0.8 : 0) + (hasPlagal ? 0.6 : 0) + 0.2
      ),
      reasons,
    });
  }
  return { romans, progressions, cadences, section_suggestions };
}
