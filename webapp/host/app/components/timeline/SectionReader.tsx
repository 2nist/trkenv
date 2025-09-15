"use client";
import React, { useMemo } from "react";
import { useTimelineStore } from "@/lib/timelineStore";

export function SectionReader() {
  const { sections, chords, lyrics, select, selection } = useTimelineStore(
    (s) => ({
      sections: s.sections,
      chords: s.chords,
      lyrics: s.lyrics,
      select: s.select,
      selection: s.selection,
    })
  );

  const grouped = useMemo(() => {
    return sections.map((s) => {
      const sEnd = s.startBeat + s.lengthBeats;
      const chordsIn = chords
        .filter((c) => c.startBeat >= s.startBeat && c.startBeat < sEnd)
        .sort((a, b) => a.startBeat - b.startBeat);
      const lyricsIn = lyrics
        .filter((l) => l.beat >= s.startBeat && l.beat < sEnd)
        .sort((a, b) => a.beat - b.beat);
      return { s, chordsIn, lyricsIn };
    });
  }, [sections, chords, lyrics]);

  return (
    <div className="space-y-4">
      {grouped.map(({ s, chordsIn, lyricsIn }) => (
        <div
          key={s.id}
          className="rounded border border-border bg-slate-900/60"
        >
          <div className="px-3 py-2 flex items-center justify-between bg-slate-800/70">
            <div className="font-medium text-sm">
              {s.name}
              <span className="text-xs text-slate-400 ml-2">
                {s.lengthBeats} beats
              </span>
            </div>
            <button
              className={`text-[11px] px-2 py-1 rounded border ${
                selection.kind === "section" && selection.id === s.id
                  ? "border-primary text-primary"
                  : "border-slate-600 text-slate-300"
              }`}
              onClick={() => select("section", s.id)}
            >
              Select
            </button>
          </div>
          <div className="px-3 py-2 space-y-2">
            {chordsIn.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {chordsIn.map((c) => (
                  <span
                    key={c.id}
                    className={`text-xs px-2 py-0.5 rounded bg-sky-800/60 text-sky-100 border border-sky-500/30 ${
                      selection.kind === "chord" && selection.id === c.id
                        ? "ring-1 ring-primary"
                        : ""
                    }`}
                    title={`beat ${c.startBeat}`}
                    onClick={() => select("chord", c.id)}
                  >
                    {c.symbol}
                  </span>
                ))}
              </div>
            )}
            {lyricsIn.length > 0 && (
              <div className="space-y-1">
                {lyricsIn.map((l) => (
                  <div
                    key={l.id}
                    className={`text-sm text-slate-200 ${
                      selection.kind === "lyric" && selection.id === l.id
                        ? "bg-slate-700/40 rounded px-2"
                        : ""
                    }`}
                    title={`beat ${l.beat}`}
                    onClick={() => select("lyric", l.id)}
                  >
                    {l.text}
                  </div>
                ))}
              </div>
            )}
            {chordsIn.length === 0 && lyricsIn.length === 0 && (
              <div className="text-xs text-slate-500">(empty)</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
