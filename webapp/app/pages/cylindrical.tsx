import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import useSWR from "swr";
import { swrFetcher } from "@/lib/api";
import { SectionRail } from "@/components/SectionRail";
import { ChordLane } from "@/components/ChordLane";
import { BarRuler } from "@/components/BarRuler";
import { LyricLane } from "@/components/LyricLane";
import { WaveformRail } from "@/components/timeline/WaveformRail";
import TimelineFooter from "@/components/timeline/TimelineFooter";
// LrcAttachButton panel removed in favor of a clean header; reintroduce later as needed.

type SongRow = { id: string; title?: string };

function SongPicker({ songs, currentId, onPick }: { songs: SongRow[]; currentId: string; onPick: (id: string) => void }) {
  const [q, setQ] = React.useState("");
  const filtered = React.useMemo(() => {
    const s = (q || "").toLowerCase().trim();
    if (!s) return songs;
    return songs.filter((r) => (r.title || "").toLowerCase().includes(s) || (r.id || "").toLowerCase().includes(s));
  }, [q, songs]);
  return (
    <div className="flex items-center gap-1">
      {/* Quick search with datalist */}
      <input
        list="songs-list"
        placeholder="Find song…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const hit = filtered[0];
            if (hit) onPick(hit.id);
          }
        }}
        className="w-40 p-1 border border-black/20 rounded bg-white text-black text-xs font-typewriter"
      />
      <datalist id="songs-list">
        {filtered.slice(0, 50).map((s) => (
          <option key={s.id} value={s.id} label={s.title || s.id} />
        ))}
      </datalist>
      {/* Explicit selector */}
      <select
        aria-label="Select song"
        value={currentId}
        onChange={(e) => onPick(e.target.value)}
        className="p-1 border border-black/20 rounded bg-white font-typewriter text-xs text-black max-w-[26ch]"
      >
        {songs.map((s) => (
          <option key={s.id} value={s.id}>{s.title || s.id}</option>
        ))}
      </select>
    </div>
  );
}

export default function CylindricalTimelinePage() {
  const router = useRouter();
  // Accept either ?song=ID (preferred) or ?id=ID as a fallback
  const qSong = router.query?.song as string | string[] | undefined;
  const qId = router.query?.id as string | string[] | undefined;
  const songId = Array.isArray(qSong) ? qSong[0] : (qSong ?? (Array.isArray(qId) ? qId[0] : qId));
  const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

  const [zoom, setZoom] = useState(16); // px per beat (persisted)
  const [playhead, setPlayhead] = useState(0); // Current playhead position in beats
  const [itemHeight, setItemHeight] = useState(32);
  const [isDragging, setIsDragging] = useState(false);
  const [lastInteractionX, setLastInteractionX] = useState(0);

  const url = useMemo(() => {
    if (!songId) return null;
    return `${apiBase}/v1/songs/${songId}/doc`;
  }, [songId, apiBase]);

  const { data, error, isLoading, mutate } = useSWR(url, swrFetcher);
  // Fetch songs for dropdown selector
  const songsUrl = useMemo(() => `${apiBase}/songs`, [apiBase]);
  const { data: songsData } = useSWR(songsUrl, async (u: string) => {
    const res = await fetch(u);
    const j = await res.json();
    // handle {songs: []} or []
    return Array.isArray(j) ? j : (Array.isArray(j?.songs) ? j.songs : []);
  });

  const doc = data as any;
  const sections = useMemo(() => doc?.sections || [], [doc]);
  const chords = useMemo(() => (doc?.chords || []) as { symbol: string; startBeat: number }[], [doc]);
  const lyrics = useMemo(() => (doc?.lyrics || []) as { text: string; beat?: number | null }[], [doc]);
  const timeSig: string = doc?.timeSignature || "4/4";
  const beatsPerBar = Number(timeSig?.split("/")[0] || "4") || 4;

  // Demo content fallback and query flag (?demo=1) to force demo rows
  const demoFlag = React.useMemo(() => {
    try {
      const v = Array.isArray(router.query?.demo) ? router.query?.demo[0] : router.query?.demo;
      const s = String(v || '').toLowerCase();
      return s === '1' || s === 'true';
    } catch { return false; }
  }, [router.query]);

  // Check if this is a recording (has audio assets) - don't show demo data for recordings
  const hasAudioAssets = React.useMemo(() => {
    const assets = doc?.assets || doc?.source?.assets || {};
    return Object.keys(assets).some(key => 
      key.toLowerCase().includes('audio') || 
      (typeof assets[key] === 'string' && assets[key].toLowerCase().includes('.wav')) ||
      (typeof assets[key] === 'string' && assets[key].toLowerCase().includes('.mp3')) ||
      (typeof assets[key] === 'string' && assets[key].toLowerCase().includes('.webm'))
    );
  }, [doc]);

  const demoSections: { id: string; name: string; startBeat: number; lengthBeats: number; color: string }[] = [
    { id: "1", name: "Intro", startBeat: 0, lengthBeats: 16, color: "#8B5CF6" },
    { id: "2", name: "Verse 1", startBeat: 16, lengthBeats: 32, color: "#10B981" },
    { id: "3", name: "Chorus", startBeat: 48, lengthBeats: 32, color: "#F59E0B" },
    { id: "4", name: "Verse 2", startBeat: 80, lengthBeats: 32, color: "#10B981" },
    { id: "5", name: "Chorus", startBeat: 112, lengthBeats: 32, color: "#F59E0B" },
    { id: "6", name: "Bridge", startBeat: 144, lengthBeats: 16, color: "#EF4444" },
    { id: "7", name: "Chorus", startBeat: 160, lengthBeats: 32, color: "#F59E0B" },
    { id: "8", name: "Outro", startBeat: 192, lengthBeats: 16, color: "#6B7280" },
  ];
  const demoChords: { symbol: string; startBeat: number }[] = [
    { symbol: "C", startBeat: 0 },
    { symbol: "Am", startBeat: 4 },
    { symbol: "F", startBeat: 8 },
    { symbol: "G", startBeat: 12 },
    { symbol: "C", startBeat: 16 },
    { symbol: "Am", startBeat: 20 },
    { symbol: "F", startBeat: 24 },
    { symbol: "G", startBeat: 28 },
  ];
  const demoLyrics: { text: string; beat?: number | null }[] = [
    { text: "Hello", beat: 16 },
    { text: "world", beat: 18 },
    { text: "this", beat: 20 },
    { text: "is", beat: 21 },
    { text: "a", beat: 22 },
    { text: "song", beat: 24 },
  ];

  // Get audio URL from assets
  const audioUrl = React.useMemo(() => {
    const assets = doc?.assets || doc?.source?.assets || {};
    for (const [key, value] of Object.entries(assets)) {
      if (key.toLowerCase().includes('audio') && typeof value === 'string') {
        return value;
      }
      if (typeof value === 'string' && (value.toLowerCase().includes('.wav') || value.toLowerCase().includes('.mp3') || value.toLowerCase().includes('.webm'))) {
        return value;
      }
    }
    return undefined;
  }, [doc]);

  const effSections = (demoFlag || (sections.length === 0 && !hasAudioAssets)) ? demoSections : sections;
  const effChords = (demoFlag || (chords.length === 0 && !hasAudioAssets)) ? demoChords : chords;
  const effLyrics = (demoFlag || (lyrics.length === 0 && !hasAudioAssets)) ? demoLyrics : lyrics;

  const totalBeats = useMemo(() => {
    if (!effChords.length && !effSections.length) return beatsPerBar * 16; // Default length
    const lastChordBeat = effChords[effChords.length - 1]?.startBeat ?? 0;
    const lastSectionBeat = effSections[effSections.length - 1]?.startBeat ?? 0;
    const lastBeat = Math.max(lastChordBeat, lastSectionBeat) + beatsPerBar;
    return Math.max(beatsPerBar, lastBeat);
  }, [effChords, effSections, beatsPerBar]);

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
    const baseSections = effSections || [];
    const baseChords = effChords || [];
    const baseLyrics = effLyrics || [];

    const rotatedSections: any[] = [];
    const rotatedChords: any[] = [];
    const rotatedLyrics: any[] = [];

    for (let i = -cycles; i <= cycles; i++) {
      const offset = i * totalBeats;
      baseSections.forEach(section => rotatedSections.push({ ...section, startBeat: offset + section.startBeat }));
      baseChords.forEach(chord => rotatedChords.push({ ...chord, startBeat: offset + chord.startBeat }));
      baseLyrics.forEach(lyric => rotatedLyrics.push({ ...lyric, beat: offset + (lyric.beat || 0) }));
    }

    const shift = sideBeats;
    return {
      sections: rotatedSections.map(s => ({ ...s, startBeat: (s.startBeat || 0) + shift })),
      chords: rotatedChords.map(c => ({ ...c, startBeat: (c.startBeat || 0) + shift })),
      lyrics: rotatedLyrics.map(l => ({ ...l, beat: (l.beat || 0) + shift })),
    };
  }, [doc, sections, chords, lyrics, totalBeats, cycles, sideBeats]);

  const contentRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastCenterRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const motionBlurRef = useRef<number>(0);
  const viewBeat = useMemo(() => normalizeBeat(playhead), [normalizeBeat, playhead]);
  const tempoInitial = useMemo(() => (doc?.source?.metadata?.tempo || doc?.tempo || 120) as number, [doc]);
  const [tempo, setTempo] = useState<number>(tempoInitial);
  const [isPlaying, setIsPlaying] = useState(false);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  // Debug/UX: allow toggling overlays on/off; default enabled
  const [showOverlays, setShowOverlays] = useState(false);
  // View mode: start with plain (static stack), allow switching to timeline
  const [mode, setMode] = useState<'plain' | 'timeline'>('timeline');
  // Centering transform toggle for timeline
  const [centerEnabled, setCenterEnabled] = useState(true);
  const [jumpBeat, setJumpBeat] = useState<number>(0);
  const [scrollX, setScrollX] = useState<number>(0);

  // Persist UI preferences
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cyl.ui');
      if (saved) {
        const s = JSON.parse(saved);
        if (s && typeof s === 'object') {
          if (s.mode === 'plain' || s.mode === 'timeline') setMode(s.mode);
          if (typeof s.centerEnabled === 'boolean') setCenterEnabled(s.centerEnabled);
          if (Number.isFinite(s.zoom)) setZoom(Math.max(8, Math.min(64, s.zoom)));
          if (typeof s.showOverlays === 'boolean') setShowOverlays(s.showOverlays);
        }
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem('cyl.ui', JSON.stringify({ mode, centerEnabled, zoom, showOverlays }));
    } catch {}
  }, [mode, centerEnabled, zoom, showOverlays]);

  // Center view: if centering is enabled, move playhead to 0; otherwise, scroll horizontally to center beat 0
  const scrollToBeat = useCallback((beat: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const b = Number.isFinite(beat) ? beat : 0;
    const norm = ((b % Math.max(1, totalBeats)) + Math.max(1, totalBeats)) % Math.max(1, totalBeats);
    const leftBeats = sideBeats + norm;
    const leftPx = leftBeats * zoom;
    const maxLeft = Math.max(0, el.scrollWidth - el.clientWidth);
    const targetLeft = Math.max(0, Math.min(leftPx - el.clientWidth / 2, maxLeft));
    try { el.scrollTo({ left: targetLeft, behavior: 'smooth' }); } catch { el.scrollLeft = targetLeft; }
  }, [contentRef, totalBeats, sideBeats, zoom]);

  const centerView = useCallback(() => {
    if (centerEnabled) {
      setPlayhead(0);
      // also scroll to beat 0 to guarantee visible movement
      scrollToBeat(0);
      return;
    }
    scrollToBeat(0);
  }, [centerEnabled, scrollToBeat]);

  // Track scroll position for debug and add page-left/right helpers
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setScrollX(el.scrollLeft);
    el.addEventListener('scroll', onScroll, { passive: true });
    // initialize
    setScrollX(el.scrollLeft || 0);
    return () => { el.removeEventListener('scroll', onScroll as any); };
  }, [contentRef, mode]);

  const pageBy = useCallback((dir: -1 | 1) => {
    const el = scrollRef.current; if (!el) return;
    const deltaPx = Math.max(160, Math.floor(el.clientWidth * 0.9)) * dir;
    const deltaBeats = deltaPx / Math.max(1, zoom);
    try { el.scrollBy({ left: deltaPx, behavior: 'smooth' }); } catch { el.scrollLeft += deltaPx; }
    setPlayhead(p => normalizeBeat(p + deltaBeats));
  }, [zoom, normalizeBeat]);

  // Update local tempo when song changes
  useEffect(() => { setTempo(tempoInitial); }, [tempoInitial]);

  // Format helpers
  const formatBarsBeats = useCallback((pos: number) => {
    const bpb = Math.max(1, beatsPerBar || 4);
    const bar = Math.floor(pos / bpb) + 1;
    const beat = pos % bpb;
    return `${bar}:${beat.toFixed(2)}`;
  }, [beatsPerBar]);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    // If we're in debug/no-translate mode, don't apply inline transforms
    if (el.classList.contains('no-translate')) {
      el.style.transform = '';
      try {
        const root = document.documentElement;
        root.style.setProperty('--sheen-x', '0px');
      } catch {}
      lastCenterRef.current = null;
      lastTimeRef.current = null;
      return;
    }
    const center = window.innerWidth / 2;
    const translateX = center - (viewBeat + sideBeats) * zoom;
    el.style.transform = `translateX(${translateX}px)`;

    try {
      const root = document.documentElement;
      const sheenX = `${translateX}px`;
      root.style.setProperty('--sheen-x', sheenX);
    } catch (e) { /* ignore */ }

    lastCenterRef.current = translateX;
    lastTimeRef.current = performance.now();
  }, [viewBeat, sideBeats, zoom]);

  // Input handlers
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
      const tgt = e.target as HTMLElement | null;
      if (
        tgt && tgt.closest && tgt.closest('header, input, textarea, select, button, a, [role="button"], [role="listbox"]')
      ) {
        return;
      }
      e.preventDefault();
      handleInteractionStart(e.clientX);
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) { e.preventDefault(); handleInteractionMove(e.clientX); }
    };
    const handleMouseUp = (e: MouseEvent) => {
      if (isDragging) { e.preventDefault(); handleInteractionEnd(); }
    };
    const handleWheel = (e: WheelEvent) => {
      const tgt = e.target as HTMLElement | null;
      if (tgt && tgt.closest && tgt.closest('header, input, textarea, select, button, a, [role="button"], [role="listbox"]')) {
        return; // allow normal scrolling in UI elements/header
      }
      e.preventDefault();
      const deltaBeats = (e.deltaX / zoom) * 0.5 + (e.deltaY / zoom) * 0.1;
      setPlayhead(prev => normalizeBeat(prev + deltaBeats));
    };
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const active = e.target as HTMLElement | null;
        if (
          active && active.closest && active.closest('header, input, textarea, select, button, a, [role="button"], [role="listbox"]')
        ) {
          return;
        }
        e.preventDefault();
        handleInteractionStart(e.touches[0].clientX);
      }
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && isDragging) { e.preventDefault(); handleInteractionMove(e.touches[0].clientX); }
    };
    const handleTouchEnd = (e: TouchEvent) => { if (isDragging) { e.preventDefault(); handleInteractionEnd(); } };

    const opts = { passive: false } as AddEventListenerOptions;
    window.addEventListener('mousedown', handleMouseDown, opts);
    window.addEventListener('mousemove', handleMouseMove, opts);
    window.addEventListener('mouseup', handleMouseUp, opts);
    window.addEventListener('wheel', handleWheel, opts);
    window.addEventListener('touchstart', handleTouchStart, opts);
    window.addEventListener('touchmove', handleTouchMove, opts);
    window.addEventListener('touchend', handleTouchEnd, opts);
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

  // Simple transport: Play/Pause advances playhead based on tempo (beats per second)
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      lastTsRef.current = null;
      return;
    }
    const step = (ts: number) => {
      const last = lastTsRef.current ?? ts;
      const dt = Math.max(0, (ts - last) / 1000);
      lastTsRef.current = ts;
      const bps = (Number(tempo) || 120) / 60; // beats per second
      const add = dt * bps;
      setPlayhead(p => normalizeBeat(p + add));
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null; lastTsRef.current = null; };
  }, [isPlaying, tempo, normalizeBeat]);

  // Lyrics search/attach (same behavior as song page)
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState<string | null>(null);
  const [foundLyrics, setFoundLyrics] = useState<any>(null);
  const [lyricQuery, setLyricQuery] = useState("");
  const [searchStatus, setSearchStatus] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  // Plain lanes-only debug mode (no overlays, no playhead)
  const plainFlag = React.useMemo(() => {
    try {
      const v = Array.isArray(router.query?.plain) ? router.query?.plain[0] : router.query?.plain;
      const s = String(v || '').toLowerCase();
      return s === '1' || s === 'true';
    } catch { return false; }
  }, [router.query]);

  const searchLyrics = useCallback(async () => {
    if (!doc) return;
    setSearching(true); setSearchErr(null); setFoundLyrics(null);
    try {
      const cleanTitle = (doc?.title || "").replace(/^\d+\s*-\s*/, '').replace(/_/g, ' ');
      const title = encodeURIComponent(cleanTitle);
      const artist = encodeURIComponent(doc?.artist || "");
      const res = await fetch(`${apiBase}/v1/lyrics/search?title=${title}&artist=${artist}`);
      if (!res.ok) throw new Error(`[${res.status}] ${await res.text()}`);
      const data = await res.json();
      if (data.matched && data.lines?.length > 0) setFoundLyrics(data); else setSearchErr("No matching lyrics found.");
    } catch (e: any) { setSearchErr(e.message || String(e)); }
    finally { setSearching(false); }
  }, [doc, apiBase]);

  const attachLyrics = useCallback(async (lyricsToAttach: any) => {
    if (!songId || !lyricsToAttach) return;
    try {
      const res = await fetch(`${apiBase}/v1/songs/${songId}/attach-lyrics`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lines: lyricsToAttach.lines, mode: "append" }),
      });
      if (!res.ok) throw new Error(await res.text());
      await mutate();
      setFoundLyrics(null);
    } catch (e: any) { console.error("Attach failed:", e); }
  }, [songId, apiBase, mutate]);

  useEffect(() => { if (doc && !lyrics.length && !foundLyrics && !searching && !searchErr) { searchLyrics(); } }, [doc, lyrics.length, foundLyrics, searching, searchErr, searchLyrics]);
  useEffect(() => { if (foundLyrics) { attachLyrics(foundLyrics); } }, [foundLyrics, attachLyrics]);

  const findAndCenterLyric = useCallback((query: string) => {
    if (!doc || !query) return;
    const q = query.trim().toLowerCase(); if (!q) return;
    const found = (doc.lyrics || []).find((l: any) => (l.text || "").toLowerCase().includes(q));
    if (found && typeof found.beat === 'number') {
      setPlayhead(found.beat);
      setSearchStatus(`Found "${found.text}" @ beat ${found.beat.toFixed(2)}`);
      try {
        const el = contentRef.current; if (el) {
          const center = window.innerWidth / 2;
          const vb = normalizeBeat(found.beat);
          const translateX = center - (vb + sideBeats) * zoom;
          el.style.transition = 'transform 320ms cubic-bezier(.22,.9,.28,1)';
          el.style.transform = `translateX(${translateX}px)`;
          el.style.boxShadow = '0 0 0 6px rgba(255,0,0,0.06)';
          window.setTimeout(() => { if (!el) return; el.style.boxShadow = ''; }, 800);
        }
      } catch {}
    } else if (found) {
      setPlayhead(found.beat || 0); setSearchStatus(`Found "${found.text}" (no beat available)`);
    } else { setSearchStatus(`No lyric matching "${query}"`); }
    setTimeout(() => setSearchStatus(null), 3500);
  }, [doc, normalizeBeat, sideBeats, zoom]);

  if (!router.isReady) return <div className="p-4 text-center">Loading…</div>;
  if (isLoading) return <div className="p-4 text-center">Loading song…</div>;
  if (error) return <div className="p-4 text-center text-red-500">Error loading song: {String((error as any)?.message || error)}</div>;

  return (
  <div className="fixed inset-0 cylindrical-timeline no-cylinder-bg overflow-hidden select-none touch-none">
      {/* Top header: title, positions, and Load Song */}
      <header className="fixed top-0 left-0 right-0 min-h-14 border-b border-black/10 shadow-sm z-[10001]" style={{backgroundColor: '#ffffff', color: '#000000'}}>
        <div className="px-4 py-1 flex flex-wrap items-center gap-2 justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="m-0 font-typewriter font-bold text-base truncate max-w-[28ch] text-black" title={(doc?.title || (demoFlag ? 'Demo Song' : 'Untitled'))}>{doc?.title || (demoFlag ? 'Demo Song' : 'Untitled')}</h1>
            <div className="flex items-center gap-3">
              <div className="text-xs text-black font-typewriter">Playhead: {formatBarsBeats(playhead)}</div>
              <div className="text-xs text-black font-typewriter">Beat: {viewBeat.toFixed(2)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Enhanced song picker: select + search */}
            <SongPicker
              songs={Array.isArray(songsData) ? songsData : []}
              currentId={songId || ''}
              onPick={(sid) => sid && router.push(`/cylindrical?song=${encodeURIComponent(sid)}`)}
            />
            {/* Transport controls */}
            <div className="flex items-center gap-1">
              <button
                aria-label="Seek back 1 bar"
                onClick={() => setPlayhead(p => normalizeBeat(p - beatsPerBar))}
                className="btn-tape-sm"
              >⏮︎</button>
              <button
                aria-label={isPlaying ? 'Pause' : 'Play'}
                onClick={() => setIsPlaying(v => !v)}
                className="btn-tape-sm"
              >{isPlaying ? 'Pause' : 'Play'}</button>
              <button
                aria-label="Seek forward 1 bar"
                onClick={() => setPlayhead(p => normalizeBeat(p + beatsPerBar))}
                className="btn-tape-sm"
              >⏭︎</button>
              <button
                aria-label="Center timeline"
                onClick={centerView}
                className="btn-tape-sm"
              >Center</button>
              {/* Page left/right to verify movement */}
              <button aria-label="Page left" onClick={() => pageBy(-1)} className="btn-tape-sm">← Page</button>
              <button aria-label="Page right" onClick={() => pageBy(1)} className="btn-tape-sm">Page →</button>
            </div>
            {/* Zoom controls */}
            <div className="flex items-center gap-1">
              <button onClick={() => setZoom(z => Math.max(8, z - 4))} className="btn-tape-sm" aria-label="Zoom out">-</button>
              <span className="text-xs font-typewriter w-10 text-center" style={{color: '#000000'}}>{zoom}px</span>
              <button onClick={() => setZoom(z => Math.min(64, z + 4))} className="btn-tape-sm" aria-label="Zoom in">+</button>
              <button onClick={() => setZoom(16)} className="btn-tape-sm" aria-label="Reset zoom">Reset</button>
            </div>
            {/* BPM control */}
            <div className="flex items-center gap-1">
              <label className="text-xs font-typewriter text-black" htmlFor="bpm-input">BPM</label>
              <input
                id="bpm-input"
                type="number"
                min={30}
                max={300}
                step={1}
                value={Number.isFinite(tempo) ? tempo : 120}
                onChange={(e) => {
                  const v = parseInt(e.target.value || '120', 10);
                  if (!Number.isFinite(v)) return; setTempo(Math.max(30, Math.min(300, v)));
                }}
                className="w-16 p-1 border border-black/20 rounded bg-white text-black text-xs font-typewriter"
              />
            </div>
            {/* Go to beat */}
            {mode === 'timeline' && (
              <div className="flex items-center gap-1">
                <label className="text-xs font-typewriter text-black" htmlFor="goto-beat">Beat</label>
                <input
                  id="goto-beat"
                  type="number"
                  min={0}
                  max={Math.max(0, totalBeats - 1)}
                  step={1}
                  value={Number.isFinite(jumpBeat) ? jumpBeat : 0}
                  onChange={(e) => setJumpBeat(parseInt(e.target.value || '0', 10) || 0)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { centerEnabled ? setPlayhead(jumpBeat) : scrollToBeat(jumpBeat); } }}
                  className="w-16 p-1 border border-black/20 rounded bg-white text-black text-xs font-typewriter"
                />
                <button onClick={() => (centerEnabled ? setPlayhead(jumpBeat) : scrollToBeat(jumpBeat))} className="btn-tape-sm" aria-label="Go to beat">Go</button>
                <button onClick={() => (centerEnabled ? setPlayhead(0) : scrollToBeat(0))} className="btn-tape-sm" aria-label="Start">Start</button>
                <button onClick={() => (centerEnabled ? setPlayhead(totalBeats - 1) : scrollToBeat(totalBeats - 1))} className="btn-tape-sm" aria-label="End">End</button>
              </div>
            )}
            {/* Mode switch: Plain vs Timeline */}
            <div className="flex items-center gap-1">
              <label className="text-xs font-typewriter text-black" htmlFor="mode-toggle">Mode</label>
              <select
                id="mode-toggle"
                value={mode}
                onChange={(e) => setMode((e.target.value as 'plain' | 'timeline') || 'plain')}
                className="p-1 border border-black/20 rounded bg-white font-typewriter text-xs text-black"
                aria-label="Switch view mode"
              >
                <option value="plain">Plain</option>
                <option value="timeline">Timeline</option>
              </select>
            </div>
            {/* Scroll readout (debug) */}
            {mode === 'timeline' && (
              <div className="flex items-center gap-1">
                <span className="text-xs font-typewriter" style={{color: '#000000'}}>ScrollX: {Math.round(scrollX)}</span>
              </div>
            )}
            {/* Centering toggle (timeline only) */}
            {mode === 'timeline' && (
              <div className="flex items-center gap-1">
                <label className="text-xs font-typewriter text-black" htmlFor="center-toggle">Centering</label>
                <button
                  id="center-toggle"
                  onClick={() => setCenterEnabled(v => !v)}
                  className="btn-tape-sm"
                  aria-label="Toggle centering"
                  title="Toggle centering"
                >{centerEnabled ? 'On' : 'Off'}</button>
              </div>
            )}
            {/* Overlays toggle for debugging */}
            <div className="flex items-center gap-1">
              <label className="text-xs font-typewriter text-black" htmlFor="ovl-toggle">Overlays</label>
              <button
                id="ovl-toggle"
                onClick={() => setShowOverlays(v => !v)}
                className="btn-tape-sm"
                aria-label="Toggle overlays"
                title="Toggle overlays"
              >{showOverlays ? 'On' : 'Off'}</button>
            </div>
          </div>
        </div>
      </header>
      {/* Center area: conditional based on mode */}
      {mode === 'plain' ? (
        <div className="absolute left-0 right-0 top-16 offset-bottom-footer">
          <div className="max-w-full h-full overflow-auto p-4">
            <div className="space-y-2">
              <div className="ring-2 ring-purple-500/70 rounded-sm bg-purple-600/30 py-1" title="WaveformRail (plain)">
                <div className="text-[3px] font-typewriter text-white/90 px-2 opacity-0 hover:opacity-100 transition-opacity">WaveformRail (plain)</div>
                <WaveformRail zoom={zoom} totalBeats={totalBeats} audioUrl={audioUrl} laneOffset={0} depthBlur={0} />
              </div>
              <div className="ring-2 ring-red-500/70 rounded-sm bg-red-600/30 py-1" title="SectionRail (plain)">
                <div className="text-[3px] font-typewriter text-white/90 px-2 opacity-0 hover:opacity-100 transition-opacity">SectionRail (plain)</div>
                <SectionRail sections={effSections} zoom={zoom} totalBeats={totalBeats} laneOffset={0} depthBlur={0} />
              </div>
              <div className="ring-2 ring-yellow-500/70 rounded-sm bg-yellow-600/30 py-1" title="BarRuler (plain)">
                <div className="text-[3px] font-typewriter text-white/90 px-2 opacity-0 hover:opacity-100 transition-opacity">BarRuler (plain)</div>
                <BarRuler beatsPerBar={beatsPerBar} totalBeats={totalBeats} zoom={zoom} />
              </div>
              <div className="ring-2 ring-green-500/70 rounded-sm bg-green-600/30 py-1" title="ChordLane (plain)">
                <div className="text-[3px] font-typewriter text-white/90 px-2 opacity-0 hover:opacity-100 transition-opacity">ChordLane (plain)</div>
                <ChordLane chords={effChords} zoom={zoom} beatsPerBar={beatsPerBar} totalBeats={totalBeats} laneOffset={0} depthBlur={0} itemHeight={itemHeight} />
              </div>
              <div className="ring-2 ring-blue-500/70 rounded-sm bg-blue-600/30 py-1" title="LyricLane (plain)">
                <div className="text-[3px] font-typewriter text-white/90 px-2 opacity-0 hover:opacity-100 transition-opacity">LyricLane (plain)</div>
                <LyricLane lyrics={effLyrics} zoom={zoom} beatsPerBar={beatsPerBar} totalBeats={totalBeats} laneOffset={0} depthBlur={0} itemHeight={itemHeight} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="absolute left-0 right-0 top-16 offset-bottom-footer">
          <div className="relative h-full">
            {/* Debug HUD */}
            <div className="absolute top-2 left-2 z-[10002] bg-black/70 text-white text-[3px] font-typewriter px-2 py-1 rounded">
              secs: {rotatingContent.sections?.length || 0} | chords: {rotatingContent.chords?.length || 0} | lyrics: {rotatingContent.lyrics?.length || 0} | audio: {audioUrl ? 'yes' : 'no'}
            </div>
            {/* Playhead line */}
            <div className="cylindrical-playhead" />
            {/* No overlays by default; can be toggled on */}
            {showOverlays && (
              <>
                <div className="cylindrical-content-overlay pointer-events-none" />
                <div className="cylindrical-vignette pointer-events-none" aria-hidden />
                <div className="cylindrical-filmgrain pointer-events-none" aria-hidden />
                <div className="cylindrical-sheen pointer-events-none" aria-hidden />
                <div className="cylindrical-scanlines pointer-events-none" aria-hidden />
                <div className="cylindrical-chromatic pointer-events-none" aria-hidden />
              </>
            )}
            {/* Moving content; centering can be toggled. Scroll stays enabled as fallback. */}
            <div ref={scrollRef} className="timeline-scroll z-20 h-full">
              <div ref={contentRef} className={`relative timeline-content ${centerEnabled ? '' : 'no-translate'} h-full`}>
              <div className="flex flex-col items-stretch h-full space-y-2 p-4 pt-6">
                {/* Fixed baseline to visualize top alignment */}
                <div className="sticky top-0 z-30 h-6 bg-black/20 text-white text-[3px] font-typewriter px-2 flex items-center rounded">Timeline Top</div>
                <div className="ring-2 ring-purple-500/70 rounded-sm bg-purple-600/30 py-1" title="WaveformRail (timeline)">
                  <div className="text-[3px] font-typewriter text-white/90 px-2 opacity-0 hover:opacity-100 transition-opacity">WaveformRail (timeline)</div>
                  <WaveformRail zoom={zoom} totalBeats={extendedTotalBeats} audioUrl={audioUrl} laneOffset={0} depthBlur={0} />
                </div>
                <div className="ring-2 ring-red-500/70 rounded-sm bg-red-600/30 py-1" title="SectionRail (timeline)">
                  <div className="text-[3px] font-typewriter text-white/90 px-2 opacity-0 hover:opacity-100 transition-opacity">SectionRail (timeline)</div>
                  <SectionRail sections={rotatingContent.sections} zoom={zoom} totalBeats={extendedTotalBeats} laneOffset={0} depthBlur={0} />
                </div>
                <div className="ring-2 ring-yellow-500/70 rounded-sm bg-yellow-600/30 py-1" title="BarRuler (timeline)">
                  <div className="text-[3px] font-typewriter text-white/90 px-2 opacity-0 hover:opacity-100 transition-opacity">BarRuler (timeline)</div>
                  <BarRuler beatsPerBar={beatsPerBar} totalBeats={extendedTotalBeats} zoom={zoom} />
                </div>
                <div className="ring-2 ring-green-500/70 rounded-sm bg-green-600/30 py-1" title="ChordLane (timeline)">
                  <div className="text-[3px] font-typewriter text-white/90 px-2 opacity-0 hover:opacity-100 transition-opacity">ChordLane (timeline)</div>
                  <ChordLane chords={rotatingContent.chords} zoom={zoom} beatsPerBar={beatsPerBar} totalBeats={extendedTotalBeats} laneOffset={0} depthBlur={0} itemHeight={itemHeight} />
                </div>
                <div className="ring-2 ring-blue-500/70 rounded-sm bg-blue-600/30 py-1" title="LyricLane (timeline)">
                  <div className="text-[3px] font-typewriter text-white/90 px-2 opacity-0 hover:opacity-100 transition-opacity">LyricLane (timeline)</div>
                  <LyricLane lyrics={rotatingContent.lyrics} zoom={zoom} beatsPerBar={beatsPerBar} totalBeats={extendedTotalBeats} laneOffset={0} depthBlur={0} itemHeight={itemHeight} />
                </div>
              </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <TimelineFooter zoom={zoom} setZoom={setZoom} itemHeight={itemHeight} setItemHeight={setItemHeight} />
    </div>
  );
}
