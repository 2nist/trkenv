"use client";
import React from "react";

const SHAPES: Record<string, string[]> = {
  Cmaj7: ["x32000", "x35453"],
  Dm7: ["xx0211", "x57565"],
  G7: ["320001", "353433"],
};

export function ChordShapesPopover({ symbol }: { symbol: string }) {
  const [open, setOpen] = React.useState(false);
  const shapes = SHAPES[symbol] || [];
  return (
    <div className="relative inline-block text-xs">
      <button
        className="px-2 py-1 rounded border border-slate-600"
        onClick={() => setOpen((v) => !v)}
      >
        Shapes
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-48 rounded border border-slate-700 bg-slate-900 p-2 shadow">
          <div className="text-[11px] text-slate-400 mb-1">Chord: {symbol}</div>
          {shapes.length === 0 ? (
            <div className="text-slate-500">No shapes yet</div>
          ) : (
            <ul className="space-y-1">
              {shapes.map((s, i) => (
                <li
                  key={i}
                  className="px-2 py-1 rounded bg-slate-800 border border-slate-700"
                >
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
