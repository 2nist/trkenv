// Canonical theme loader for TRK.
// Features:
// - Load theme JSON files from `/theme/themes/<name>.json` (or a provided path)
// - Apply theme vars to `:root` as CSS custom properties
// - Persist selected theme in localStorage under `trk.skin`
// - Expose `trkLoadCurrent()` and `trkSetTheme(name)` on `window`
(function (global) {
	var THEME_BASE = '/theme/themes';
	var STORAGE_KEY = 'trk.skin';

	function setCssVar(name, value) {
		try {
			document.documentElement.style.setProperty('--' + name, value);
		} catch (e) {
			// ignore
		}
	}

	function applyVars(vars) {
		if (!vars) return;
		Object.keys(vars).forEach(function (k) {
			setCssVar(k, vars[k]);
		});
	}

	function applySkinName(name) {
		if (!name) return;
		try {
			document.documentElement.dataset.skin = name;
			document.documentElement.classList.add('skin-' + name);
		} catch (e) {
			// ignore
		}
	}

	function fetchThemeJson(name) {
		if (!name) return Promise.reject(new Error('no-theme-name'));
		var url = THEME_BASE + '/' + name + '.json';
		return fetch(url, { credentials: 'same-origin' }).then(function (r) {
			if (!r.ok) throw new Error('failed-fetch-' + r.status);
			return r.json();
		});
	}

	function trkSetTheme(name) {
		if (!name) return Promise.reject(new Error('no-theme-name'));
		return fetchThemeJson(name)
			.then(function (json) {
				// JSON expected shape: { name: '...', vars: { key: value } }
				applyVars(json.vars || {});
				applySkinName(json.name || name);
				try { window.localStorage.setItem(STORAGE_KEY, json.name || name); } catch (e) {}
				return json;
			})
			.catch(function (err) {
				// fallback: still set skin name so selectors work
				applySkinName(name);
				try { window.localStorage.setItem(STORAGE_KEY, name); } catch (e) {}
				return { name: name, error: err && err.message };
			});
	}

	function trkLoadCurrent() {
		var fromStorage = null;
		try { fromStorage = window.localStorage.getItem(STORAGE_KEY); } catch (e) {}
		var desired = document.documentElement.dataset.skin || fromStorage || null;
		if (!desired) return { skin: null };
		// Try to load theme JSON; if that fails, still apply the skin attribute
		return fetchThemeJson(desired)
			.then(function (json) {
				applyVars(json.vars || {});
				applySkinName(json.name || desired);
				return { skin: json.name || desired };
			})
			.catch(function () {
				applySkinName(desired);
				return { skin: desired };
			});
	}

	// Expose without overwriting if another implementation exists
	if (typeof global.trkLoadCurrent !== 'function') global.trkLoadCurrent = trkLoadCurrent;
	if (typeof global.trkSetTheme !== 'function') global.trkSetTheme = trkSetTheme;
})(window);

// Optional: API-based loader fallback (upstream variant). If backend exposes /api/theme/current.json
// you can call window.trkApiLoadCurrent() to pull server-provided merged theme vars.
async function trkApiLoadCurrent(){
	try {
		const r = await fetch("/api/theme/current.json"); if(!r.ok) return;
		const t = await r.json(); if(!t.vars) return;
		for (const [k,v] of Object.entries(t.vars)) { document.documentElement.style.setProperty("--"+k, String(v)); }
	} catch {}
}
if (typeof window.trkApiLoadCurrent !== 'function') window.trkApiLoadCurrent = trkApiLoadCurrent;
