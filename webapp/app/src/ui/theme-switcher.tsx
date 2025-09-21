'use client'

import React from 'react';

// ThemeSwitcher removed from UI surface. Export a no-op component so
// existing imports remain valid while the theme editor/system is archived.
export function ThemeSwitcher(_: { themes?: string[]; onSet?: (t: string) => void }) {
  return null;
}
