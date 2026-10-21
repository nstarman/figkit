# Changelog

Every release has a section. Every breaking change has a migration note with three parts, so the
`figkit-upgrade` skill can apply it:

- **What changed**: one sentence.
- **Find**: how to locate affected code, e.g. `grep -rn "compute:" webapps/`.
- **Edit**: the exact change to make.

A release with a breaking change that has no migration note is not tagged.

## Unreleased

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
