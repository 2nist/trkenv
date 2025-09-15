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

export default function TimelinePage() {
  const router = useRouter();
  const { song: songId } = router.query;
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [zoom, setZoom] = useState(16);

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

  // Use fetched data or demo data
  const sections = songData?.sections || demoSections;
  const chords = songData?.chords || demoChords;
  const lyrics = songData?.lyrics || demoLyrics;

  const totalBeats = Math.max(
    ...sections.map((s) => s.startBeat + s.lengthBeats),
    192
  );

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
            {lyrics.map((lyric, index) => (
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
