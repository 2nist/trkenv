import type { LibraryCatalog, LibraryPattern } from "./progressionLibrary";
import type { RomanToken } from "./romanizer";

export type MatchSpan = {
  startIndex: number;
  endIndex: number; // inclusive
  pattern_id: string;
  name: string;
  roman_seq: string[];
  confidence: number; // 0..1
  explanation: string;
};

function seqEditScore(window: RomanToken[], pattern: LibraryPattern) {
  // simple scoring: +1 exact rn match, +0.5 if borrowed variant (case-insensitive without accidentals), -0.25 for gap/extra
  let score = 0;
  const rnWin = window.map((t) => t.rn);
  const rnPat = pattern.roman_sequence;
  const n = Math.min(rnWin.length, rnPat.length);
  let i = 0;
  let j = 0;
  const reasons: string[] = [];
  while (i < rnWin.length && j < rnPat.length) {
    const a = rnWin[i];
    const b = rnPat[j];
    if (a === b) {
      score += 1;
      reasons.push(`hit ${a}`);
      i++;
      j++;
    } else if (
      a.replace(/[b#]/g, "").toLowerCase() ===
      b.replace(/[b#]/g, "").toLowerCase()
    ) {
      score += 0.5; // borrowed/altered
      reasons.push(`altered ${a}~${b}`);
      i++;
      j++;
    } else {
      // allow one skip (passing tone)
      score -= 0.25;
      reasons.push(`skip ${a}`);
      i++;
    }
  }
  // penalty for leftover pattern tokens
  const leftover = rnPat.length - j;
  score -= Math.max(0, leftover) * 0.25;
  return { score, reasons };
}

function functionAlignmentBonus(window: RomanToken[], pattern: LibraryPattern) {
  if (!pattern.function_path) return 0;
  const funcs = window.map((t) => t.func);
  let bonus = 0;
  for (
    let k = 0;
    k < Math.min(funcs.length, pattern.function_path.length);
    k++
  ) {
    if (funcs[k] && funcs[k] === pattern.function_path[k]) bonus += 0.25;
  }
  return bonus;
}

function cadenceBonus(window: RomanToken[], pattern: LibraryPattern) {
  if (!pattern.cadence_type) return 0;
  const tail = window.slice(-2).map((t) => t.rn);
  const s = tail.join("-");
  if (pattern.cadence_type === "authentic" && (s === "V-I" || s === "V7-I"))
    return 1;
  if (pattern.cadence_type === "plagal" && s === "IV-I") return 0.75;
  if (pattern.cadence_type === "deceptive" && (s === "V-vi" || s === "V7-vi"))
    return 0.75;
  if (pattern.cadence_type === "half" && tail[tail.length - 1] === "V")
    return 0.5;
  return 0;
}

export function matchProgressions(
  romans: RomanToken[],
  lib: LibraryCatalog,
  windowRange: [number, number] = [3, 8]
): MatchSpan[] {
  const spans: MatchSpan[] = [];
  const [minW, maxW] = windowRange;
  for (let i = 0; i < romans.length; i++) {
    for (let w = minW; w <= maxW; w++) {
      const j = i + w;
      if (j > romans.length) break;
      const win = romans.slice(i, j);
      let best: { pat: LibraryPattern; score: number; explain: string } | null =
        null;
      for (const p of lib.patterns) {
        const { score, reasons } = seqEditScore(win, p);
        const bonus = functionAlignmentBonus(win, p) + cadenceBonus(win, p);
        const total = score + bonus;
        const exp = `${reasons.join(", ")}${
          bonus ? `; bonus ${bonus.toFixed(2)}` : ""
        }`;
        if (!best || total > best.score)
          best = { pat: p, score: total, explain: exp };
      }
      if (!best) continue;
      // normalize confidence by window length
      const conf = Math.max(0, Math.min(1, best.score / (w * 1.25)));
      if (conf < 0.35) continue; // low-confidence skip
      spans.push({
        startIndex: i,
        endIndex: j - 1,
        pattern_id: best.pat.id,
        name: best.pat.name,
        roman_seq: best.pat.roman_sequence,
        confidence: conf,
        explanation: best.explain,
      });
    }
  }
  // Overlap resolution: greedy keep highest confidence, prefer longer windows
  spans.sort(
    (a, b) =>
      b.confidence - a.confidence ||
      b.endIndex - b.startIndex - (a.endIndex - a.startIndex)
  );
  const kept: MatchSpan[] = [];
  for (const s of spans) {
    if (
      kept.some(
        (k) => !(s.endIndex < k.startIndex || s.startIndex > k.endIndex)
      )
    )
      continue;
    kept.push(s);
  }
  // sort by start
  kept.sort((a, b) => a.startIndex - b.startIndex);
  return kept;
}
