import React, { useMemo } from "react";
import { useTimelineStore } from "@/lib/timelineStore";
import { computeLastBeat } from "@/lib/timelineUtils";

function groupLyrics(
  lyrics: Array<{ id?: string; atBeat?: number; text: string }>,
  beatsPerLine: number
) {
  const map = new Map<number, any[]>();
  for (const l of lyrics) {
    const beat = l.atBeat ?? 0;
    const row = Math.floor(beat / beatsPerLine);
    if (!map.has(row)) map.set(row, []);
    map.get(row)!.push(l);
  }
  return Array.from(map.entries()).map(([row, items]) => ({ row, items }));
}

export function LyricsLane() {
  const { timeline, beatsPerLine, editLayout, snap, select, selection, zoom } =
    useTimelineStore((s) => ({
      timeline: s.timeline,
      beatsPerLine: s.beatsPerLine,
      editLayout: s.editLayout,
      snap: s.snap,
      select: s.select,
      selection: s.selection,
      zoom: s.zoom,
    }));
  const lyrics = timeline?.lyrics || [];
  const chords = timeline?.chords || [];
  const [hoverLyricId, setHoverLyricId] = React.useState<string | null>(null);
  const rows = useMemo(
    () => groupLyrics(lyrics, beatsPerLine),
    [lyrics, beatsPerLine]
  );
  const ROW_H = 24; // use spacing token equivalent (approx var(--spacing-md) = 16 plus padding)
  const PAD_Y = 8;
  const height = rows.length * ROW_H + PAD_Y * 2;
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const rowRefs = React.useRef<Array<HTMLDivElement | null>>([]);

  React.useEffect(() => {
    if (containerRef.current) containerRef.current.style.setProperty('--height', `${height}px`);
    rows.forEach((r, i) => {
      const el = rowRefs.current[i];
      if (el) el.style.setProperty('--top', `${PAD_Y + r.row * ROW_H}px`);
      r.items.forEach((l) => {
        // nothing here; individual items are positioned using inline refs on render
      });
    });
  }, [rows, height]);

  const onDrag = (id: string, clientX: number) => {
    if (!editLayout) return;
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    let beat = x / zoom;
    beat = Math.round(beat / snap) * snap;
    const item = lyrics.find((l) => (l as any).id === id);
    if (item) (item as any).atBeat = beat;
  };

  return (
    <div ref={containerRef} className="relative bg-slate-900/80 border border-border rounded overflow-hidden">
      {rows.map((r) => (
        <div key={r.row} ref={(el) => { rowRefs.current[r.row] = el; }} className="absolute left-0 right-0 var-top">
          {r.items.map((l) => {
            const anyChordLinked = chords.some(
              (c) => (c as any).lyricId === (l as any).id
            );
            const linked = hoverLyricId && hoverLyricId === (l as any).id;
            return (
              <span
                key={l.id || l.text}
                ref={(el) => {
                  if (!el) return;
                  const tx = ((l.atBeat ?? 0) - Math.floor((l.atBeat ?? 0) / beatsPerLine) * beatsPerLine) * zoom;
                  el.style.setProperty('--left', `${tx}px`);
                }}
                className={`inline-block align-middle text-xs px-2 py-0.5 rounded border whitespace-nowrap mr-2 ${
                  selection.kind === "lyric" && selection.id === l.id
                    ? "ring-2 ring-primary"
                    : ""
                } ${editLayout ? "cursor-grab active:cursor-grabbing" : ""} ${
                  linked
                    ? "bg-sky-700/70 text-white border-sky-400"
                    : anyChordLinked
                    ? "bg-emerald-800/70 text-emerald-50 border-emerald-500/30"
                    : "bg-slate-700/60 text-slate-100 border-slate-500/30"
                } var-left`}
                onClick={() => select("lyric", (l as any).id!)}
                onMouseEnter={() => setHoverLyricId((l as any).id || null)}
                onMouseLeave={() => setHoverLyricId(null)}
                onDoubleClick={() => {
                  if (!editLayout) return;
                  select("lyric", (l as any).id!);
                  const next = prompt("Edit lyric", l.text);
                  if (next && next.trim()) (l as any).text = next.trim();
                }}
                onMouseDown={(e) => {
                  if (!editLayout) return;
                  e.preventDefault();
                  const move = (ev: MouseEvent) =>
                    onDrag((l as any).id!, ev.clientX);
                  const up = () => {
                    window.removeEventListener("mousemove", move);
                    window.removeEventListener("mouseup", up);
                  };
                  window.addEventListener("mousemove", move);
                  window.addEventListener("mouseup", up);
                }}
                title={`beat ${l.atBeat}`}
              >
                {l.text}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}
