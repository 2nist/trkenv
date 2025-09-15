import React from "react";
import { SectionRail } from "@/components/SectionRail";
import { BarRuler } from "@/components/BarRuler";
import { ChordLane } from "@/components/ChordLane";
import { LyricLane } from "@/components/LyricLane";

export default function DesignPage() {
  const [zoom, setZoom] = React.useState(8);
  const [sectionsOri, setSectionsOri] = React.useState<
    "horizontal" | "vertical"
  >("horizontal");
  const [rulerOri, setRulerOri] = React.useState<"horizontal" | "vertical">(
    "horizontal"
  );
  const [chordsOri, setChordsOri] = React.useState<"horizontal" | "vertical">(
    "horizontal"
  );
  const [lyricsOri, setLyricsOri] = React.useState<"horizontal" | "vertical">(
    "horizontal"
  );
  const beatsPerBar = 4;

  // Mock data for showcase
  const sections = [
    { name: "Verse", startBeat: 0, lengthBeats: 32, color: "#5B8DEF" },
    { name: "Chorus", startBeat: 32, lengthBeats: 32, color: "#F59E0B" },
  ];
  const chords = [
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
  ];
  const lyrics = [
    { text: "When I find myself in times of trouble", beat: 2 },
    { text: "Mother Mary comes to me", beat: 10 },
    { text: "Speaking words of wisdom, let it be", beat: 18 },
    { text: "Let it be, let it be", beat: 34 },
  ];

  const totalBeats = Math.max(
    beatsPerBar,
    (chords[chords.length - 1]?.startBeat ?? 0) + beatsPerBar
  );

  return (
    <div className="p-4 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Design playground</h1>
        <div className="flex items-center gap-3">
          <label className="text-sm">Zoom: {zoom}px/beat</label>
          <input
            type="range"
            min={4}
            max={24}
            step={1}
            value={zoom}
            onChange={(e) => setZoom(parseInt(e.target.value, 10))}
          />
        </div>
      </header>

      <div className="flex flex-wrap gap-2 text-xs items-center">
        <label className="flex items-center gap-1">
          Sections:
          <select
            className="bg-slate-900 border border-slate-700 rounded px-1 py-0.5"
            value={sectionsOri}
            onChange={(e) => setSectionsOri(e.target.value as any)}
          >
            <option value="horizontal">Horizontal</option>
            <option value="vertical">Vertical</option>
          </select>
        </label>
        <label className="flex items-center gap-1">
          Ruler:
          <select
            className="bg-slate-900 border border-slate-700 rounded px-1 py-0.5"
            value={rulerOri}
            onChange={(e) => setRulerOri(e.target.value as any)}
          >
            <option value="horizontal">Horizontal</option>
            <option value="vertical">Vertical</option>
          </select>
        </label>
        <label className="flex items-center gap-1">
          Chords:
          <select
            className="bg-slate-900 border border-slate-700 rounded px-1 py-0.5"
            value={chordsOri}
            onChange={(e) => setChordsOri(e.target.value as any)}
          >
            <option value="horizontal">Horizontal</option>
            <option value="vertical">Vertical</option>
          </select>
        </label>
        <label className="flex items-center gap-1">
          Lyrics:
          <select
            className="bg-slate-900 border border-slate-700 rounded px-1 py-0.5"
            value={lyricsOri}
            onChange={(e) => setLyricsOri(e.target.value as any)}
          >
            <option value="horizontal">Horizontal</option>
            <option value="vertical">Vertical</option>
          </select>
        </label>
      </div>

      {/* Horizontal lanes preview */}
      <div>
        <h2 className="text-sm mb-1 text-slate-400">Horizontal</h2>
        <div className="space-y-2">
          <SectionRail
            sections={sections}
            zoom={zoom}
            orientation={sectionsOri}
            totalBeats={totalBeats}
          />
          <BarRuler
            beatsPerBar={beatsPerBar}
            totalBeats={totalBeats}
            zoom={zoom}
            orientation={rulerOri}
          />
          <ChordLane
            chords={chords}
            zoom={zoom}
            beatsPerBar={beatsPerBar}
            totalBeats={totalBeats}
            orientation={chordsOri}
          />
          <LyricLane
            lyrics={lyrics}
            zoom={zoom}
            beatsPerBar={beatsPerBar}
            totalBeats={totalBeats}
            orientation={lyricsOri}
          />
        </div>
      </div>

      {/* Vertical board side-by-side */}
      {(sectionsOri === "vertical" ||
        rulerOri === "vertical" ||
        chordsOri === "vertical" ||
        lyricsOri === "vertical") && (
        <div>
          <h2 className="text-sm mb-1 text-slate-400">Vertical board</h2>
          <div className="flex gap-2">
            <div className="flex-none w-[72px]">
              <SectionRail
                sections={sections}
                zoom={zoom}
                orientation="vertical"
                totalBeats={totalBeats}
              />
            </div>
            <div className="flex-none w-[56px]">
              <BarRuler
                beatsPerBar={beatsPerBar}
                totalBeats={totalBeats}
                zoom={zoom}
                orientation="vertical"
              />
            </div>
            <div className="flex-1">
              <ChordLane
                chords={chords}
                zoom={zoom}
                beatsPerBar={beatsPerBar}
                totalBeats={totalBeats}
                orientation="vertical"
              />
            </div>
            <div className="flex-1">
              <LyricLane
                lyrics={lyrics}
                zoom={zoom}
                beatsPerBar={beatsPerBar}
                totalBeats={totalBeats}
                orientation="vertical"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
