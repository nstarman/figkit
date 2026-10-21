# Changelog

Every release has a section. Every breaking change has a migration note with three parts, so the
`figkit-upgrade` skill can apply it:

- **What changed**: one sentence.
- **Find**: how to locate affected code, e.g. `grep -rn "compute:" webapps/`.
- **Edit**: the exact change to make.

A release with a breaking change that has no migration note is not tagged.

## Unreleased

### Added

- Responsive layout classes in `figkit.css`, driven by container queries (the app's own width,
  so they also adapt in narrow notebook cells): `.fk-split` (two columns, stacked below 760 px)
  and `.fk-grid-2` (a 2 × 2-style grid, one column below 320 px).
- `cssVar(el, name, fallback)`, `rgb(color)` (a frozen `[r, g, b]`) and `context2d(canvas)` (a clear error
  instead of a null context) in `figkit/stage.js`, re-exported by `figkit.js`.
- `shade(camera, texture, size, out, base)`: optional background `[r, g, b]` (0–255) to composite over.

### Fixed

- Dark mode: the globe's disc, axes and labels and the panels' origin mark follow the theme
  instead of staying white or near-black; canvases redraw when the system theme changes.
- Panel headers wrap whole words (title, then readout) on narrow screens.
- The globe example stacks the globe above its panels on phones.
- Gallery: each example page links back to the gallery (served and single file).

## 0.1.0 — 2026-10-21

First release. Specified in `specs/001-figkit-v0-1/`.

### Added

- Data contract: `figkit.export` / `figkit.load` — a manifest plus plain `.npy` files, dtype rules,
  checked opt-in float64 → float32 narrowing (data format 1).
- Browser library: `model`, `npy`, `data`, `geom`, `stage`, `globe`, `skypanel` and `figkit.css`.
- `figkit build` (served site with vendored library and import map; single self-contained HTML that
  opens from `file://`), `figkit serve`, `figkit test`.
- `figkit.anywidget.Widget` (extra `notebook`): the same app in JupyterLab and marimo.
- The globe example (`examples/globe/`) and its gallery page.
- Skills: `figkit` (building a webapp) and `figkit-upgrade` (moving one to a newer tag).
