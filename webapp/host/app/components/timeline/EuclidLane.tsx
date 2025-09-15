"use client";
import React from "react";
import { useTimelineStore, beatPx } from "@/lib/timelineStore";

function buildSteps(steps: number, pulses: number, rotation: number) {
  // Bjorklund simplified: generate pulses then rotate
  const pattern: number[] = [];
  let bucket = 0;
  for (let i = 0; i < steps; i++) {
    bucket += pulses;
    if (bucket >= steps) {
      bucket -= steps;
      pattern.push(1);
    } else pattern.push(0);
  }
  // rotate
  if (rotation % steps) {
    const r = ((rotation % steps) + steps) % steps;
    pattern.unshift(...pattern.splice(pattern.length - r, r));
  }
  return pattern;
}

export function EuclidLane() {
  const { euclids, zoom, snap, updateItem, select, selection } =
    useTimelineStore((s) => ({
      euclids: s.euclids,
      zoom: s.zoom,
      snap: s.snap,
      updateItem: s.updateItem,
      select: s.select,
      selection: s.selection,
    }));

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const onDragRotate = (
    id: string,
    startX: number,
    originRotation: number,
    steps: number
  ) => {
    const gridPx = zoom * snap; // snap beats per grid
    const move = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const stepDelta = Math.round(dx / gridPx);
      const rot = (originRotation + stepDelta) % steps;
      updateItem("euclid", id, { rotation: ((rot % steps) + steps) % steps });
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  return (
    <div
      ref={containerRef}
      className="relative min-h-[60px] bg-slate-900/80 border border-border rounded px-2 py-2 flex flex-col gap-2"
    >
      {euclids.map((e) => {
        const active = selection.kind === "euclid" && selection.id === e.id;
        const pattern = buildSteps(e.steps, e.pulses, e.rotation);
        const itemRef = React.createRef<HTMLDivElement>();
        React.useEffect(() => {
          const el = itemRef.current;
          if (!el) return;
          el.style.setProperty("--left", `${beatPx(e.startBeat, zoom)}px`);
          el.style.setProperty("--width", `${beatPx(e.lengthBeats, zoom)}px`);
        }, [e.startBeat, e.lengthBeats, zoom]);

        return (
          <div
            key={e.id}
            ref={itemRef}
            className={`relative rounded border px-2 py-1 text-[11px] flex items-center gap-2 var-left var-width ${
              active
                ? "bg-indigo-700/60 border-indigo-400"
                : "bg-indigo-800/40 border-indigo-500/30"
            }`}
            onClick={() => select("euclid", e.id)}
          >
            <span className="font-mono">
              E{e.steps}/{e.pulses} r{e.rotation}
            </span>
            <div className="flex gap-1">
              {pattern.map((p, i) => {
                const isActive = p === 1;
                return (
                  <button
                    key={i}
                    className={`w-3 h-3 rounded-full border transition-colors ${
                      isActive
                        ? "bg-indigo-300 border-indigo-100"
                        : "bg-slate-700 border-slate-600 hover:bg-slate-600"
                    }`}
                    aria-label={`step ${i}`}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      // Toggle pulse by adjusting pulses count (simple heuristic)
                      const delta = isActive ? -1 : 1;
                      const pulses = Math.min(
                        Math.max(0, e.pulses + delta),
                        e.steps
                      );
                      updateItem("euclid", e.id, { pulses });
                    }}
                  />
                );
              })}
            </div>
            {active && (
              <div className="ml-auto flex items-center gap-1">
                <label className="flex items-center gap-1">
                  <span>S</span>
                  <input
                    type="number"
                    className="w-12 bg-slate-900 border border-slate-600 rounded px-1 py-0.5"
                    value={e.steps}
                    min={1}
                    max={64}
                    onChange={(ev) =>
                      updateItem("euclid", e.id, {
                        steps: Math.max(
                          1,
                          Math.min(64, Number(ev.target.value))
                        ),
                      })
                    }
                  />
                </label>
                <label className="flex items-center gap-1">
                  <span>P</span>
                  <input
                    type="number"
                    className="w-12 bg-slate-900 border border-slate-600 rounded px-1 py-0.5"
                    value={e.pulses}
                    min={0}
                    max={e.steps}
                    onChange={(ev) =>
                      updateItem("euclid", e.id, {
                        pulses: Math.max(
                          0,
                          Math.min(e.steps, Number(ev.target.value))
                        ),
                      })
                    }
                  />
                </label>
                <button
                  className="px-1.5 py-0.5 rounded border border-slate-600 text-[10px]"
                  onMouseDown={(ev) => {
                    ev.preventDefault();
                    onDragRotate(e.id, ev.clientX, e.rotation, e.steps);
                  }}
                >
                  Rotate
                </button>
              </div>
            )}
          </div>
        );
      })}
      {euclids.length === 0 && (
        <div className="text-[11px] text-slate-500">No Euclid clips</div>
      )}
    </div>
  );
}
