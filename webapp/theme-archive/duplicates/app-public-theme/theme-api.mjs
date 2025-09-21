// Archived copy of app/public/theme/theme-api.mjs
export async function trkSetTheme(name){ return { name }; }
export async function trkLoadCurrent(){ return { skin:null }; }
if (typeof window !== 'undefined') {
  if (typeof window.trkSetTheme !== 'function') window.trkSetTheme = trkSetTheme;
  if (typeof window.trkLoadCurrent !== 'function') window.trkLoadCurrent = trkLoadCurrent;
}
