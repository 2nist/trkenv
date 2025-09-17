"use client";
import React from "react";
import { SectionsLane } from "@/components/timeline/SectionsLane";
import { BarRuler } from "@/components/timeline/BarRuler";
import { useTimelineStore } from "@/lib/timelineStore";
import { computeLastBeat } from "@/lib/timelineUtils";
import { SectionProgressions } from "@/components/timeline/SectionProgressions";
import { cleanupSections } from "@/lib/harmony";
import { SectionFocusEditor } from "@/components/timeline/SectionFocusEditor";

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed top-4 right-4 bg-slate-800/95 text-[11px] text-slate-100 px-3 py-2 rounded shadow border border-slate-600 z-50">
      {message}
    </div>
  );
}

export function TimelineHeader({
  meta,
}: {
  meta?: {
    title?: string;
    artist?: string;
    timeSignature?: string;
    bpm?: number;
  } | null;
}) {
  const {
    sections,
    zoom,
    setZoom,
    saveDraftChanges,
    songId,
    beatsPerLine,
    setBeatsPerLine,
    snap,
    setSnap,
    editLayout,
    toggleEditLayout,
    timeline,
    warnings,
    help,
    toggleHelp,
  } = useTimelineStore((s) => ({
    sections: s.sections,
    zoom: s.zoom,
    setZoom: s.setZoom,
    saveDraftChanges: s.saveDraftChanges,
    songId: s.songId,
    beatsPerLine: s.beatsPerLine,
    setBeatsPerLine: s.setBeatsPerLine,
    snap: s.snap,
    setSnap: s.setSnap,
    editLayout: s.editLayout,
    toggleEditLayout: s.toggleEditLayout,
    timeline: s.timeline,
    warnings: s.warnings,
    help: s.help,
    toggleHelp: s.toggleHelp,
  }));
  const [saving, setSaving] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);
  const [showCleanup, setShowCleanup] = React.useState(false);
  const [focusMode, setFocusMode] = React.useState(false);
  const [showDebug, setShowDebug] = React.useState(false);
  const [cleanupPreview, setCleanupPreview] = React.useState<null | {
    changes: { kind: string; detail: string }[];
    notes: string[];
    apply: () => void;
  }>(null);
  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };
  const onSave = async () => {
    setSaving(true);
    try {
      const payload = saveDraftChanges();
      const res = await fetch(`/v1/songs/${songId}/drafts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      triggerToast("Draft saved");
    } catch (e) {
      console.error(e);
      triggerToast("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const runCleanup = () => {
    const state = useTimelineStore.getState();
    const { sections, chords } = state;
    const {
      sections: cleaned,
      changes,
      notes,
    } = cleanupSections(sections as any, chords as any, { minBeats: 16 });
    setCleanupPreview({
      changes,
      notes,
      apply: () => {
        state.setData({ sections: cleaned });
        triggerToast("Sections cleaned");
        setCleanupPreview(null);
        setShowCleanup(false);
      },
    });
    setShowCleanup(true);
  };

  const totalBeats = React.useMemo(() => {
    if (timeline) return computeLastBeat(timeline) + 4; // pad a bar
    if (sections.length) {
      const last = sections[sections.length - 1];
      return last.startBeat + last.lengthBeats + 4;
    }
    return 32;
  }, [timeline, sections]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold">{meta?.title || "Timeline"}</h1>
        <span className="text-xs text-muted-foreground">
          {meta?.artist ? `— ${meta.artist}` : ""}
        </span>
        <span className="text-xs text-muted-foreground">
          {(timeline?.timeSigDefault?.num || 4) +
            "/" +
            (timeline?.timeSigDefault?.den || 4)}
          {" • "}
          {(timeline?.tempoMap?.[0]?.bpm ||
            timeline?.bpmDefault ||
            meta?.bpm ||
            120) + " bpm"}
          {timeline?.key ? ` • Key ${timeline.key}` : ""}
        </span>
        {warnings.length > 0 && (
          <span
            className="text-[10px] px-2 py-0.5 rounded bg-red-700/70 text-red-100 border border-red-400/40"
            title={warnings.map((w) => w.message).join("\n")}
          >
            ⚠︎ {warnings.length}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowDebug((v) => !v)}
            className={`text-xs px-2 py-1 rounded border ${
              showDebug
                ? "bg-slate-600 border-slate-400"
                : "bg-slate-800 border-slate-600"
            }`}
            title="Toggle timeline debug JSON"
          >
            {showDebug ? "Debug✓" : "Debug"}
          </button>
          <label className="text-xs">Zoom</label>
          <input
            type="range"
            min={4}
            max={48}
            step={1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
          <select
            className="text-xs bg-slate-800 border border-slate-600 rounded px-1 py-0.5"
            value={beatsPerLine}
            onChange={(e) => setBeatsPerLine(parseInt(e.target.value))}
            title="Beats per line"
          >
            {[8, 12, 16, 32].map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <select
            className="text-xs bg-slate-800 border border-slate-600 rounded px-1 py-0.5"
            value={snap}
            onChange={(e) => setSnap(parseFloat(e.target.value))}
            title="Snap interval"
          >
            {[0.25, 0.125, 0.0625].map((v) => (
              <option key={v} value={v}>
                {v === 0.25 ? "1/4" : v === 0.125 ? "1/8" : "1/16"}
              </option>
            ))}
          </select>
          <button
            onClick={toggleHelp}
            className={`text-xs px-2 py-1 rounded border ${
              help
                ? "bg-slate-600 border-slate-400"
                : "bg-slate-800 border-slate-600"
            }`}
          >
            Help {help ? "on" : "off"}
          </button>
          <button
            onClick={toggleEditLayout}
            className={`text-xs px-2 py-1 rounded ${
              editLayout
                ? "bg-teal-600 hover:bg-teal-500"
                : "bg-teal-700/40 hover:bg-teal-600"
            }`}
            title="Toggle editing"
          >
            {editLayout ? "Editing" : "Edit"}
          </button>
          <button
            onClick={runCleanup}
            className="text-xs px-2 py-1 rounded bg-amber-600 hover:bg-amber-500"
          >
            Clean Sections
          </button>
          <button
            onClick={() => setFocusMode((v) => !v)}
            className="text-xs px-2 py-1 rounded bg-teal-600 hover:bg-teal-500"
          >
            {focusMode ? "Timeline" : "Focus"}
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="text-xs px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Draft"}
          </button>
        </div>
      </div>
      {!focusMode && (
        <div className="space-y-1 overflow-x-auto">
          <SectionsLane />
          <BarRuler totalBeats={totalBeats} beatsPerBar={4} />
          <SectionProgressions />
        </div>
      )}
      {focusMode && (
        <div className="mt-3">
          <SectionFocusEditor />
        </div>
      )}
      {showCleanup && cleanupPreview && (
        <div className="mt-2 border border-amber-500/40 bg-amber-900/30 rounded p-2 text-[11px] space-y-1">
          <div className="flex items-center gap-2">
            <strong className="text-amber-300">Section Cleanup Preview</strong>
            <button
              className="ml-auto px-2 py-0.5 rounded bg-amber-700 hover:bg-amber-600 text-xs"
              onClick={cleanupPreview.apply}
            >
              Apply
            </button>
            <button
              className="px-2 py-0.5 rounded border border-amber-600 text-xs"
              onClick={() => {
                setShowCleanup(false);
                setCleanupPreview(null);
              }}
            >
              Close
            </button>
          </div>
          {cleanupPreview.notes.map((n, i) => (
            <div key={i} className="text-amber-200">
              {n}
            </div>
          ))}
          <ul className="list-disc ml-4 space-y-0.5 text-amber-100">
            {cleanupPreview.changes.length === 0 && (
              <li>No changes suggested</li>
            )}
            {cleanupPreview.changes.map((c, i) => (
              <li key={i}>
                {c.kind}: {c.detail}
              </li>
            ))}
          </ul>
        </div>
      )}
      {toast && <Toast message={toast} />}
      {showDebug && (
        <pre className="mt-2 max-h-72 overflow-auto text-[10px] bg-slate-900/70 border border-slate-600 rounded p-2">
          {JSON.stringify(timeline, null, 2)}
        </pre>
      )}
    </div>
  );
}
