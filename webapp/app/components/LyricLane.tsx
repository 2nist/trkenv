import React from "react";

export type LyricLine = {
  text: string;
  ts_sec?: number | null;
  beat?: number | null;
};

export function LyricLane({
  lyrics,
  zoom,
  beatsPerBar,
  totalBeats,
  orientation = "horizontal",
  editable = false,
  onChange,
  laneOffset = 0,
  depthBlur = 0,
  itemHeight,
}: {
  lyrics: LyricLine[];
  zoom: number;
  beatsPerBar?: number;
  totalBeats?: number;
  orientation?: "horizontal" | "vertical";
  editable?: boolean;
  onChange?: (next: LyricLine[]) => void;
  laneOffset?: number;
  depthBlur?: number;
  itemHeight?: number;
}) {
  if (orientation === "vertical") {
    const height = totalBeats && totalBeats > 0 ? totalBeats * zoom : undefined;
    const bars = beatsPerBar && totalBeats ? Math.ceil(totalBeats / beatsPerBar) : 0;
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const vItemRefs = React.useRef<Array<HTMLDivElement | null>>([]);
    const vGridRefs = React.useRef<Array<HTMLDivElement | null>>([]);

    React.useEffect(() => {
      if (containerRef.current && typeof height !== 'undefined') containerRef.current.style.setProperty('--height', `${height}px`);
      (lyrics || []).forEach((l, i) => {
        const el = vItemRefs.current[i];
        if (el) {
          const top = typeof l.beat === "number" ? l.beat * zoom : i * 24 + 8;
          el.style.setProperty('--top', `${top}px`);
          el.style.setProperty('--transform', `translateY(-50%)`);
        }
      });
      if (beatsPerBar && totalBeats) {
        Array.from({ length: bars + 1 }).forEach((_, i) => {
          const g = vGridRefs.current[i];
          if (g) g.style.setProperty('--top', `${i * beatsPerBar * zoom}px`);
        });
      }
    }, [lyrics, zoom, height, bars, beatsPerBar, totalBeats]);

    return (
      <div className="relative w-full min-h-[48px] bg-slate-900 rounded border border-slate-700 overflow-visible" ref={containerRef}>
        {lyrics?.map((l, i) => (
          <div
            key={`ly-${i}`}
            ref={(el) => { vItemRefs.current[i] = el; }}
            className={`absolute left-2 text-xs px-2 py-0.5 rounded bg-emerald-800/60 text-emerald-100 whitespace-nowrap border border-emerald-500/30 shadow ${
              editable ? "cursor-ns-resize select-none" : ""
            } var-top var-transform`}
            title={typeof l.ts_sec === "number" ? `${l.ts_sec.toFixed(2)}s` : undefined}
          >
            {l.text}
          </div>
        ))}
        {beatsPerBar && totalBeats
          ? Array.from({ length: bars + 1 }).map((_, i) => (
              <div key={`vgrid-bar-${i}`} ref={(el) => { vGridRefs.current[i] = el; }} className="absolute left-0 right-0 h-px bg-slate-700/70 var-top" />
            ))
          : null}
      </div>
    );
  }

  // horizontal default
  const width = totalBeats && totalBeats > 0 ? totalBeats * zoom : undefined;
  const bars = beatsPerBar && totalBeats ? Math.ceil(totalBeats / beatsPerBar) : 0;
  const ITEM_HEIGHT = itemHeight ?? 32;

  // Build a map of lyrics grouped by integer beat bucket (small snap) to detect overlap
  const groups: { beatKey: number; items: LyricLine[]; startBeat: number }[] = [];
  const snap = 0.125; // small snap grid for grouping overlapping lyrics
  (lyrics || []).forEach((l) => {
    const beat = typeof l.beat === 'number' ? l.beat : 0;
    const key = Math.round(beat / snap);
    let g = groups.find((gg) => gg.beatKey === key && Math.abs(gg.startBeat - beat) < 1);
    if (!g) {
      g = { beatKey: key, items: [], startBeat: beat };
      groups.push(g);
    }
    g.items.push(l);
  });
  groups.sort((a, b) => a.startBeat - b.startBeat);

  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const underlayRefs = React.useRef<Array<HTMLDivElement | null>>([]);
  const labelRefs = React.useRef<Array<HTMLDivElement | null>>([]);
  const overlapRefs = React.useRef<Array<HTMLDivElement | null>>([]);
  const gridRefs = React.useRef<Array<HTMLDivElement | null>>([]);

  React.useEffect(() => {
    if (wrapperRef.current) {
      if (typeof width !== 'undefined') wrapperRef.current.style.setProperty('--width', `${width}px`);
      wrapperRef.current.style.setProperty('--transform', `translateX(${laneOffset}px)`);
      wrapperRef.current.style.setProperty('--item-height', `${ITEM_HEIGHT}px`);
    }
    groups.forEach((g, gi) => {
      const beat = g.startBeat;
      const nextBeat = groups[gi + 1]?.startBeat ?? (beat + (beatsPerBar || 4));
      const widthBeats = Math.max(0.25, (nextBeat || beat + 1) - beat);
      const bgLeft = beat * zoom;
      const bgWidth = widthBeats * zoom;
      const under = underlayRefs.current[gi];
      const label = labelRefs.current[gi];
      const overlap = overlapRefs.current[gi];
      if (under) {
        under.style.setProperty('--left', `${bgLeft}px`);
        under.style.setProperty('--width', `${bgWidth}px`);
        under.style.setProperty('--item-height', `${ITEM_HEIGHT}px`);
        under.style.setProperty('--transform', `translateY(-50%)`);
      }
      if (label) {
        label.style.setProperty('--left', `${beat * zoom}px`);
        label.style.setProperty('--item-height', `${ITEM_HEIGHT}px`);
        label.style.setProperty('--transform', `translateX(-50%) translateY(-50%)`);
      }
      if (overlap) {
        overlap.style.setProperty('--left', `${bgLeft + 8}px`);
        overlap.style.setProperty('--top', `calc(50% + ${ITEM_HEIGHT/2}px)`);
        overlap.style.setProperty('--width', `${Math.max(48, bgWidth - 16)}px`);
      }
    });
    if (beatsPerBar && totalBeats) {
      Array.from({ length: bars + 1 }).forEach((_, i) => {
        const g = gridRefs.current[i];
        if (g) g.style.setProperty('--left', `${i * beatsPerBar * zoom}px`);
      });
    }
  }, [groups, zoom, laneOffset, width, ITEM_HEIGHT, beatsPerBar]);

  return (
    <div ref={wrapperRef} className="relative min-h-[32px] bg-stone-900/60 border border-stone-600/40 overflow-hidden vintage-timeline-element timeline-wrapper">
      {groups.map((g, gi) => {
        const beat = g.startBeat;
        const nextBeat = groups[gi + 1]?.startBeat ?? (beat + (beatsPerBar || 4));
        const widthBeats = Math.max(0.25, (nextBeat || beat + 1) - beat);
        const bgLeft = beat * zoom;
        const bgWidth = widthBeats * zoom;

        return (
          <div key={`g-${gi}`} className="relative">
            <div aria-hidden ref={(el) => { underlayRefs.current[gi] = el; }} className="timeline-item-underlay var-left var-width var-height" />

            <div ref={(el) => { labelRefs.current[gi] = el; }} className="timeline-item-label var-left var-height var-transform -translate-x-1/2 text-xs px-3 text-stone-700 font-bold whitespace-nowrap border border-stone-400/30 shadow-sm font-typewriter">
              {g.items[0]?.text}
            </div>

            {g.items.length > 1 && (
              <div ref={(el) => { overlapRefs.current[gi] = el; }} className="absolute var-left var-top var-width">
                {g.items.slice(1).map((it, idx) => (
                  <div key={idx} className={`text-[11px] text-stone-700 font-typewriter leading-tight break-words ${idx ? 'mt-[2px]' : ''} text-left`}>
                    {it.text}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      {beatsPerBar && totalBeats
        ? Array.from({ length: bars + 1 }).map((_, i) => (
            <div key={`grid-bar-${i}`} ref={(el) => { gridRefs.current[i] = el; }} className="absolute top-0 bottom-0 w-px bg-stone-600/20 var-left" />
          ))
        : null}
    </div>
  );
}

export default LyricLane;
