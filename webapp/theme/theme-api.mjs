// ESM theme API for TRK. Can be imported by the host app.
const THEME_BASE = '/theme/themes';
const STORAGE_KEY = 'trk.skin';

function setCssVar(name, value) {
  try { document.documentElement.style.setProperty('--' + name, value); } catch (e) {}
}

function applyVars(vars) {
  if (!vars) return;
  Object.keys(vars).forEach(k => setCssVar(k, vars[k]));
}

function applySkinName(name) {
  if (!name) return;
  try {
    document.documentElement.dataset.skin = name;
    document.documentElement.classList.add('skin-' + name);
  } catch (e) {}
}

async function fetchThemeJson(name) {
  if (!name) throw new Error('no-theme-name');
  const url = `${THEME_BASE}/${name}.json`;
  const r = await fetch(url, { credentials: 'same-origin' });
  if (!r.ok) throw new Error('failed-fetch-' + r.status);
  return r.json();
}

export async function trkSetTheme(name) {
  if (!name) throw new Error('no-theme-name');
  try {
    const json = await fetchThemeJson(name);
    applyVars(json.vars || {});
    applySkinName(json.name || name);
    try { window.localStorage.setItem(STORAGE_KEY, json.name || name); } catch (e) {}
    return json;
  } catch (err) {
    applySkinName(name);
    try { window.localStorage.setItem(STORAGE_KEY, name); } catch (e) {}
    return { name, error: err && err.message };
  }
}

export async function trkLoadCurrent() {
  let fromStorage = null;
  try { fromStorage = window.localStorage.getItem(STORAGE_KEY); } catch (e) {}
  const desired = document.documentElement.dataset.skin || fromStorage || null;
  if (!desired) return { skin: null };
  try {
    const json = await fetchThemeJson(desired);
    applyVars(json.vars || {});
    applySkinName(json.name || desired);
    return { skin: json.name || desired };
  } catch (err) {
    applySkinName(desired);
    return { skin: desired, error: err && err.message };
  }
}

// Attach to window for scripts that expect global functions.
if (typeof window !== 'undefined') {
  if (typeof window.trkLoadCurrent !== 'function') window.trkLoadCurrent = trkLoadCurrent;
  if (typeof window.trkSetTheme !== 'function') window.trkSetTheme = trkSetTheme;
}
