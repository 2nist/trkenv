"use client";
import React from "react";
import { useTimelineStore } from "@/lib/timelineStore";

function formatChord(c: any) {
  const base = c.symbol;
  if (c.carryIn && c.carryOut) return `↤${base}↦`;
  if (c.carryIn) return `↤${base}`;
  if (c.carryOut) return `${base}↦`;
  return base;
}

export const SectionProgressions: React.FC = () => {
  const { slices } = useTimelineStore((s) => ({
    slices: s.sectionChordSlices || [],
  }));
  if (!slices.length) return null;
  return (
    <div className="mt-2 space-y-1 text-[11px] leading-snug">
      <div className="text-xs font-semibold text-slate-300">
        Section Progressions
      </div>
      {slices.map((row: any, i: number) => {
        const sec = row.section;
        const name = sec.name || sec.kind || `Section ${i + 1}`;
        const chords = row.chords.map((c: any) => formatChord(c)).join(" ");
        return (
          <div
            key={i}
            className="px-2 py-1 rounded bg-slate-800/60 border border-slate-700/50 flex gap-2"
          >
            <span className="min-w-[90px] text-slate-400">{name}</span>
            <span
              className="flex-1 font-mono text-slate-200 truncate"
              title={chords}
            >
              {chords || "(no chords)"}
            </span>
          </div>
        );
      })}
      <div className="text-[10px] text-slate-500 flex gap-3 pt-1">
        <span>↤ = chord started earlier</span>
        <span>↦ = chord continues</span>
      </div>
    </div>
  );
};
