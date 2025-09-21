// Stub ESM theme API (archived). Use archive copies for full implementations.
export async function trkSetTheme(name){ return { name }; }
export async function trkLoadCurrent(){ return { skin: null }; }
if (typeof window !== 'undefined') {
  if (typeof window.trkSetTheme !== 'function') window.trkSetTheme = trkSetTheme;
  if (typeof window.trkLoadCurrent !== 'function') window.trkLoadCurrent = trkLoadCurrent;
}
