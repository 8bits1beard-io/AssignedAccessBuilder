# Repository Guidelines

## Project Structure & Module Organization

- `index.html` provides the UI structure and modal content (uses `data-action`/`data-change` hooks).
- `styles.css` owns the visual system (CSS variables, layout, components).
- `app.js` wires UI handlers and orchestrates app flow.
- `dom.js` caches DOM lookups; `state.js` holds shared state and preset loading.
- `helpers.js` hosts shared utilities (URL encoding, args helpers, clipboard, etc.).
- `xml.js`, `validation.js`, and `summary.js` isolate XML generation, validation, and summary rendering.
- `data/` stores JSON presets (`app-presets.json`, `pin-presets.json`, `single-app-presets.json`) loaded at runtime.
- `README.md` and `REFERENCE.md` are the primary docs; update them when behavior changes.

## Build, Test, and Development Commands

This is a static web app with no build step.

- Open `index.html` directly to run locally.
- If your browser blocks `fetch()` from `file://`, run a local server:
  - `python -m http.server` (then visit `http://localhost:8000`).

## Coding Style & Naming Conventions

- Indentation: 4 spaces in HTML/CSS/JS; avoid tabs.
- JavaScript: `camelCase` for variables/functions, `UPPER_SNAKE_CASE` only for true constants.
- CSS: `kebab-case` class names and CSS variables; keep theme values in `:root`.
- Keep functions focused and prefer small helper utilities over large monoliths.

## Testing Guidelines

No automated tests are defined. Do quick manual checks before PRs:

- Load the page, add a few apps/pins, and verify XML preview updates.
- Export XML and confirm the file downloads as expected.
- For Edge kiosk options, verify the expected arguments appear in the XML.

## Commit & Pull Request Guidelines

- Commit messages follow an imperative, sentence-case style (e.g., “Add …”, “Fix …”, “Update …”).
- Optional prefix like `Fix:` or `Add:` appears in history; use it when helpful.
- PRs should include a brief summary, test notes, and UI screenshots/gifs for visual changes.
- Update `README.md` or `REFERENCE.md` when user-visible behavior or deployment steps change.

## Configuration & Security Notes

- No secrets should be committed; this repo is static front-end only.
- Preset data changes belong in `data/` JSON files, not hardcoded in `app.js`.
