import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import useSWR from "swr";
import { swrFetcher } from "@/lib/api";
import { SectionRail } from "@/components/SectionRail";
import { ChordLane } from "@/components/ChordLane";
import { BarRuler } from "@/components/BarRuler";
import { LyricLane } from "@/components/LyricLane";
import TimelineFooter from "@/components/timeline/TimelineFooter";
import dynamic from 'next/dynamic'

const LrcAttachButton = dynamic(() => import('@/src/components/LrcAttachButton').then(m => m.default), { ssr: false })

const SongPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

  const [zoom, setZoom] = useState(8); // px per beat
  const [playhead, setPlayhead] = useState(0); // Current playhead position in beats
  const [itemHeight, setItemHeight] = useState(32);
  const [isDragging, setIsDragging] = useState(false);
  const [lastInteractionX, setLastInteractionX] = useState(0);

  const url = useMemo(() => {
    if (!id) return null;
    const sid = Array.isArray(id) ? id[0] : id;
    return `${apiBase}/v1/songs/${sid}/doc`;
  }, [id, apiBase]);

  const { data, error, isLoading, mutate } = useSWR(url, swrFetcher);

  const doc = data as any;
  const sections = useMemo(() => doc?.sections || [], [doc]);
  const chords = useMemo(() => (doc?.chords || []) as { symbol: string; startBeat: number }[], [doc]);
  const lyrics = useMemo(() => (doc?.lyrics || []) as { text: string; beat?: number | null }[], [doc]);
  const timeSig: string = doc?.timeSignature || "4/4";
  const beatsPerBar = Number(timeSig?.split("/")[0] || "4") || 4;

  const totalBeats = useMemo(() => {
    if (!chords.length && !sections.length) return beatsPerBar * 16; // Default length
    const lastChordBeat = chords[chords.length - 1]?.startBeat ?? 0;
    const lastSectionBeat = sections[sections.length - 1]?.startBeat ?? 0;
    const lastBeat = Math.max(lastChordBeat, lastSectionBeat) + beatsPerBar;
    return Math.max(beatsPerBar, lastBeat);
  }, [chords, sections, beatsPerBar]);

  const normalizeBeat = useCallback((b: number) => {
    const tb = Math.max(1, totalBeats || 1);
    return ((b % tb) + tb) % tb;
  }, [totalBeats]);

  // Cylindrical rotation boundaries
  const ROTATION_BARS = 10;
  const rotationBeats = ROTATION_BARS * beatsPerBar;
  const cycles = Math.max(3, Math.ceil(rotationBeats / Math.max(1, totalBeats)));
  const sideBeats = cycles * totalBeats;
  const extendedTotalBeats = totalBeats + 2 * sideBeats;

  const rotatingContent = useMemo(() => {
    if (!doc) return { sections: [], chords: [], lyrics: [] };

    const rotatedSections: any[] = [];
    const rotatedChords: any[] = [];
    const rotatedLyrics: any[] = [];

    for (let i = -cycles; i <= cycles; i++) {
      const offset = i * totalBeats;
      sections.forEach(section => rotatedSections.push({ ...section, startBeat: offset + section.startBeat }));
      chords.forEach(chord => rotatedChords.push({ ...chord, startBeat: offset + chord.startBeat }));
      lyrics.forEach(lyric => rotatedLyrics.push({ ...lyric, beat: offset + (lyric.beat || 0) }));
    }

    const shift = sideBeats;
    return {
      sections: rotatedSections.map(s => ({ ...s, startBeat: (s.startBeat || 0) + shift })),
      chords: rotatedChords.map(c => ({ ...c, startBeat: (c.startBeat || 0) + shift })),
      lyrics: rotatedLyrics.map(l => ({ ...l, beat: (l.beat || 0) + shift })),
    };
  }, [doc, sections, chords, lyrics, totalBeats, cycles, sideBeats]);

  const contentRef = useRef<HTMLDivElement | null>(null);
  const sheenRef = useRef<HTMLDivElement | null>(null);
  const lastCenterRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const motionBlurRef = useRef<number>(0);
  const viewBeat = useMemo(() => normalizeBeat(playhead), [normalizeBeat, playhead]);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const center = window.innerWidth / 2;
    const translateX = center - (viewBeat + sideBeats) * zoom;
    el.style.transform = `translateX(${translateX}px)`;

    try {
      const root = document.documentElement;
      const sheenX = `${translateX}px`;
      root.style.setProperty('--sheen-x', sheenX);
    } catch (e) {
      // ignore
    }

    lastCenterRef.current = translateX;
    lastTimeRef.current = performance.now();
  }, [viewBeat, sideBeats, zoom]);

  // --- Consolidated Event Handlers ---
  useEffect(() => {
    const handleInteractionStart = (clientX: number) => {
      setIsDragging(true);
      setLastInteractionX(clientX);
    };

    const handleInteractionMove = (clientX: number) => {
      setLastInteractionX(prevX => {
        if (prevX === 0) return clientX;
        const deltaX = prevX - clientX;
        const deltaBeats = deltaX / zoom;
        setPlayhead(p => normalizeBeat(p + deltaBeats));
        return clientX;
      });
    };

    const handleInteractionEnd = () => {
      setIsDragging(false);
      setLastInteractionX(0);
    };

    const handleMouseDown = (e: MouseEvent) => {
      // Don't steal focus or prevent default for native interactive elements
      const tgt = e.target as HTMLElement | null;
      if (tgt && tgt.closest && tgt.closest('input, textarea, button, a, [role="button"]')) {
        return; // allow normal focus behavior
      }
      e.preventDefault();
      handleInteractionStart(e.clientX);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        e.preventDefault();
        handleInteractionMove(e.clientX);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (isDragging) {
        e.preventDefault();
        handleInteractionEnd();
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const deltaBeats = (e.deltaX / zoom) * 0.5 + (e.deltaY / zoom) * 0.1;
      setPlayhead(prev => normalizeBeat(prev + deltaBeats));
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        // Allow touches on input controls to act normally (so keyboard can appear, etc.)
        const active = e.target as HTMLElement | null;
        if (active && active.closest && active.closest('input, textarea, button, a, [role="button"]')) {
          return;
        }
        e.preventDefault();
        handleInteractionStart(e.touches[0].clientX);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && isDragging) {
        e.preventDefault();
        handleInteractionMove(e.touches[0].clientX);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (isDragging) {
        e.preventDefault();
        handleInteractionEnd();
      }
    };

    const eventOptions = { passive: false };
    window.addEventListener('mousedown', handleMouseDown, eventOptions);
    window.addEventListener('mousemove', handleMouseMove, eventOptions);
    window.addEventListener('mouseup', handleMouseUp, eventOptions);
    window.addEventListener('wheel', handleWheel, eventOptions);
    window.addEventListener('touchstart', handleTouchStart, eventOptions);
    window.addEventListener('touchmove', handleTouchMove, eventOptions);
    window.addEventListener('touchend', handleTouchEnd, eventOptions);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, zoom, normalizeBeat]);


  // --- Lyrics Search and Attach Logic ---
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState<string | null>(null);
  const [foundLyrics, setFoundLyrics] = useState<any>(null);
  const [lyricQuery, setLyricQuery] = useState("");
  const [searchStatus, setSearchStatus] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const searchLyrics = useCallback(async () => {
    if (!doc) return;
    setSearching(true);
    setSearchErr(null);
    setFoundLyrics(null);
    try {
      const cleanTitle = (doc?.title || "").replace(/^\d+\s*-\s*/, '').replace(/_/g, ' ');
      const title = encodeURIComponent(cleanTitle);
      const artist = encodeURIComponent(doc?.artist || "");
      const res = await fetch(`${apiBase}/v1/lyrics/search?title=${title}&artist=${artist}`);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`[${res.status}] ${errorText}`);
      }
      const data = await res.json();
      if (data.matched && data.lines?.length > 0) {
        setFoundLyrics(data);
      } else {
        setSearchErr("No matching lyrics found.");
      }
    } catch (e: any) {
      setSearchErr(e.message || String(e));
    } finally {
      setSearching(false);
    }
  }, [doc, apiBase]);

  const attachLyrics = useCallback(async (lyricsToAttach: any) => {
    if (!id || !lyricsToAttach) return;
    const sid = Array.isArray(id) ? id[0] : id;
    try {
      const res = await fetch(`${apiBase}/v1/songs/${sid}/attach-lyrics`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lines: lyricsToAttach.lines, mode: "append" }),
      });
      if (!res.ok) throw new Error(await res.text());
      await mutate();
      setFoundLyrics(null);
    } catch (e: any) {
      console.error("Attach failed:", e);
    }
  }, [id, apiBase, mutate]);

  useEffect(() => {
    if (doc && !lyrics.length && !foundLyrics && !searching && !searchErr) {
      searchLyrics();
    }
  }, [doc, lyrics.length, foundLyrics, searching, searchErr, searchLyrics]);

  useEffect(() => {
    if (foundLyrics) {
      attachLyrics(foundLyrics);
    }
  }, [foundLyrics, attachLyrics]);

  const findAndCenterLyric = useCallback((query: string) => {
    if (!doc || !query) return;
    const q = query.trim().toLowerCase();
    if (!q) return;
    const found = (doc.lyrics || []).find((l: any) => (l.text || "").toLowerCase().includes(q));
    if (found && typeof found.beat === 'number') {
      setPlayhead(found.beat);
      setSearchStatus(`Found "${found.text}" @ beat ${found.beat.toFixed(2)}`);
      // Also directly recompute and apply transform so the UI recenters immediately
      try {
        const el = contentRef.current;
        if (el) {
          const center = window.innerWidth / 2;
          const vb = normalizeBeat(found.beat);
          const translateX = center - (vb + sideBeats) * zoom;
          // apply a smooth animated transform and a quick highlight so the user notices
          el.style.transition = 'transform 320ms cubic-bezier(.22,.9,.28,1)';
          el.style.transform = `translateX(${translateX}px)`;
          // flash a subtle box-shadow to indicate movement
          el.style.boxShadow = '0 0 0 6px rgba(255,0,0,0.06)';
          window.setTimeout(() => {
            if (!el) return;
            el.style.boxShadow = '';
          }, 800);
        }
      } catch (e) {
        // ignore
      }
    } else if (found) {
      setPlayhead(found.beat || 0);
      setSearchStatus(`Found "${found.text}" (no beat available)`);
    } else {
      setSearchStatus(`No lyric matching "${query}"`);
    }
    // clear status after a moment
    setTimeout(() => setSearchStatus(null), 3500);
  }, [doc, normalizeBeat, sideBeats, zoom]);

  const maxParallax = typeof window !== 'undefined' ? Math.min(80, window.innerWidth / 12) : 60;

  // During server-side render `router.query.id` may be undefined and SWR won't
  // run. Wait for the router to be ready on the client so we don't show a
  // misleading "Song not found" before the client fetches the document.
  if (!router.isReady) return <div className="p-4 text-center">Loading song...</div>;
  if (isLoading) return <div className="p-4 text-center">Loading song...</div>;
  if (error) return <div className="p-4 text-center text-red-500">Error loading song: {error.message}</div>;
  if (!doc) return <div className="p-4 text-center">Song not found.</div>;

  return (
    <div className="fixed inset-0 cylindrical-timeline overflow-hidden select-none touch-none">
      {/* Debug overlay: shows when doc is loaded to verify data arrived */}
      {doc && (
  <div className="absolute top-16 left-4 p-2 bg-white text-black rounded shadow-md font-typewriter text-sm debug-panel">
          <div><strong>{doc.title || 'Untitled'}</strong></div>
          <div className="mb-2">Sections: {sections.length} • Chords: {chords.length} • Lyrics: {lyrics.length}</div>
          <div className="mb-1 text-xs">Playhead: {playhead.toFixed(2)} • ViewBeat: {viewBeat.toFixed(2)} • Zoom: {zoom}px</div>
          <div className="flex gap-2 items-center">
            <input
              value={lyricQuery}
              onChange={(e) => setLyricQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') findAndCenterLyric(lyricQuery); }}
              placeholder="Find lyric... e.g. 'If I needed someone'"
              className="p-1 border border-black/10 rounded text-sm"
            />
            <button
              onClick={() => findAndCenterLyric(lyricQuery)}
              className="btn-tape-sm"
            >Find</button>
            {doc && (
              <LrcAttachButton songId={doc.id} tempo={doc?.tempo || doc?.metadata?.tempo || undefined} />
            )}
          </div>
          {/* Lyrics resolver UI */}
          <div className="mt-2 flex items-center gap-2">
            <div className="text-xs">Lyrics source:</div>
            <div id="lyrics-source-badge" className="px-2 py-0.5 rounded bg-gray-200 text-xs">{doc?.assets?.lyrics_vtt ? 'Cache' : 'None'}</div>
            <button
              onClick={async () => {
                try {
                    const sid = doc?.id
                    const res = await fetch(`${apiBase}/api/lyrics/resolve?title=${encodeURIComponent(doc.title||'')}&artist=${encodeURIComponent(doc.artist||'')}&duration=${Math.round(doc?.duration||0)}&songId=${encodeURIComponent(sid||'')}`)
                  const j = await res.json()
                  if (j && j.vttPath) {
                    // update doc source by refetch
                    await mutate()
                    // optional: show badge
                    const el = document.getElementById('lyrics-source-badge')
                    if (el) el.textContent = j.source || 'ok'
                  } else {
                    alert('No lyrics found')
                  }
                } catch (e) {
                  console.error(e)
                  alert('Lyrics resolution failed')
                }
              }}
              className="btn-tape-sm"
            >Re-resolve</button>
              <button
                onClick={async () => {
                  if (!doc?.id) return alert('No song id');
                  try {
                    setPublishing(true);
                    const res = await fetch(`${apiBase}/api/experiments/publish-lyrics`, {
                      method: 'POST',
                      headers: { 'content-type': 'application/json' },
                      body: JSON.stringify({ songId: doc.id }),
                    });
                    if (!res.ok) {
                      const txt = await res.text();
                      throw new Error(txt || res.statusText || 'publish failed');
                    }
                    const j = await res.json();
                    await mutate();
                    const el = document.getElementById('lyrics-source-badge');
                    if (el) el.textContent = j.slug || 'Cache';
                    alert('Publish succeeded: ' + (j.slug || j.vttPath || 'ok'));
                  } catch (err: any) {
                    console.error('publish failed', err);
                    alert('Publish failed: ' + (err?.message || String(err)));
                  } finally {
                    setPublishing(false);
                  }
                }}
                disabled={publishing}
                className="btn-tape-sm"
              >{publishing ? 'Publishing…' : 'Publish session lyrics'}</button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={() => {
                const sid = doc?.id;
                if (!sid) return;
                window.location.href = `/playhead?song=${encodeURIComponent(sid)}`;
              }}
              className="btn-tape-sm"
            >Open in Playhead</button>
            <button
              onClick={() => { window.location.href = `/playhead?demo=1`; }}
              className="btn-tape-sm"
            >Open demo Playhead</button>
          </div>
          {searchStatus && <div className="mt-1 text-xs text-black/70">{searchStatus}</div>}
        </div>
      )}
      <div className="cylindrical-playhead" />

      <div className="absolute inset-0">
        <div className="cylindrical-content-overlay" />
        <div className="cylindrical-vignette" aria-hidden />
        <div className="cylindrical-filmgrain" aria-hidden />
        <div className="cylindrical-sheen" aria-hidden />
        <div className="cylindrical-scanlines" aria-hidden />
        <div className="cylindrical-chromatic" aria-hidden />

        <div ref={contentRef} className="relative timeline-content z-20 h-full">
          <div className="flex flex-col justify-center h-full space-y-0">
            {!!rotatingContent.sections?.length && (
              <div>
                <SectionRail sections={rotatingContent.sections} zoom={zoom} totalBeats={extendedTotalBeats} laneOffset={0} depthBlur={0} />
              </div>
            )}
            <div>
              <BarRuler beatsPerBar={beatsPerBar} totalBeats={extendedTotalBeats} zoom={zoom} />
            </div>
            <div>
              <ChordLane chords={rotatingContent.chords} zoom={zoom} beatsPerBar={beatsPerBar} totalBeats={extendedTotalBeats} laneOffset={0} depthBlur={0} itemHeight={itemHeight} />
            </div>
            {!!rotatingContent.lyrics?.length && (
              <div>
                <LyricLane lyrics={rotatingContent.lyrics} zoom={zoom} beatsPerBar={beatsPerBar} totalBeats={extendedTotalBeats} laneOffset={0} depthBlur={0} itemHeight={itemHeight} />
              </div>
            )}
          </div>
        </div>
      </div>
      <TimelineFooter zoom={zoom} setZoom={setZoom} itemHeight={itemHeight} setItemHeight={setItemHeight} />
    </div>
  );
}

export default SongPage;
