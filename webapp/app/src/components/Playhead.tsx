"use client";
import React from 'react';

export default function Playhead() {
  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)] p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-4 flex items-center gap-2">
          <span className="font-dymo bg-[color:var(--text)] text-[var(--bg)] rounded-[6px] px-2 py-0.5">[play]</span>
          <h1 className="text-xl font-semibold">Playhead</h1>
        </div>
        <div className="relative border border-[color:var(--border,#2a2d33)] rounded-md overflow-hidden">
          {/* stationary playhead */}
          <div className="cylindrical-playhead" />
          {/* simple scrollable lane */}
          <div className="timeline-content bg-[var(--surface)] p-6">
            <div className="grid grid-cols-12 gap-4">
              {Array.from({ length: 48 }).map((_, i) => (
                <div key={i} className="h-24 bg-[var(--panel)]/60 border border-[color:var(--border,#2a2d33)] rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
