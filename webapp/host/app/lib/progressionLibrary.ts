export type FunctionTag = "T" | "PD" | "D";

export type LibraryPattern = {
  id: string;
  name: string;
  roman_sequence: string[]; // ["I","V","vi","IV"]
  function_path?: FunctionTag[]; // same length as roman_sequence when provided
  cadence_type?: "authentic" | "plagal" | "half" | "deceptive" | "modal" | null;
  mode_hints?: Array<
    "major" | "minor" | "mixolydian" | "dorian" | "aeolian" | "ionian"
  >;
  allowed_subs?: string[]; // e.g., ["tritone(V)","bVII","ii° pass"]
  section_affinity?: Array<
    "intro" | "verse" | "pre-chorus" | "chorus" | "bridge" | "outro"
  >;
  group?:
    | "Common Major"
    | "Common Minor"
    | "Modal/borrowed"
    | "Cadences"
    | "Transitions";
};

export type LibraryCatalog = {
  patterns: LibraryPattern[];
  byId: Record<string, LibraryPattern>;
};

// Minimal default catalog so the system works before 2nist is wired.
const DEFAULT_PATTERNS: LibraryPattern[] = [
  {
    id: "I-V-vi-IV",
    name: "I–V–vi–IV",
    roman_sequence: ["I", "V", "vi", "IV"],
    function_path: ["T", "D", "T", "PD"],
    section_affinity: ["chorus"],
    group: "Common Major",
  },
  {
    id: "ii-V-I",
    name: "ii–V–I",
    roman_sequence: ["ii", "V", "I"],
    function_path: ["PD", "D", "T"],
    cadence_type: "authentic",
    group: "Cadences",
  },
  {
    id: "twelve-bar",
    name: "Twelve-bar (skeletal)",
    roman_sequence: [
      "I",
      "I",
      "I",
      "I",
      "IV",
      "IV",
      "I",
      "I",
      "V",
      "IV",
      "I",
      "V",
    ],
    group: "Common Major",
  },
  {
    id: "plagal",
    name: "Plagal cadence",
    roman_sequence: ["IV", "I"],
    cadence_type: "plagal",
    group: "Cadences",
  },
  {
    id: "deceptive",
    name: "Deceptive cadence",
    roman_sequence: ["V", "vi"],
    cadence_type: "deceptive",
    group: "Cadences",
  },
];

export function buildCatalog(
  patterns: LibraryPattern[] = DEFAULT_PATTERNS
): LibraryCatalog {
  const byId: Record<string, LibraryPattern> = {};
  for (const p of patterns) byId[p.id] = p;
  return { patterns, byId };
}

// Placeholder to parse external plain-text resource (2nist Progressions.txt) into patterns.
// For now we accept JSON-ish content or fall back to DEFAULT_PATTERNS.
export function parse2nistProgressions(
  raw: string | null | undefined
): LibraryCatalog {
  if (!raw) return buildCatalog(DEFAULT_PATTERNS);
  try {
    const parsed = JSON.parse(raw) as LibraryPattern[];
    return buildCatalog(parsed);
  } catch {
    return buildCatalog(DEFAULT_PATTERNS);
  }
}
