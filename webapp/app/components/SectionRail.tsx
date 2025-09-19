import React from "react";

export type Section = {
  name: string;
  startBeat: number;
  lengthBeats: number;
  color?: string;
};

export function SectionRail({
  sections,
  zoom,
  orientation = "horizontal",
  totalBeats,
  laneOffset = 0,
  depthBlur = 0,
}: {
  sections: Section[];
  zoom: number; // px per beat
  orientation?: "horizontal" | "vertical";
  totalBeats?: number;
  laneOffset?: number; // px
  depthBlur?: number; // px
}) {
  if (orientation === "vertical") {
    const height = totalBeats && totalBeats > 0 ? totalBeats * zoom : undefined;
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const itemRefs = React.useRef<Array<HTMLDivElement | null>>([]);

    React.useEffect(() => {
      if (containerRef.current && typeof height !== 'undefined') containerRef.current.style.setProperty('--height', `${height}px`);
      sections?.forEach((s, i) => {
        const el = itemRefs.current[i];
        if (el) {
          el.style.setProperty('--top', `${s.startBeat * zoom}px`);
          el.style.setProperty('--height', `${Math.max(1, s.lengthBeats * zoom)}px`);
          const sectionColor = s.color || '#334155';
          el.style.setProperty('--bg-gradient', `linear-gradient(to bottom, ${sectionColor}, ${sectionColor}aa)`);
        }
      });
    }, [sections, zoom, height]);

    return (
      <div className="relative w-full bg-slate-800 rounded" ref={containerRef}>
        {sections?.map((s, i) => (
          <div
            key={i}
            ref={(el) => { itemRefs.current[i] = el; }}
            className="absolute w-full text-xs text-white/90 flex items-center px-1 var-top var-height section-bg"
            title={`${s.name}`}
          >
            <span className="truncate origin-left vertical-label">
              {s.name}
            </span>
          </div>
        ))}
      </div>
    );
  }

  // horizontal default
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const itemRefs = React.useRef<Array<HTMLDivElement | null>>([]);

  React.useEffect(() => {
    if (wrapperRef.current) {
      wrapperRef.current.style.setProperty('--transform', `translateX(${laneOffset}px)`);
      wrapperRef.current.style.setProperty('--filter', depthBlur ? `blur(${depthBlur}px)` : 'none');
      if (typeof totalBeats === 'number' && totalBeats > 0) {
        const width = totalBeats * zoom;
        wrapperRef.current.style.setProperty('--width', `${width}px`);
      }
    }
    sections?.forEach((s, i) => {
      const el = itemRefs.current[i];
      if (el) {
        el.style.setProperty('--left', `${s.startBeat * zoom}px`);
        el.style.setProperty('--width', `${Math.max(1, s.lengthBeats * zoom)}px`);
        const sectionColor = s.color || '#334155';
        el.style.setProperty('--bg-gradient', `linear-gradient(to right, ${sectionColor}, ${sectionColor}aa)`);
      }
    });
  }, [sections, zoom, laneOffset, depthBlur]);

  return (
    <div ref={wrapperRef} className="relative h-9 vintage-timeline-element timeline-wrapper ring-1 ring-red-500/40">
      {sections?.map((s, i) => {
        // Muted vintage section colors
        const vintageColors = {
          intro: "#5A4A3A",      // Muted brown
          verse: "#3A4A2A",      // Muted olive
          chorus: "#7A4A45",     // Muted red
          bridge: "#2A4A5A",     // Muted steel blue
          outro: "#4A3A5A",      // Muted purple
        };

        const sectionColor = vintageColors[s.name?.toLowerCase() as keyof typeof vintageColors] || "#4A4A4A";

        return (
          <div
            key={i}
            ref={(el) => { itemRefs.current[i] = el; }}
            className="absolute h-full text-xs text-stone-50 flex items-center px-2 font-typewriter var-left var-width section-bg"
            title={`${s.name}`}
          >
            <span className="truncate drop-shadow-sm">{s.name}</span>
          </div>
        );
      })}
    </div>
  );
}
