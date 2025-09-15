// Feature flags for progressive rollout. Read from public env vars, default off.
export const FEATURE_PROG_MATCH =
  (typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_FEATURE_PROG_MATCH) === "1";

export const FEATURE_CADENCE_TAGS =
  (typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_FEATURE_CADENCE_TAGS) === "1";

// Default ON if env not specified to improve discoverability
export const FEATURE_SECTION_CHART = (() => {
  if (typeof process === "undefined") return true;
  const v = process.env.NEXT_PUBLIC_FEATURE_SECTION_CHART;
  if (v === undefined) return true;
  return v === "1";
})();
