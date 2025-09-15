import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { postJSON, request, errorMessage } from "../lib/api";
import useSWRMutation from "swr/mutation";

export default function ImportPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
  const parseUrl = useMemo(() => `${apiBase}/legacy/lyrics/parse`, [apiBase]);
  const importLyricsUrl = useMemo(() => `${apiBase}/import/lyrics`, [apiBase]);
  const importMultiUrl = useMemo(() => `${apiBase}/import/multi`, [apiBase]);
  const importJsonUrl = useMemo(() => `${apiBase}/import/json`, [apiBase]);
  const { trigger: previewParse, isMutating: previewing } = useSWRMutation(
    importLyricsUrl,
    async (
      url: string,
      { arg }: { arg: { text: string; filename?: string } }
    ) => {
      const blob = new Blob([arg.text || ""], { type: "text/plain" });
      const fname = arg.filename || "preview.txt";
      const file = new File([blob], fname, { type: blob.type });
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(url, { method: "POST", body: fd });
      return res.json();
    }
  );
  const [preview, setPreview] = useState<{
    count: number;
    sample: string[];
    sampleTs: (number | null)[];
  } | null>(null);

  // Preview-and-edit state for multi-file imports (JSON, MIDI, TXT, etc.)
  type SongDraft = { title: string; artist: string; content: string };
  const [importedSongs, setImportedSongs] = useState<SongDraft[]>([]);
  const [importErrors, setImportErrors] = useState<string[] | null>(null);
  const [jsonPreview, setJsonPreview] = useState<any | null>(null);
  const [lyricsPreview, setLyricsPreview] = useState<any | null>(null);
  const [lyricsError, setLyricsError] = useState<string | null>(null);
  const [includeLyrics, setIncludeLyrics] = useState(true);
  const [barStart, setBarStart] = useState<"auto" | "zero">("auto");
  const combineUrl = useMemo(
    () => `${apiBase}/combine/jcrd-lyrics?save=true`,
    [apiBase]
  );
  const combinePreviewUrl = useMemo(
    () => `${apiBase}/combine/jcrd-lyrics?save=false`,
    [apiBase]
  );
  const [combinedPreview, setCombinedPreview] = useState<any | null>(null);
  const [lastCombinePayload, setLastCombinePayload] = useState<any | null>(
    null
  );
  const [showBarBeat, setShowBarBeat] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const v = window.localStorage.getItem("showBarBeat");
      if (v === "true") return true;
      if (v === "false") return false;
    }
    return true; // default to showing bar/beat hints
  });

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("showBarBeat", String(showBarBeat));
      }
    } catch {}
  }, [showBarBeat]);

  const fetchLyrics = async (title: string, artist: string) => {
    setLyricsError(null);
    try {
      const url = new URL(`${apiBase}/lyrics/search`);
      url.searchParams.set("title", title);
      url.searchParams.set("artist", artist);
      const res = await fetch(url.toString());
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Lyrics search failed");
      return data;
    } catch (e: any) {
      setLyricsError(e.message || String(e));
      return null;
    }
  };

  const onParse = async () => {
    try {
      // If no pasted text but files are selected (e.g., .json), route through /import/multi
      if ((!text || text.trim().length === 0) && files && files.length > 0) {
        setStatus("Importing selected files...");
        const fd = new FormData();
        Array.from(files).forEach((f: File) => fd.append("files", f));
        const r = await request<any>(apiBase + "/import/multi", {
          method: "POST",
          body: fd,
        });
        const songs = r?.songs || [];
        setStatus(`Imported ${songs.length} songs. Saving...`);
        for (const s of songs) {
          await postJSON(apiBase + "/songs", s);
        }
        setStatus("Saved.");
        return;
      }

      if (!text || text.trim().length === 0) {
        setStatus("Nothing to parse. Paste text or choose files.");
        return;
      }

      setStatus("Parsing pasted text...");
      const r = await request<any>(apiBase + "/parse", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: text,
      });
      const songs = r?.songs || [];
      setStatus(`Parsed ${songs.length} songs. Saving...`);
      for (const s of songs) {
        await postJSON(apiBase + "/songs", s);
      }
      setStatus("Saved.");
      // After saving parsed text, go to library
      router.push("/library");
    } catch (e: any) {
      setStatus("Error: " + errorMessage(e));
    }
  };

  // Auto-run combined preview whenever JSON preview is available or settings change
  useEffect(() => {
    if (jsonPreview?.preview) {
      onPreviewCombine();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jsonPreview?.preview, includeLyrics, lyricsPreview]);

  const onImportFile = async () => {
    if (!files || files.length === 0) return;
    try {
      // If any JSON files are selected, prefer the Combine & Save flow to preserve metadata
      const selected = Array.from(files);
      const jsonFiles = selected.filter((f) =>
        f.name.toLowerCase().endsWith(".json")
      );
      if (jsonFiles.length > 0) {
        setStatus(
          `Combining ${jsonFiles.length} JSON file(s) with lyrics (if available) and saving…`
        );
        let okCount = 0;
        let errCount = 0;
        for (const jf of jsonFiles) {
          try {
            const fdSingle = new FormData();
            fdSingle.append("file", jf);
            // Ask backend to inspect JSON and optionally fetch lyrics (non-destructive)
            const res = await fetch(
              importJsonUrl +
                `?include_lyrics=${includeLyrics ? "true" : "false"}`,
              { method: "POST", body: fdSingle }
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data?.detail || "JSON preview failed");
            const auto = (data && data.auto_combined) || null;
            const payload = {
              jcrd: data.preview,
              lyrics: { lines: (auto?.lines as any[]) || [] },
              title:
                data.summary?.title ||
                (jf.name || "Untitled").replace(/\.json$/i, ""),
              artist: data.summary?.artist || "",
              include_lyrics: includeLyrics,
            };
            await postJSON(combineUrl, payload);
            okCount++;
          } catch (e) {
            errCount++;
          }
        }
        setStatus(
          `Saved ${okCount} JSON song(s)` +
            (errCount ? `, ${errCount} failed` : "")
        );
        router.push("/library");
        return;
      }

      // Fallback for non-JSON: use mixed importer for MIDI/MP3/TXT/etc.
      setStatus("Uploading & parsing files…");
      const fd = new FormData();
      selected.forEach((f: File) => fd.append("files", f));
      const r = await request<any>(
        importMultiUrl + `?include_lyrics=${includeLyrics ? "true" : "false"}`,
        {
          method: "POST",
          body: fd,
        }
      );
      const songs = (r?.songs || []) as SongDraft[];
      setImportedSongs(songs);
      setImportErrors(r?.errors || null);
      setStatus(
        `Ready: ${songs.length} songs. Review & Edit below, then Save.`
      );
    } catch (e: any) {
      setStatus("Error: " + errorMessage(e));
    }
  };

  // One-click best-effort: get chords+lyrics, sync, and save
  const onAutoBuildBestEffort = async () => {
    try {
      setStatus("Building best-effort version…");
      // 1) If files selected, prefer Combine & Save for any JSONs; fallback to mixed importer for others
      if (files && files.length > 0) {
        const selected = Array.from(files);
        const jsonFiles = selected.filter((f) =>
          f.name.toLowerCase().endsWith(".json")
        );
        const otherFiles = selected.filter(
          (f) => !f.name.toLowerCase().endsWith(".json")
        );

        // Process JSONs via combine to preserve metadata
        let okCount = 0;
        for (const jf of jsonFiles) {
          try {
            const fdSingle = new FormData();
            fdSingle.append("file", jf);
            const res = await fetch(importJsonUrl + `?include_lyrics=true`, {
              method: "POST",
              body: fdSingle,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.detail || "JSON preview failed");
            const auto = (data && data.auto_combined) || null;
            const payload = {
              jcrd: data.preview,
              lyrics: { lines: (auto?.lines as any[]) || [] },
              title:
                data.summary?.title ||
                (jf.name || "Untitled").replace(/\.json$/i, ""),
              artist: data.summary?.artist || "",
              include_lyrics: true,
            };
            await postJSON(combineUrl, payload);
            okCount++;
          } catch {}
        }

        // Handle non-JSON via mixed importer
        if (otherFiles.length > 0) {
          const fd = new FormData();
          otherFiles.forEach((f: File) => fd.append("files", f));
          const r = await request<any>(
            importMultiUrl + `?include_lyrics=true`,
            {
              method: "POST",
              body: fd,
            }
          );
          const songs = (r?.songs || []) as SongDraft[];
          for (const s of songs) {
            await postJSON(apiBase + "/songs", s);
          }
          setStatus(`Built & saved ${okCount + songs.length} song(s).`);
        } else {
          setStatus(`Built & saved ${okCount} song(s).`);
        }
        router.push("/library");
        return;
      }
      // 2) If JSON preview exists (single file path), combine and save with include_lyrics=true
      if (jsonPreview?.preview) {
        const payload = {
          jcrd: jsonPreview.preview,
          lyrics: { lines: lyricsPreview?.lines || [] },
          title: jsonPreview.summary?.title || "Untitled",
          artist: jsonPreview.summary?.artist || "",
          include_lyrics: true,
        };
        const res = await postJSON(combineUrl, payload);
        setStatus(`Built & saved: ${res?.song?.id ?? "ok"}`);
        router.push("/library");
        return;
      }
      // 3) Fallback: pasted text -> parse & save
      if (text && text.trim().length > 0) {
        await onParse();
        return;
      }
      setStatus("Nothing to build. Upload files or paste/preview first.");
    } catch (e: any) {
      setStatus("Error: " + errorMessage(e));
    }
  };

  const onPreview = async () => {
    try {
      let payload = text;
      let fname: string | undefined = undefined;
      // If no pasted text, try to preview from the first selected text-lyrics file
      if (
        (!payload || payload.trim().length === 0) &&
        files &&
        files.length > 0
      ) {
        const first = (files[0] as File) || (Array.from(files) as File[])[0];
        const name = first.name.toLowerCase();
        if (name.endsWith(".json")) {
          const fd = new FormData();
          fd.append("file", first);
          const res = await fetch(
            importJsonUrl +
              `?include_lyrics=${includeLyrics ? "true" : "false"}`,
            { method: "POST", body: fd }
          );
          const data = await res.json();
          setJsonPreview(data);
          // Auto-populate lyricsPreview if backend auto_combined included lines
          const auto = (data && data.auto_combined) || null;
          if (auto && includeLyrics && Array.isArray(auto.lines)) {
            setLyricsPreview({
              lines: auto.lines.map((l: any) => ({
                ts_sec: l.ts_sec ?? null,
                text: l.text ?? "",
              })),
            });
          }
          if (auto && auto.content) {
            setCombinedPreview(auto);
          } else {
            setCombinedPreview(null);
          }
          setPreview(null);
          return;
        }
        const isTextLyrics = [".lrc", ".vtt", ".txt", ".csv"].some((ext) =>
          name.endsWith(ext)
        );
        if (isTextLyrics) {
          payload = await first.text();
          fname = first.name;
        }
      }
      const r = await previewParse({ text: payload || "", filename: fname });
      const lines = Array.isArray(r?.lines) ? r.lines : [];
      setJsonPreview(null);
      setPreview({
        count: lines.length,
        sample: lines.slice(0, 10).map((l: any) => l?.text ?? ""),
        sampleTs: lines
          .slice(0, 10)
          .map((l: any) => (typeof l?.ts === "number" ? l.ts : null)),
      });
    } catch (e) {
      setPreview({ count: 0, sample: [], sampleTs: [] });
    }
  };

  const onSaveAll = async () => {
    if (!importedSongs.length) return;
    try {
      setStatus("Saving songs...");
      for (const s of importedSongs) {
        await postJSON(apiBase + "/songs", s);
      }
      setStatus("Saved.");
      setImportedSongs([]);
      // Navigate to library after successful save
      router.push("/library");
    } catch (e: any) {
      setStatus("Error: " + errorMessage(e));
    }
  };

  const onAttachFetchedLyrics = async () => {
    try {
      if (!lyricsPreview || !jsonPreview?.summary?.title) return;
      const title = jsonPreview.summary.title as string;
      const artist = (jsonPreview.summary.artist || "") as string;
      const lines = (lyricsPreview.lines || []) as {
        ts_sec: number | null;
        text: string;
      }[];
      const content = lines
        .filter((l) => (l.text || "").trim().length > 0)
        .map((l) =>
          typeof l.ts_sec === "number"
            ? `[${l.ts_sec.toFixed(2)}] ${l.text}`
            : l.text
        )
        .join("\n");
      const song = await postJSON(apiBase + "/songs", {
        title,
        artist,
        content,
      });
      setStatus(`Created song #${song.id} with fetched lyrics`);
      router.push("/library");
    } catch (e: any) {
      setStatus("Error: " + errorMessage(e));
    }
  };

  const onCombineAndSave = async () => {
    try {
      if (!jsonPreview?.preview) return;
      const payload = {
        jcrd: jsonPreview.preview,
        lyrics: { lines: lyricsPreview?.lines || [] },
        title: jsonPreview.summary?.title || "Untitled",
        artist: jsonPreview.summary?.artist || "",
        include_lyrics: includeLyrics,
      };
      const res = await postJSON(combineUrl, payload);
      setStatus(`Combined and saved: ${res?.song?.id ?? "ok"}`);
      router.push("/library");
    } catch (e: any) {
      setStatus("Error: " + errorMessage(e));
    }
  };

  const onPreviewCombine = async () => {
    try {
      if (!jsonPreview?.preview) return;
      const payload = {
        jcrd: jsonPreview.preview,
        lyrics: { lines: lyricsPreview?.lines || [] },
        title: jsonPreview.summary?.title || "Untitled",
        artist: jsonPreview.summary?.artist || "",
        include_lyrics: includeLyrics,
      };
      setLastCombinePayload(payload);
      const res = await postJSON(combinePreviewUrl, {
        ...payload,
        bar_start: barStart,
      });
      setCombinedPreview(res);
      setStatus("Preview ready");
    } catch (e: any) {
      setStatus("Error: " + errorMessage(e));
      setCombinedPreview(null);
    }
  };

  const onSaveCombinedPreview = async () => {
    try {
      const payload =
        lastCombinePayload ||
        (jsonPreview?.preview && {
          jcrd: jsonPreview.preview,
          lyrics: { lines: lyricsPreview?.lines || [] },
          title: jsonPreview.summary?.title || "Untitled",
          artist: jsonPreview.summary?.artist || "",
          include_lyrics: includeLyrics,
        });
      if (!payload) return;
      const res = await postJSON(combineUrl, {
        ...payload,
        bar_start: barStart,
      });
      setStatus(`Saved: ${res?.song?.id ?? "ok"}`);
      router.push("/library");
    } catch (e: any) {
      setStatus("Error: " + errorMessage(e));
    }
  };

  return (
    <main className="min-h-screen p-[var(--spacing-lg)]">
      <div className="max-w-4xl mx-auto">
        <div className="card bg-[var(--cream)] text-[#111] rounded-[var(--radius-lg)]">
          <h2 className="font-typewriter text-black font-bold">
            Import
          </h2>
          <p className="mt-1 text-[#4b5563]">
            Upload lyrics, MIDI/JSON, or paste text. We’ll parse and save songs.
          </p>

          <section className="mt-4">
            <h3 className="font-typewriter text-black font-bold">Upload Files</h3>
            <input
              className="mt-2"
              type="file"
              multiple
              accept=".json,.mid,.midi,.mp3,.txt,.pro,.chordpro,.md,.lrc,.vtt,.csv"
              onChange={(e) => setFiles(e.target.files)}
            />
            <div className="text-sm mt-1 text-[#6b7280]">
              Supports .json, .mid/.midi, .mp3, .txt, .lrc, .vtt, .csv
            </div>
            <div className="mt-2">
              <button
                className="btn"
                disabled={!files || files.length === 0}
                onClick={onImportFile}
              >
                Import Files
              </button>
              <button className="btn ml-2"
                disabled={
                  !files ||
                  Array.from(files).filter((f) =>
                    f.name.toLowerCase().endsWith(".json")
                  ).length === 0
                }
                onClick={async () => {
                  // Reuse onImportFile which now prefers Combine for JSON
                  await onImportFile();
                }}
              >
                Import JSON (Combine & Save)
              </button>
              <button className="btn ml-2" onClick={onAutoBuildBestEffort}>
                Auto Build & Save (best effort)
              </button>
              {status && (
                <div className="mt-2 text-sm text-[#6b7280]">{status}</div>
              )}
              <div className="text-xs mt-2 text-[#9ca3af]">
                Tip: JSON chord files are combined and saved with metadata by
                default to prevent data loss.
              </div>
            </div>
          </section>

          <section className="mt-6">
            <h3 className="font-typewriter text-black font-bold">Paste Text</h3>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full mt-2 h-[200px] text-[#111] bg-white rounded-[var(--radius)]"
              placeholder="Paste songs here..."
            />
            <div className="mt-2 flex items-center gap-2">
              <button className="btn" onClick={onPreview} disabled={previewing}>
                {previewing ? "Previewing…" : "Preview"}
              </button>
              <button className="btn" onClick={onParse}>
                Parse & Save
              </button>
              <span className="text-sm text-[#6b7280]">{status}</span>
              {!text && files && files.length > 0 && (
                <span className="text-xs text-[#9ca3af]">Tip: With no pasted text, Parse & Save will import selected files.</span>
              )}
            </div>
          </section>

          {preview && (
            <div className="card mt-4 bg-white text-[#111]">
              {preview.count > 0 ? (
                <>
                  <div className="mb-2">Lines parsed: {preview.count}</div>
                  <ul className="list-none p-0 m-0">
                    {preview.sample.map((t, i) => (
                      <li key={i} className="text-sm text-[#4b5563]">
                        {i + 1}.{" "}
                        {preview.sampleTs[i] !== null
                          ? `[${preview.sampleTs[i]}] `
                          : ""}
                        {t}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <div className="text-sm text-[#6b7280]">No previewable lines for this input.</div>
              )}
            </div>
          )}

          {jsonPreview && (
            <div className="card mt-4 bg-white text-[#111]">
              <div className="mb-2 font-typewriter text-black font-bold">JSON preview</div>
              <div className="text-sm text-[#4b5563]">File: {jsonPreview?.filename} • Size: {jsonPreview?.size_bytes} bytes</div>
              <div className="mt-2 text-sm">Summary:</div>
              <pre className="mt-1 text-xs overflow-auto max-h-[240px]">
                {JSON.stringify(jsonPreview?.summary, null, 2)}
              </pre>
              <div className="mt-2 flex items-center gap-4">
                <input
                  id="includeLyrics"
                  type="checkbox"
                  checked={includeLyrics}
                  onChange={(e) => setIncludeLyrics(e.target.checked)}
                />
                <label htmlFor="includeLyrics" className="text-sm">
                  Include lyrics (auto-fetch on import)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="showBarBeat"
                    type="checkbox"
                    checked={showBarBeat}
                    onChange={(e) => setShowBarBeat(e.target.checked)}
                  />
                  <label htmlFor="showBarBeat" className="text-sm">
                    Show bar/beat hints
                  </label>
                </div>
                {/* Hidden/advanced: bar start mode; keep default to auto */}
                <div className="hidden items-center gap-2">
                  <label className="text-sm">Bar start:</label>
                  <select
                    value={barStart}
                    onChange={(e) => setBarStart(e.target.value as any)}
                    className="text-sm"
                  >
                    <option value="auto">Auto</option>
                    <option value="zero">Zero</option>
                  </select>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <button className="btn" onClick={onPreviewCombine}>
                  Preview Combined
                </button>
                <button className="btn" onClick={onSaveCombinedPreview}>
                  Save Combined
                </button>
              </div>
              {jsonPreview?.summary?.title && (
                <div className="mt-3">
                  <button
                    className="btn"
                    onClick={async () => {
                      const data = await fetchLyrics(
                        jsonPreview.summary.title,
                        jsonPreview.summary.artist || ""
                      );
                      if (data) setLyricsPreview(data);
                    }}
                  >
                    Fetch Timestamped Lyrics
                  </button>
                  {lyricsError && <div className="text-sm mt-2 text-[#b91c1c]">{lyricsError}</div>}
                  {lyricsPreview && (
                    <div className="mt-2 text-sm">
                      <div>
                        Matched: <b>{String(lyricsPreview.matched)}</b>, Synced:{" "}
                        <b>{String(lyricsPreview.synced)}</b>
                      </div>
                      <pre className="mt-2 p-3 rounded-lg bg-black/80 text-white overflow-auto text-xs max-h-64">
                        {JSON.stringify(
                          (lyricsPreview.lines || []).slice(0, 30),
                          null,
                          2
                        )}
                      </pre>
                      <div className="mt-2">
                        <button className="btn" onClick={onAttachFetchedLyrics}>
                          Save as New Song
                        </button>
                        <button className="btn ml-2" onClick={onCombineAndSave}>Combine Chords + Lyrics & Save</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {combinedPreview?.content && (
                <div className="mt-3">
                  <div className="text-sm font-medium">
                    Combined master preview
                  </div>
                  <pre className="mt-2 p-3 rounded-lg bg-black/80 text-white overflow-auto text-xs max-h-80">
                    {(() => {
                      if (
                        !showBarBeat ||
                        !Array.isArray(combinedPreview?.lines)
                      ) {
                        return combinedPreview.content;
                      }
                      try {
                        const lines = combinedPreview.lines as Array<any>;
                        const out: string[] = [];
                        for (const cl of lines) {
                          const chords = Array.isArray(cl?.chords)
                            ? cl.chords
                            : [];
                          const header = chords
                            .filter((c: any) => c && c.chord)
                            .map((c: any) => {
                              const chord = String(c.chord);
                              const b =
                                typeof c.bar === "number" ? c.bar : null;
                              const bi =
                                typeof c.beat_in_bar === "number"
                                  ? c.beat_in_bar
                                  : null;
                              if (b && bi !== null)
                                return `${chord} (${b}:${(bi as number).toFixed(
                                  1
                                )})`;
                              return chord;
                            })
                            .join("  ");
                          if (header) out.push(header);
                          const text = String(cl?.text ?? "");
                          out.push(text);
                        }
                        return out.join("\n");
                      } catch {
                        return combinedPreview.content;
                      }
                    })()}
                  </pre>
                </div>
              )}
            </div>
          )}

          {importedSongs.length > 0 && (
            <div className="card mt-4 bg-white text-[#111]">
              <div className="mb-2 font-typewriter text-black font-bold">Review & Edit</div>
              {importErrors && (
                <div className="text-sm mb-2 text-[#b91c1c]">
                  {importErrors.join("; ")}
                </div>
              )}
              <div className="space-y-4">
                {importedSongs.map((s, idx) => (
                  <div key={idx} className="border border-border rounded p-3">
                    <div className="grid gap-2 grid-cols-2">
                      <div>
                        <label htmlFor={`title-${idx}`} className="block text-xs text-gray-500">Title</label>
                        <input
                          id={`title-${idx}`}
                          className="w-full bg-[#fafafa] text-[#111] rounded-[var(--radius)] p-2"
                          value={s.title}
                          onChange={(e) => {
                            const v = e.target.value;
                            setImportedSongs((prev) =>
                              prev.map((it, i) =>
                                i === idx ? { ...it, title: v } : it
                              )
                            );
                          }}
                        />
                      </div>
                      <div>
                        <label htmlFor={`artist-${idx}`} className="block text-xs text-gray-500">Artist</label>
                        <input
                          id={`artist-${idx}`}
                          className="w-full bg-[#fafafa] text-[#111] rounded-[var(--radius)] p-2"
                          value={s.artist}
                          onChange={(e) => {
                            const v = e.target.value;
                            setImportedSongs((prev) =>
                              prev.map((it, i) =>
                                i === idx ? { ...it, artist: v } : it
                              )
                            );
                          }}
                        />
                      </div>
                    </div>
                    <div className="mt-2">
                      <label className="block text-xs text-gray-500">
                        Content
                      </label>
                      <textarea
                        id={`content-${idx}`}
                        className="w-full mt-1 h-[120px] bg-[#fafafa] text-[#111] rounded-[var(--radius)] p-2"
                        value={s.content}
                        onChange={(e) => {
                          const v = e.target.value;
                          setImportedSongs((prev) =>
                            prev.map((it, i) =>
                              i === idx ? { ...it, content: v } : it
                            )
                          );
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <button className="btn" onClick={onSaveAll}>
                  Save All
                </button>
                <button className="btn ml-2" onClick={() => router.push("/library")}>Go to Library</button>
                <button className="btn ml-2" onClick={() => router.push("/")}>Back to Home</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
