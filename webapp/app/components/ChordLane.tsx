import React from "react";

export type Chord = {
  symbol: string;
  startBeat: number;
};

export function ChordLane({
  chords,
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
  chords: Chord[];
  zoom: number;
  beatsPerBar?: number;
  totalBeats?: number;
  orientation?: "horizontal" | "vertical";
  editable?: boolean;
  onChange?: (next: Chord[]) => void;
  laneOffset?: number;
  depthBlur?: number;
  itemHeight?: number;
}) {
  if (orientation === "vertical") {
    const height = totalBeats && totalBeats > 0 ? totalBeats * zoom : undefined;
    const bars =
      beatsPerBar && totalBeats ? Math.ceil(totalBeats / beatsPerBar) : 0;
    const handleDrag = (
      idx: number,
      clientY: number,
      container: HTMLDivElement | null
    ) => {
      if (!editable || !container) return;
      const rect = container.getBoundingClientRect();
      const y = clientY - rect.top;
      const beat = Math.max(0, y / zoom);
      const snap = 1; // snap to quarter-note; can be made configurable
      const snapped = Math.round(beat / snap) * snap;
      const next = chords.slice();
      next[idx] = { ...next[idx], startBeat: snapped };
      onChange?.(next);
    };
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const vItemRefs = React.useRef<Array<HTMLDivElement | null>>([]);
    const vGridRefs = React.useRef<Array<HTMLDivElement | null>>([]);

    React.useEffect(() => {
      if (containerRef.current) {
        if (typeof height !== 'undefined') containerRef.current.style.setProperty('--height', `${height}px`);
      }
      // set per-item top vars
      chords?.forEach((c, i) => {
        const el = vItemRefs.current[i];
        if (el) {
          el.style.setProperty('--top', `${c.startBeat * zoom}px`);
          el.style.setProperty('--transform', `translateY(-50%)`);
        }
      });
      // set grid top positions
      if (beatsPerBar && totalBeats) {
        Array.from({ length: bars + 1 }).forEach((_, i) => {
          const g = vGridRefs.current[i];
          if (g) g.style.setProperty('--top', `${i * beatsPerBar * zoom}px`);
        });
      }
    }, [chords, zoom, height, bars, beatsPerBar, totalBeats]);
    return (
      <div
        className="relative min-h-[48px] bg-slate-900 rounded border border-slate-700 overflow-visible"
        ref={containerRef}
      >
        {chords?.map((c, i) => (
          <div
            key={`${c.symbol}-${i}`}
            ref={(el) => { vItemRefs.current[i] = el; }}
            className={`absolute left-2 text-xs px-2 py-0.5 rounded bg-sky-700 text-white whitespace-nowrap border border-sky-400/30 shadow ${
              editable ? "cursor-ns-resize select-none" : ""
            } var-top var-transform`}
            title={`Beat ${c.startBeat}`}
            onMouseDown={(e) => {
              if (!editable) return;
              e.preventDefault();
              const move = (ev: MouseEvent) =>
                handleDrag(i, ev.clientY, containerRef.current);
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
        ))}
            {beatsPerBar && totalBeats
          ? Array.from({ length: bars + 1 }).map((_, i) => (
              <div
                key={`vgrid-bar-${i}`}
                ref={(el) => { vGridRefs.current[i] = el; }}
                className="absolute left-0 right-0 h-px bg-slate-700/70 var-top"
              />
            ))
          : null}
      </div>
    );
  }

  // horizontal default
  const width = totalBeats && totalBeats > 0 ? totalBeats * zoom : undefined;
  const bars =
    beatsPerBar && totalBeats ? Math.ceil(totalBeats / beatsPerBar) : 0;
  const ITEM_HEIGHT = itemHeight ?? 32;
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const underlayRefs = React.useRef<Array<HTMLDivElement | null>>([]);
  const labelRefs = React.useRef<Array<HTMLDivElement | null>>([]);
  const gridRefs = React.useRef<Array<HTMLDivElement | null>>([]);

  React.useEffect(() => {
    // set wrapper CSS vars
    if (wrapperRef.current) {
      if (typeof width !== 'undefined') wrapperRef.current.style.setProperty('--width', `${width}px`);
      wrapperRef.current.style.setProperty('--transform', `translateX(${laneOffset}px)`);
      wrapperRef.current.style.setProperty('--item-height', `${ITEM_HEIGHT}px`);
    }
  // set per-item vars
    chords?.forEach((c, i) => {
      const nextBeat = chords[i + 1]?.startBeat ?? (c.startBeat + (beatsPerBar || 4));
      const widthBeats = Math.max(0.25, nextBeat - c.startBeat);
      const bgLeft = c.startBeat * zoom;
      const bgWidth = widthBeats * zoom;
      const under = underlayRefs.current[i];
      const label = labelRefs.current[i];
      if (under) {
        under.style.setProperty('--left', `${bgLeft}px`);
        under.style.setProperty('--width', `${bgWidth}px`);
        under.style.setProperty('--item-height', `${ITEM_HEIGHT}px`);
        under.style.setProperty('--transform', `translateY(-50%)`);
      }
      if (label) {
        label.style.setProperty('--left', `${c.startBeat * zoom}px`);
        label.style.setProperty('--item-height', `${ITEM_HEIGHT}px`);
        label.style.setProperty('--transform', `translateX(-50%) translateY(-50%)`);
      }
    });
    // set horizontal grid bar positions
    if (beatsPerBar && totalBeats) {
      Array.from({ length: bars + 1 }).forEach((_, i) => {
        const g = gridRefs.current[i];
        if (g) g.style.setProperty('--left', `${i * beatsPerBar * zoom}px`);
      });
    }
  }, [chords, zoom, laneOffset, width, ITEM_HEIGHT, beatsPerBar]);
  return (
    <div
      ref={wrapperRef}
      className="relative h-[32px] bg-stone-900/60 border border-stone-600/40 overflow-hidden vintage-timeline-element timeline-wrapper ring-1 ring-green-500/30"
    >
      {chords?.map((c, i) => {
        const beat = c.startBeat;
        // compute background span from this chord's beat to the next chord's startBeat (time-aligned)
        const nextBeat = chords[i + 1]?.startBeat ?? (c.startBeat + (beatsPerBar || 4));
        const widthBeats = Math.max(0.25, nextBeat - c.startBeat);
        const bgLeft = c.startBeat * zoom;
        const bgWidth = widthBeats * zoom;

        return (
          <React.Fragment key={`${c.symbol}-${i}`}>
            {/* time-aligned background span (underlay) */}
            <div
              aria-hidden
              ref={(el) => { underlayRefs.current[i] = el; }}
              className="timeline-item-underlay absolute top-1/2 var-left var-width var-height"
            />

            {/* visible item label centered on beat (left = exact time); no parallax */}
            <div
              ref={(el) => { labelRefs.current[i] = el; }}
              className="timeline-item-label absolute top-1/2 var-left var-height var-transform text-xs px-3 text-stone-50 font-bold whitespace-nowrap border border-stone-400/30 shadow-sm font-typewriter"
              title={`Beat ${c.startBeat}`}
            >
              {c.symbol}
            </div>
          </React.Fragment>
        );
      })}
      {beatsPerBar && totalBeats
        ? Array.from({ length: bars + 1 }).map((_, i) => (
            <div
              key={`grid-bar-${i}`}
              ref={(el) => { gridRefs.current[i] = el; }}
              className="absolute top-0 bottom-0 w-px bg-stone-600/20 var-left"
            />
          ))
        : null}
    </div>
  );
}
