import React, { useState } from "react";
import { useRouter } from "next/router";
import useSWR from "swr";
import { swrFetcher } from "@/lib/api";
import Link from "next/link";

interface Section {
  id: string;
  name: string;
  startBeat: number;
  lengthBeats: number;
  color: string;
}

interface Chord {
  symbol: string;
  startBeat: number;
}

interface Lyric {
  text: string;
  beat?: number | null;
  ts_sec?: number | null;
}

type PlayheadProps = {
  songIdProp?: string | string[] | undefined;
};

export type { PlayheadProps };

export function Playhead({ songIdProp }: PlayheadProps) {
  const router = useRouter();
  const songIdQuery = router.query?.song;
  const songId = songIdProp ?? songIdQuery;
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [zoom, setZoom] = useState(16);
  const [forceDemoRows, setForceDemoRows] = useState(false);

  // If URL query contains demo=1, enable demo rows automatically
  React.useEffect(() => {
    try {
      const demo = Array.isArray(router.query?.demo) ? router.query?.demo[0] : router.query?.demo;
      const ds = String(demo || '').toLowerCase();
      if (ds === '1' || ds === 'true') setForceDemoRows(true);
    } catch (e) {}
  }, [router.query]);

  const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

  // Fetch song data if songId is provided
  const url = React.useMemo(() => {
    if (!songId) return null;
    const sid = Array.isArray(songId) ? songId[0] : songId;
    return `${apiBase}/v1/songs/${sid}/doc`;
  }, [songId, apiBase]);

  const { data: songData, error, isLoading } = useSWR(url, swrFetcher);

  // Demo data (used when no song is loaded)
  const demoSections: Section[] = [
    { id: "1", name: "Intro", startBeat: 0, lengthBeats: 16, color: "#8B5CF6" },
    { id: "2", name: "Verse 1", startBeat: 16, lengthBeats: 32, color: "#10B981" },
    { id: "3", name: "Chorus", startBeat: 48, lengthBeats: 32, color: "#F59E0B" },
    { id: "4", name: "Verse 2", startBeat: 80, lengthBeats: 32, color: "#10B981" },
    { id: "5", name: "Chorus", startBeat: 112, lengthBeats: 32, color: "#F59E0B" },
    { id: "6", name: "Bridge", startBeat: 144, lengthBeats: 16, color: "#EF4444" },
    { id: "7", name: "Chorus", startBeat: 160, lengthBeats: 32, color: "#F59E0B" },
    { id: "8", name: "Outro", startBeat: 192, lengthBeats: 16, color: "#6B7280" },
  ];

  const demoChords: Chord[] = [
    { symbol: "C", startBeat: 0 },
    { symbol: "Am", startBeat: 4 },
    { symbol: "F", startBeat: 8 },
    { symbol: "G", startBeat: 12 },
    { symbol: "C", startBeat: 16 },
    { symbol: "Am", startBeat: 20 },
    { symbol: "F", startBeat: 24 },
    { symbol: "G", startBeat: 28 },
  ];

  const demoLyrics: Lyric[] = [
    { text: "Hello", beat: 16 },
    { text: "world", beat: 18 },
    { text: "this", beat: 20 },
    { text: "is", beat: 21 },
    { text: "a", beat: 22 },
    { text: "song", beat: 24 },
  ];

  // Normalize song data shapes into the timeline-friendly shapes
  const normSections: Section[] = React.useMemo(() => {
    const src = songData?.sections;
    if (!src || !Array.isArray(src) || src.length === 0) return demoSections;
    return src.map((s: any, i: number) => ({
      id: s.id || s.name || String(i),
      name: s.name || s.label || `Section ${i + 1}`,
      startBeat: Number(s.startBeat || s.start || 0),
      lengthBeats: Number(s.lengthBeats || s.length || s.durationBeats || 16),
      color: s.color || (i % 2 ? '#10B981' : '#8B5CF6'),
    }));
  }, [songData]);

  const normChords: Chord[] = React.useMemo(() => {
    const src = songData?.chords;
    if (!src || !Array.isArray(src) || src.length === 0) return demoChords;
    return src.map((c: any) => ({ symbol: c.symbol || c.chord || '', startBeat: Number(c.startBeat || c.time || 0) }));
  }, [songData]);

  const normLyrics: Lyric[] = React.useMemo(() => {
    const src = songData?.lyrics;
    if (!src || !Array.isArray(src) || src.length === 0) return demoLyrics;
    return src.map((l: any) => ({ text: l.text || l.line || String(l), beat: typeof l.beat === 'number' ? l.beat : (typeof l.time === 'number' ? secondsToBeats(l.time, songData?.tempo || 120) : null) }));
  }, [songData]);

  const sections = forceDemoRows ? demoSections : normSections;
  const chords = forceDemoRows ? demoChords : normChords;
  const lyrics = forceDemoRows ? demoLyrics : normLyrics;

  const totalBeats = React.useMemo(() => {
    const lastSectionEnd = sections.length ? Math.max(...sections.map((s) => s.startBeat + s.lengthBeats)) : 0;
    const lastChordBeat = chords.length ? Math.max(...chords.map((c) => c.startBeat)) : 0;
    const lastLyricBeat = lyrics.length ? Math.max(...lyrics.map((l) => l.beat || 0)) : 0;
    return Math.max(192, lastSectionEnd, lastChordBeat + 8, lastLyricBeat + 8);
  }, [sections, chords, lyrics]);

  function secondsToBeats(sec: number, tempo: number) {
    if (!sec || !tempo) return 0;
    return sec * (tempo / 60.0);
  }

  // --- VTT handling: if the song has cached VTTs, fetch and parse cues into timed lyrics ---
  const [vttCues, setVttCues] = React.useState<Array<{start: number; end: number; text: string}>>([]);
  const [availableVtts, setAvailableVtts] = React.useState<string[]>([]);
  const [selectedVttIndex, setSelectedVttIndex] = React.useState<number>(0);

  React.useEffect(() => {
    let mounted = true;
    async function loadVtt() {
      setVttCues([]);
      setAvailableVtts([]);
      if (!songData) return;
      const assets = songData?.assets || songData?.source?.assets || {};
      // detect known asset keys
      let vtts: string[] = [];
      if (Array.isArray(assets?.lyrics_vtts)) vtts = assets.lyrics_vtts;
      else if (typeof assets?.lyrics_vtts === 'string') vtts = [assets.lyrics_vtts];
      else if (Array.isArray(assets?.lyrics_vtt)) vtts = assets.lyrics_vtt;
      else if (typeof assets?.lyrics_vtt === 'string') vtts = [assets.lyrics_vtt];
      else if (Array.isArray(assets?.vttPaths)) vtts = assets.vttPaths;
      else if (typeof assets?.vttPaths === 'string') vtts = [assets.vttPaths];

      // normalize and convert filesystem paths under data/lyrics_cache to public /data/lyrics_cache URLs
      const normalized: string[] = vtts.map((p) => {
        if (!p) return '';
        try {
          const m = String(p).match(/data[\\/](lyrics_cache[\\/].*)$/i);
          if (m) return `/data/${m[1].replace(/\\/g, '/').replace(/^\//, '')}`;
        } catch (e) {}
        return p;
      }).filter(Boolean);

      if (!normalized.length) return;

      setAvailableVtts(normalized);
      // ensure selected index is within range
      const idx = Math.min(Math.max(0, selectedVttIndex), Math.max(0, normalized.length - 1));
      setSelectedVttIndex(idx);

      const chosen = normalized[idx];
      try {
        const res = await fetch(chosen);
        if (!res.ok) return;
        const txt = await res.text();
        if (!mounted) return;
        // parse WEBVTT cues
        const cues: Array<{start:number; end:number; text:string}> = [];
        const lines = txt.split(/\r?\n/);
        let i = 0;
        while (i < lines.length) {
          const line = lines[i].trim();
          if (!line) { i++; continue; }
          let timeLine = line;
          if (!timeLine.includes('-->')) {
            if (i + 1 < lines.length && lines[i+1].includes('-->')) {
              timeLine = lines[i+1];
              i += 1;
            } else { i++; continue; }
          }
          const parts = timeLine.split('-->');
          if (parts.length < 2) { i++; continue; }
          const startStamp = parts[0].trim();
          const endStamp = parts[1].trim().split(' ')[0];
          const startSec = stampToSeconds(startStamp);
          const endSec = stampToSeconds(endStamp);
          let textLines: string[] = [];
          i++;
          while (i < lines.length && lines[i].trim()) { textLines.push(lines[i]); i++; }
          const text = textLines.join('\n').trim();
          if (!isNaN(startSec)) cues.push({ start: startSec, end: endSec || (startSec + 3), text });
          i++;
        }
        // prefer tempo from source.metadata if present
        const tempo = songData?.source?.metadata?.tempo || songData?.tempo || 120;
        const cueBeats = cues.map(c => ({ start: secondsToBeats(c.start, tempo), end: secondsToBeats(c.end, tempo), text: c.text }));
        setVttCues(cueBeats);
      } catch (e) {
        console.warn('vtt load failed', e);
      }
    }
    loadVtt();
    return () => { mounted = false; };
  }, [songData]);

  function stampToSeconds(stamp: string) {
    // Accept formats like HH:MM:SS.mmm or MM:SS.mmm or SS.mmm
    try {
      const parts = stamp.split(':').map(p => p.trim());
      if (parts.length === 3) {
        const hh = Number(parts[0]); const mm = Number(parts[1]); const ss = Number(parts[2]);
        return hh * 3600 + mm * 60 + ss;
      } else if (parts.length === 2) {
        const mm = Number(parts[0]); const ss = Number(parts[1]);
        return mm * 60 + ss;
      } else {
        return Number(parts[0]) || 0;
      }
    } catch (e) { return 0; }
  }

  // prefer VTT cues if available for timing
  const displayLyrics = vttCues && vttCues.length ? vttCues.map(c => ({ text: c.text, beat: c.start })) : lyrics;

  return (
    <main className="p-6 min-h-screen bg-[#efe3cc]">
      <div className="flex items-center gap-2 mb-6">
        <h1 className="font-typewriter text-black font-bold">Timeline Editor</h1>
      </div>

      {/* Song Selection */}
      <div className="mb-6 p-4 border border-black/15 rounded-[6px] bg-white shadow-[0_1px_0_rgba(0,0,0,.25)]">
        <div className="flex items-center justify-between">
          <div>
            {songData ? (
              <div>
                <h2 className="font-typewriter text-black font-bold">{songData.title}</h2>
                <p className="font-typewriter text-black">by {songData.artist}</p>
                {/* VTT selector when multiple cached VTTs are available */}
                {availableVtts && availableVtts.length > 0 && (
                  <div className="mt-2">
                    <label className="font-typewriter text-black mr-2">Lyrics VTT:</label>
                    <select
                      aria-label="Select lyrics VTT"
                      value={selectedVttIndex}
                      onChange={(e) => {
                        const v = parseInt(e.target.value || '0');
                        setSelectedVttIndex(v);
                        // reload cues for the newly selected VTT
                        setVttCues([]);
                      }}
                      className="p-1 border border-black/20 rounded bg-white font-typewriter text-black"
                    >
                      {availableVtts.map((v, idx) => (
                        <option key={v} value={idx}>{v.split('/').slice(-2).join('/')}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <h2 className="font-typewriter text-black font-bold">Demo Timeline</h2>
                <p className="font-typewriter text-black">Select a song to edit its timeline</p>
              </div>
            )}
          </div>
          <Link href="/library" className="btn-tape-sm">
            Select Song
          </Link>
        </div>
      </div>

      {isLoading && (
        <div className="font-typewriter text-black">Loading song...</div>
      )}

      {error && (
        <div className="font-typewriter text-black">
          Error loading song: {String(error)}
        </div>
      )}

      {/* Timeline Controls */}
      <div className="mb-6 p-4 border border-black/15 rounded-[6px] bg-white shadow-[0_1px_0_rgba(0,0,0,.25)]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-typewriter text-black">Zoom:</span>
            <button
              onClick={() => setZoom(Math.max(8, zoom - 4))}
              className="btn-tape-sm"
            >
              -
            </button>
            <span className="font-typewriter text-black px-2">{zoom}px/beat</span>
            <button
              onClick={() => setZoom(Math.min(32, zoom + 4))}
              className="btn-tape-sm"
            >
              +
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-typewriter text-black">Section:</span>
            <select
              aria-label="Select section"
              value={currentSectionIndex}
              onChange={(e) => setCurrentSectionIndex(parseInt(e.target.value))}
              className="p-2 border border-black/20 rounded bg-white font-typewriter text-black"
            >
              {sections.map((section, index) => (
                <option key={section.id} value={index}>
                  {section.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="font-typewriter text-black">Show demo rows</label>
            <input
              aria-label="Show demo rows"
              type="checkbox"
              checked={forceDemoRows}
              onChange={(e) => setForceDemoRows(e.target.checked)}
            />
          </div>
        </div>
      </div>

      {/* Timeline Canvas */}
      <div className="border border-black/15 rounded-[6px] bg-white shadow-[0_1px_0_rgba(0,0,0,.25)] overflow-x-auto">
          <div
            ref={(el) => {
              if (!el) return;
              el.style.setProperty('--width', `${totalBeats * zoom}px`);
              el.style.setProperty('--min-height', `400px`);
            }}
            className="relative timeline-wrapper"
          >

          {/* Beat Ruler */}
          <div className="absolute top-0 left-0 right-0 h-8 border-b border-black/10">
            {Array.from({ length: Math.ceil(totalBeats / 4) }).map((_, i) => (
              <div
                key={i}
                ref={(el) => { if (el) el.style.setProperty('--left', `${i * 4 * zoom}px`); }}
                className="absolute top-0 border-l border-black/20 h-full flex items-center pl-1 var-left"
              >
                <span className="font-dymo text-xs text-black">{i * 4}</span>
              </div>
            ))}
          </div>

          {/* Sections Track */}
          <div className="absolute top-8 left-0 right-0 h-12 border-b border-black/10">
            {sections.map((section, idx) => (
              <div
                key={section.id}
                ref={(el) => {
                  if (!el) return;
                  el.style.setProperty('--left', `${section.startBeat * zoom}px`);
                  el.style.setProperty('--width', `${section.lengthBeats * zoom}px`);
                  el.style.backgroundColor = section.color;
                  el.style.opacity = '0.7';
                }}
                className="absolute top-1 h-10 rounded border border-black/20 flex items-center justify-center var-left var-width"
              >
                <span className="font-dymo text-xs text-white">{section.name}</span>
              </div>
            ))}
          </div>

          {/* Chords Track */}
          <div className="absolute top-20 left-0 right-0 h-12 border-b border-black/10">
            {chords.map((chord, index) => (
              <div
                key={index}
                ref={(el) => {
                  if (!el) return;
                  el.style.setProperty('--left', `${chord.startBeat * zoom}px`);
                  el.style.setProperty('--width', `${Math.max(zoom * 2, 60)}px`);
                }}
                className="absolute top-1 h-10 bg-blue-100 border border-blue-300 rounded flex items-center justify-center var-left var-width"
              >
                <span className="font-typewriter text-xs text-blue-800">{chord.symbol}</span>
              </div>
            ))}
          </div>

          {/* Lyrics Track */}
          <div className="absolute top-32 left-0 right-0 h-16">
            {displayLyrics.map((lyric, index) => (
              <div
                key={index}
                ref={(el) => { if (el) el.style.setProperty('--left', `${(lyric.beat || 0) * zoom}px`); }}
                className="absolute top-1 bg-green-100 border border-green-300 rounded px-2 py-1 var-left"
              >
                <span className="font-typewriter text-xs text-green-800">{lyric.text}</span>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Section Details */}
      {sections[currentSectionIndex] && (
        <div className="mt-6 p-4 border border-black/15 rounded-[6px] bg-white shadow-[0_1px_0_rgba(0,0,0,.25)]">
          <h3 className="font-typewriter text-black font-bold mb-3">
            Section: {sections[currentSectionIndex].name}
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-typewriter text-black">Start Beat:</span>
              <span className="font-typewriter text-black ml-2">{sections[currentSectionIndex].startBeat}</span>
            </div>
            <div>
              <span className="font-typewriter text-black">Length:</span>
              <span className="font-typewriter text-black ml-2">{sections[currentSectionIndex].lengthBeats} beats</span>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}

export default Playhead;
