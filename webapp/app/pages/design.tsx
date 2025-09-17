/* eslint-disable react/forbid-dom-props */
/* eslint-disable @stylistic/jsx-props-no-spreading */
/* eslint-disable style/no-inline-styles */
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

  // Demo song data
  const demoSongData = React.useMemo(() => {
    const sid = Array.isArray(songId) ? songId[0] : songId;

    if (sid === "demo-let-it-be") {
      return {
        title: "Let It Be",
        artist: "The Beatles",
        bpm: 76,
        timeSignature: "4/4",
        sections: [
          { id: "1", name: "Intro", startBeat: 0, lengthBeats: 16, color: "#8B5CF6" },
          { id: "2", name: "Verse 1", startBeat: 16, lengthBeats: 32, color: "#5B8DEF" },
          { id: "3", name: "Chorus", startBeat: 48, lengthBeats: 16, color: "#059669" },
          { id: "4", name: "Verse 2", startBeat: 64, lengthBeats: 32, color: "#5B8DEF" },
          { id: "5", name: "Chorus", startBeat: 96, lengthBeats: 16, color: "#059669" },
          { id: "6", name: "Bridge", startBeat: 112, lengthBeats: 16, color: "#DC2626" },
          { id: "7", name: "Outro", startBeat: 128, lengthBeats: 16, color: "#9333EA" },
        ],
        chords: [
          { symbol: "C", startBeat: 16 },
          { symbol: "G", startBeat: 20 },
          { symbol: "Am", startBeat: 24 },
          { symbol: "F", startBeat: 28 },
          { symbol: "C", startBeat: 32 },
          { symbol: "G", startBeat: 36 },
          { symbol: "F", startBeat: 40 },
          { symbol: "C", startBeat: 44 },
          { symbol: "Am", startBeat: 48 },
          { symbol: "G", startBeat: 52 },
          { symbol: "F", startBeat: 56 },
          { symbol: "C", startBeat: 60 },
        ],
        lyrics: [
          { text: "When I find myself in times of trouble", ts_sec: 18.95, beat: null },
          { text: "Mother Mary comes to me", ts_sec: 23.68, beat: null },
          { text: "Speaking words of wisdom", ts_sec: 27.89, beat: null },
          { text: "Let it be", ts_sec: 31.58, beat: null },
          { text: "Let it be, let it be", ts_sec: 50.53, beat: null },
          { text: "Let it be, let it be", ts_sec: 54.21, beat: null },
          { text: "Whisper words of wisdom", ts_sec: 57.89, beat: null },
          { text: "Let it be", ts_sec: 61.58, beat: null },
        ],
      };
    }

    if (sid === "demo-hey-jude") {
      return {
        title: "Hey Jude",
        artist: "The Beatles",
        bpm: 75,
        timeSignature: "4/4",
        sections: [
          { id: "1", name: "Intro", startBeat: 0, lengthBeats: 8, color: "#8B5CF6" },
          { id: "2", name: "Verse 1", startBeat: 8, lengthBeats: 32, color: "#5B8DEF" },
          { id: "3", name: "Chorus", startBeat: 40, lengthBeats: 24, color: "#059669" },
          { id: "4", name: "Verse 2", startBeat: 64, lengthBeats: 32, color: "#5B8DEF" },
          { id: "5", name: "Chorus", startBeat: 96, lengthBeats: 24, color: "#059669" },
          { id: "6", name: "Bridge", startBeat: 120, lengthBeats: 16, color: "#DC2626" },
          { id: "7", name: "Outro", startBeat: 136, lengthBeats: 40, color: "#9333EA" },
        ],
        chords: [
          { symbol: "F", startBeat: 8 },
          { symbol: "C", startBeat: 16 },
          { symbol: "F", startBeat: 24 },
          { symbol: "Bb", startBeat: 28 },
          { symbol: "F", startBeat: 32 },
          { symbol: "C", startBeat: 36 },
          { symbol: "F", startBeat: 40 },
        ],
        lyrics: [
          { text: "Hey Jude, don't make it bad", ts_sec: 8.0, beat: null },
          { text: "Take a sad song and make it better", ts_sec: 12.8, beat: null },
          { text: "Remember to let her into your heart", ts_sec: 19.2, beat: null },
          { text: "Then you can start to make it better", ts_sec: 25.6, beat: null },
        ],
      };
    }

    return null;
  }, [songId]);

  // Process real song data, demo song data, or use fallback demo data
  const sections: Section[] = React.useMemo(() => {
    const dataSource = songData || demoSongData;
    if (dataSource?.sections) {
      return dataSource.sections.map((section: any, index: number) => ({
        id: section.id || String(index),
        name: section.name || `Section ${index + 1}`,
        startBeat: section.startBeat || 0,
        lengthBeats: section.lengthBeats || 16,
        color: section.color || "#5B8DEF",
      }));
    }
    return demoSections;
  }, [songData, demoSongData]);

  const chords: Chord[] = React.useMemo(() => {
    const dataSource = songData || demoSongData;
    if (dataSource?.chords) {
      return dataSource.chords.map((chord: any) => ({
        symbol: chord.symbol || "C",
        startBeat: chord.startBeat || 0,
      }));
    }
    return demoChords;
  }, [songData, demoSongData]);

  const lyrics: Lyric[] = React.useMemo(() => {
    const dataSource = songData || demoSongData;
    if (dataSource?.lyrics) {
      return dataSource.lyrics
        .map((lyric: any) => {
          let beat: number | null = null;

          // If we have a beat value, use it directly
          if (typeof lyric.beat === "number") {
            beat = lyric.beat;
          }
          // If we have ts_sec (timestamp from LRCLIB), convert to beats
          else if (typeof lyric.ts_sec === "number" && dataSource.bpm) {
            // Convert seconds to beats: (seconds * BPM) / 60
            beat = Math.round((lyric.ts_sec * dataSource.bpm) / 60);
          }
          // If the text starts with timestamp format [mm:ss.xx], parse it
          else if (
            typeof lyric.text === "string" &&
            lyric.text.match(/^\[\d+:\d+(\.\d+)?\]/)
          ) {
            const timestampMatch = lyric.text.match(/^\[(\d+):(\d+)(\.\d+)?\]/);
            if (timestampMatch && dataSource.bpm) {
              const minutes = parseInt(timestampMatch[1]);
              const seconds = parseInt(timestampMatch[2]);
              const milliseconds = timestampMatch[3]
                ? parseFloat(timestampMatch[3])
                : 0;
              const totalSeconds = minutes * 60 + seconds + milliseconds;

              // Convert seconds to beats
              beat = Math.round((totalSeconds * dataSource.bpm) / 60);

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
  }, [songData, demoSongData]);

  const beatsPerBar = React.useMemo(() => {
    const dataSource = songData || demoSongData;
    if (dataSource?.timeSignature) {
      return Number(dataSource.timeSignature.split("/")[0] || "4") || 4;
    }
    return 4;
  }, [songData, demoSongData]);

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
      <div className="min-h-screen bg-[#efe3cc] text-black p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="font-typewriter text-black font-bold mb-4">Loading song data...</div>
          <div className="font-typewriter text-black">
            Please wait while we fetch the song details
          </div>
        </div>
      </div>
    );
  }

  if (error && songId && !songId.toString().startsWith('demo-')) {
    return (
      <div className="min-h-screen bg-[#efe3cc] text-black p-6">
        <div className="text-center">
          <div className="font-typewriter text-black font-bold mb-4">Error Loading Song</div>
          <div className="font-typewriter text-black mb-4">{String(error)}</div>
          <div className="font-typewriter text-black">
            <Link href="/design" className="text-black hover:underline">
              Go back to demo timeline
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#efe3cc] text-black p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="font-dymo bg-[#1a1a1a] text-[#efe3cc] rounded-[6px] px-2 py-0.5">[trk]</span>
          <h1 className="font-typewriter text-black font-bold">
            {songData || demoSongData ? (
              <>
                {(songData || demoSongData)?.title} {(songData || demoSongData)?.artist && `— ${(songData || demoSongData)?.artist}`}
              </>
            ) : (
              "Enhanced Timeline Design"
            )}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-black/60">Zoom: {zoom}px/beat</span>
          <input
            type="range"
            min={8}
            max={32}
            step={2}
            value={zoom}
            onChange={(e) => setZoom(parseInt(e.target.value))}
            className="accent-black h-1 w-40 bg-black/20 rounded"
          />
        </div>
      </div>

      {/* Section Navigation */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setCurrentSectionIndex(Math.max(0, currentSectionIndex - 1))}
          disabled={currentSectionIndex === 0}
          className="btn-tape text-sm disabled:opacity-50"
        >
          prev
        </button>
        <div className="bg-[#efe3cc] text-[#1a1a1a] border border-[#000]/15 rounded-[3px] px-2 py-1 shadow-[0_1px_0_rgba(0,0,0,.25)]">
          Section {currentSectionIndex + 1} / {sections.length}: {currentSection?.name}
        </div>
        <button
          onClick={() => setCurrentSectionIndex(Math.min(sections.length - 1, currentSectionIndex + 1))}
          disabled={currentSectionIndex === sections.length - 1}
          className="btn-tape text-sm disabled:opacity-50"
        >
          next
        </button>
      </div>

      {/* Song Selector */}
      {!songId && (
        <div className="mb-6 p-4 bg-white border border-black/20 rounded">
          <h3 className="font-typewriter text-black font-bold mb-2">Load a Song</h3>
          <p className="font-typewriter text-black text-sm mb-3">
            To see real song data, go to the{" "}
            <Link href="/songs" className="text-black hover:underline">
              Songs page
            </Link>{" "}
            and click "View" on any song, then add "?view=design" to the URL, or
            add "?song=ID" to this page.
          </p>
          <div className="flex gap-2 mb-3">
            <Link
              href="/design?song=demo-let-it-be"
              className="btn-tape text-xs"
            >
              Try "Let It Be" Demo
            </Link>
            <Link
              href="/design?song=demo-hey-jude"
              className="btn-tape text-xs"
            >
              Try "Hey Jude" Demo
            </Link>
          </div>
          <p className="text-gray-400 text-sm">
            Currently showing demo data for demonstration purposes.
          </p>
        </div>
      )}

      {/* Section Navigation */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() =>
            setCurrentSectionIndex(Math.max(0, currentSectionIndex - 1))
          }
          disabled={currentSectionIndex === 0}
          className="btn-tape disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ← Previous
        </button>
        <span className="px-4 py-1 bg-[#efe3cc] text-[#1a1a1a] border border-[#000]/15 rounded-[3px] shadow-[0_1px_0_rgba(0,0,0,.25)]">
          Section {currentSectionIndex + 1} of {sections.length}:{" "}
          {currentSection?.name || "Unknown"}
        </span>
        <button
          onClick={() =>
            setCurrentSectionIndex(
              Math.min(sections.length - 1, currentSectionIndex + 1)
            )
          }
          disabled={currentSectionIndex === sections.length - 1}
          className="btn-tape disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next →
        </button>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Previous Section Preview */}
          {prevSection && (
            <div className="opacity-50 border border-black/20 rounded p-3">
              <h3 className="font-typewriter text-black text-sm mb-2">
                Previous: {prevSection.name}
              </h3>
              <div className="h-8 bg-white border border-black/10 rounded flex items-center px-2 text-xs font-typewriter text-black">
                Preview of {prevSection.name} ({prevSection.lengthBeats} beats)
              </div>
            </div>
          )}

          {/* Current Section - Main View */}
          {currentSection && (
            <div className="border border-black/20 rounded p-4 bg-white">
              <h3 className="font-typewriter text-black font-bold mb-4">
                Current: {currentSection.name}
              </h3>

              {/* Timeline Grid */}
              <div className="bg-white border border-black/20 rounded p-4 overflow-x-auto">
                <div
                  className="flex mb-4 timeline-wrapper"
                  ref={(el) => { if (!el) return; el.style.setProperty('--zoom', `${zoom}px`); el.style.setProperty('--width', `${currentSection.lengthBeats * zoom}px`); }}
                >
                  {Array.from(
                    { length: currentSection.lengthBeats },
                    (_, i) => (
                      <div
                        key={i}
                        ref={(el) => { if (!el) return; el.style.setProperty('--width', `${zoom}px`); }}
                        className="var-width flex flex-col items-center border-r border-gray-600"
                      >
                        <div
                          className={`h-16 border-gray-600 ${
                            i % beatsPerBar === 0
                              ? "border-l-2 border-l-gray-400"
                              : ""
                          }`}
                        >
                          {/* Beat marker */}
                          <div className="text-xs text-gray-400 text-center mt-1">
                            {i + 1}
                          </div>
                        </div>
                        {/* Beat number */}
                        <div className="text-xs text-gray-500 mt-1">
                          {currentSection.startBeat + i}
                        </div>
                      </div>
                    )
                  )}
                </div>

                {/* Chords Row */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium mb-2 text-green-400">
                    Chords:
                  </h4>
                  <div className="flex relative h-8">
                    {Array.from(
                      { length: currentSection.lengthBeats },
                      (_, i) => (
                        <div
                          key={i}
                          ref={(el) => { if (!el) return; el.style.setProperty('--width', `${zoom}px`); }}
                          className="var-width border-r border-gray-700 border-opacity-30 h-full"
                        ></div>
                      )
                    )}

                    {/* Overlay chords at their exact beat positions */}
                    {currentSectionChords.map((chord, idx) => {
                      const beatOffset = chord.startBeat - currentSection.startBeat;
                      return (
                        <div
                          key={idx}
                          ref={(el) => { if (!el) return; el.style.setProperty('--left', `${beatOffset * zoom}px`); el.style.setProperty('--width', `${Math.min(zoom * 2, 60)}px`); }}
                          className="absolute top-0 h-8 flex items-center justify-center var-left var-width"
                        >
                          <span className="bg-green-600 text-white text-xs px-1 py-0.5 rounded whitespace-nowrap">
                            {chord.symbol}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Lyrics Row */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium mb-2 text-purple-400">
                    Lyrics:
                  </h4>
                  <div className="flex relative h-10">
                    {Array.from(
                      { length: currentSection.lengthBeats },
                      (_, i) => (
                        <div
                          key={i}
                          ref={(el) => { if (!el) return; el.style.setProperty('--width', `${zoom}px`); }}
                          className="var-width border-r border-gray-700 border-opacity-30 h-full"
                        ></div>
                      )
                    )}

                    {/* Overlay lyrics at their exact beat positions */}
                    {currentSectionLyrics.map((lyric, idx) => {
                      const beatOffset = lyric.beat! - currentSection.startBeat;
                      return (
                        <div
                          key={idx}
                          ref={(el) => { if (!el) return; el.style.setProperty('--left', `${beatOffset * zoom}px`); el.style.setProperty('--width', `${zoom}px`); el.style.setProperty('--transform', 'translateX(-50%)'); }}
                          className="absolute top-0 h-8 flex items-center justify-center var-left var-width var-transform"
                        >
                          <span
                            className="bg-purple-600 text-white text-xs w-3 h-3 rounded-full flex items-center justify-center"
                            title={`${lyric.text} (Beat ${lyric.beat})`}
                          >
                            ♪
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Lyrics text preview below the timeline */}
                  <div className="mt-2 text-xs text-purple-300 min-h-4">
                    {currentSectionLyrics.length > 0 && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {currentSectionLyrics.map((lyric, idx) => (
                          <span key={idx} className="whitespace-nowrap">
                            <span className="text-purple-400">
                              ♪{lyric.beat}
                            </span>
                            : {lyric.text.slice(0, 20)}
                            {lyric.text.length > 20 ? "..." : ""}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Next Section Preview */}
          {nextSection && (
            <div className="opacity-50 border border-black/20 rounded p-3">
              <h3 className="font-typewriter text-black text-sm mb-2">
                Next: {nextSection.name}
              </h3>
              <div className="h-8 bg-white border border-black/10 rounded flex items-center px-2 text-xs font-typewriter text-black">
                Preview of {nextSection.name} ({nextSection.lengthBeats} beats)
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Lyrics Panel */}
          <div className="bg-white border border-black/20 rounded p-4">
            <h3 className="font-typewriter text-black font-bold mb-3">
              {currentSection?.name || "Section"} - Lyrics
            </h3>
            <div className="space-y-3">
              {currentSectionLyrics.length > 0 ? (
                currentSectionLyrics.map((lyric, idx) => (
                  <div
                    key={idx}
                    className="text-gray-300 border-l-2 border-purple-500 pl-3 py-1"
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-sm text-gray-400 mr-3 min-w-fit">
                        Beat {lyric.beat}
                        {lyric.ts_sec && (
                          <div className="text-xs text-purple-400">
                            {Math.floor(lyric.ts_sec / 60)}:
                            {(lyric.ts_sec % 60).toFixed(1).padStart(4, "0")}
                          </div>
                        )}
                      </span>
                      <span className="flex-1">{lyric.text}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-gray-500 italic">
                  No lyrics in this section
                </div>
              )}
            </div>

            {/* Lyrics Timeline Visualization */}
            {currentSection && currentSectionLyrics.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <h4 className="font-typewriter text-black font-bold text-sm mb-2">
                  Lyrics Timeline
                </h4>
                <div className="relative h-8 bg-white border border-black/20 rounded overflow-hidden">
                  {/* Section duration bar */}
                  <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-black/5"></div>

                  {/* Lyric markers */}
                    {currentSectionLyrics.map((lyric, idx) => {
                    const position = ((lyric.beat! - currentSection.startBeat) / currentSection.lengthBeats) * 100;
                    const clamped = Math.max(0, Math.min(100, position));
                    return (
                      <div
                        key={idx}
                        ref={(el) => { if (!el) return; el.style.setProperty('--left', `${clamped}%`); }}
                        className="absolute top-0 bottom-0 w-1 bg-purple-400 var-left"
                        title={`${lyric.text} (Beat ${lyric.beat})`}
                      />
                    );
                  })}

                  {/* Beat markers */}
                  {Array.from(
                    {
                      length: Math.ceil(
                        currentSection.lengthBeats / beatsPerBar
                      ),
                    },
                    (_, i) => {
                      const beatPosition =
                        ((i * beatsPerBar) / currentSection.lengthBeats) * 100;
                      return (
                        <div
                          key={i}
                          ref={(el) => { if (!el) return; el.style.setProperty('--left', `${beatPosition}%`); }}
                          className="absolute top-0 bottom-0 w-px bg-black/30 var-left"
                        />
                      );
                    }
                  )}
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Beat {currentSection.startBeat}</span>
                  <span>
                    Beat {currentSection.startBeat + currentSection.lengthBeats}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Section Overview */}
          <div className="bg-[#efe3cc] border border-black/15 rounded p-4">
            <h3 className="text-lg font-medium mb-3">Song Structure</h3>
            <div className="space-y-1">
              {sections.map((section, idx) => (
                <button
                  key={section.id}
                  onClick={() => setCurrentSectionIndex(idx)}
                  className={`w-full text-left px-2 py-1 rounded text-sm ${
                    idx === currentSectionIndex
                      ? "btn-tape"
                      : "bg-[#D4C2A0] hover:bg-[#E0CBA8] text-[#1a1a1a]"
                  }`}
                >
                  {section.name} ({section.lengthBeats} beats)
                </button>
              ))}
            </div>
          </div>

          {/* Song Info */}
          {(songData || demoSongData) && (
            <div className="bg-white border border-black/20 rounded p-4">
              <h3 className="font-typewriter text-black font-bold mb-3">Song Info</h3>
              <div className="space-y-2 text-sm font-typewriter text-black">
                <div>
                  <strong>Title:</strong> {(songData || demoSongData)?.title}
                </div>
                {(songData || demoSongData)?.artist && (
                  <div>
                    <strong>Artist:</strong> {(songData || demoSongData)?.artist}
                  </div>
                )}
                {(songData || demoSongData)?.bpm && (
                  <div>
                    <strong>BPM:</strong> {(songData || demoSongData)?.bpm}
                  </div>
                )}
                {(songData || demoSongData)?.timeSignature && (
                  <div>
                    <strong>Time Signature:</strong> {(songData || demoSongData)?.timeSignature}
                  </div>
                )}
                <div>
                  <strong>Total Sections:</strong> {sections.length}
                </div>
                <div>
                  <strong>Total Chords:</strong> {chords.length}
                </div>
                <div>
                  <strong>Total Lyrics:</strong> {lyrics.length}
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-white border border-black/20 rounded p-4">
            <h3 className="font-typewriter text-black font-bold mb-2">UX Improvements:</h3>
            <ul className="text-sm font-typewriter text-black space-y-1">
              <li>
                • <strong>Focused View:</strong> One section at a time
              </li>
              <li>
                • <strong>Context:</strong> Preview adjacent sections
              </li>
              <li>
                • <strong>Vertical Space:</strong> Better use of screen height
              </li>
              <li>
                • <strong>Separated Lyrics:</strong> Dedicated panel
              </li>
              <li>
                • <strong>Easy Navigation:</strong> Quick section jumping
              </li>
              <li>
                • <strong>Real Data:</strong> Loads actual song content
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
