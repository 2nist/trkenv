"use client";
import React from "react";
import { useTimelineStore } from "@/lib/timelineStore";

export function BarRuler({
  totalBeats,
  beatsPerBar = 4,
}: {
  totalBeats: number;
  beatsPerBar?: number;
}) {
  const { zoom } = useTimelineStore((s) => ({ zoom: s.zoom }));
  const widthPx = Math.max(1, Math.round(totalBeats * zoom));
  const bars = Math.ceil(totalBeats / beatsPerBar);
  const ticks: Array<{ left: number; strong: boolean; label?: string }> = [];
  for (let b = 0; b <= bars * beatsPerBar; b++) {
    const left = Math.round(b * zoom);
    const strong = b % beatsPerBar === 0;
    const label = strong ? String(Math.floor(b / beatsPerBar) + 1) : undefined;
    ticks.push({ left, strong, label });
  }
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const tickRefs = React.useRef<Array<HTMLDivElement | null>>([]);

  React.useEffect(() => {
    if (wrapperRef.current) wrapperRef.current.style.setProperty("--width", `${widthPx}px`);
    ticks.forEach((t, i) => {
      const el = tickRefs.current[i];
      if (el) el.style.setProperty("--left", `${t.left}px`);
    });
  }, [widthPx, ticks]);

  return (
    <div className="relative h-6 bg-slate-900/70 border border-border rounded">
      <div ref={wrapperRef} className="relative h-full timeline-wrapper">
        {ticks.map((t, i) => (
          <div key={i} ref={(el) => { tickRefs.current[i] = el; }} className="absolute top-0 bottom-0 var-left">
            <div className={t.strong ? "h-full w-px bg-slate-500/60" : "h-full w-px bg-slate-600/30"} />
            {t.label && (
              <div className="absolute -top-5 text-[10px] text-slate-300 select-none">{t.label}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
