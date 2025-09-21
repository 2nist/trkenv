// Canonical theme loader for TRK.
// Features:
// - Load theme JSON files from `/theme/themes/<name>.json` (or a provided path)
// - Apply theme vars to `:root` as CSS custom properties
// - Persist selected theme in localStorage under `trk.skin`
// - Expose `trkLoadCurrent()` and `trkSetTheme()` on `window`
// Stub loader (archived). Use archive copies for full implementations.
(function (g) {
  function trkSetTheme(n){ return Promise.resolve({name:n}); }
  function trkLoadCurrent(){ return Promise.resolve({skin:null}); }
  if (typeof g.trkSetTheme !== 'function') g.trkSetTheme = trkSetTheme;
  if (typeof g.trkLoadCurrent !== 'function') g.trkLoadCurrent = trkLoadCurrent;
})(typeof window !== 'undefined' ? window : globalThis);
