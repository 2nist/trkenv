TRK Theme Kit
================

This folder contains the canonical theme assets for TRK:

- `tokens.css` — CSS custom properties used across the app.
- `skins/` — skin-specific CSS layers (selectors use `[data-skin "<name>"]`).
- `themes/` — JSON theme files that map token names to values.
- `theme-loader.js` — canonical global loader (UMD-style) for script-based pages.
- `theme-api.mjs` — ESM module exposing `trkLoadCurrent()` and `trkSetTheme()` for apps that can import it.

Usage
-----

1. Client script usage (standalone pages):

```html
<script src="/theme/theme-loader.js"></script>
<script>document.documentElement.dataset.skin='midnight'; window.trkLoadCurrent();</script>
```

2. ESM usage (Next/React app):

```js
import('/theme/theme-api.mjs').then(api => api.trkLoadCurrent());
// or call api.trkSetTheme('midnight')
```

Theme JSON format
-----------------

Each theme JSON should be under `/theme/themes/<name>.json` and have the shape:

```json
{
  "name": "midnight",
  "vars": { "bg": "#0e1013", "panel": "#171c26", ... }
}
```

The loader maps JSON `vars` keys to CSS custom properties `--<key>`.
