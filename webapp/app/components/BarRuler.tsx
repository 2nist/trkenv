import React from "react";

export function BarRuler({
  beatsPerBar,
  totalBeats,
  zoom,
  orientation = "horizontal",
}: {
  beatsPerBar: number;
  totalBeats: number;
  zoom: number; // px per beat
  orientation?: "horizontal" | "vertical";
}) {
  const bars = Math.max(0, Math.ceil(totalBeats / Math.max(1, beatsPerBar)));

  if (orientation === "vertical") {
    const totalHeight = Math.max(0, totalBeats) * zoom;
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const lineRefs = React.useRef<Array<HTMLDivElement | null>>([]);
  const vLabelRefs = React.useRef<Array<HTMLDivElement | null>>([]);

    React.useEffect(() => {
      if (containerRef.current && typeof totalHeight !== 'undefined') containerRef.current.style.setProperty('--height', `${totalHeight}px`);
      Array.from({ length: bars + 1 }).forEach((_, barIdx) => {
        const top = barIdx * beatsPerBar * zoom;
        const el = lineRefs.current[barIdx];
        if (el) el.style.setProperty('--top', `${top}px`);
        const lbl = vLabelRefs.current[barIdx];
        if (lbl) lbl.style.setProperty('--top', `${top + 2}px`);
      });
    }, [totalHeight, bars, beatsPerBar, zoom]);

    return (
      <div
        className="relative w-12 bg-slate-800/60 rounded border border-slate-700 overflow-hidden"
        ref={containerRef}
      >
        {/* baseline */}
        <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px bg-slate-600/50" />
        {Array.from({ length: bars + 1 }).map((_, barIdx) => {
          const top = barIdx * beatsPerBar * zoom;
          const label = barIdx + 1;
          return (
              <div key={`vbar-${barIdx}`}>
                <div className="absolute left-0 right-0 h-px bg-slate-400 var-top" ref={(el) => { lineRefs.current[barIdx] = el; }} />
                <div ref={(el) => { vLabelRefs.current[barIdx] = el; }} className="absolute text-[10px] text-slate-200/90 px-1 var-top ruler-label-left">
                {label}
              </div>
              {/* beat ticks */}
              {Array.from({ length: Math.max(0, beatsPerBar - 1) }).map(
                (__, b) => (
                    <div key={`vbeat-${barIdx}-${b}`} className="absolute left-0 right-0 h-px bg-slate-600/50 var-top" ref={(el) => { lineRefs.current[barIdx * beatsPerBar + b + 1] = el; }} />
                )
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // horizontal (default)
  const totalWidth = Math.max(0, totalBeats) * zoom;
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const tickRefs = React.useRef<Array<HTMLDivElement | null>>([]);
  const labelRefs = React.useRef<Array<HTMLDivElement | null>>([]);

  React.useEffect(() => {
    if (wrapperRef.current && typeof totalWidth !== 'undefined') wrapperRef.current.style.setProperty('--width', `${totalWidth}px`);
    Array.from({ length: bars + 1 }).forEach((_, barIdx) => {
      const left = barIdx * beatsPerBar * zoom;
      const el = tickRefs.current[barIdx];
      if (el) el.style.setProperty('--left', `${left}px`);
      const lbl = labelRefs.current[barIdx];
      if (lbl) lbl.style.setProperty('--left', `${left}px`);
    });
  }, [wrapperRef, totalWidth, bars, beatsPerBar, zoom]);

  return (
  <div ref={wrapperRef} className="relative h-12 bg-yellow-900/30 border border-yellow-600/50 overflow-hidden vintage-timeline-element timeline-wrapper ring-1 ring-yellow-500/30">
      {/* baseline */}
      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-stone-400/50" />
      {Array.from({ length: bars + 1 }).map((_, barIdx) => {
        const left = barIdx * beatsPerBar * zoom;
        const label = barIdx + 1;
        return (
          <div key={`bar-${barIdx}`}>
              <div className="absolute top-0 bottom-0 w-px bg-stone-300/70 var-left" ref={(el) => { tickRefs.current[barIdx] = el; }} />
              <div ref={(el) => { labelRefs.current[barIdx] = el; }} className="absolute text-[11px] text-stone-200/90 px-1 font-typewriter font-bold ruler-label-offset ruler-label-top">
              {label}
            </div>
            {/* beat ticks */}
            {Array.from({ length: Math.max(0, beatsPerBar - 1) }).map(
              (__, b) => (
                    <div key={`beat-${barIdx}-${b}`} className="absolute top-0 bottom-0 w-px bg-stone-500/30 var-left" ref={(el) => { tickRefs.current[barIdx * beatsPerBar + b + 1] = el; }} />
              )
            )}
          </div>
        );
      })}
    </div>
  );
}
