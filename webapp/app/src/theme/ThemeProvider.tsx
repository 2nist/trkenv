"use client";
// Lightweight stub of the ThemeProvider used to remove runtime theme mutations
// while preserving the public API for components that import it.
import { useState } from "react";

type ThemeKey = "sharpie" | "inkdark" | "play" | "funky";
type ThemeState = { theme: ThemeKey; dark: boolean };

const DEFAULT_STATE: ThemeState = { theme: "sharpie", dark: false };

export function useThemeState() {
  // Keep API stable: return a simple state that does not mutate document.documentElement
  const [state, setState] = useState<ThemeState>(DEFAULT_STATE);
  return { state, setState } as { state: ThemeState; setState: (s: ThemeState | ((s: ThemeState) => ThemeState)) => void };
}

// Minimal ThemeSelector that renders nothing by default (safe to mount)
export function ThemeSelector() {
  // Safe no-op: return null (React will accept this without JSX typing)
  return null as any;
}

export default function noop() { return null; }
