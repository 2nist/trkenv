import {
  Mode,
  degreeRoot,
  diatonicQuality,
  parseChordSymbol,
  isDominant7,
} from "./harmony";

export type RomanToken = {
  rn: string; // roman numeral like I, ii, bVII, etc.
  beat?: number;
  flags?: string[]; // e.g., ["secDom","borrowed","tritoneSub","dimPass"]
  func?: "T" | "PD" | "D"; // tonal function
};

// Map diatonic scale degree to roman (major/minor casing) and basic function
function diatonicDegreeToRoman(
  deg: number,
  mode: Mode
): { rn: string; func: RomanToken["func"] } {
  const rn = ["I", "II", "III", "IV", "V", "VI", "VII"][deg - 1] || "I";
  const isMinor =
    mode === "minor" && [1, 4, 5].includes(deg)
      ? true
      : mode === "major"
      ? [2, 3, 6].includes(deg)
      : false;
  const rnAdj = isMinor ? rn.toLowerCase() : rn;
  const func: RomanToken["func"] =
    deg === 1 ? "T" : deg === 5 ? "D" : deg === 2 || deg === 4 ? "PD" : "T";
  return { rn: rnAdj, func };
}

export function romanizeChords(
  key: string,
  mode: Mode,
  chords: Array<{ symbol: string; startBeat?: number }>
): RomanToken[] {
  const out: RomanToken[] = [];
  const degRoot = (d: number) => degreeRoot(key, d, mode);
  for (let i = 0; i < chords.length; i++) {
    const ch = chords[i];
    const { root, quality } = parseChordSymbol(ch.symbol);
    // direct diatonic check
    let diatonicDeg: number | null = null;
    for (let d = 1; d <= 7; d++)
      if (degRoot(d) === root) {
        diatonicDeg = d;
        break;
      }
    if (diatonicDeg) {
      const { rn, func } = diatonicDegreeToRoman(diatonicDeg, mode);
      out.push({ rn, beat: ch.startBeat, func });
      continue;
    }
    const flags: string[] = [];
    // Secondary dominant detection: treat dominant resolving down a fifth to a diatonic degree
    let matched = false;
    for (let target = 1; target <= 7 && !matched; target++) {
      const tgtRoot = degRoot(target);
      // A dom7 built on perfect fifth above target resolves to target
      // Perfect fifth above target is transpose(tgtRoot, +7) but we work by comparing: if chord root equals dominant of tgt
      // We'll approximate by checking if (root,quality) looks dominant and root is a perfect fifth above tgtRoot
      // Note: harmony.ts keeps normalizeNote, but we compare by degreeRoot equality via a small helper.
    }
    // Simplify: encode non-diatonic as borrowed degrees by nearest letter with accidental, common cases: bIII, bVI, bVII, iv
    const letterIdx = [
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
    ].indexOf(root);
    const scale = Array.from({ length: 7 }, (_, k) => degRoot(k + 1));
    // try borrowed: if root equals major-degree minus a semitone -> flat degree
    let rnBorrowed: string | null = null;
    for (let d = 1; d <= 7 && !rnBorrowed; d++) {
      // quick heuristic: compare semitone indices diff
      const idxDeg = [
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
      ].indexOf(scale[d - 1]);
      const diff = (((letterIdx - idxDeg) % 12) + 12) % 12;
      if (diff === 11) {
        // -1 semitone => flat degree
        const base = ["I", "II", "III", "IV", "V", "VI", "VII"][d - 1];
        rnBorrowed = `b${base}`;
      }
    }
    if (rnBorrowed) {
      flags.push("borrowed");
      out.push({
        rn: rnBorrowed,
        beat: ch.startBeat,
        flags,
        func: rnBorrowed === "bVII" ? "D" : rnBorrowed === "bVI" ? "PD" : "T",
      });
      continue;
    }
    // Tritone sub: mark if looks like dominant and can stand in for V
    if (isDominant7(quality)) flags.push("tritoneCandidate");
    out.push({ rn: "?", beat: ch.startBeat, flags });
  }
  return out;
}
