import type { RomanToken } from "./romanizer";

export type CadenceMarker = {
  index: number; // index in roman token stream where cadence lands (on arrival chord)
  type: "authentic" | "plagal" | "half" | "deceptive" | "modal";
  confidence: number;
  evidence: { chords: string[] };
};

export function detectCadences(romans: RomanToken[]): CadenceMarker[] {
  const out: CadenceMarker[] = [];
  for (let i = 1; i < romans.length; i++) {
    const prev = romans[i - 1]?.rn;
    const cur = romans[i]?.rn;
    if (!prev || !cur) continue;
    if (prev === "V" && (cur === "I" || cur === "i")) {
      out.push({
        index: i,
        type: "authentic",
        confidence: 0.9,
        evidence: { chords: [prev, cur] },
      });
    } else if (
      (prev === "IV" || prev === "iv") &&
      (cur === "I" || cur === "i")
    ) {
      out.push({
        index: i,
        type: "plagal",
        confidence: 0.75,
        evidence: { chords: [prev, cur] },
      });
    } else if (cur === "V") {
      out.push({
        index: i,
        type: "half",
        confidence: 0.6,
        evidence: { chords: [prev, cur] },
      });
    } else if (prev === "V" && (cur === "vi" || cur === "VI")) {
      out.push({
        index: i,
        type: "deceptive",
        confidence: 0.7,
        evidence: { chords: [prev, cur] },
      });
    } else if (
      (prev === "I" || prev === "i") &&
      (cur === "bVII" || cur === "VII")
    ) {
      out.push({
        index: i,
        type: "modal",
        confidence: 0.6,
        evidence: { chords: [prev, cur] },
      });
    }
  }
  return out;
}
