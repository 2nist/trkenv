import React from "react";
import { useTimelineStore, beatPx } from "@/lib/timelineStore";
import { sectionBeats } from "@/lib/timelineUtils";

export function SectionsLane() {
  const {
    timeline,
    zoom,
    select,
    selection,
    snap,
    editLayout,
    sections: editableSections,
    updateItem,
    setData,
  } = useTimelineStore((s) => ({
    timeline: s.timeline,
    zoom: s.zoom,
    select: s.select,
    selection: s.selection,
    snap: s.snap,
    editLayout: s.editLayout,
    sections: s.sections,
    updateItem: s.updateItem,
    setData: s.setData,
  }));
  const sections = timeline ? sectionBeats(timeline) : [];

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (editingId && inputRef.current) inputRef.current.focus();
  }, [editingId]);

  const onResize = (
    s: any,
    e: React.MouseEvent<HTMLDivElement, MouseEvent>,
    container: HTMLDivElement | null
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = container?.getBoundingClientRect();
    const startLeft = beatPx(s.startBeat, zoom);
    const move = (ev: MouseEvent) => {
      if (!rect) return;
      const x = ev.clientX - rect.left;
      let lenBeats = (x - startLeft) / zoom;
      lenBeats = Math.max(snap, Math.round(lenBeats / snap) * snap);
      // TODO: implement server patch; for now mutate local legacy store if needed
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const sectionRefs = React.useRef<Array<HTMLDivElement | null>>([]);

  // Stable contrasting colors by semantic kind, with a fallback palette by index
  const PALETTE = React.useMemo(
    () => [
      "bg-rose-700/60",
      "bg-emerald-700/60",
      "bg-indigo-700/60",
      "bg-amber-700/70",
      "bg-sky-700/60",
      "bg-fuchsia-700/60",
      "bg-lime-700/60",
      "bg-cyan-700/60",
    ],
    []
  );
  const colorForSection = (s: any, idx: number) => {
    const key = String((s.name || s.kind || "").toLowerCase());
    if (key.includes("intro")) return "bg-sky-700/60";
    if (key.includes("pre") && key.includes("chorus")) return "bg-teal-700/60";
    if (key.includes("chorus")) return "bg-amber-700/70";
    if (key.includes("verse")) return "bg-emerald-700/60";
    if (key.includes("bridge")) return "bg-fuchsia-700/60";
    if (key.includes("solo")) return "bg-rose-700/60";
    if (key.includes("outro")) return "bg-indigo-700/60";
    if (key.includes("instr")) return "bg-lime-700/60";
    return PALETTE[idx % PALETTE.length];
  };

  // Find editable record for a timeline section
  const findEditable = (sec: any, idx: number) => {
    const fallbackId = sec.id || `sec${idx}`;
    const byId = editableSections.find((e) => e.id === fallbackId);
    if (byId) return byId;
    // fuzzy match by bounds/name
    const eps = 1e-3;
    return editableSections.find(
      (e) =>
        Math.abs(e.startBeat - sec.startBeat) < eps &&
        Math.abs(e.lengthBeats - sec.lengthBeats) < eps &&
        (e.name || "") === (sec.name || sec.kind || "")
    );
  };

  const setSectionColor = (sec: any, idx: number, hex: string | null) => {
    const fallbackId = sec.id || `sec${idx}`;
    const existing = findEditable(sec, idx);
    if (existing) {
      updateItem("section", existing.id, { color: hex || undefined });
    } else {
      const next = [
        ...editableSections,
        {
          id: fallbackId,
          name: sec.name || sec.kind || `Section ${idx + 1}`,
          startBeat: sec.startBeat,
          lengthBeats: sec.lengthBeats,
          color: hex || undefined,
        },
      ];
      setData({ sections: next });
    }
  };

  const HEX_PALETTE = [
    "#be123c", // rose-700
    "#059669", // emerald-600/700 blend
    "#4338ca", // indigo-700
    "#b45309", // amber-700
    "#0284c7", // sky-600
    "#a21caf", // fuchsia-700
    "#65a30d", // lime-600
    "#0891b2", // cyan-600
  ];

  return (
    <div
      ref={containerRef}
      className="relative h-12 bg-slate-800/80 border border-border rounded"
    >
      {sections.map((s: any, idx: number) => {
        const secId = s.id || `sec${idx}`;
        const edited = findEditable(s, idx);
        const userColor = edited?.color as string | undefined;
        const bgClass = userColor ? "" : colorForSection(s, idx);
        return (
          <div
              key={secId}
              ref={(el) => { sectionRefs.current[idx] = el; }}
            className={`absolute h-full pl-2 pr-4 flex items-center text-xs border-r border-border group text-white/90 ${
              selection.kind === "section" && selection.id === secId
                ? `${bgClass} outline outline-2 outline-primary/60`
                : bgClass
            }`}
            onClick={() => select("section", secId)}
            onDoubleClick={() => setEditingId(secId)}
            title={`${s.name}`}
          >
            {editingId === secId ? (
              <input
                ref={inputRef}
                className="bg-slate-900/70 border border-slate-600 rounded px-1 py-0.5 text-xs w-40"
                defaultValue={s.name || s.kind}
                onBlur={(e) => {
                  // Placeholder for name editing (not yet persisted to canonical timeline)
                  void e.target.value;
                  setEditingId(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") setEditingId(null);
                }}
              />
            ) : (
              <span className="truncate">{s.name || s.kind}</span>
            )}
            {/* Resize handle */}
            <div
              className="absolute top-0 right-0 h-full w-1.5 cursor-ew-resize bg-transparent group-hover:bg-slate-200/10"
              onMouseDown={(e) => onResize(s, e, containerRef.current)}
              title="Drag to resize section"
            />
            {/* Color palette (edit mode only) */}
            {editLayout && (
              <div className="absolute right-2 top-1 hidden group-hover:flex items-center gap-1">
                {HEX_PALETTE.map((hex) => (
                  <button
                    key={hex}
                    className={`w-3 h-3 rounded-full border border-white/40 ${
                      userColor === hex ? "ring-2 ring-white/70" : ""
                    }`}
                    title={hex}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      setSectionColor(s, idx, hex);
                    }}
                    ref={(el) => {
                      if (!el) return;
                      el.style.setProperty("--bg", hex);
                      el.style.backgroundColor = hex;
                    }}
                  />
                ))}
                <button
                  className="ml-1 text-[10px] px-1 py-0.5 rounded border border-white/30 bg-black/20"
                  title="Reset color"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    setSectionColor(s, idx, null);
                  }}
                >
                  Reset
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
