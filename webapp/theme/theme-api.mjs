// Minimal ESM theme API shim (no-op)
export async function trkSetTheme(name) { return { name }; }
export async function trkLoadCurrent() { return { skin: null }; }

// Attach to window for legacy scripts
if (typeof window !== 'undefined') {
  if (typeof window.trkSetTheme !== 'function') window.trkSetTheme = trkSetTheme;
  if (typeof window.trkLoadCurrent !== 'function') window.trkLoadCurrent = trkLoadCurrent;
}
