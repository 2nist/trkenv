"use client";
import React from "react";
import { useTimelineStore } from "@/lib/timelineStore";
import {
  PROGRESSIONS,
  degreesToChordSymbols,
  distributeBeats,
  tritoneSub,
  secondaryDominants,
  modalInterchange,
  SONG_TEMPLATES,
  buildFromTemplate,
  detectProgressionForSection,
  detectKeyForChords,
  KEYS,
  semitoneDelta,
  transposeChordsBy,
} from "@/lib/harmony";
import { ChordShapesPopover } from "./ChordShapesPopover";
import { FEATURE_PROG_MATCH, FEATURE_CADENCE_TAGS } from "@/lib/featureFlags";
import { analyzeSection } from "@/lib/analysis";

export function InspectorPanel() {
  const {
    selection,
    sections,
    chords,
    lyrics,
    zoom,
    setZoom,
    snap,
    setSnap,
    updateItem,
  } = useTimelineStore((s) => ({
    selection: s.selection,
    sections: s.sections,
    chords: s.chords,
    lyrics: s.lyrics,
    zoom: s.zoom,
    setZoom: s.setZoom,
    snap: s.snap,
    setSnap: s.setSnap,
    updateItem: s.updateItem,
  }));

  const sel = React.useMemo(() => {
    if (!selection.kind || !selection.id) return null;
    const map: any = {
      section: sections.find((x) => x.id === selection.id),
      chord: chords.find((x) => x.id === selection.id),
      lyric: lyrics.find((x) => x.id === selection.id),
    };
    return map[selection.kind] || null;
  }, [selection, sections, chords, lyrics]);

  const [progKey, setProgKey] = React.useState<string>("C");
  const [progMode, setProgMode] = React.useState<"major" | "minor">("major");
  const [progId, setProgId] = React.useState<string>(PROGRESSIONS[0]?.id || "");
  const selectedProgression = React.useMemo(
    () => PROGRESSIONS.find((p) => p.id === progId) || PROGRESSIONS[0],
    [progId]
  );

  // Detect main progression & cadence for the selected section
  const detection = React.useMemo(() => {
    if (selection.kind !== "section" || !sel) return null;
    return detectProgressionForSection(
      progKey,
      progMode,
      (sel as any).startBeat,
      (sel as any).lengthBeats,
      chords
    );
  }, [selection.kind, sel, progKey, progMode, chords]);

  // Global key detection for entire song chords
  const keyDetection = React.useMemo(
    () => detectKeyForChords(chords),
    [chords]
  );

  // 2nist analysis (guarded by flags)
  const twonist = React.useMemo(() => {
    if (selection.kind !== "section" || !sel) return null;
    if (!(FEATURE_PROG_MATCH || FEATURE_CADENCE_TAGS)) return null;
    const kd = keyDetection || { key: progKey, mode: progMode };
    try {
      return analyzeSection(
        kd.key,
        (kd as any).mode,
        {
          startBeat: (sel as any).startBeat,
          lengthBeats: (sel as any).lengthBeats,
        },
        chords
      );
    } catch {
      return null;
    }
  }, [selection.kind, sel, chords, keyDetection, progKey, progMode]);

  const [showCadences, setShowCadences] = React.useState(true);

  return (
    <div className="sticky top-4 space-y-3">
      <div className="rounded border border-border bg-slate-900/70 p-3">
        <div className="font-medium text-sm mb-2">Controls</div>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <label className="w-16">Zoom</label>
            <input
              type="range"
              min={4}
              max={48}
              step={1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            />
            <span className="tabular-nums w-8 text-right">{zoom}</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="w-16">Snap</label>
            <select
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1"
              value={snap}
              onChange={(e) => setSnap(Number(e.target.value))}
            >
              {[0.25, 0.5, 1, 2, 4].map((v) => (
                <option key={v} value={v}>
                  {v} beat{v !== 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="rounded border border-border bg-slate-900/70 p-3">
        <div className="font-medium text-sm mb-2">Selection</div>
        {!selection.kind && (
          <div className="text-xs text-slate-500">Nothing selected</div>
        )}
        {selection.kind && (
          <div className="text-xs space-y-2">
            <div>
              <span className="text-slate-400">Type:</span> {selection.kind}
            </div>
            {selection.kind === "section" && sel && (
              <div className="space-y-2">
                <label className="block">
                  <span className="text-slate-400 mr-2">Name</span>
                  <input
                    className="bg-slate-800 border border-slate-700 rounded px-2 py-1 w-full"
                    defaultValue={(sel as any).name}
                    onBlur={(e) =>
                      updateItem("section", (sel as any).id, {
                        name: e.target.value,
                      })
                    }
                  />
                </label>
                <label className="block">
                  <span className="text-slate-400 mr-2">Length (beats)</span>
                  <input
                    type="number"
                    min={1}
                    step={snap}
                    className="bg-slate-800 border border-slate-700 rounded px-2 py-1 w-full"
                    defaultValue={(sel as any).lengthBeats}
                    onBlur={(e) =>
                      updateItem("section", (sel as any).id, {
                        lengthBeats: Number(e.target.value),
                      })
                    }
                  />
                </label>
                {detection && (
                  <div className="mt-3 space-y-2">
                    <div className="text-[11px] text-slate-400">Detected</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded border border-slate-700 p-2">
                        <div className="text-slate-400 mb-1">
                          Main progression
                        </div>
                        {detection.main ? (
                          <div>
                            <div>{detection.main.name}</div>
                            <div className="text-slate-500">
                              conf{" "}
                              {Math.round(
                                (detection.main.confidence || 0) * 100
                              )}
                              %
                            </div>
                            <button
                              className="mt-2 px-2 py-1 rounded border border-slate-600"
                              onClick={() =>
                                updateItem("section", (sel as any).id, {
                                  progressionMeta: {
                                    ...(sel as any).progressionMeta,
                                    main: {
                                      presetId: detection.main!.presetId,
                                      confidence: detection.main!.confidence,
                                      startIndex: detection.main!.startIndex,
                                      userLocked: true,
                                    },
                                  },
                                })
                              }
                            >
                              Set as main
                            </button>
                          </div>
                        ) : (
                          <div className="text-slate-500">No match</div>
                        )}
                      </div>
                      <div className="rounded border border-slate-700 p-2">
                        <div className="text-slate-400 mb-1">Cadence</div>
                        {detection.cadence ? (
                          <div>
                            <div>{detection.cadence.name}</div>
                            <div className="text-slate-500">
                              conf{" "}
                              {Math.round(
                                (detection.cadence.confidence || 0) * 100
                              )}
                              %
                            </div>
                            <button
                              className="mt-2 px-2 py-1 rounded border border-slate-600"
                              onClick={() =>
                                updateItem("section", (sel as any).id, {
                                  progressionMeta: {
                                    ...(sel as any).progressionMeta,
                                    cadence: {
                                      presetId: detection.cadence!.presetId,
                                      degrees: undefined,
                                      kind: undefined,
                                    },
                                  },
                                })
                              }
                            >
                              Set cadence
                            </button>
                          </div>
                        ) : (
                          <div className="text-slate-500">No match</div>
                        )}
                      </div>
                    </div>
                    {detection.intro && (
                      <div className="rounded border border-slate-700 p-2 text-xs">
                        <div className="text-slate-400 mb-1">Intro</div>
                        <div>
                          Prelude length: {detection.intro.lengthBeats} beats
                        </div>
                        <button
                          className="mt-2 px-2 py-1 rounded border border-slate-600"
                          onClick={() =>
                            updateItem("section", (sel as any).id, {
                              progressionMeta: {
                                ...(sel as any).progressionMeta,
                                intro: {
                                  lengthBeats: detection.intro!.lengthBeats,
                                  kind: "intro",
                                },
                              },
                            })
                          }
                        >
                          Mark prelude as intro
                        </button>
                      </div>
                    )}
                    {(sel as any).progressionMeta && (
                      <div className="rounded border border-slate-700 p-2 text-xs">
                        <div className="text-slate-400 mb-1">
                          Section progression
                        </div>
                        <pre className="whitespace-pre-wrap break-words text-[11px] text-slate-300">
                          {JSON.stringify(
                            (sel as any).progressionMeta,
                            null,
                            2
                          )}
                        </pre>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-slate-400">Transition</span>
                          <select
                            className="bg-slate-800 border border-slate-700 rounded px-2 py-1"
                            value={
                              (sel as any).progressionMeta?.transition?.kind ||
                              "none"
                            }
                            onChange={(e) =>
                              updateItem("section", (sel as any).id, {
                                progressionMeta: {
                                  ...(sel as any).progressionMeta,
                                  transition: { kind: e.target.value },
                                },
                              })
                            }
                          >
                            {(
                              ["none", "half-cadence", "modulation"] as const
                            ).map((k) => (
                              <option key={k} value={k}>
                                {k}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {selection.kind === "chord" && sel && (
              <div className="space-y-2">
                <label className="block">
                  <span className="text-slate-400 mr-2">Chord</span>
                  <input
                    className="bg-slate-800 border border-slate-700 rounded px-2 py-1 w-full"
                    defaultValue={(sel as any).symbol}
                    onBlur={(e) =>
                      updateItem("chord", (sel as any).id, {
                        symbol: e.target.value,
                      })
                    }
                  />
                </label>
                <label className="block">
                  <span className="text-slate-400 mr-2">Start (beat)</span>
                  <input
                    type="number"
                    step={snap}
                    min={0}
                    className="bg-slate-800 border border-slate-700 rounded px-2 py-1 w-full"
                    defaultValue={(sel as any).startBeat}
                    onBlur={(e) =>
                      updateItem("chord", (sel as any).id, {
                        startBeat: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <div className="flex items-center gap-2">
                  <ChordShapesPopover symbol={(sel as any).symbol} />
                </div>
                <div className="text-[11px] text-slate-400 mt-2">
                  Functional suggestions:
                </div>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    const out: Array<{ label: string; symbol: string }> = [];
                    const tri = tritoneSub((sel as any).symbol);
                    if (tri) out.push({ label: "Tritone", symbol: tri });
                    secondaryDominants(progKey, progMode).forEach((x) =>
                      out.push(x)
                    );
                    modalInterchange(progKey, progMode).forEach((x) =>
                      out.push(x)
                    );
                    return out;
                  })().map((opt, i) => (
                    <button
                      key={`${opt.symbol}_${i}`}
                      className="px-2 py-0.5 rounded border border-slate-600 hover:bg-slate-800"
                      title={opt.label}
                      onClick={() =>
                        updateItem("chord", (sel as any).id, {
                          symbol: opt.symbol,
                        })
                      }
                    >
                      {opt.symbol}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {selection.kind === "lyric" && sel && (
              <div className="space-y-2">
                <label className="block">
                  <span className="text-slate-400 mr-2">Text</span>
                  <input
                    className="bg-slate-800 border border-slate-700 rounded px-2 py-1 w-full"
                    defaultValue={(sel as any).text}
                    onBlur={(e) =>
                      updateItem("lyric", (sel as any).id, {
                        text: e.target.value,
                      })
                    }
                  />
                </label>
                <label className="block">
                  <span className="text-slate-400 mr-2">Beat</span>
                  <input
                    type="number"
                    step={snap}
                    min={0}
                    className="bg-slate-800 border border-slate-700 rounded px-2 py-1 w-full"
                    defaultValue={(sel as any).beat}
                    onBlur={(e) =>
                      updateItem("lyric", (sel as any).id, {
                        beat: Number(e.target.value),
                      })
                    }
                  />
                </label>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded border border-border bg-slate-900/70 p-3">
        <div className="font-medium text-sm mb-2">Key & Transpose</div>
        <div className="text-xs space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Detected</span>
            <span>
              {keyDetection
                ? `${keyDetection.key} ${keyDetection.mode} (conf ${Math.round(
                    (keyDetection.confidence || 0) * 100
                  )}%)`
                : "–"}
            </span>
            <button
              className="ml-auto px-2 py-1 rounded border border-slate-600"
              onClick={() => {
                if (!keyDetection) return;
                setProgKey(keyDetection.key);
                setProgMode(keyDetection.mode);
              }}
            >
              Use detected as target
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="flex items-center gap-2 col-span-1">
              <span className="text-slate-400">Target key</span>
            </label>
            <div className="col-span-2 flex items-center gap-2">
              <select
                className="bg-slate-800 border border-slate-700 rounded px-2 py-1"
                value={progKey}
                onChange={(e) => setProgKey(e.target.value)}
              >
                {KEYS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
              <select
                className="bg-slate-800 border border-slate-700 rounded px-2 py-1"
                value={progMode}
                onChange={(e) => setProgMode(e.target.value as any)}
              >
                <option value="major">major</option>
                <option value="minor">minor</option>
              </select>
              <button
                className="px-2 py-1 rounded border border-slate-600"
                title="Transpose all chords from detected key to selected key"
                onClick={() => {
                  if (!keyDetection) return;
                  const delta = semitoneDelta(keyDetection.key, progKey);
                  const next = transposeChordsBy(chords, delta);
                  (useTimelineStore as any).setState?.({ chords: next });
                }}
              >
                Transpose to selected key
              </button>
            </div>
          </div>
        </div>
      </div>

      {(FEATURE_PROG_MATCH || FEATURE_CADENCE_TAGS) && (
        <div className="rounded border border-border bg-slate-900/70 p-3">
          <div className="font-medium text-sm mb-2">2nist Analysis</div>
          {!twonist && (
            <div className="text-xs text-slate-500">No data for selection</div>
          )}
          {twonist && (
            <div className="space-y-3 text-xs">
              {FEATURE_PROG_MATCH && (
                <div>
                  <div className="text-slate-400 mb-1">Progression blocks</div>
                  <div className="flex flex-wrap gap-2">
                    {twonist.progressions.map((p, i) => (
                      <span
                        key={i}
                        className="flex items-center gap-2 px-2 py-0.5 rounded border border-slate-700"
                      >
                        <span>
                          {p.name} ({Math.round(p.confidence * 100)}%)
                        </span>
                        <button
                          className="px-1.5 py-0.5 rounded border border-slate-600"
                          title="Apply as main progression"
                          onClick={() =>
                            updateItem("section", (sel as any).id, {
                              progressionMeta: {
                                ...(sel as any).progressionMeta,
                                main: {
                                  presetId: p.pattern_id,
                                  confidence: p.confidence,
                                  startIndex: 0,
                                  userLocked: true,
                                },
                              },
                            })
                          }
                        >
                          Apply
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {FEATURE_CADENCE_TAGS && (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-slate-400">Cadences</span>
                    <label className="ml-auto flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={showCadences}
                        onChange={(e) => setShowCadences(e.target.checked)}
                      />
                      <span>Show</span>
                    </label>
                  </div>
                  {showCadences && (
                    <div className="flex flex-wrap gap-2">
                      {twonist.cadences.map((c, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded border border-slate-700"
                        >
                          {c.type} @ {Math.round(c.time)} (
                          {Math.round(c.confidence * 100)}%)
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="rounded border border-border bg-slate-900/70 p-3">
        <div className="font-medium text-sm mb-2">Progressions</div>
        <div className="grid grid-cols-3 gap-2 text-xs mb-2">
          <label className="flex items-center gap-2">
            <span className="text-slate-400">Key</span>
            <select
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1"
              value={progKey}
              onChange={(e) => setProgKey(e.target.value)}
            >
              {[
                "C",
                "C#",
                "D",
                "D#",
                "E",
                "F",
                "F#",
                "G",
                "G#",
                "A",
                "A#",
                "B",
              ].map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-slate-400">Mode</span>
            <select
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1"
              value={progMode}
              onChange={(e) => setProgMode(e.target.value as any)}
            >
              <option value="major">major</option>
              <option value="minor">minor</option>
            </select>
          </label>
          <label className="flex items-center gap-2 col-span-3">
            <span className="text-slate-400">Preset</span>
            <select
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 w-full"
              value={progId}
              onChange={(e) => setProgId(e.target.value)}
            >
              {PROGRESSIONS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.degrees.join("-")})
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          className="px-2 py-1 rounded border border-slate-600 text-xs"
          onClick={() => {
            if (!selectedProgression) return;
            const sec =
              (selection.kind === "section" && sel) || sections[0] || null;
            if (!sec) return;
            const symbols = degreesToChordSymbols(
              progKey,
              progMode,
              selectedProgression.degrees
            );
            const starts = distributeBeats(sec.lengthBeats, symbols.length);
            const now = Date.now();
            const base = (useTimelineStore as any).getState?.();
            const next = (base?.chords || []).slice();
            symbols.forEach((sym, i) => {
              next.push({
                id: `gen_${sec.id}_${now}_${i}`,
                symbol: sym,
                startBeat: sec.startBeat + (starts[i] || 0),
              });
            });
            (useTimelineStore as any).setState?.({ chords: next });
          }}
        >
          Insert progression into section
        </button>
      </div>

      <div className="rounded border border-border bg-slate-900/70 p-3">
        <div className="font-medium text-sm mb-2">Templates</div>
        <div className="grid grid-cols-3 gap-2 text-xs mb-2">
          <label className="flex items-center gap-2 col-span-3">
            <span className="text-slate-400">Preset</span>
            <select
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 w-full"
              id="tmpl-select"
            >
              {SONG_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          className="px-2 py-1 rounded border border-slate-600 text-xs"
          onClick={() => {
            const selEl = document.getElementById(
              "tmpl-select"
            ) as HTMLSelectElement | null;
            const tmpl =
              SONG_TEMPLATES.find((t) => t.id === selEl?.value) ||
              SONG_TEMPLATES[0];
            if (!tmpl) return;
            const built = buildFromTemplate(progKey, progMode, tmpl);
            (useTimelineStore as any).setState?.({
              sections: built.sections,
              chords: built.chords,
            });
          }}
        >
          Create from template
        </button>
      </div>

      <div className="rounded border border-border bg-slate-900/70 p-3">
        <div className="font-medium text-sm mb-2">Transport</div>
        <div className="flex items-center gap-2 text-xs">
          <button className="px-2 py-1 rounded border border-slate-600">
            Play
          </button>
          <button className="px-2 py-1 rounded border border-slate-600">
            Stop
          </button>
          <button className="px-2 py-1 rounded border border-slate-600">
            Loop
          </button>
        </div>
      </div>
    </div>
  );
}
