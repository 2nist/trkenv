"use client";
import React from "react";
import { useTimelineStore, beatPx } from "@/lib/timelineStore";

// Focused single-section editor: chords top (horizontal linear row), lyrics wrapped below.
export function SectionFocusEditor() {
  const { sections, chords, lyrics, selection, select, updateItem, zoom } =
    useTimelineStore((s) => ({
      sections: s.sections,
      chords: s.chords,
      lyrics: s.lyrics,
      selection: s.selection,
      select: s.select,
      updateItem: s.updateItem,
      zoom: s.zoom,
    }));
  const [sectionId, setSectionId] = React.useState(() => sections[0]?.id);
  React.useEffect(() => {
    if (sections.length && !sections.find((s) => s.id === sectionId)) {
      setSectionId(sections[0].id);
    }
  }, [sections, sectionId]);
  const section = sections.find((s) => s.id === sectionId);
  if (!section)
    return <div className="text-xs text-slate-500">No section.</div>;
  const secChords = chords
    .filter(
      (c) =>
        c.startBeat >= section.startBeat &&
        c.startBeat < section.startBeat + section.lengthBeats
    )
    .sort((a, b) => a.startBeat - b.startBeat);
  const secLyrics = lyrics
    .filter(
      (l) =>
        l.beat >= section.startBeat &&
        l.beat < section.startBeat + section.lengthBeats
    )
    .sort((a, b) => a.beat - b.beat);

  const relBeat = (abs: number) => abs - section.startBeat;
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  const onDragChord = (id: string, clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const beat = Math.max(0, Math.round(x / zoom));
    updateItem("chord", id, { startBeat: section.startBeat + beat });
  };
  const onDragLyric = (id: string, clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const beat = Math.max(0, Math.round(x / zoom));
    updateItem("lyric", id, { beat: section.startBeat + beat });
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-1 flex-wrap">
        {sections.map((s) => (
          <button
            key={s.id}
            className={`px-2 py-1 rounded text-[11px] border ${
              s.id === sectionId
                ? "bg-slate-700 border-slate-500"
                : "bg-slate-800 border-slate-700"
            }`}
            onClick={() => setSectionId(s.id)}
          >
            {s.name}
          </button>
        ))}
      </div>
      <div
        ref={containerRef}
        className="relative border border-slate-700 rounded bg-slate-900 p-3"
      >
        <div className="mb-2 text-xs font-semibold flex items-center gap-2">
          <span>{section.name}</span>
          <span className="text-slate-400">{section.lengthBeats} beats</span>
        </div>
        {/* Chord Row */}
        <div className="relative min-h-[40px] mb-4">
            {secChords.map((c) => {
              const ref = React.createRef<HTMLDivElement>();
              React.useEffect(() => {
                const el = ref.current;
                if (!el) return;
                el.style.setProperty("--left", `${beatPx(relBeat(c.startBeat), zoom)}px`);
              }, [c.startBeat, zoom]);
              return (
                <div
                  key={c.id}
                  ref={ref}
                  className={`absolute -translate-y-1/2 top-1/2 text-xs px-2 py-0.5 rounded border cursor-grab active:cursor-grabbing whitespace-nowrap var-left ${
                    selection.kind === "chord" && selection.id === c.id
                      ? "bg-sky-700/80 border-sky-400"
                      : "bg-sky-800/60 border-sky-500/30"
                  }`}
                  onClick={() => select("chord", c.id)}
                  onDoubleClick={() => {
                    const next = prompt("Edit chord", c.symbol);
                    if (next && next.trim())
                      updateItem("chord", c.id, { symbol: next.trim() });
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const move = (ev: MouseEvent) => onDragChord(c.id, ev.clientX);
                    const up = () => {
                      window.removeEventListener("mousemove", move);
                      window.removeEventListener("mouseup", up);
                    };
                    window.addEventListener("mousemove", move);
                    window.addEventListener("mouseup", up);
                  }}
                >
                  {c.symbol}
                </div>
              );
            })}
        </div>
        {/* Lyrics block: inline flow with pill tokens */}
        <div className="flex flex-wrap gap-2">
          {secLyrics.map((l) => (
            <span
              key={l.id}
              className={`px-2 py-0.5 rounded text-xs border cursor-pointer ${
                selection.kind === "lyric" && selection.id === l.id
                  ? "bg-emerald-700/80 border-emerald-400"
                  : "bg-emerald-800/60 border-emerald-600/30"
              }`}
              onClick={() => select("lyric", l.id)}
              onDoubleClick={() => {
                const next = prompt("Edit lyric", l.text);
                if (next && next.trim())
                  updateItem("lyric", l.id, { text: next.trim() });
              }}
              onMouseDown={(e) => {
                if ((e.target as HTMLElement).closest("input,textarea")) return;
                e.preventDefault();
                const move = (ev: MouseEvent) => onDragLyric(l.id, ev.clientX);
                const up = () => {
                  window.removeEventListener("mousemove", move);
                  window.removeEventListener("mouseup", up);
                };
                window.addEventListener("mousemove", move);
                window.addEventListener("mouseup", up);
              }}
              title={`beat ${relBeat(l.beat)}`}
            >
              {l.text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
