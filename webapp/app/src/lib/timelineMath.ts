//se Core CPS transform utilities
export function xOf(time_s: number, now_s: number, px_per_s: number, viewport_w: number): number {
  return (time_s - now_s) * px_per_s + viewport_w / 2;
}
export function timeAt(x_px: number, now_s: number, px_per_s: number, viewport_w: number): number {
  return ((x_px - viewport_w / 2) / px_per_s) + now_s;
}

// Binary search helpers for karaoke highlighting
export function bsearch<T>(arr: T[], t: number, start: (x:T)=>number, end: (x:T, i:number)=>number): number {
  let lo = 0, hi = arr.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const s = start(arr[mid]);
    const e = end(arr[mid], mid);
    if (t < s) hi = mid - 1;
    else if (t > e) lo = mid + 1;
    else { ans = mid; break; }
  }
  return ans;
}

export type LyricLine = { start_s: number; end_s: number; text: string; words?: { t: number; text: string }[] };

export function interpolateWords(text: string, start_s: number, end_s: number): { t: number; text: string }[] {
  const parts = (text || "").split(/\s+/).filter(Boolean);
  const dur = Math.max(0.001, end_s - start_s);
  return parts.map((w, i) => ({ t: start_s + (i / Math.max(1, parts.length)) * dur, text: w }));
}

export function currentLyricIndices(lines: LyricLine[], now_s: number) {
  const li = bsearch(lines, now_s, (l) => l.start_s, (l, i) => (i+1 < lines.length ? Math.min(lines[i+1].start_s, l.end_s) : l.end_s));
  if (li < 0) return { line: -1, word: -1 };
  const line = lines[li];
  const words = line.words ?? interpolateWords(line.text, line.start_s, line.end_s);
  const wi = bsearch(words, now_s, (w) => w.t, (w, i) => (i+1 < words.length ? words[i+1].t : line.end_s));
  return { line: li, word: wi };
}
