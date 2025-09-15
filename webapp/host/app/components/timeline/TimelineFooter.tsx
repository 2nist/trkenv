"use client";
import React from "react";

type FooterProps = {
  zoom: number;
  setZoom: (z: number) => void;
  itemHeight: number;
  setItemHeight: (h: number) => void;
}

export default function TimelineFooter({ zoom, setZoom, itemHeight, setItemHeight }: FooterProps) {
  // Simple vintage-styled fader controls using range inputs
  return (
    <footer className="timeline-footer bg-white text-gray-800 px-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between py-3">
        <div className="flex items-center gap-4">
          <div className="flex flex-col text-xs">
            <label className="mb-1 font-typewriter">Zoom</label>
            <div className="flex items-center gap-2">
              <input aria-label="Timeline zoom number" type="number" min={4} max={200} value={zoom} onChange={(e) => setZoom(Number(e.target.value || 0))} className="w-20 px-2 py-1 border rounded text-sm" />
              <input aria-label="Timeline zoom" type="range" min={4} max={200} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-48" />
              <div className="text-[11px] text-gray-600 mt-1">{zoom}px / beat</div>
            </div>
          </div>

          <div className="flex flex-col text-xs">
            <label className="mb-1 font-typewriter">Item Height</label>
            <div className="flex items-center gap-2">
              <input aria-label="Item height number" type="number" min={8} max={120} value={itemHeight} onChange={(e) => setItemHeight(Number(e.target.value || 0))} className="w-20 px-2 py-1 border rounded text-sm" />
              <input aria-label="Item height" type="range" min={8} max={120} value={itemHeight} onChange={(e) => setItemHeight(Number(e.target.value))} className="w-48" />
              <div className="text-[11px] text-gray-600 mt-1">{itemHeight}px</div>
            </div>
          </div>
        </div>

        <div className="text-sm text-gray-600">Vintage controls</div>
      </div>
    </footer>
  )
}
