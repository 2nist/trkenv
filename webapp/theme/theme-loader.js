// Theme loader stub (no-op)
// The interactive theme system has been archived; this lightweight shim
// preserves the global function names but avoids network requests or DOM
// mutations so the app's CSS/tailwind pipeline stays unaffected.
(function (global) {
	function trkSetTheme(name) { return Promise.resolve({ name }); }
	function trkLoadCurrent() { return Promise.resolve({ skin: null }); }
	if (typeof global.trkLoadCurrent !== 'function') global.trkLoadCurrent = trkLoadCurrent;
	if (typeof global.trkSetTheme !== 'function') global.trkSetTheme = trkSetTheme;
})(typeof window !== 'undefined' ? window : globalThis);

// API loader no-op
async function trkApiLoadCurrent(){ return; }
if (typeof window !== 'undefined' && typeof window.trkApiLoadCurrent !== 'function') window.trkApiLoadCurrent = trkApiLoadCurrent;
