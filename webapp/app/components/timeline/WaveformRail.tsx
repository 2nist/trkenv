"use client";
import React from "react";

export function WaveformRail({
  zoom,
  totalBeats,
  audioUrl,
  laneOffset = 0,
  depthBlur = 0,
}: {
  zoom: number;
  totalBeats: number;
  audioUrl?: string;
  laneOffset?: number;
  depthBlur?: number;
}) {
  const widthPx = Math.max(1, Math.round(totalBeats * zoom));
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);

  // Generate sample waveform data (this would normally come from audio analysis)
  const generateWaveformData = React.useMemo(() => {
    const samples = Math.floor(widthPx / 2); // Sample every 2 pixels
    const data: number[] = [];
    for (let i = 0; i < samples; i++) {
      // Create a pseudo-random waveform pattern
      const t = i / samples;
      const amplitude = Math.sin(t * Math.PI * 8) * 0.5 + 0.5; // Base wave
      const noise = (Math.random() - 0.5) * 0.3; // Add some noise
      const value = Math.max(0, Math.min(1, amplitude + noise));
      data.push(value);
    }
    return data;
  }, [widthPx]);

  React.useEffect(() => {
    if (wrapperRef.current) {
      wrapperRef.current.style.setProperty("--width", `${widthPx}px`);
      wrapperRef.current.style.setProperty("--filter", depthBlur > 0 ? `blur(${depthBlur}px)` : "none");
    }
  }, [widthPx, depthBlur]);

  return (
    <div className="relative h-12 bg-slate-800/50 border border-border rounded overflow-hidden">
      <div ref={wrapperRef} className="relative h-full timeline-wrapper">
        {/* Waveform visualization */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox={`0 0 ${widthPx} 64`}
          preserveAspectRatio="none"
        >
          {/* Background grid */}
          <defs>
            <pattern id="waveform-grid" width="20" height="64" patternUnits="userSpaceOnUse">
              <rect width="20" height="64" fill="transparent"/>
              <line x1="0" y1="32" x2="20" y2="32" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#waveform-grid)" />

          {/* Waveform path */}
          <path
            d={`M 0 32 ${generateWaveformData.map((value, index) => {
              const x = index * 2;
              const y = 32 - (value - 0.5) * 50; // Center at 32, amplitude of 50
              return `L ${x} ${y}`;
            }).join(' ')}`}
            stroke="#00ff88"
            strokeWidth="1.5"
            fill="none"
            opacity="0.8"
          />

          {/* Fill under the waveform */}
          <path
            d={`M 0 32 ${generateWaveformData.map((value, index) => {
              const x = index * 2;
              const y = 32 - (value - 0.5) * 50;
              return `L ${x} ${y}`;
            }).join(' ')} L ${widthPx} 32 Z`}
            fill="rgba(0, 255, 136, 0.2)"
          />
        </svg>

        {/* Playhead indicator line */}
        <div className="absolute top-0 bottom-0 w-px bg-red-500 z-10 pointer-events-none opacity-75" />

        {/* Audio info overlay */}
        {audioUrl && (
          <div className="absolute top-1 right-2 text-[10px] text-green-400 font-mono bg-black/50 px-1 rounded">
            AUDIO
          </div>
        )}
      </div>
    </div>
  );
}