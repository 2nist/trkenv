// Archived copy of app/public/theme/theme-loader.js
// Original implementation archived for history. See webapp/theme-archive for canonical versions.
(function(global){
  if (typeof global.trkSetTheme !== 'function') global.trkSetTheme = function(){ return Promise.resolve(); };
  if (typeof global.trkLoadCurrent !== 'function') global.trkLoadCurrent = function(){ return Promise.resolve({skin:null}); };
})(typeof window !== 'undefined' ? window : globalThis);
