import { create } from "zustand";
import type { SongTimeline } from "@/types/timeline";
import { sectionChordProgressions } from "@/lib/timelineUtils";

export type Section = {
  id: string;
  name: string;
  startBeat: number;
  lengthBeats: number;
  color?: string;
  progressionMeta?: {
    main?: {
      presetId?: string;
      degrees?: string[];
      confidence?: number; // 0..1
      startIndex?: number; // start position within section chord list
      userLocked?: boolean;
    };
    cadence?: {
      presetId?: string; // e.g. "ii-V-I", "IV-V-I", "V-I"
      degrees?: string[];
      kind?: "authentic" | "plagal" | "half";
    };
    intro?: {
      lengthBeats?: number;
      kind?: "intro";
    };
    transition?: {
      kind?: "none" | "half-cadence" | "modulation";
    };
  };
};
export type Chord = {
  id: string;
  symbol: string;
  startBeat: number;
  lengthBeats?: number;
};
export type LyricLine = {
  id: string;
  text: string;
  beat: number;
  row?: number;
};
export type EuclidClip = {
  id: string;
  startBeat: number;
  lengthBeats: number;
  steps: number;
  pulses: number;
  rotation: number;
  track: "drums" | "melodic";
  channel?: number;
  velocity?: number;
  gate?: number;
  swing?: number;
  probability?: number;
  perStep?: Array<{
    index: number;
    velocity?: number;
    gate?: number;
    probability?: number;
  }>;
};

export type Selection = {
  kind: "section" | "chord" | "lyric" | "euclid" | null;
  id?: string | null;
};

export type TimelineState = {
  zoom: number; // px per beat
  snap: number; // beats per grid unit
  songId?: string;
  beatsPerLine: number;
  editLayout: boolean;
  help: boolean;
  timeline?: SongTimeline; // canonical mapped data
  sectionChordSlices?: ReturnType<typeof sectionChordProgressions>;
  warnings: { code: string; message: string }[];
  dataStatus: "idle" | "loading" | "ok" | "error";
  dataError?: string;
  validationErrors?: { code: string; message: string }[];
  sections: Section[];
  chords: Chord[];
  lyrics: LyricLine[];
  euclids: EuclidClip[];
  selection: Selection;
  setZoom: (z: number) => void;
  setSnap: (s: number) => void;
  setBeatsPerLine: (b: number) => void;
  toggleEditLayout: () => void;
  toggleHelp: () => void;
  setTimeline: (
    t: any,
    warnings?: { code: string; message: string }[]
  ) => void;
  setValidationErrors: (
    errs: { code: string; message: string }[] | undefined
  ) => void;
  setDataStatus: (st: TimelineState["dataStatus"], err?: string) => void;
  setData: (
    data: Partial<
      Pick<TimelineState, "sections" | "chords" | "lyrics" | "euclids">
    >
  ) => void;
  updateItem: (kind: Selection["kind"], id: string, patch: any) => void;
  select: (kind: Selection["kind"], id?: string | null) => void;
  saveDraftChanges: () => any;
};

export const useTimelineStore = create<TimelineState>((set, get) => ({
  zoom: 8,
  snap: 1,
  beatsPerLine: 16,
  editLayout: false,
  help: false,
  songId: undefined,
  timeline: undefined,
  warnings: [],
  dataStatus: "idle",
  dataError: undefined,
  validationErrors: undefined,
  sections: [],
  chords: [],
  lyrics: [],
  euclids: [],
  selection: { kind: null },
  setZoom: (z) => set({ zoom: Math.max(1, Math.min(64, Math.round(z))) }),
  setSnap: (s) => set({ snap: Math.max(0.125, Math.min(4, s)) }),
  setBeatsPerLine: (b) => set({ beatsPerLine: b }),
  toggleEditLayout: () => set((st) => ({ editLayout: !st.editLayout })),
  toggleHelp: () => set((st) => ({ help: !st.help })),
  setTimeline: (t: any, warnings = []) => {
    // Handle data that might already be in store format or need conversion
    const convertedSections: Section[] = (t.sections || []).map((section: any, index: number) => ({
      id: section.id || `section_${index}`,
      name: section.name || section.label || `Section ${index + 1}`,
      startBeat: section.startBeat !== undefined ? section.startBeat : (section.startSec ? section.startSec * 2 : 0),
      lengthBeats: section.lengthBeats || 8,
      color: section.color || "#e0e7ff",
    }));

    const convertedChords: Chord[] = (t.chords || []).map((chord: any, index: number) => ({
      id: chord.id || `chord_${index}`,
      symbol: chord.symbol,
      startBeat: chord.startBeat !== undefined ? chord.startBeat : (chord.atBeat !== undefined ? chord.atBeat : (chord.atSec ? chord.atSec * 2 : 0)),
      lengthBeats: chord.lengthBeats || chord.durationBeats || 2,
    }));

    const convertedLyrics: LyricLine[] = (t.lyrics || []).map((lyric: any, index: number) => ({
      id: lyric.id || `lyric_${index}`,
      text: lyric.text,
      beat: lyric.beat !== undefined ? lyric.beat : (lyric.atBeat !== undefined ? lyric.atBeat : (lyric.atSec ? lyric.atSec * 2 : 0)),
      row: lyric.row !== undefined ? lyric.row : index,
    }));

    set({
      timeline: t,
      warnings,
      sections: convertedSections,
      chords: convertedChords,
      lyrics: convertedLyrics,
      euclids: [], // Reset euclids for now
      sectionChordSlices: sectionChordProgressions(t),
    });
  },
  // Optionally compute and cache per-section chord progressions (derived view)
  setValidationErrors: (errs) => set({ validationErrors: errs }),
  setDataStatus: (st, err) => set({ dataStatus: st, dataError: err }),
  setData: (data) => set(data as any),
  updateItem: (kind, id, patch) => {
    const state = get();
    const key =
      kind === "section"
        ? "sections"
        : kind === "chord"
        ? "chords"
        : kind === "lyric"
        ? "lyrics"
        : kind === "euclid"
        ? "euclids"
        : null;
    if (!key) return;
    const list: any[] = (state as any)[key] || [];
    const next = list.map((it) => (it.id === id ? { ...it, ...patch } : it));
    set({ [key]: next } as any);
  },
  select: (kind, id) => set({ selection: { kind, id: id ?? null } }),
  saveDraftChanges: () => saveDraftChanges("draft", get()),
}));

// Persistence helpers
const PREF_KEY = "timeline:prefs:v1";
export function loadTimelinePrefs() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (!raw) return;
    const obj = JSON.parse(raw);
    const { beatsPerLine, snap, editLayout } = obj || {};
    const st = useTimelineStore.getState();
    if (typeof beatsPerLine === "number") st.setBeatsPerLine(beatsPerLine);
    if (typeof snap === "number") st.setSnap(snap);
    if (typeof editLayout === "boolean")
      useTimelineStore.setState({ editLayout });
  } catch {}
}

export function saveTimelinePrefs() {
  if (typeof window === "undefined") return;
  const st = useTimelineStore.getState();
  const payload = {
    beatsPerLine: st.beatsPerLine,
    snap: st.snap,
    editLayout: st.editLayout,
  };
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify(payload));
  } catch {}
}

// Auto-subscribe changes
if (typeof window !== "undefined") {
  loadTimelinePrefs();
  useTimelineStore.subscribe((state, prev) => {
    if (
      state.beatsPerLine !== prev.beatsPerLine ||
      state.snap !== prev.snap ||
      state.editLayout !== prev.editLayout
    ) {
      saveTimelinePrefs();
    }
  });
}

export function beatPx(beat: number, zoom: number) {
  return beat * zoom;
}

// Estimate text width in pixels (fast path). Falls back to DOM measurement in browser.
export function textPxWidth(text: string, approxPxPerChar = 7): number {
  if (typeof window === "undefined")
    return Math.max(16, text.length * approxPxPerChar);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return Math.max(16, text.length * approxPxPerChar);
  const style = getComputedStyle(document.body);
  ctx.font = `${style.fontSize} ${style.fontFamily}`;
  const m = ctx.measureText(text || " ");
  return Math.ceil(Math.max(16, m.width));
}

// Simple greedy row-wrapper: place lyrics in rows avoiding collisions within a section
export function wrapLyricsRows(
  lines: LyricLine[],
  sections: Section[],
  zoom: number,
  pad = 8
) {
  const bySection = new Map<string, LyricLine[]>();
  // Assign sectionId inferred by beat position
  sections.forEach((s) => bySection.set(s.id, []));
  for (const l of lines) {
    const s =
      sections.find(
        (sec) =>
          l.beat >= sec.startBeat && l.beat < sec.startBeat + sec.lengthBeats
      ) || sections[sections.length - 1];
    if (!s) continue;
    (bySection.get(s.id) || bySection.set(s.id, []).get(s.id)!).push(l);
  }
  const placed: Record<string, { id: string; row: number }[]> = {};
  for (const s of sections) {
    const arr = (bySection.get(s.id) || [])
      .slice()
      .sort((a, b) => a.beat - b.beat);
    const rows: { endX: number }[] = [];
    placed[s.id] = [];
    for (const l of arr) {
      const left = (l.beat - s.startBeat) * zoom;
      const w = textPxWidth(l.text);
      // find first row with no collision
      let row = 0;
      for (; row < rows.length; row++) {
        if (left >= rows[row].endX + pad) break;
      }
      if (row === rows.length) rows.push({ endX: -Infinity });
      rows[row].endX = Math.max(rows[row].endX, left + w);
      placed[s.id].push({ id: l.id, row });
    }
  }
  return placed; // map of sectionId -> [{id,row}]
}

export function saveDraftChanges(draftId: string, state: TimelineState) {
  // For now, produce a minimal patch shape; backend endpoint to be added later.
  const patch = {
    sections: state.sections,
    chords: state.chords,
    lyrics: state.lyrics,
    euclids: state.euclids,
    meta: { zoom: state.zoom, snap: state.snap },
  };
  return patch;
}

export function firstWords(text: string, maxWords = 3) {
  const words = (text || "").trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(" ") + "…";
}
