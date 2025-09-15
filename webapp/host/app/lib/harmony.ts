export type Mode = "major" | "minor";

export type Progression = {
  id: string;
  name: string;
  degrees: string[]; // roman numerals like ["ii", "V", "I"]
  tags?: string[];
  description?: string;
};

const NOTE_ORDER = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

function normalizeNote(n: string) {
  // Simple enharmonic collapse: flats to sharps
  return n
    .replace(/Db/g, "C#")
    .replace(/Eb/g, "D#")
    .replace(/Gb/g, "F#")
    .replace(/Ab/g, "G#")
    .replace(/Bb/g, "A#");
}

function noteIndex(n: string) {
  const idx = NOTE_ORDER.indexOf(normalizeNote(n));
  return idx >= 0 ? idx : 0;
}

function transpose(root: string, semitones: number) {
  const i = noteIndex(root);
  const j = (i + ((semitones % 12) + 12)) % 12;
  return NOTE_ORDER[j];
}

function romanToDegree(rn: string): { degree: number; qualityHint?: string } {
  // Supports e.g. I, ii, V, viio, iv, V7
  const m = rn.match(
    /^(i{1,3}|iv|v|vi|vii|I{1,3}|IV|V|VI|VII)(o|°)?(7|maj7|m7|dim|sus2|sus4)?$/
  );
  const map: Record<string, number> = {
    i: 1,
    ii: 2,
    iii: 3,
    iv: 4,
    v: 5,
    vi: 6,
    vii: 7,
    I: 1,
    II: 2,
    III: 3,
    IV: 4,
    V: 5,
    VI: 6,
    VII: 7,
  };
  if (!m) return { degree: 1 };
  const deg = map[m[1]] || 1;
  const qual = m[2] || m[3] || undefined;
  return { degree: deg, qualityHint: qual };
}

export function diatonicQuality(degree: number, mode: Mode): string {
  if (mode === "major") {
    // I ii iii IV V vi vii°
    return (
      ["maj7", "m7", "m7", "maj7", "7", "m7", "m7b5"][degree - 1] || "maj7"
    );
  } else {
    // i ii° III iv V VI VII (simplified harmonic minor)
    return ["m7", "m7b5", "maj7", "m7", "7", "maj7", "7"][degree - 1] || "m7";
  }
}

export function degreeRoot(key: string, degree: number, mode: Mode) {
  // Semitone steps for major scale degrees relative to tonic
  const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];
  const MINOR_STEPS = [0, 2, 3, 5, 7, 8, 10];
  const steps = mode === "major" ? MAJOR_STEPS : MINOR_STEPS;
  const st = steps[(degree - 1) % 7];
  return transpose(key, st);
}

export function degreesToChordSymbols(
  key: string,
  mode: Mode,
  degrees: string[]
) {
  const tonic = normalizeNote(key);
  return degrees.map((rn) => {
    const { degree, qualityHint } = romanToDegree(rn);
    const root = degreeRoot(tonic, degree, mode);
    const qual = qualityHint || diatonicQuality(degree, mode);
    // basic pretty: m7b5 -> ø7 symbol could be later
    return `${root}${qual}`;
  });
}

export const PROGRESSIONS: Progression[] = [
  {
    id: "ii-V-I",
    name: "ii–V–I",
    degrees: ["ii", "V", "I"],
    tags: ["cadence", "jazz"],
    description: "Perfect/authentic cadence in major.",
  },
  {
    id: "I-vi-IV-V",
    name: "I–vi–IV–V",
    degrees: ["I", "vi", "IV", "V"],
    tags: ["pop"],
    description: "50s progression.",
  },
  {
    id: "I-IV-V-I",
    name: "I–IV–V–I",
    degrees: ["I", "IV", "V", "I"],
    tags: ["rock", "pop"],
  },
  {
    id: "vi-ii-V-I",
    name: "vi–ii–V–I",
    degrees: ["vi", "ii", "V", "I"],
    tags: ["turnaround"],
  },
  {
    id: "iv-V-I",
    name: "iv–V–I (minor iv)",
    degrees: ["iv", "V", "I"],
    tags: ["modal interchange"],
  },
  {
    id: "I-V-vi-IV",
    name: "I–V–vi–IV",
    degrees: ["I", "V", "vi", "IV"],
    tags: ["pop"],
  },
  {
    id: "ii-V",
    name: "ii–V (half cadence)",
    degrees: ["ii", "V"],
    tags: ["cadence"],
  },
];

export function distributeBeats(totalBeats: number, items: number) {
  const step = Math.max(1, Math.floor(totalBeats / Math.max(1, items)));
  return Array.from({ length: items }, (_, i) => i * step);
}

// --- Functional harmony helpers ---

export function parseChordSymbol(symbol: string): {
  root: string;
  quality: string;
} {
  const m = symbol.trim().match(/^([A-G](?:#|b)?)(.*)$/);
  if (!m) return { root: "C", quality: "" };
  return { root: normalizeNote(m[1]), quality: (m[2] || "").trim() };
}

export function isDominant7(quality: string) {
  // treat '7' (not 'maj7') as dominant
  return /(^|[^a-z])7(?![a-z])/i.test(quality) && !/maj7/i.test(quality);
}

export function tritoneSub(symbol: string) {
  const { root, quality } = parseChordSymbol(symbol);
  if (!isDominant7(quality)) return null;
  const subRoot = transpose(root, 6); // +6 semitones
  return `${subRoot}7`;
}

export function secondaryDominants(key: string, mode: Mode) {
  // Common secondary dominants that resolve to diatonic triads/7ths
  // V/ii, V/iii, V/IV, V/V, V/vi
  const targets: Array<{ target: number; label: string }> = [
    { target: 2, label: "V/ii" },
    { target: 3, label: "V/iii" },
    { target: 4, label: "V/IV" },
    { target: 5, label: "V/V" },
    { target: 6, label: "V/vi" },
  ];
  return targets.map(({ target, label }) => {
    const tgtRoot = degreeRoot(key, target, mode);
    // Dominant of target
    const domRoot = transpose(tgtRoot, -5); // perfect fifth up is +7; dominant root is -5 semitones
    return { label, symbol: `${domRoot}7` };
  });
}

export function modalInterchangeMajor(key: string) {
  // Borrow from parallel minor: bVII, bVI, bIII, iv
  const bVII = transpose(key, -2);
  const bVI = transpose(key, -3);
  const bIII = transpose(key, 3);
  const iv = degreeRoot(key, 4, "minor"); // iv minor
  return [
    { label: "bVII", symbol: `${bVII}maj7` },
    { label: "bVI", symbol: `${bVI}maj7` },
    { label: "bIII", symbol: `${bIII}maj7` },
    { label: "iv", symbol: `${iv}m7` },
  ];
}

export function modalInterchange(key: string, mode: Mode) {
  if (mode === "major") return modalInterchangeMajor(key);
  // For minor, suggest borrowing from parallel major: IV (major), bVII (major)
  const IV = degreeRoot(key, 4, "major");
  const bVII = transpose(key, -2);
  return [
    { label: "IV(maj)", symbol: `${IV}maj7` },
    { label: "bVII(maj)", symbol: `${bVII}7` },
  ];
}

// --- Song templates (lightweight scaffolding) ---

export type SongTemplate = {
  id: string;
  name: string;
  sections: Array<{
    name: string;
    bars: number; // assumes 4/4 (4 beats per bar)
    progressionId?: string; // id from PROGRESSIONS
  }>;
};

export const SONG_TEMPLATES: SongTemplate[] = [
  {
    id: "verse-chorus-8-8",
    name: "Verse–Chorus (8+8)",
    sections: [
      { name: "Verse", bars: 8, progressionId: "I-V-vi-IV" },
      { name: "Chorus", bars: 8, progressionId: "I-V-vi-IV" },
    ],
  },
  {
    id: "aaba-8-8-8-8",
    name: "AABA (8×4)",
    sections: [
      { name: "A1", bars: 8, progressionId: "I-IV-V-I" },
      { name: "A2", bars: 8, progressionId: "I-IV-V-I" },
      { name: "B", bars: 8, progressionId: "ii-V-I" },
      { name: "A3", bars: 8, progressionId: "I-IV-V-I" },
    ],
  },
];

export function buildFromTemplate(key: string, mode: Mode, tmpl: SongTemplate) {
  const beatsPerBar = 4;
  const sections: Array<{
    id: string;
    name: string;
    startBeat: number;
    lengthBeats: number;
  }> = [];
  const chords: Array<{
    id: string;
    symbol: string;
    startBeat: number;
    lengthBeats?: number;
  }> = [];
  let cursor = 0;
  const now = Date.now();
  tmpl.sections.forEach((s, idx) => {
    const lengthBeats = s.bars * beatsPerBar;
    const id = `sec_${idx}_${now}`;
    sections.push({ id, name: s.name, startBeat: cursor, lengthBeats });
    // find progression degrees
    const prog =
      PROGRESSIONS.find((p) => p.id === s.progressionId) || PROGRESSIONS[0];
    const symbols = degreesToChordSymbols(key, mode, prog.degrees);
    const starts = distributeBeats(lengthBeats, symbols.length);
    symbols.forEach((sym, i) => {
      chords.push({
        id: `ch_${idx}_${i}_${now}`,
        symbol: sym,
        startBeat: cursor + (starts[i] || 0),
      });
    });
    cursor += lengthBeats;
  });
  return { sections, chords };
}

// --- Detection helpers ---

export const CADENCES: Progression[] = [
  {
    id: "V-I",
    name: "V–I (authentic)",
    degrees: ["V", "I"],
    tags: ["cadence"],
  },
  {
    id: "IV-I",
    name: "IV–I (plagal)",
    degrees: ["IV", "I"],
    tags: ["cadence"],
  },
  {
    id: "ii-V-I",
    name: "ii–V–I (authentic)",
    degrees: ["ii", "V", "I"],
    tags: ["cadence"],
  },
  { id: "V", name: "V (half)", degrees: ["V"], tags: ["cadence", "half"] },
];

function chordToDegree(key: string, mode: Mode, symbol: string): number | null {
  const { root } = parseChordSymbol(symbol);
  const roots = [1, 2, 3, 4, 5, 6, 7].map((d) => degreeRoot(key, d, mode));
  const idx = roots.indexOf(normalizeNote(root));
  return idx >= 0 ? idx + 1 : null;
}

export function detectProgressionForSection(
  key: string,
  mode: Mode,
  sectionStartBeat: number,
  sectionLengthBeats: number,
  chords: Array<{ symbol: string; startBeat: number }>
) {
  // Collect chords within section window, ordered
  const inWindow = chords
    .filter(
      (c) =>
        c.startBeat >= sectionStartBeat &&
        c.startBeat < sectionStartBeat + sectionLengthBeats
    )
    .sort((a, b) => a.startBeat - b.startBeat);
  if (inWindow.length === 0) return { main: null, cadence: null } as const;
  const degreesSeq = inWindow
    .map((c) => chordToDegree(key, mode, c.symbol))
    .filter((x): x is number => !!x);
  // Score each known progression by longest matching subsequence
  function scoreProgression(degrees: string[]) {
    const target = degrees.map((rn) => romanToDegree(rn).degree);
    let best = 0;
    // sliding window match
    for (let i = 0; i + target.length <= degreesSeq.length; i++) {
      const window = degreesSeq.slice(i, i + target.length);
      let ok = 0;
      for (let j = 0; j < target.length; j++) if (window[j] === target[j]) ok++;
      if (ok > best) best = ok;
      if (best === target.length) return { hits: best, startIndex: i };
    }
    return {
      hits: best,
      startIndex: best > 0 ? degreesSeq.indexOf(target[0]) : -1,
    };
  }

  let bestMain: {
    id: string;
    name: string;
    hits: number;
    len: number;
    startIndex: number;
  } | null = null;
  for (const p of PROGRESSIONS) {
    const { hits, startIndex } = scoreProgression(p.degrees);
    if (!bestMain || hits / p.degrees.length > bestMain.hits / bestMain.len) {
      bestMain = {
        id: p.id,
        name: p.name,
        hits,
        len: p.degrees.length,
        startIndex,
      };
    }
  }
  let bestCad: { id: string; name: string; hits: number; len: number } | null =
    null;
  for (const c of CADENCES) {
    const { hits } = scoreProgression(c.degrees);
    if (!bestCad || hits / c.degrees.length > bestCad.hits / bestCad.len) {
      bestCad = { id: c.id, name: c.name, hits, len: c.degrees.length };
    }
  }
  const mainConfidence = bestMain ? bestMain.hits / bestMain.len : 0;
  const cadenceConfidence = bestCad ? bestCad.hits / bestCad.len : 0;
  // Intro heuristic: if the best main match begins later in the section and the leading window is short,
  // flag it as an intro (often vamp/pickup). Limit to <= 2 bars or <= 50% of the section, whichever smaller.
  let intro: { lengthBeats: number; kind: "intro" } | null = null;
  if (
    bestMain &&
    typeof bestMain.startIndex === "number" &&
    bestMain.startIndex > 0 &&
    inWindow.length > bestMain.startIndex
  ) {
    const firstMainChord = inWindow[bestMain.startIndex];
    const introLen = Math.max(0, firstMainChord.startBeat - sectionStartBeat);
    const maxIntro = Math.min(8, Math.round(0.5 * sectionLengthBeats));
    // Also consider diatonic coverage of prelude: if <=1 diatonic chord, more likely an intro riff
    const preludeDegrees = inWindow
      .slice(0, bestMain.startIndex)
      .map((c) => chordToDegree(key, mode, c.symbol))
      .filter((x): x is number => !!x);
    if (introLen > 0 && introLen <= maxIntro && preludeDegrees.length <= 1) {
      intro = { lengthBeats: introLen, kind: "intro" };
    }
  }
  return {
    main:
      bestMain && mainConfidence > 0
        ? {
            presetId: bestMain.id,
            name: bestMain.name,
            confidence: mainConfidence,
            startIndex: bestMain.startIndex,
          }
        : null,
    cadence:
      bestCad && cadenceConfidence > 0
        ? {
            presetId: bestCad.id,
            name: bestCad.name,
            confidence: cadenceConfidence,
          }
        : null,
    intro,
  } as const;
}

// --- Key detection and transposition ---

export const KEYS = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

function diatonicDegreeForRoot(
  key: string,
  mode: Mode,
  root: string
): number | null {
  const norm = normalizeNote(root);
  for (let d = 1; d <= 7; d++) if (degreeRoot(key, d, mode) === norm) return d;
  return null;
}

export function detectKeyForChords(
  chords: Array<{ symbol: string; startBeat?: number }>
): { key: string; mode: Mode; confidence: number } | null {
  if (!chords.length) return null;
  let best: { key: string; mode: Mode; score: number } | null = null;
  for (const key of KEYS) {
    for (const mode of ["major", "minor"] as const) {
      let score = 0;
      for (const ch of chords) {
        const { root, quality } = parseChordSymbol(ch.symbol);
        const deg = diatonicDegreeForRoot(key, mode, root);
        if (deg) {
          // base diatonic hit
          score += 1;
          // tonic and dominant extra weight
          if (deg === 1) score += 0.5;
          if (deg === 5) score += isDominant7(quality) ? 0.75 : 0.5;
          // quality hint match
          if (quality && diatonicQuality(deg, mode) === quality) score += 0.25;
        } else {
          // slight penalty for non-diatonic
          score -= 0.25;
        }
      }
      if (!best || score > best.score) best = { key, mode, score };
    }
  }
  if (!best) return null;
  // normalize confidence to 0..1 roughly by dividing by 1.75*chords.length
  const confidence = Math.max(
    0,
    Math.min(1, best.score / (1.75 * chords.length))
  );
  return { key: best.key, mode: best.mode, confidence };
}

export function semitoneDelta(fromKey: string, toKey: string): number {
  const a = noteIndex(normalizeNote(fromKey));
  const b = noteIndex(normalizeNote(toKey));
  return (((b - a) % 12) + 12) % 12;
}

export function transposeChordSymbol(symbol: string, delta: number): string {
  const { root, quality } = parseChordSymbol(symbol);
  const newRoot = transpose(root, delta);
  return `${newRoot}${quality}`;
}

export function transposeChordsBy<T extends { symbol: string }>(
  chords: T[],
  delta: number
): T[] {
  if (delta === 0) return chords.slice();
  return chords.map((c) => ({
    ...c,
    symbol: transposeChordSymbol(c.symbol, delta),
  }));
}

// --- Section cleanup heuristics ---
export type RawSectionLike = {
  id: string;
  name: string;
  startBeat: number;
  lengthBeats: number;
};
export type TimedChordLike = {
  id: string;
  symbol: string;
  startBeat: number;
};

export type SectionCleanupResult = {
  sections: RawSectionLike[];
  chords: TimedChordLike[];
  notes: string[];
  changes: Array<{ kind: string; detail: string }>;
};

// Heuristic: merge consecutive identical-named tiny sections (< minBeats) into neighbor; detect repeating segment lengths; normalize names to Verse/Chorus/Bridge etc.
export function cleanupSections(
  rawSections: RawSectionLike[],
  chords: TimedChordLike[],
  opts: { minBeats?: number } = {}
): SectionCleanupResult {
  if (!rawSections.length)
    return { sections: [], chords, notes: [], changes: [] };
  const minBeats = opts.minBeats ?? 16; // 4 bars default
  const changes: Array<{ kind: string; detail: string }> = [];
  const notes: string[] = [];
  // 1. Merge small trailing or leading fragments into previous if same chord region.
  let sections = rawSections
    .slice()
    .sort((a, b) => a.startBeat - b.startBeat)
    .map((s) => ({ ...s }));
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    if (s.lengthBeats >= minBeats) continue;
    const prev = sections[i - 1];
    const next = sections[i + 1];
    // prefer merge into previous if exists
    if (prev) {
      prev.lengthBeats = s.startBeat + s.lengthBeats - prev.startBeat;
      changes.push({
        kind: "merge",
        detail: `${s.name} -> extend ${prev.name}`,
      });
      sections.splice(i, 1);
      i -= 1;
      continue;
    } else if (next) {
      // merge forward
      const newStart = s.startBeat;
      next.startBeat = newStart;
      next.lengthBeats += s.lengthBeats;
      changes.push({
        kind: "merge",
        detail: `${s.name} -> prepend into ${next.name}`,
      });
      sections.splice(i, 1);
      i -= 1;
      continue;
    }
  }
  // 2. Recompute ordering integrity (ensure no gaps / overlaps) by snapping sequentially.
  sections.sort((a, b) => a.startBeat - b.startBeat);
  let cursor = sections[0].startBeat;
  for (const s of sections) {
    if (s.startBeat !== cursor) {
      changes.push({
        kind: "shift",
        detail: `${s.name} start ${s.startBeat} -> ${cursor}`,
      });
      s.startBeat = cursor;
    }
    cursor = s.startBeat + s.lengthBeats;
  }
  // 3. Pattern recognition: group by chord hash inside each section.
  function sectionChordHash(sec: RawSectionLike) {
    const within = chords
      .filter(
        (c) =>
          c.startBeat >= sec.startBeat &&
          c.startBeat < sec.startBeat + sec.lengthBeats
      )
      .sort((a, b) => a.startBeat - b.startBeat)
      .map((c) => c.symbol)
      .join("|");
    return within;
  }
  const hashMap = new Map<string, RawSectionLike[]>();
  sections.forEach((s) => {
    const h = sectionChordHash(s);
    if (!hashMap.has(h)) hashMap.set(h, []);
    hashMap.get(h)!.push(s);
  });
  // 4. Name normalization: most frequent hash -> Verse; second frequent -> Chorus; short unique -> Bridge/Break.
  const freq = Array.from(hashMap.entries()).map(([h, arr]) => ({
    hash: h,
    count: arr.length,
    avgLen: arr.reduce((a, b) => a + b.lengthBeats, 0) / arr.length,
  }));
  freq.sort((a, b) => b.count - a.count || b.avgLen - a.avgLen);
  const nameMap = new Map<string, string>();
  const canonical = ["Verse", "Chorus", "Bridge", "Break", "Outro"];
  freq.forEach((f, idx) => {
    if (idx < canonical.length) nameMap.set(f.hash, canonical[idx]);
    else nameMap.set(f.hash, `Part${idx + 1}`);
  });
  sections.forEach((s) => {
    const h = sectionChordHash(s);
    const newName = nameMap.get(h) || s.name;
    if (newName !== s.name) {
      changes.push({ kind: "rename", detail: `${s.name} -> ${newName}` });
      s.name = newName;
    }
  });
  notes.push(
    `Detected ${freq.length} unique progression patterns across ${sections.length} sections.`
  );
  return { sections, chords, notes, changes };
}
