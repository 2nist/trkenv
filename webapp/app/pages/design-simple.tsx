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

export default function DesignPage() {
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
    {
      id: "2",
      name: "Verse 1",
      startBeat: 16,
      lengthBeats: 32,
      color: "#5B8DEF",
    },
    {
      id: "3",
      name: "Chorus",
      startBeat: 48,
      lengthBeats: 24,
      color: "#F59E0B",
    },
    {
      id: "4",
      name: "Verse 2",
      startBeat: 72,
      lengthBeats: 32,
      color: "#5B8DEF",
    },
    {
      id: "5",
      name: "Chorus",
      startBeat: 104,
      lengthBeats: 24,
      color: "#F59E0B",
    },
    {
      id: "6",
      name: "Bridge",
      startBeat: 128,
      lengthBeats: 16,
      color: "#EF4444",
    },
    {
      id: "7",
      name: "Outro",
      startBeat: 144,
      lengthBeats: 16,
      color: "#8B5CF6",
    },
  ];

  const demoChords: Chord[] = [
    { symbol: "C", startBeat: 0 },
    { symbol: "G", startBeat: 4 },
    { symbol: "Am", startBeat: 8 },
    { symbol: "F", startBeat: 12 },
    { symbol: "C", startBeat: 16 },
    { symbol: "G", startBeat: 20 },
    { symbol: "Am", startBeat: 24 },
    { symbol: "F", startBeat: 28 },
    { symbol: "C", startBeat: 32 },
    { symbol: "G", startBeat: 36 },
    { symbol: "Am", startBeat: 40 },
    { symbol: "F", startBeat: 44 },
    { symbol: "F", startBeat: 48 },
    { symbol: "C", startBeat: 52 },
    { symbol: "G", startBeat: 56 },
    { symbol: "Am", startBeat: 60 },
    { symbol: "F", startBeat: 64 },
    { symbol: "C", startBeat: 68 },
  ];

  const demoLyrics: Lyric[] = [
    { text: "When I find myself in times of trouble", beat: 18 },
    { text: "Mother Mary comes to me", beat: 26 },
    { text: "Speaking words of wisdom", beat: 34 },
    { text: "Let it be", beat: 42 },
    { text: "Let it be, let it be", beat: 50 },
    { text: "Let it be, let it be", beat: 58 },
    { text: "Whisper words of wisdom", beat: 66 },
    { text: "Let it be", beat: 70 },
  ];

  // Process real song data or use demo data
  const sections: Section[] = React.useMemo(() => {
    if (songData?.sections) {
      return songData.sections.map((section: any, index: number) => ({
        id: section.id || String(index),
        name: section.name || `Section ${index + 1}`,
        startBeat: section.startBeat || 0,
        lengthBeats: section.lengthBeats || 16,
        color: section.color || "#5B8DEF",
      }));
    }
    return demoSections;
  }, [songData]);

  const chords: Chord[] = React.useMemo(() => {
    if (songData?.chords) {
      return songData.chords.map((chord: any) => ({
        symbol: chord.symbol || "C",
        startBeat: chord.startBeat || 0,
      }));
    }
    return demoChords;
  }, [songData]);

  const lyrics: Lyric[] = React.useMemo(() => {
    if (songData?.lyrics) {
      return songData.lyrics
        .map((lyric: any) => {
          let beat: number | null = null;

          // If we have a beat value, use it directly
          if (typeof lyric.beat === "number") {
            beat = lyric.beat;
          }
          // If we have ts_sec (timestamp from LRCLIB), convert to beats
          else if (typeof lyric.ts_sec === "number" && songData.bpm) {
            // Convert seconds to beats: (seconds * BPM) / 60
            beat = Math.round((lyric.ts_sec * songData.bpm) / 60);
          }
          // If the text starts with timestamp format [mm:ss.xx], parse it
          else if (
            typeof lyric.text === "string" &&
            lyric.text.match(/^\[\d+:\d+(\.\d+)?\]/)
          ) {
            const timestampMatch = lyric.text.match(/^\[(\d+):(\d+)(\.\d+)?\]/);
            if (timestampMatch && songData.bpm) {
              const minutes = parseInt(timestampMatch[1]);
              const seconds = parseInt(timestampMatch[2]);
              const milliseconds = timestampMatch[3]
                ? parseFloat(timestampMatch[3])
                : 0;
              const totalSeconds = minutes * 60 + seconds + milliseconds;

              // Convert seconds to beats
              beat = Math.round((totalSeconds * songData.bpm) / 60);

              // Remove the timestamp from the text
              lyric.text = lyric.text.replace(/^\[\d+:\d+(\.\d+)?\]\s*/, "");
            }
          }

          return {
            text: lyric.text || "",
            beat: beat,
            ts_sec: lyric.ts_sec || null,
          };
        })
        .filter((lyric: Lyric) => lyric.text && lyric.beat !== null);
    }
    return demoLyrics;
  }, [songData]);

  const beatsPerBar = React.useMemo(() => {
    if (songData?.timeSignature) {
      return Number(songData.timeSignature.split("/")[0] || "4") || 4;
    }
    return 4;
  }, [songData]);

  const currentSection = sections[currentSectionIndex] || sections[0];
  const prevSection =
    currentSectionIndex > 0 ? sections[currentSectionIndex - 1] : null;
  const nextSection =
    currentSectionIndex < sections.length - 1
      ? sections[currentSectionIndex + 1]
      : null;

  // Filter content for current section
  const currentSectionChords = chords.filter(
    (chord) =>
      currentSection &&
      chord.startBeat >= currentSection.startBeat &&
      chord.startBeat < currentSection.startBeat + currentSection.lengthBeats
  );

  const currentSectionLyrics = lyrics.filter(
    (lyric) =>
      currentSection &&
      lyric.beat &&
      lyric.beat >= currentSection.startBeat &&
      lyric.beat < currentSection.startBeat + currentSection.lengthBeats
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-4">Loading song data...</div>
          <div className="text-gray-400">
            Please wait while we fetch the song details
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-6">
        <div className="text-center">
          <div className="text-2xl mb-4 text-red-400">Error Loading Song</div>
          <div className="text-gray-400 mb-4">{String(error)}</div>
          <div className="text-gray-400">Falling back to demo data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            Enhanced Timeline Design - Zoom Test
            {songData && (
              <span className="text-lg text-gray-300 ml-3">
                {songData.title} {songData.artist && `— ${songData.artist}`}
              </span>
            )}
          </h1>
          {!songData && (
            <p className="text-gray-400 text-sm mt-1">
              Demo Mode - Load a song to see real data
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <label className="text-sm">
            Zoom: {zoom}px/beat
            <input
              type="range"
              min={8}
              max={32}
              step={2}
              value={zoom}
              onChange={(e) => setZoom(parseInt(e.target.value))}
              className="ml-2"
            />
          </label>
        </div>
      </div>

      {/* Zoom Test Area */}
      <div className="mb-6 p-4 bg-gray-900 border border-gray-700 rounded">
        <h3 className="text-lg font-medium mb-3">
          Zoom Test - Watch Elements Scale
        </h3>

        {/* Simple Beat Grid */}
        <div className="mb-4">
          <h4 className="text-sm font-medium mb-2 text-blue-400">
            Beat Grid (Should scale with zoom):
          </h4>
          <div className="flex bg-gray-800 rounded p-2 overflow-x-auto">
              {Array.from({ length: 16 }, (_, i) => (
              <div
                  key={i}
                  ref={(el) => { if (!el) return; el.style.setProperty('--width', `${zoom}px`); el.style.setProperty('--height', '40px'); }}
                  className="var-width var-height border-r border-gray-600 flex flex-col items-center justify-center text-xs bg-gray-700 mr-1"
                >
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Chord Display */}
        <div className="mb-4">
          <h4 className="text-sm font-medium mb-2 text-green-400">
            Chords (Should move with zoom):
          </h4>
          <div
            className="relative bg-gray-800 rounded p-2 overflow-x-auto h-[50px]"
          >
            {/* Background grid */}
            <div className="flex absolute inset-0">
              {Array.from({ length: 16 }, (_, i) => (
                <div
                  key={i}
                  ref={(el) => { if (!el) return; el.style.setProperty('--width', `${zoom}px`); }}
                  className="var-width border-r border-gray-600 opacity-30"
                />
              ))}
            </div>

            {/* Demo chords */}
            {[
              { symbol: "C", beat: 0 },
              { symbol: "G", beat: 4 },
              { symbol: "Am", beat: 8 },
              { symbol: "F", beat: 12 },
            ].map((chord, idx) => (
              <div
                key={idx}
                ref={(el) => { if (!el) return; el.style.setProperty('--left', `${chord.beat * zoom + 2}px`); }}
                className="absolute top-2 bg-green-600 text-white text-xs px-2 py-1 rounded var-left"
              >
                {chord.symbol}
              </div>
            ))}
          </div>
        </div>

        {/* Lyrics Display */}
        <div className="mb-4">
          <h4 className="text-sm font-medium mb-2 text-purple-400">
            Lyrics (Should move with zoom):
          </h4>
          <div
            className="relative bg-gray-800 rounded p-2 overflow-x-auto h-[50px]"
          >
            {/* Background grid */}
            <div className="flex absolute inset-0">
              {Array.from({ length: 16 }, (_, i) => (
                <div
                  key={i}
                  ref={(el) => { if (!el) return; el.style.setProperty('--width', `${zoom}px`); }}
                  className="var-width border-r border-gray-600 opacity-30"
                />
              ))}
            </div>

            {/* Demo lyrics */}
            {[
              { text: "When I find myself", beat: 2 },
              { text: "Mother Mary comes", beat: 6 },
              { text: "Speaking words", beat: 10 },
              { text: "Let it be", beat: 14 },
            ].map((lyric, idx) => (
              <div
                key={idx}
                ref={(el) => { if (!el) return; el.style.setProperty('--left', `${lyric.beat * zoom + 2}px`); }}
                className="absolute top-2 bg-purple-600 text-white text-xs px-1 py-1 rounded var-left"
                title={lyric.text}
              >
                ♪
              </div>
            ))}
          </div>
        </div>

        <div className="text-sm text-gray-400">
          <p>
            <strong>Expected behavior:</strong> As you move the zoom slider, all
            elements should scale proportionally.
          </p>
          <p>
            <strong>Current zoom value:</strong> {zoom}px per beat
          </p>
          <p>
            <strong>Total width per 16 beats:</strong> {zoom * 16}px
          </p>
        </div>
      </div>

      {/* Rest of the original content */}
      <div className="text-center text-gray-500 mt-8">
        <p>Original design implementation below...</p>
        <p>
          The zoom test above should help us debug why the timeline isn't
          responding to zoom changes.
        </p>
      </div>
    </div>
  );
}
