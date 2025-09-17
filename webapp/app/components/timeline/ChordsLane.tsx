"use client";
import React from "react";
import { useTimelineStore, beatPx } from "@/lib/timelineStore";
import { ChordShapesPopover } from "./ChordShapesPopover";
import { parseChordSymbol } from "@/lib/harmony";
import { computeLastBeat } from "@/lib/timelineUtils";

export function ChordsLane() {
  const { timeline, zoom, snap, select, selection, editLayout } =
    useTimelineStore((s) => ({
      timeline: s.timeline,
      zoom: s.zoom,
      snap: s.snap,
      select: s.select,
      selection: s.selection,
      editLayout: s.editLayout,
    }));
  const [hoverLyricId, setHoverLyricId] = React.useState<string | null>(null);
  const chords = timeline?.chords || [];
  const lastBeat = timeline ? computeLastBeat(timeline) : 32;
  const width = lastBeat * zoom;
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const itemRefs = React.useRef<Array<HTMLDivElement | null>>([]);
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (wrapperRef.current) {
      if (typeof width !== 'undefined') wrapperRef.current.style.setProperty('--width', `${width}px`);
      // depthBlur not provided in this component; keep no filter by default
      wrapperRef.current.style.setProperty('--filter', 'none');
    }
    chords.forEach((c, i) => {
      const el = itemRefs.current[i];
      if (el) el.style.setProperty('--left', `${beatPx(c.atBeat || 0, zoom)}px`);
    });
  }, [width, chords, zoom]);

  const onDrag = (
    id: string,
    clientX: number,
    container: HTMLDivElement | null
  ) => {
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    let beat = x / zoom;
    beat = Math.max(0, Math.round(beat / snap) * snap);
    // Placeholder: local drag only adjusting atBeat in-memory (not persisted yet)
    const idx = chords.findIndex((c) => (c as any).id === id);
    if (idx >= 0 && timeline) {
      (chords[idx] as any).atBeat = beat;
    }
  };

  return (
    <div
      ref={(el) => { containerRef.current = el; wrapperRef.current = el; }}
      className="relative min-h-[44px] bg-slate-900 rounded border border-slate-700 overflow-hidden timeline-wrapper"
    >
      {chords.map((c, i) => {
        const id = (c as any).id || `c${i}`;
        const active = selection.kind === "chord" && selection.id === id;
        const { root, quality } = parseChordSymbol(c.symbol);
        const linked = hoverLyricId && (c as any).lyricId === hoverLyricId;
        return (
          <div
            key={id}
            ref={(el) => { itemRefs.current[i] = el; }}
            className="absolute top-1/2 -translate-y-1/2 var-left"
          >
            <div
              className={`text-xs px-2 py-0.5 rounded whitespace-nowrap border shadow cursor-grab active:cursor-grabbing flex items-center gap-1 ${
                active
                  ? "bg-sky-700/80 text-white border-sky-400"
                  : linked
                  ? "bg-emerald-700/70 text-emerald-100 border-emerald-400/50"
                  : "bg-sky-800/60 text-sky-100 border-sky-500/30"
              }`}
              title={`Beat ${c.atBeat}`}
              onClick={() => select("chord", id)}
              onMouseEnter={() => setHoverLyricId((c as any).lyricId || null)}
              onMouseLeave={() => setHoverLyricId(null)}
              onDoubleClick={() => {
                if (!editLayout) return;
                const next = prompt("Edit chord", c.symbol);
                if (next && next.trim()) (c as any).symbol = next.trim();
              }}
              onMouseDown={(e) => {
                if (!editLayout) return;
                if (
                  (e.target as HTMLElement).closest(
                    "input,textarea,select,button"
                  )
                )
                  return;
                e.preventDefault();
                const move = (ev: MouseEvent) =>
                  onDrag(id, ev.clientX, containerRef.current);
                const up = () => {
                  window.removeEventListener("mousemove", move);
                  window.removeEventListener("mouseup", up);
                };
                window.addEventListener("mousemove", move);
                window.addEventListener("mouseup", up);
              }}
            >
              {c.symbol}
              {active && editLayout && <ChordShapesPopover symbol={c.symbol} />}
            </div>
            {active && (
              <div className="mt-1 flex items-center gap-1 bg-slate-800/80 border border-slate-700 rounded px-2 py-1">
                <select
                  className="bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-[11px]"
                  value={root}
                  title="Select root note"
                  onChange={(e) =>
                    ((c as any).symbol = e.target.value + quality)
                  }
                >
                  {[
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
                  ].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <select
                  className="bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-[11px]"
                  value={quality}
                  title="Select chord quality"
                  onChange={(e) => ((c as any).symbol = root + e.target.value)}
                >
                  {["", "m", "7", "m7", "maj7", "dim", "m7b5"].map((q) => (
                    <option key={q} value={q}>
                      {q || "(triad)"}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="/bass"
                  className="w-14 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-[11px]"
                  onBlur={(e) => {
                    if (!editLayout) return;
                    const val = e.target.value.trim();
                    if (val) (c as any).symbol = `${root}${quality}/${val}`;
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
