"use client";
import React from "react";
import { useTimelineStore, firstWords, beatPx } from "@/lib/timelineStore";

type Line = {
  chords: { id: string; symbol: string; startBeat: number }[];
  lyrics: { id: string; text: string; beat: number }[];
};

function layoutSection(
  start: number,
  end: number,
  chords: { id: string; symbol: string; startBeat: number }[],
  lyrics: { id: string; text: string; beat: number }[],
  maxBeats: number
): Line[] {
  const lines: Line[] = [];
  let cursor = start;
  while (cursor < end) {
    const lineEnd = Math.min(end, cursor + maxBeats);
    lines.push({
      chords: chords.filter(
        (c) => c.startBeat >= cursor && c.startBeat < lineEnd
      ),
      lyrics: lyrics.filter((l) => l.beat >= cursor && l.beat < lineEnd),
    });
    cursor = lineEnd;
  }
  return lines;
}

export function SectionChordLyricChart() {
  const {
    sections,
    chords,
    lyrics,
    zoom,
    snap,
    updateItem,
    select,
    selection,
  } = useTimelineStore((s) => ({
    sections: s.sections,
    chords: s.chords,
    lyrics: s.lyrics,
    zoom: s.zoom,
    snap: s.snap,
    updateItem: s.updateItem,
    select: s.select,
    selection: s.selection,
  }));

  const [beatsPerLine, setBeatsPerLine] = React.useState(16);
  const [previewWords, setPreviewWords] = React.useState(3);
  const [showHelp, setShowHelp] = React.useState(true);

  const dragRef = React.useRef<HTMLDivElement | null>(null);

  const onDragChord = (
    id: string,
    clientX: number,
    container: HTMLDivElement | null,
    sectionStart: number
  ) => {
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    let beat = x / zoom + sectionStart; // relative inside section grid
    beat = Math.max(sectionStart, Math.round(beat / snap) * snap);
    updateItem("chord", id, { startBeat: beat });
  };

  return (
    <div className="space-y-6">
      {sections.map((sec) => {
        const sEnd = sec.startBeat + sec.lengthBeats;
        const chordsIn = chords
          .filter((c) => c.startBeat >= sec.startBeat && c.startBeat < sEnd)
          .sort((a, b) => a.startBeat - b.startBeat);
        const lyricsIn = lyrics
          .filter((l) => l.beat >= sec.startBeat && l.beat < sEnd)
          .sort((a, b) => a.beat - b.beat);
        const lines = layoutSection(
          sec.startBeat,
          sEnd,
          chordsIn,
          lyricsIn,
          beatsPerLine
        );
        return (
          <div
            key={sec.id}
            className="border border-border rounded bg-slate-900/60"
          >
            <div className="px-3 py-2 flex items-center justify-between bg-slate-800/70 text-sm font-medium">
              <span>
                {sec.name}{" "}
                <span className="text-xs text-slate-400">
                  {sec.lengthBeats} beats
                </span>
              </span>
              <button
                className={`text-[11px] px-2 py-1 rounded border ${
                  selection.kind === "section" && selection.id === sec.id
                    ? "border-primary text-primary"
                    : "border-slate-600 text-slate-300"
                }`}
                onClick={() => select("section", sec.id)}
              >
                Select
              </button>
            </div>
            <div ref={dragRef} className="px-3 py-2 space-y-4">
              {showHelp && (
                <div className="text-[11px] bg-slate-800/70 border border-slate-700 rounded p-2 flex flex-wrap gap-3 items-center">
                  <span className="text-slate-300">
                    Drag chords to reposition • Double‑click chord/lyric to edit
                    • Adjust layout below.
                  </span>
                  <button
                    className="ml-auto px-2 py-0.5 rounded border border-slate-600"
                    onClick={() => setShowHelp(false)}
                  >
                    Hide
                  </button>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-300">
                <label className="flex items-center gap-1">
                  <span>Beats/line</span>
                  <input
                    type="number"
                    min={4}
                    max={64}
                    value={beatsPerLine}
                    onChange={(e) =>
                      setBeatsPerLine(
                        Math.max(4, Math.min(64, Number(e.target.value)))
                      )
                    }
                    className="w-14 bg-slate-800 border border-slate-600 rounded px-1 py-0.5"
                  />
                </label>
                <label className="flex items-center gap-1">
                  <span>Words</span>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={previewWords}
                    onChange={(e) =>
                      setPreviewWords(
                        Math.max(1, Math.min(12, Number(e.target.value)))
                      )
                    }
                    className="w-14 bg-slate-800 border border-slate-600 rounded px-1 py-0.5"
                  />
                </label>
                <button
                  className="px-2 py-0.5 rounded border border-slate-600"
                  onClick={() => setShowHelp((v) => !v)}
                >
                  {showHelp ? "Help off" : "Help on"}
                </button>
              </div>
              {lines.map((ln, i) => (
                <div key={i} className="space-y-1">
                  <div className="relative min-h-[28px]">
                    {ln.chords.map((c) => {
                      const ref = React.createRef<HTMLDivElement>();
                      React.useEffect(() => {
                        const el = ref.current;
                        if (!el) return;
                        el.style.setProperty("--left", `${beatPx(c.startBeat - sec.startBeat, zoom)}px`);
                      }, [c.startBeat, zoom]);
                      return (
                        <div
                          key={c.id}
                          ref={ref}
                          className={`absolute -translate-y-1/2 top-1/2 text-xs px-2 py-0.5 rounded border cursor-grab active:cursor-grabbing whitespace-nowrap var-left ${
                            selection.kind === "chord" && selection.id === c.id
                              ? "bg-sky-700/80 text-white border-sky-400"
                              : "bg-sky-800/60 text-sky-100 border-sky-500/30"
                          }`}
                          onClick={() => select("chord", c.id)}
                          onDoubleClick={() => {
                            const next = prompt("Edit chord", c.symbol);
                            if (next && next.trim())
                              updateItem("chord", c.id, { symbol: next.trim() });
                          }}
                          onMouseDown={(e) => {
                            if ((e.target as HTMLElement).closest("input,textarea")) return;
                            e.preventDefault();
                            const move = (ev: MouseEvent) =>
                              onDragChord(c.id, ev.clientX, dragRef.current, sec.startBeat);
                            const up = () => {
                              window.removeEventListener("mousemove", move);
                              window.removeEventListener("mouseup", up);
                            };
                            window.addEventListener("mousemove", move);
                            window.addEventListener("mouseup", up);
                          }}
                          title={`beat ${c.startBeat}`}
                        >
                          {c.symbol}
                        </div>
                      );
                    })}
                    <div className="absolute inset-0 pointer-events-none border-t border-dashed border-slate-700/50" />
                  </div>
                  <div className="relative min-h-[22px] text-[13px] tracking-wide font-medium text-slate-100">
                    {ln.lyrics.map((l) => {
                      const ref = React.createRef<HTMLSpanElement>();
                      React.useEffect(() => {
                        const el = ref.current;
                        if (!el) return;
                        el.style.setProperty("--left", `${beatPx(l.beat - sec.startBeat, zoom)}px`);
                      }, [l.beat, zoom]);
                      return (
                        <span
                          key={l.id}
                          ref={ref}
                          className={`absolute -translate-y-1/2 top-1/2 px-1 rounded cursor-pointer var-left ${
                            selection.kind === "lyric" && selection.id === l.id ? "bg-slate-700/40" : ""
                          }`}
                          onClick={() => select("lyric", l.id)}
                          onDoubleClick={() => {
                            const next = prompt("Edit lyric", l.text);
                            if (next && next.trim()) updateItem("lyric", l.id, { text: next.trim() });
                          }}
                          title={l.text}
                        >
                          {firstWords(l.text, previewWords)}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
              {lines.length === 0 && (
                <div className="text-xs text-slate-500">(empty)</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
