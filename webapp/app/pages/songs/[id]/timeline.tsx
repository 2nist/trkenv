import React from "react";
import Playhead from "@/components/Playhead";

// Render the shared Playhead component for legacy /songs/[id]/timeline routes.
// This keeps the UI identical to /playhead and avoids duplication.
export default function SongTimelinePage() {
  return <Playhead />;
}
